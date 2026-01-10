import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

function flattenHTMLOutputPlugin(): Plugin {
  return {
    name: "flatten-html-output",
    apply: "build",
    writeBundle() {
      try {
        const srcViewerPath = join("dist", "src", "viewer", "index.html");
        const viewerPath = join("dist", "viewer", "index.html");

        // Read the HTML file from src/viewer if it exists
        const content = readFileSync(srcViewerPath, "utf-8");

        // Create viewer directory if it doesn't exist
        mkdirSync(join("dist", "viewer"), { recursive: true });

        // Write to the flattened location
        writeFileSync(viewerPath, content);

        // Clean up the src directory
        rmSync(join("dist", "src"), { recursive: true, force: true });
      } catch (_e) {
        // Silently fail if operation doesn't work as expected
      }
    },
  };
}

function viewerDevServerPlugin(): Plugin {
  return {
    name: "viewer-dev-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === "/viewer" || req.url === "/viewer/") {
          req.url = "/src/viewer/index.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [solid(), flattenHTMLOutputPlugin(), viewerDevServerPlugin()],
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "./index.html",
        viewer: "./src/viewer/index.html",
      },
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: process.env.API_TARGET || "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
