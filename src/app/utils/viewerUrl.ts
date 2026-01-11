export function getViewerUrl(heatId: string): string {
  // In development, viewer is served from port 3000 (backend server)
  // In production, it's served from the same server as the app
  const baseUrl = import.meta.env.DEV ? "http://localhost:3000" : "";
  return `${baseUrl}/viewer/${heatId}`;
}
