import path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const viteDevPort = process.env.VITE_DEV_PORT ? parseInt(process.env.VITE_DEV_PORT, 10) : 5173;

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
        target: process.env.API_TARGET || "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
      },
      "/rpc": {
        target: process.env.API_TARGET || "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/docs": {
        target: process.env.API_TARGET || "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
