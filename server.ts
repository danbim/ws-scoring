import type { BunRequest } from "bun";
import { withAuth, withRoleAuth } from "./src/api/helpers.js";
import { handleGetMe, handleLogin, handleLogout } from "./src/api/routes/auth.js";
import {
  handleCreateBracket,
  handleCreateContest,
  handleCreateDivision,
  handleCreateSeason,
  handleDeleteBracket,
  handleDeleteContest,
  handleDeleteDivision,
  handleDeleteSeason,
  handleGetBracket,
  handleGetContest,
  handleGetDivision,
  handleGetSeason,
  handleListBrackets,
  handleListContests,
  handleListDivisions,
  handleListSeasons,
  handleUpdateBracket,
  handleUpdateContest,
  handleUpdateDivision,
  handleUpdateSeason,
} from "./src/api/routes/contest-routes.js";
import {
  handleAddJumpScore,
  handleAddWaveScore,
  handleCreateHeat,
  handleGetHeat,
  handleGetHeatViewer,
  handleListHeats,
} from "./src/api/routes.js";
import { addConnection, handleWebSocketMessage, removeConnection } from "./src/api/websocket.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// CORS configuration
// Allow both the Bun server and Vite dev server origins
const defaultAllowedOrigin = "http://localhost:3000";
const viteDevOrigin = "http://localhost:5173";
const allowedOrigin =
  process.env.CORS_ALLOWED_ORIGIN && process.env.CORS_ALLOWED_ORIGIN.trim().length > 0
    ? process.env.CORS_ALLOWED_ORIGIN.trim()
    : defaultAllowedOrigin;

// Build a whitelist of allowed origins
// In development, allow both the configured origin and Vite dev server
// In production, only allow the configured origin
const isDevelopment = process.env.NODE_ENV !== "production";
const allowedOrigins = new Set<string>([allowedOrigin]);
if (isDevelopment) {
  allowedOrigins.add(viteDevOrigin);
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

function addCorsHeaders(response: Response, request?: BunRequest): Response {
  // Validate request origin against whitelist
  const requestOrigin = request?.headers.get("origin");
  const isOriginAllowed = requestOrigin && allowedOrigins.has(requestOrigin);
  // Note: We set allowedOrigin as fallback rather than rejecting the request entirely.
  // This follows standard CORS behavior where the browser enforces the origin check.
  // By responding with the configured origin, browsers will block the response for
  // unauthorized origins, while legitimate requests without origin headers still work.
  const originHeader = isOriginAllowed ? requestOrigin : allowedOrigin;

  // Log security violation for monitoring (sanitize origin to prevent log injection)
  if (requestOrigin && !isOriginAllowed) {
    const sanitizedOrigin = requestOrigin.replace(/[\r\n]/g, "");
    console.warn(`[SECURITY] Unauthorized origin attempted: ${sanitizedOrigin}`);
  }

  response.headers.set("Access-Control-Allow-Origin", originHeader);
  response.headers.set("Access-Control-Allow-Methods", corsHeaders["Access-Control-Allow-Methods"]);
  response.headers.set("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"]);
  response.headers.set(
    "Access-Control-Allow-Credentials",
    corsHeaders["Access-Control-Allow-Credentials"]
  );
  return response;
}

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

Bun.serve<{ heatId: string }>({
  port,
  routes: {
    // Handle CORS preflight
    "/api/*": {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },

    // Authentication endpoints (public)
    "/api/auth/login": {
      POST: async (request: BunRequest) => {
        const loginResponse = await handleLogin(request);
        return addCorsHeaders(loginResponse, request);
      },
    },
    "/api/auth/logout": {
      POST: async (request: BunRequest) => {
        return addCorsHeaders(await handleLogout(request), request);
      },
    },
    "/api/auth/me": {
      GET: async (request: BunRequest) => {
        return addCorsHeaders(await handleGetMe(request), request);
      },
    },

    // POST /api/heats - Create heat (protected)
    "/api/heats": {
      POST: async (request: BunRequest) => {
        const response = await withAuth(request, (req) => handleCreateHeat(req));
        return addCorsHeaders(response, request);
      },
      GET: async (request: BunRequest) => {
        const response = await withAuth(request, () => handleListHeats());
        return addCorsHeaders(response, request);
      },
    },

    // GET /api/heats/:heatId - Get heat state (protected)
    "/api/heats/:heatId": {
      GET: async (request: BunRequest) => {
        const response = await withAuth(request, () => handleGetHeat(request.params.heatId));
        return addCorsHeaders(response, request);
      },
    },

    // GET /api/heats/:heatId/viewer - Get heat viewer state (public)
    "/api/heats/:heatId/viewer": {
      GET: async (request: BunRequest) => {
        return addCorsHeaders(await handleGetHeatViewer(request.params.heatId), request);
      },
    },

    // POST /api/heats/:heatId/scores/wave - Add wave score (protected)
    "/api/heats/:heatId/scores/wave": {
      POST: async (request: BunRequest) => {
        const response = await withAuth(request, (req) => handleAddWaveScore(req));
        return addCorsHeaders(response, request);
      },
    },

    // POST /api/heats/:heatId/scores/jump - Add jump score (protected)
    "/api/heats/:heatId/scores/jump": {
      POST: async (request: BunRequest) => {
        const response = await withAuth(request, (req) => handleAddJumpScore(req));
        return addCorsHeaders(response, request);
      },
    },

    // Seasons endpoints
    "/api/seasons": {
      POST: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], (req) =>
          handleCreateSeason(req)
        );
        return addCorsHeaders(response, request);
      },
      GET: async (request: BunRequest) => {
        const response = await withAuth(request, () => handleListSeasons());
        return addCorsHeaders(response, request);
      },
    },
    "/api/seasons/:seasonId": {
      GET: async (request: BunRequest) => {
        const response = await withAuth(request, () => handleGetSeason(request.params.seasonId));
        return addCorsHeaders(response, request);
      },
      PUT: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], (req) =>
          handleUpdateSeason(request.params.seasonId, req)
        );
        return addCorsHeaders(response, request);
      },
      DELETE: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], () =>
          handleDeleteSeason(request.params.seasonId)
        );
        return addCorsHeaders(response, request);
      },
    },

    // Contests endpoints
    "/api/contests": {
      POST: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], (req) =>
          handleCreateContest(req)
        );
        return addCorsHeaders(response, request);
      },
      GET: async (request: BunRequest) => {
        const url = new URL(request.url);
        const seasonId = url.searchParams.get("seasonId") || undefined;
        const response = await withAuth(request, () => handleListContests(seasonId));
        return addCorsHeaders(response, request);
      },
    },
    "/api/contests/:contestId": {
      GET: async (request: BunRequest) => {
        const response = await withAuth(request, () => handleGetContest(request.params.contestId));
        return addCorsHeaders(response, request);
      },
      PUT: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], (req) =>
          handleUpdateContest(request.params.contestId, req)
        );
        return addCorsHeaders(response, request);
      },
      DELETE: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], () =>
          handleDeleteContest(request.params.contestId)
        );
        return addCorsHeaders(response, request);
      },
    },

    // Divisions endpoints
    "/api/divisions": {
      POST: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], (req) =>
          handleCreateDivision(req)
        );
        return addCorsHeaders(response, request);
      },
      GET: async (request: BunRequest) => {
        const url = new URL(request.url);
        const contestId = url.searchParams.get("contestId") || undefined;
        const response = await withAuth(request, () => handleListDivisions(contestId));
        return addCorsHeaders(response, request);
      },
    },
    "/api/divisions/:divisionId": {
      GET: async (request: BunRequest) => {
        const response = await withAuth(request, () =>
          handleGetDivision(request.params.divisionId)
        );
        return addCorsHeaders(response, request);
      },
      PUT: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], (req) =>
          handleUpdateDivision(request.params.divisionId, req)
        );
        return addCorsHeaders(response, request);
      },
      DELETE: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], () =>
          handleDeleteDivision(request.params.divisionId)
        );
        return addCorsHeaders(response, request);
      },
    },

    // Brackets endpoints
    "/api/brackets": {
      POST: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], (req) =>
          handleCreateBracket(req)
        );
        return addCorsHeaders(response, request);
      },
      GET: async (request: BunRequest) => {
        const url = new URL(request.url);
        const divisionId = url.searchParams.get("divisionId") || undefined;
        const response = await withAuth(request, () => handleListBrackets(divisionId));
        return addCorsHeaders(response, request);
      },
    },
    "/api/brackets/:bracketId": {
      GET: async (request: BunRequest) => {
        const response = await withAuth(request, () => handleGetBracket(request.params.bracketId));
        return addCorsHeaders(response, request);
      },
      PUT: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], (req) =>
          handleUpdateBracket(request.params.bracketId, req)
        );
        return addCorsHeaders(response, request);
      },
      DELETE: async (request: BunRequest) => {
        const response = await withRoleAuth(request, ["administrator", "head_judge"], () =>
          handleDeleteBracket(request.params.bracketId)
        );
        return addCorsHeaders(response, request);
      },
    },

    // WebSocket upgrade for /api/heats/:heatId/stream
    "/api/heats/:heatId/stream": async (
      request: BunRequest,
      server: Bun.Server<{ heatId: string }>
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
  },
  async fetch(request: BunRequest, _server) {
    const url = new URL(request.url);

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
            "@event-driven-io/emmett",
            "../infrastructure/eventStore",
            "../api/helpers",
            "../api/routes",
            "../api/websocket",
            "../domain/heat/decider",
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
    if (url.pathname === "/viewer" || url.pathname === "/viewer/") {
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
    if (url.pathname.startsWith("/app")) {
      const pathname =
        url.pathname === "/app" || url.pathname === "/app/"
          ? "/app/index.html"
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
      if (heatId && typeof message === "string") {
        handleWebSocketMessage(heatId, ws, message);
      }
    },
    open(ws) {
      const heatId = ws.data?.heatId;
      if (heatId) {
        addConnection(heatId, ws);
      }
    },
    close(ws) {
      const heatId = ws.data?.heatId;
      if (heatId) {
        removeConnection(heatId, ws);
      }
    },
  },
});

console.log(`Server running at http://localhost:${port}`);
