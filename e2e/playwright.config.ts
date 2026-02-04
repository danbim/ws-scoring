import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    screenshot: "off",
    video: "off",
    trace: "off",
  },
  projects: [
    {
      name: "screenshots",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
