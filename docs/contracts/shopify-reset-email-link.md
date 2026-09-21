# Shopify "Customer account password reset" email link

## Why the native URL does not work

`customer.reset_password_url` (and the normalised `shop.url + /account/reset/{id}/{token}`
variant) points at Shopify's own account pages. On this shop Shopify 302s
`/account/reset/{id}/{token}` to `/services/verify_email/confirm?...`, which never loads
the theme, never opens the overlay, and on failure lands on `/account/invalid_token` or
back at `/account/login`. That is the "the link just takes me back to the log in page"
report.

## Correct button href: storefront page, overlay modal

The link must open a normal storefront page and hand the reset URL to the theme overlay,
which then opens the modal on the app's `/reset-password` route. Do **not** link straight
to `/apps/apply/...`; that loads the app outside the overlay.

```liquid
{% assign reset_path_segment = customer.reset_password_url | split: '/account/' | last %}
{% assign canonical_reset_url = shop.url | append: '/account/' | append: reset_path_segment %}
{% assign overlay_reset_url = shop.url
   | append: '/?reset_url='
   | append: canonical_reset_url | url_encode
   | append: '&email_hint='
   | append: customer.email | url_encode %}

<a href="{{ overlay_reset_url }}" class="button__text">Reset your password</a>
```

Resulting link shape:

```
https://dropdeadextensions.com/?reset_url=https%3A%2F%2Fdropdeadextensions.com%2Faccount%2Freset%2F123%2Ftoken&email_hint=customer%40example.com
```

## Contract with the theme overlay

`assets/dd-registration-overlay.js` → `_ingestAuthQueryParam()`:

- reads `reset_url` (and `activation_url`) plus `email_hint` from the storefront query
- validates the URL host and the `/account/reset/` path prefix via
  `_validateAccountActionUrl`, rebuilding it on `window.location.origin`
- strips the params from the address bar, then opens the overlay at
  `/reset-password?reset_url=<encoded>&email=<hint>`

Do **not** add `auth=reset` to the email link. With `auth=reset` the overlay prefers a
sessionStorage copy of the reset URL over the query param, so a stale, already-consumed
link from an earlier attempt in the same tab can win over the fresh one from the email.
Passing `reset_url` alone always uses the link that was just clicked.

## Contract with the app

- `ResetPasswordPage` reads `reset_url` / `url`, `token` + `customer_id`, and
  `email_hint` / `email` / `customer_email` through `resolveResetParams({ kind: "reset" })`,
  which stashes them for one hour so social in-app browsers (Instagram, Facebook) that drop
  query params on navigation still resolve.
- Activation emails use `account_activation_url` and the same overlay entry point with
  `?activation_url=...`. `ResetPasswordPage` forwards a misrouted activation URL to
  `/activate-account`, but the correct link avoids the extra hop.
