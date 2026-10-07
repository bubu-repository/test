import { cacheLife } from "next/cache";
import { identity } from "@/content/profile";

/**
 * Bekasi's sky right now, from Open-Meteo (free, no key). Cached for 15 minutes, so every
 * visitor shares one upstream call. If the upstream fails, the widget shows a friendly fallback.
 */

export type Weather = {
  ok: boolean;
  temperature: number | null;
  code: number | null;
  isDay: boolean;
  humidity: number | null;
  cloudCover: number | null;
  wind: number | null;
  sunrise: string | null;
  sunset: string | null;
  fetchedAt: string;
};

async function getWeather(): Promise<Weather> {
  "use cache";
  const { lat, lon } = identity.coords;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day,relative_humidity_2m,wind_speed_10m,cloud_cover` +
    `&daily=sunrise,sunset&forecast_days=1&timezone=${encodeURIComponent(identity.timeZone)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number; is_day?: number; relative_humidity_2m?: number; wind_speed_10m?: number; cloud_cover?: number; time?: string };
      daily?: { sunrise?: string[]; sunset?: string[] };
    };
    const weather: Weather = {
      ok: true,
      temperature: data.current?.temperature_2m ?? null,
      code: data.current?.weather_code ?? null,
      isDay: data.current?.is_day === 1,
      humidity: data.current?.relative_humidity_2m ?? null,
      cloudCover: data.current?.cloud_cover ?? null,
      wind: data.current?.wind_speed_10m ?? null,
      sunrise: data.daily?.sunrise?.[0] ?? null,
      sunset: data.daily?.sunset?.[0] ?? null,
      fetchedAt: data.current?.time ?? "",
    };
    cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
    return weather;
  } catch {
    // Don't keep a failure around: try again soon.
    cacheLife("seconds");
    return { ok: false, temperature: null, code: null, isDay: true, humidity: null, cloudCover: null, wind: null, sunrise: null, sunset: null, fetchedAt: "" };
  }
}

export async function GET() {
  const weather = await getWeather();
  return Response.json(weather, {
    headers: { "cache-control": weather.ok ? "public, max-age=300, stale-while-revalidate=900" : "no-store" },
  });
}
