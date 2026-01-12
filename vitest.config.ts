import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid({ dev: false, hot: false })],
  test: {
    environment: "happy-dom",
    globals: true,
    // Only run tests in __tests__/components directory
    include: ["__tests__/components/**/*.test.{ts,tsx}"],
    setupFiles: ["./__tests__/setup.ts"],
  },
  resolve: {
    conditions: ["browser"],
    alias: {
      "@": "/src",
    },
  },
});
