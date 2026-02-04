import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin, ResponseHeadersPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { BunRequest } from "bun";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { appRouter } from "./src/api/orpc/router.js";
import { addConnection, handleWebSocketMessage, removeConnection } from "./src/api/websocket.js";
import {
  addHeadJudgeConnection,
  handleHeadJudgeWebSocketMessage,
  removeHeadJudgeConnection,
} from "./src/api/websocket-head-judge.js";
import { getDb, type schema } from "./src/infrastructure/db/index.js";

// Require API_PORT environment variable
if (!process.env.API_PORT) {
  throw new Error("API_PORT environment variable is required");
}
const port = parseInt(process.env.API_PORT, 10);

// CORS configuration
// Require API_CORS_ALLOWED_ORIGIN environment variable
if (!process.env.API_CORS_ALLOWED_ORIGIN) {
  throw new Error("API_CORS_ALLOWED_ORIGIN environment variable is required");
}
const allowedOrigin = process.env.API_CORS_ALLOWED_ORIGIN.trim();

// Build a whitelist of allowed origins
// In development, allow both the configured origin and Vite dev server origin
// In production, only allow the configured origin
const isDevelopment = process.env.NODE_ENV !== "production";
const allowedOrigins = new Set<string>([allowedOrigin]);
if (isDevelopment && process.env.API_CORS_DEV_ORIGIN) {
  allowedOrigins.add(process.env.API_CORS_DEV_ORIGIN.trim());
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

const openApiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new CORSPlugin({
      origin: (origin) => (allowedOrigins.has(origin) ? origin : undefined),
      credentials: true,
    }),
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: {
          title: "WS Scoring API",
          version: "0.1.0",
        },
      },
    }),
  ],
});

const rpcHandler = new RPCHandler(appRouter, {
  plugins: [
    new CORSPlugin({
      origin: (origin) => (allowedOrigins.has(origin) ? origin : undefined),
      credentials: true,
    }),
    new ResponseHeadersPlugin(),
  ],
  interceptors: [
    onError((error) => {
      console.error("[oRPC Error]", error);
    }),
  ],
});

function getContentType(pathname: string): string {
  const ext = pathname.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    html: "text/html; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
  };
  return contentTypes[ext || ""] || "application/octet-stream";
}

async function runMigrations() {
  console.log("Running migrations...");
  try {
    const db = await getDb();
    // In production, this will always be NodePgDatabase (testDb is only set in tests)
    await migrate(db as NodePgDatabase<typeof schema>, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

await runMigrations();

Bun.serve<{ heatId: string; isHeadJudge?: boolean }>({
  port,
  routes: {
    // WebSocket upgrade for /api/heats/:heatId/stream
    "/api/heats/:heatId/stream": async (
      request: BunRequest,
      server: Bun.Server<{ heatId: string; isHeadJudge?: boolean }>
    ) => {
      if (request.headers.get("upgrade") === "websocket") {
        if (!request.params.heatId) {
          return new Response(JSON.stringify({ error: "Heat ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const success = server.upgrade(request, {
          data: { heatId: request.params.heatId },
        });
        if (success) {
          return undefined; // Handled by websocket handler
        }
      }
      return new Response(JSON.stringify({ error: "WebSocket upgrade failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    },

    // WebSocket upgrade for /api/heats/:heatId/head-judge/stream
    "/api/heats/:heatId/head-judge/stream": async (
      request: BunRequest,
      server: Bun.Server<{ heatId: string; isHeadJudge?: boolean }>
    ) => {
      if (request.headers.get("upgrade") === "websocket") {
        if (!request.params.heatId) {
          return new Response(JSON.stringify({ error: "Heat ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const success = server.upgrade(request, {
          data: { heatId: request.params.heatId, isHeadJudge: true },
        });
        if (success) {
          return undefined; // Handled by websocket handler
        }
      }
      return new Response(JSON.stringify({ error: "WebSocket upgrade failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    },
  },
  async fetch(request: BunRequest, _server) {
    const url = new URL(request.url);

    // Handle oRPC requests
    if (url.pathname.startsWith("/rpc")) {
      const { matched, response } = await rpcHandler.handle(request, {
        prefix: "/rpc",
        context: { request },
      });
      if (matched && response) return response;
    }

    // Serve OpenAPI docs and spec
    if (url.pathname.startsWith("/docs")) {
      const { matched, response } = await openApiHandler.handle(request, {
        prefix: "/docs",
        context: { request },
      });
      if (matched && response) return response;
    }

    // Serve viewer component (transpile TypeScript to JavaScript)
    if (url.pathname === "/viewer/heat-viewer.js") {
      try {
        const result = await Bun.build({
          entrypoints: ["src/viewer/heat-viewer.ts"],
          target: "browser",
          format: "esm",
          minify: false,
          external: [
            // Exclude server-side dependencies
            "bun",
            "../api/helpers",
            "../api/routes",
            "../api/websocket",
          ],
        });

        if (result.success && result.outputs.length > 0) {
          const output = result.outputs[0];
          const code = await output.text();
          return new Response(code, {
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
              ...corsHeaders,
            },
          });
        }
      } catch (error) {
        console.error("Error building viewer component:", error);
      }
      return new Response("Error building component", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Serve example HTML page
    if (url.pathname.startsWith("/viewer")) {
      const html = Bun.file("src/viewer/index.html");
      if (await html.exists()) {
        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...corsHeaders,
          },
        });
      }
    }

    // Serve SolidJS app from /app route
    else {
      const pathname =
        url.pathname === "" || url.pathname === "/"
          ? "/index.html"
          : url.pathname.replace("/app", "");

      const file = Bun.file(`dist${pathname}`);

      if (await file.exists()) {
        const contentType = getContentType(pathname);
        return new Response(file, {
          headers: {
            "Content-Type": contentType,
            ...corsHeaders,
          },
        });
      }

      // Fallback to index.html for client-side routing
      const indexFile = Bun.file("dist/index.html");
      if (await indexFile.exists()) {
        return new Response(indexFile, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...corsHeaders,
          },
        });
      }
    }

    // This will be called if no route matches
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
  websocket: {
    message(ws, message) {
      const heatId = ws.data?.heatId;
      const isHeadJudge = ws.data?.isHeadJudge;
      if (heatId && typeof message === "string") {
        if (isHeadJudge) {
          handleHeadJudgeWebSocketMessage(heatId, ws, message);
        } else {
          handleWebSocketMessage(heatId, ws, message);
        }
      }
    },
    open(ws) {
      const heatId = ws.data?.heatId;
      const isHeadJudge = ws.data?.isHeadJudge;
      if (heatId) {
        if (isHeadJudge) {
          addHeadJudgeConnection(heatId, ws);
        } else {
          addConnection(heatId, ws);
        }
      }
    },
    close(ws) {
      const heatId = ws.data?.heatId;
      const isHeadJudge = ws.data?.isHeadJudge;
      if (heatId) {
        if (isHeadJudge) {
          removeHeadJudgeConnection(heatId, ws);
        } else {
          removeConnection(heatId, ws);
        }
      }
    },
  },
});

console.log(`Server running at http://localhost:${port}`);
