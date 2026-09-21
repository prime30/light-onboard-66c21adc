# Shopify "Customer account password reset" email link

## Why the native URL does not work

`customer.reset_password_url` (and the normalised `shop.url + /account/reset/{id}/{token}`
variant) points at Shopify's own account pages. On this shop Shopify 302s
`/account/reset/{id}/{token}` to `/services/verify_email/confirm?...`, which never loads
the theme, never loads the embedded app, and on failure lands on
`/account/invalid_token` or back at `/account/login`. That is the "the link just takes me
back to the log in page" report.

The reset screen must be opened directly, with the native reset URL carried as a param.

## Correct button href

```liquid
{% assign reset_path_segment = customer.reset_password_url | split: '/account/' | last %}
{% assign canonical_reset_url = shop.url | append: '/account/' | append: reset_path_segment %}
{% assign app_reset_url = shop.url
   | append: '/apps/apply/reset-password?fresh=1&reset_url='
   | append: canonical_reset_url | url_encode
   | append: '&email_hint='
   | append: customer.email | url_encode %}

<a href="{{ app_reset_url }}" class="button__text">Reset your password</a>
```

Resulting link shape:

```
https://dropdeadextensions.com/apps/apply/reset-password
  ?fresh=1
  &reset_url=https%3A%2F%2Fdropdeadextensions.com%2Faccount%2Freset%2F123%2Ftoken
  &email_hint=customer%40example.com
```

## Contract with the app

- `/apps/apply/reset-password` is the App Proxy mount of the SPA route `reset-password`.
- `reset_url` (or legacy `token` + `customer_id`) is read by `ResetPasswordPage` through
  `resolveResetParams({ kind: "reset" })`, which also stashes it for one hour so social
  in-app browsers (Instagram, Facebook) that drop query params on navigation still resolve.
- `fresh=1` invalidates any older stashed reset params so a previous, already-consumed
  link cannot be replayed.
- `email_hint` prefills the email and lets `reset-password` log failures against the lead.
- Activation emails must use `account_activation_url` and
  `/apps/apply/activate-account?activation_url=...` instead. `ResetPasswordPage` detects a
  misrouted activation URL and forwards it, but the correct link avoids the extra hop.
