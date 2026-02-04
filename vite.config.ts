import path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// Require VITE_DEV_PORT environment variable
if (!process.env.VITE_DEV_PORT) {
  throw new Error("VITE_DEV_PORT environment variable is required");
}
const viteDevPort = parseInt(process.env.VITE_DEV_PORT, 10);

// Require VITE_API_TARGET environment variable
if (!process.env.VITE_API_TARGET) {
  throw new Error("VITE_API_TARGET environment variable is required");
}
const apiTarget = process.env.VITE_API_TARGET;

export default defineConfig({
  plugins: [solid()],
  root: ".",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: viteDevPort,
    host: "0.0.0.0", // Allow access from outside container
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
      },
      "/rpc": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
      "/docs": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
