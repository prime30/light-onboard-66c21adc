# Remembering where a shopper came from (Meta, Google, TikTok)

Ads should land on the storefront, not the registration app. The registration
iframe therefore needs the theme to tell it which link the shopper originally
arrived on.

The app already listens for a `META_CONTEXT` postMessage and reads campaign
params from, in order of trust:

1. `first_landing_url` (the remembered first page of the session) - best
2. `parent_url` (the page the iframe is embedded on right now)
3. `referrer`

Add the snippet below to `theme.liquid` (before `</head>`). It stores the very
first landing URL of the session, so ad params survive any amount of browsing
before the shopper opens registration.

```liquid
<script>
(function () {
  var KEY = 'dd_first_landing_url';
  try {
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, window.location.href);
    }
  } catch (e) {}

  window.ddSendAttribution = function (iframeEl, targetOrigin) {
    if (!iframeEl || !iframeEl.contentWindow) return;
    var first = null;
    try { first = sessionStorage.getItem(KEY); } catch (e) {}
    iframeEl.contentWindow.postMessage(
      {
        type: 'META_CONTEXT',
        data: {
          first_landing_url: first,
          parent_url: window.location.href,
          referrer: document.referrer || null
        }
      },
      targetOrigin || window.location.origin
    );
  };
})();
</script>
```

Then call it once the registration iframe has loaded:

```liquid
<script>
  var applyFrame = document.getElementById('apply-iframe');
  if (applyFrame) {
    applyFrame.addEventListener('load', function () {
      window.ddSendAttribution(applyFrame);
    });
  }
</script>
```

If the iframe is served from `apply.dropdeadextensions.com` instead of the App
Proxy path, pass that origin as the second argument.

## Tagging ad links

Point the ad at the storefront with campaign tags, for example:

```
https://dropdeadextensions.com/?utm_source=facebook&utm_medium=paid_social&utm_campaign=launch_sep
```

Without `utm_campaign` the visit lands in the "Untagged ad clicks" line of the
admin attribution card and cannot be credited to a specific ad.
