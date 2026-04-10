const allowedMessageOrigins = [
  "https://apply.dropdeadextensions.com",
  "https://dropdeadextensions.com",
  "https://dropdeadextensions.myshopify.com",
  "https://drop-dead-2428.myshopify.com",
  "https://*.myshopify.com",
  "https://*.shopifypreview.com",
  "https://shop.app",
  "https://www.shop.app",
];

if (import.meta.env.DEV) {
  allowedMessageOrigins.push("http://127.0.0.1:9292");
  allowedMessageOrigins.push("http://localhost:9292");
}

export { allowedMessageOrigins };
