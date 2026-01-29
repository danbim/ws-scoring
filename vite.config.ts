import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
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
