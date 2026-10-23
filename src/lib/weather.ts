/* ==========================================================================
   Live weather (Open-Meteo, no API key) for Adelia's room in Bekasi.
   Bekasi shares Jakarta's time zone (Asia/Jakarta, WIB).
   Drives the window (sky, rain, sun angle), the ambience and the panel.
   ========================================================================== */
import { create } from 'zustand';

export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'storm' | 'snow';

export interface CityWeather {
  city: string;
  tz: string;
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  code: number;
  kind: WeatherKind;
  label: string;
  isDay: boolean;
  sunrise?: string;
  sunset?: string;
  hourly: { time: string; temp: number; code: number }[];
  live: boolean; // false when using fallback
  updatedAt: number;
}

export const HOME = { city: 'Bekasi', tz: 'Asia/Jakarta', lat: -6.2383, lon: 106.9756 } as const;
export const TZ = HOME.tz;

export function describe(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: 'clear', label: 'Clear sky' };
  if (code <= 2) return { kind: 'clear', label: 'Partly cloudy' };
  if (code === 3) return { kind: 'cloudy', label: 'Overcast' };
  if (code === 45 || code === 48) return { kind: 'fog', label: 'Haze & fog' };
  if (code >= 51 && code <= 57) return { kind: 'drizzle', label: 'Drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { kind: 'rain', label: code >= 65 || code === 82 ? 'Heavy rain' : 'Rain' };
  if (code >= 71 && code <= 77) return { kind: 'snow', label: 'Snow' };
  if (code >= 85 && code <= 86) return { kind: 'snow', label: 'Snow showers' };
  if (code >= 95) return { kind: 'storm', label: 'Thunderstorm' };
  return { kind: 'cloudy', label: 'Cloudy' };
}

/** Hour (0–24, fractional) in a timezone. */
export function hourIn(tz: string = TZ, d = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (get('hour') % 24) + get('minute') / 60 + get('second') / 3600;
}

function fallback(): CityWeather {
  const c = HOME;
  const h = hourIn(c.tz);
  const isDay = h >= 6 && h < 18.3;
  const code = 2;
  return {
    city: c.city,
    tz: c.tz,
    temp: isDay ? 31 : 27,
    feels: isDay ? 36 : 30,
    humidity: 74,
    wind: 9,
    code,
    ...describe(code),
    isDay,
    hourly: [],
    live: false,
    updatedAt: Date.now(),
  };
}

async function fetchHome(): Promise<CityWeather> {
  const c = HOME;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day` +
    `&hourly=temperature_2m,weather_code&daily=sunrise,sunset&forecast_days=2&timezone=${encodeURIComponent(c.tz)}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const cur = j.current;
    const nowIso = j.current.time as string;
    const startIdx = Math.max(0, (j.hourly.time as string[]).findIndex((t) => t >= nowIso.slice(0, 13)));
    const hourly = (j.hourly.time as string[]).slice(startIdx, startIdx + 12).map((time, i) => ({
      time,
      temp: j.hourly.temperature_2m[startIdx + i],
      code: j.hourly.weather_code[startIdx + i],
    }));
    return {
      city: c.city,
      tz: c.tz,
      temp: cur.temperature_2m,
      feels: cur.apparent_temperature,
      humidity: cur.relative_humidity_2m,
      wind: cur.wind_speed_10m,
      code: cur.weather_code,
      ...describe(cur.weather_code),
      isDay: cur.is_day === 1,
      sunrise: j.daily?.sunrise?.[0],
      sunset: j.daily?.sunset?.[0],
      hourly,
      live: true,
      updatedAt: Date.now(),
    };
  } finally {
    clearTimeout(to);
  }
}

interface WeatherState {
  home: CityWeather;
  /** dev/admin override for previewing the window in every condition */
  override: WeatherKind | null;
  setOverride: (k: WeatherKind | null) => void;
  refresh: () => Promise<void>;
}

export const useWeather = create<WeatherState>((set, get) => ({
  home: fallback(),
  override: null,
  setOverride: (override) => set({ override }),
  refresh: async () => {
    try {
      set({ home: await fetchHome() });
    } catch {
      set({ home: fallback() });
    }
  },
}));

let started = false;
export function startWeather() {
  if (started) return;
  started = true;
  void useWeather.getState().refresh();
  setInterval(() => void useWeather.getState().refresh(), 10 * 60 * 1000);
}

/** The weather that drives the room (Bekasi, unless overridden). */
export function roomWeather(): { kind: WeatherKind; isDay: boolean; hour: number } {
  const s = useWeather.getState();
  const hour = hourIn(TZ);
  return { kind: s.override ?? s.home.kind, isDay: s.home.live ? s.home.isDay : hour >= 6 && hour < 18.3, hour };
}

export function formatTime(tz: string = TZ, d = new Date(), seconds = false) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hour12: false }).format(d);
}

export function formatDate(tz: string = TZ, d = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}
