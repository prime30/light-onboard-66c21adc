// Cloudflare Pages Function - proxies POST /change-password on the SPA host
// (apply.dropdeadextensions.com) to the Supabase Edge Function. Without this,
// the request falls through to the SPA's index.html catch-all and returns
// 200 text/html, which the storefront theme rejects.
//
// The Edge Function does the App Proxy HMAC verification and Admin API call  - 
// see docs/contracts/account-change-password.md.
export const onRequestPost: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const target = `https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/change-password${url.search}`;

  return fetch(target, {
    method: "POST",
    headers: context.request.headers,
    body: context.request.body,
  });
};
