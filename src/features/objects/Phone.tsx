"use client";

import { MociAvatar } from "@/components/MociAvatar";
import { identity } from "@/content/profile";
import { projects } from "@/content/projects";
import { dispatch } from "@/lib/actions";
import { useNow } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { formatTime, probableStatus } from "@/lib/time";
import { SkyCanvas } from "../sky/SkyCanvas";
import { describeWeather, useWeather } from "../widgets/weather";

/**
 * A phone left on the desk, showing a lock screen: Bekasi's live sky (the WebGL shader, clouds
 * from the real weather), the time and date there, two notifications from Moci, and one button
 * that "unlocks" it, which starts the 40-second tour.
 */
export function Phone() {
  const now = useNow();
  const weather = useWeather();
  const date = now ? new Date(now * 1000) : null;
  const w = describeWeather(weather?.code ?? null);
  const status = date ? probableStatus(date) : null;

  return (
    <div className="phone w-[206px] select-none">
      <div className="phone__screen sky-stage">
        <SkyCanvas />
        <div className="relative z-10 flex h-full flex-col items-center px-3 pt-3 pb-3 text-center">
          <span className="phone__island" aria-hidden="true" />
          <p className="mt-5 text-[11px] font-semibold">
            {date ? new Intl.DateTimeFormat("en-GB", { timeZone: identity.timeZone, weekday: "long", day: "numeric", month: "long" }).format(date) : "Bekasi"}
          </p>
          <p className="text-[58px] leading-[0.95] font-semibold tracking-[-0.05em] tabular-nums [font-stretch:85%]">{date ? formatTime(identity.timeZone, date) : "--:--"}</p>
          <p className="mt-1 text-[10px] font-medium">
            {identity.city} · {weather?.ok ? `${Math.round(weather.temperature ?? 0)}° ${w.label}` : "the sky, live"}
          </p>

          <div className="mt-auto w-full space-y-1.5 text-left">
            <div className="phone__note">
              <MociAvatar size={18} />
              <span className="min-w-0">
                <span className="block text-[9px] font-semibold">Moci · now</span>
                <span className="block truncate text-[10px]">{projects.length} case studies are ready for you</span>
              </span>
            </div>
            <div className="phone__note">
              <span className="led shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[9px] font-semibold">Adelia, probably</span>
                <span className="block truncate text-[10px]">{status ? status.label : "…"}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            className="phone__unlock js-only mt-2.5"
            onClick={() => {
              sfx.whoosh();
              void dispatch({ type: "tour" });
            }}
            data-cursor="Enter"
          >
            Tap to enter · 40s tour
          </button>
        </div>
      </div>
    </div>
  );
}
