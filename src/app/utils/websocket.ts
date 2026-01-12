// WebSocket URL utility
// In development with Vite (port 5173), WebSocket proxy doesn't work reliably
// So we connect directly to the Bun server on port 3000
// In production (or when accessed directly on port 3000), use the same host

export function getWebSocketUrl(path: string): string {
  const isDevelopment = import.meta.env.DEV;
  const isViteDevServer = isDevelopment && window.location.port === "5173";

  if (isViteDevServer) {
    // In development on Vite port, connect directly to Bun server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//localhost:3000${path}`;
  }

  // In production or when accessed directly on port 3000, use same host
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}${path}`;
}
