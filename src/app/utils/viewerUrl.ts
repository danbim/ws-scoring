export function getViewerUrl(heatId: string): string {
  const baseUrl = import.meta.env.DEV
    ? `http://localhost:${import.meta.env.VITE_API_PORT || "3000"}`
    : "";
  return `${baseUrl}/viewer/${heatId}`;
}
