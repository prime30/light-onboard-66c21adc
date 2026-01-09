const allowedMessageOrigins = [
  "https://apply.dropdeadextensions.com",
  "https://dropdeadextensions.com",
  "https://dropdeadextensions.myshopify.com",
  "https://drop-dead-2428.myshopify.com",
];

if (import.meta.env.DEV) {
  allowedMessageOrigins.push("http://127.0.0.1:9292");
}

export { allowedMessageOrigins };
