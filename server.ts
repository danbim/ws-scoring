import {
  handleCreateHeat,
  handleAddWaveScore,
  handleAddJumpScore,
  handleGetHeat,
  handleListHeats,
} from "./src/api/routes.js";
import {
  addConnection,
  removeConnection,
  handleWebSocketMessage,
} from "./src/api/websocket.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function addCorsHeaders(
  response: Response,
  headers: Record<string, string>
): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
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
      POST: async (request) => {
        try {
          const response = await handleCreateHeat(request);
          return addCorsHeaders(response, corsHeaders);
        } catch (error) {
          console.error("Error handling request:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      },
      GET: async () => {
        try {
          const response = await handleListHeats();
          return addCorsHeaders(response, corsHeaders);
        } catch (error) {
          console.error("Error handling request:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      },
    },

    // GET /api/heats/:heatId - Get heat state
    "/api/heats/:heatId": {
      GET: async (request) => {
        try {
          const heatId = (request as { params?: { heatId?: string } }).params
            ?.heatId;
          if (!heatId) {
            return new Response(
              JSON.stringify({ error: "Heat ID required" }),
              {
                status: 400,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              }
            );
          }
          const response = await handleGetHeat(heatId);
          return addCorsHeaders(response, corsHeaders);
        } catch (error) {
          console.error("Error handling request:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      },
    },

    // POST /api/heats/:heatId/scores/wave - Add wave score
    "/api/heats/:heatId/scores/wave": {
      POST: async (request) => {
        try {
          const heatId = (request as { params?: { heatId?: string } }).params
            ?.heatId;
          if (!heatId) {
            return new Response("Heat ID required", {
              status: 400,
              headers: corsHeaders,
            });
          }
          const response = await handleAddWaveScore(request, heatId);
          return addCorsHeaders(response, corsHeaders);
        } catch (error) {
          console.error("Error handling request:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      },
    },

    // POST /api/heats/:heatId/scores/jump - Add jump score
    "/api/heats/:heatId/scores/jump": {
      POST: async (request) => {
        try {
          const heatId = (request as { params?: { heatId?: string } }).params
            ?.heatId;
          if (!heatId) {
            return new Response("Heat ID required", {
              status: 400,
              headers: corsHeaders,
            });
          }
          const response = await handleAddJumpScore(request, heatId);
          return addCorsHeaders(response, corsHeaders);
        } catch (error) {
          console.error("Error handling request:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      },
    },

    // WebSocket upgrade for /api/heats/:heatId/stream
    "/api/heats/:heatId/stream": async (request, server) => {
      if (request.headers.get("upgrade") === "websocket") {
        const heatId = (request as { params?: { heatId?: string } }).params
          ?.heatId;
        if (!heatId) {
          return new Response("Heat ID required", { status: 400 });
        }
        const success = server.upgrade(request, {
          data: { heatId },
        });
        if (success) {
          return undefined; // Handled by websocket handler
        }
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    },
  },
  fetch(request, server) {
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
