import type { BunRequest } from "bun";
import {
  handleAddJumpScore,
  handleAddWaveScore,
  handleCreateHeat,
  handleGetHeat,
  handleListHeats,
} from "./src/api/routes.js";
import { addConnection, handleWebSocketMessage, removeConnection } from "./src/api/websocket.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function addCorsHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

Bun.serve<{ heatId: string }>({
  port,
  routes: {
    // Handle CORS preflight
    "/api/*": {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },

    // POST /api/heats - Create heat
    "/api/heats": {
      POST: async (request: BunRequest) => {
        return addCorsHeaders(await handleCreateHeat(request));
      },
      GET: async () => {
        return addCorsHeaders(await handleListHeats());
      },
    },

    // GET /api/heats/:heatId - Get heat state
    "/api/heats/:heatId": {
      GET: async (request: BunRequest) => {
        return addCorsHeaders(await handleGetHeat(request.params.heatId));
      },
    },

    // POST /api/heats/:heatId/scores/wave - Add wave score
    "/api/heats/:heatId/scores/wave": {
      POST: async (request: BunRequest) => {
        return addCorsHeaders(await handleAddWaveScore(request));
      },
    },

    // POST /api/heats/:heatId/scores/jump - Add jump score
    "/api/heats/:heatId/scores/jump": {
      POST: async (request: BunRequest) => {
        return addCorsHeaders(await handleAddJumpScore(request));
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
  fetch(_request, _server) {
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
