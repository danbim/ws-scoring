export function getWebSocketUrl(path: string): string {
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const apiPort = import.meta.env.VITE_API_PORT || "3000";
    return `${protocol}//localhost:${apiPort}${path}`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}
