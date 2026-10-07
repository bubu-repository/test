/**
 * Lite mode for cheap phones and metered data: true when the browser asks to save data, prefers
 * reduced data, or reports 2 GB of memory or less. Heavy extras (the WebGL sky) stay still images.
 */
export function isLiteDevice(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return true;
  return window.matchMedia?.("(prefers-reduced-data: reduce)").matches ?? false;
}
