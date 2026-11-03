import { defineConfig, devices } from "@playwright/test";

// Every edge function is faked per test (see fixtures.ts), so these runs never
// send email, lock an account, or touch Shopify.
const APP_PORT = 8099;

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: true,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The fake theme page is served by request interception, so Chrome treats
    // it as public and would refuse to frame the app from localhost.
    launchOptions: { args: ["--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // A prebuilt bundle, not the dev server: parallel cold loads make Vite
  // re-optimize dependencies and reload pages mid-test. NODE_ENV=development
  // keeps import.meta.env.DEV on, which allowlists the fake theme origin.
  webServer: {
    command: `npm run build:dev && npx vite preview --port ${APP_PORT} --strictPort`,
    cwd: "..",
    env: { NODE_ENV: "development" },
    url: `http://localhost:${APP_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
