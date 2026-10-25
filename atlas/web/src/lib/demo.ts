/** True in the browser-only demo build (`npm run build:demo`): no server, sample data, nothing leaves the browser. */
export const DEMO = import.meta.env.VITE_DEMO === "1";

/** URL for an uploaded asset; in the demo, assets live as data/blob URLs. */
export function assetUrl(a: { id: number; demo_url?: string }, download = false) {
  if (DEMO) return a.demo_url ?? "";
  return `/api/assets/${a.id}/file${download ? "?download=1" : ""}`;
}
