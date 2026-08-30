# Meta conversion tracking (iframe SPA + Conversions API)

Goal: attribute pro-account registrations to Meta ads even though the form runs
inside an iframe on the Shopify theme, where browser-Pixel signals are weak.

## How it works

```text
Meta ad click -> theme page (fbclid, _fbp/_fbc cookies set first-party)
      |                                   |
      |  theme forwards fbp/fbc/fbclid    |  theme fires browser Pixel
      v  (iframe src params or META_CONTEXT postMessage)
   SPA caches signals + mints one metaEventId (sessionStorage)
      |
      |  submit -> create-customer  { meta: { eventId, fbc, fbp, eventSourceUrl } }
      v
   Conversions API "CompleteRegistration" with hashed em/ph/fn/ln + event_id
      ^
      |  theme Pixel CompleteRegistration uses the SAME eventID -> Meta dedupes
```

Server-side event fires only after the registration is fully verified (Shopify
customer created and the password confirmed), so Ads Manager never optimizes
toward stranded accounts.

## Secrets (backend)

- `META_PIXEL_ID` - the dataset/pixel ID from Events Manager.
- `META_CAPI_ACCESS_TOKEN` - system-user access token with `ads_management` for
  that dataset (Events Manager > Settings > Generate access token).
- `META_TEST_EVENT_CODE` - optional, only while validating in the Test Events tab.

Without the first two, the CAPI call is a silent no-op.

## Theme snippet

Add to the registration overlay script (`dd-registration-overlay.js`) or
`theme.liquid`. It does two things: forwards Meta cookies into the iframe, and
fires the browser Pixel on `APPLICATION_SUBMITTED` with the shared event id.

```js
(function () {
  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function metaContext() {
    var fbclid = new URLSearchParams(location.search).get('fbclid');
    return {
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc') || (fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : null),
      fbclid: fbclid,
      eventSourceUrl: location.href
    };
  }

  // 1) Forward on iframe load (works even if postMessage is missed).
  window.ddApplyIframeParams = function () {
    var ctx = metaContext();
    var p = new URLSearchParams();
    if (ctx.fbp) p.set('fbp', ctx.fbp);
    if (ctx.fbc) p.set('fbc', ctx.fbc);
    if (ctx.fbclid) p.set('fbclid', ctx.fbclid);
    p.set('parent_url', location.href);
    return p.toString();
  };

  // 2) Also push via postMessage once the SPA is ready.
  window.addEventListener('message', function (e) {
    var msg = e.data || {};
    var iframe = document.querySelector('#dd-registration-iframe');

    if (msg.type === 'IFRAME_READY' && iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: 'META_CONTEXT', data: metaContext() },
        'https://apply.dropdeadextensions.com'
      );
    }

    if (msg.type === 'APPLICATION_SUBMITTED' && typeof fbq === 'function') {
      fbq('track', 'CompleteRegistration', {
        content_name: 'Pro account application'
      }, { eventID: msg.metaEventId });
    }
  });
})();
```

Notes:

- The live theme uses the `META_CONTEXT` postMessage only (no `fbp`/`fbc`/
  `fbclid`/`parent_url` query params on first-party App Proxy iframe URLs). The
  query-param path is kept for the legacy `apply.` subdomain.
- On the App Proxy path the SPA shares the storefront origin, so it reads the
  Pixel's own first-party `_fbp` / `_fbc` cookies directly. Cookies win over
  forwarded values.
- `event_source_url` always comes from `parent_url` (then `document.referrer`),
  never the iframe URL.
- The SPA never calls `fbq`. The parent fires the single browser
  `CompleteRegistration` using the `metaEventId` from `APPLICATION_SUBMITTED`.
- Target origin must be the SPA origin. When the SPA is served first-party via
  the App Proxy (`/apps/apply`), use `location.origin` instead.
- In Ads Manager, optimize on the `CompleteRegistration` event for this dataset.

## Verifying

1. Events Manager > Test Events, set `META_TEST_EVENT_CODE`, submit a test
   registration: expect one `CompleteRegistration` from Server and one from
   Browser, shown as deduplicated.
2. Backend logs for `create-customer` print
   `Meta CAPI CompleteRegistration sent { eventId, hasFbc, hasFbp }`.
3. `hasFbc: false` on ad traffic means the theme is not forwarding cookies.
