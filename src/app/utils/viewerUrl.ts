export function getViewerUrl(heatId: string): string {
  const baseUrl = import.meta.env.DEV ? `http://localhost:${import.meta.env.VITE_API_PORT}` : "";
  return `${baseUrl}/viewer/${heatId}`;
}
