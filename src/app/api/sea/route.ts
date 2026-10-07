import { cacheLife } from "next/cache";

/**
 * The Java Sea just off Jakarta, the nearest coast to Bekasi, from Open-Meteo's marine API
 * (free, no key). Cached for 30 minutes, so every visitor shares one upstream call. If the
 * upstream fails, the widget falls back to a calm sea and says so.
 */

export type SeaState = {
  ok: boolean;
  waveHeight: number | null; // metres
  wavePeriod: number | null; // seconds
  waveDirection: number | null; // degrees, where the waves come from
  waterTemperature: number | null; // °C
  fetchedAt: string;
};

/** Teluk Jakarta, about 30 km north-west of Bekasi. */
const SPOT = { lat: -6.0, lon: 106.85 };

async function getSea(): Promise<SeaState> {
  "use cache";
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${SPOT.lat}&longitude=${SPOT.lon}` +
    `&current=wave_height,wave_period,wave_direction,sea_surface_temperature&timezone=Asia%2FJakarta`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      current?: { wave_height?: number; wave_period?: number; wave_direction?: number; sea_surface_temperature?: number; time?: string };
    };
    const sea: SeaState = {
      ok: typeof data.current?.wave_height === "number",
      waveHeight: data.current?.wave_height ?? null,
      wavePeriod: data.current?.wave_period ?? null,
      waveDirection: data.current?.wave_direction ?? null,
      waterTemperature: data.current?.sea_surface_temperature ?? null,
      fetchedAt: data.current?.time ?? "",
    };
    cacheLife({ stale: 600, revalidate: 1800, expire: 7200 });
    return sea;
  } catch {
    // Don't keep a failure around: try again soon.
    cacheLife("seconds");
    return { ok: false, waveHeight: null, wavePeriod: null, waveDirection: null, waterTemperature: null, fetchedAt: "" };
  }
}

export async function GET() {
  const sea = await getSea();
  return Response.json(sea, {
    headers: { "cache-control": sea.ok ? "public, max-age=600, stale-while-revalidate=1800" : "no-store" },
  });
}
