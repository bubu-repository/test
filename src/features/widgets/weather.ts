"use client";

import { useEffect, useState } from "react";
import type { Weather } from "@/app/api/weather/route";

/** WMO weather codes → words, for the Bekasi sky widget. */
export function describeWeather(code: number | null): { label: string; kind: "clear" | "cloud" | "rain" | "storm" | "fog" } {
  if (code === null) return { label: "Sky unknown", kind: "cloud" };
  if (code === 0) return { label: "Clear sky", kind: "clear" };
  if (code <= 2) return { label: "Partly cloudy", kind: "cloud" };
  if (code === 3) return { label: "Overcast", kind: "cloud" };
  if (code <= 48) return { label: "Hazy", kind: "fog" };
  if (code <= 57) return { label: "Drizzle", kind: "rain" };
  if (code <= 67) return { label: "Rain", kind: "rain" };
  if (code <= 82) return { label: "Rain showers", kind: "rain" };
  if (code <= 99) return { label: "Thunderstorm", kind: "storm" };
  return { label: "Weather", kind: "cloud" };
}

let cache: Promise<Weather | null> | null = null;

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  useEffect(() => {
    cache ??= fetch("/api/weather")
      .then((r) => (r.ok ? (r.json() as Promise<Weather>) : null))
      .catch(() => null);
    let alive = true;
    void cache.then((w) => alive && setWeather(w));
    return () => {
      alive = false;
    };
  }, []);
  return weather;
}
