"use client";

import { identity } from "@/content/profile";
import { useNow } from "@/lib/hooks";

/*
 * The small things on her desk, all original and all from the sea: a round seal pup hugging a desk
 * clock, a whale plush and a jellyfish keychain on a ball chain. (Her own references were licensed
 * characters; these keep their shape and softness without borrowing anyone's character.)
 */

function bekasiTime(date: Date): { h: number; m: number; label: string } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: identity.timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { h, m, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

/** A round white seal pup hugging a desk clock that keeps Bekasi time. */
export function SealClock() {
  const now = useNow();
  const t = now ? bekasiTime(new Date(now * 1000)) : { h: 10, m: 10, label: "" };
  const minute = t.m * 6;
  const hour = (t.h % 12) * 30 + t.m * 0.5;
  return (
    <svg className="seal" viewBox="0 0 120 116" role="img" aria-label={t.label ? `Desk clock, a seal pup: ${t.label} in ${identity.city}` : `Desk clock, a seal pup, on ${identity.city} time`}>
      <defs>
        <radialGradient id="seal-body" cx="40%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".7" stopColor="#EEF4FA" />
          <stop offset="1" stopColor="#CFDDEB" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="110" rx="44" ry="5" fill="rgba(8,40,80,.12)" />
      <path d="M60 14c30 0 50 22 50 50 0 30-20 44-50 44S10 94 10 64c0-28 20-50 50-50Z" fill="url(#seal-body)" />
      <ellipse cx="36" cy="58" rx="7" ry="4.5" fill="#FFB4A6" opacity=".55" />
      <ellipse cx="84" cy="58" rx="7" ry="4.5" fill="#FFB4A6" opacity=".55" />
      <circle cx="44" cy="48" r="4.6" fill="#0B1F33" />
      <circle cx="76" cy="48" r="4.6" fill="#0B1F33" />
      <circle cx="45.6" cy="46.4" r="1.5" fill="#FFFFFF" />
      <circle cx="77.6" cy="46.4" r="1.5" fill="#FFFFFF" />
      <ellipse cx="60" cy="55" rx="3.4" ry="2.3" fill="#0B1F33" />
      <path d="M55 60c1.6 2 3.4 2 5 0 1.6 2 3.4 2 5 0" stroke="#0B1F33" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <g fill="#9AAABB">
        <circle cx="50" cy="60" r=".9" />
        <circle cx="47" cy="63" r=".9" />
        <circle cx="70" cy="60" r=".9" />
        <circle cx="73" cy="63" r=".9" />
      </g>
      {/* The clock, held against her tummy. */}
      <circle cx="60" cy="86" r="20" fill="#FFFFFF" stroke="#8FD3FA" strokeWidth="3.4" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M60 69.5v3" stroke={i % 3 === 0 ? "#0A58BE" : "#BFD6EA"} strokeWidth={i % 3 === 0 ? 2 : 1.4} strokeLinecap="round" transform={`rotate(${i * 30} 60 86)`} />
      ))}
      <path d="M60 86V76.5" stroke="#0B1F33" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${hour} 60 86)`} />
      <path d="M60 86V72" stroke="#1A8FE8" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${minute} 60 86)`} />
      <circle cx="60" cy="86" r="2" fill="#0B1F33" />
      <ellipse cx="38" cy="90" rx="9" ry="6" fill="url(#seal-body)" transform="rotate(-30 38 90)" />
      <ellipse cx="82" cy="90" rx="9" ry="6" fill="url(#seal-body)" transform="rotate(30 82 90)" />
    </svg>
  );
}

/** A soft whale plush, with a stitched belly and a little spout. */
export function WhalePlush() {
  return (
    <svg className="whale" viewBox="0 0 150 104" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="whale-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD3FA" />
          <stop offset="1" stopColor="#2B95F0" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="98" rx="56" ry="5" fill="rgba(8,40,80,.12)" />
      <path d="M118 62c8-6 12-18 22-22-2 10-4 16-10 22 8 0 12 4 14 10-10 0-18-2-26-6Z" fill="#1A8FE8" />
      <path d="M14 66c0-26 22-40 52-40 32 0 56 16 56 40s-24 30-56 30S14 90 14 66Z" fill="url(#whale-body)" />
      <path d="M22 74c10 12 30 18 48 18s38-4 48-14c-14 4-30 6-48 6S34 82 22 74Z" fill="#EAF6FF" />
      <path d="M24 75c14 9 30 13 46 13s32-3 46-11" stroke="rgba(10,88,190,.35)" strokeWidth="1.4" strokeDasharray="3 3" fill="none" />
      <path d="M30 36c16-8 46-10 66-2" stroke="rgba(255,255,255,.45)" strokeWidth="1.4" strokeDasharray="3 3" fill="none" />
      <circle cx="36" cy="60" r="3.4" fill="#0B1F33" />
      <circle cx="37.2" cy="58.8" r="1.1" fill="#FFFFFF" />
      <ellipse cx="32" cy="69" rx="5.5" ry="3.2" fill="#FFB4A6" opacity=".7" />
      <path d="M60 80c4 8 12 10 18 8-4-2-8-6-10-10Z" fill="#2B95F0" />
      <path d="M50 24c-2-8 2-14 4-18M54 24c2-7 8-10 12-11" stroke="#7FD7FF" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** A jellyfish plush on a ball chain, hanging off the monitor and swaying. */
export function JellyKeychain() {
  return (
    <svg className="jelly" viewBox="0 0 60 150" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="jelly-dome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D6F6FF" />
          <stop offset="1" stopColor="#5ED0E6" />
        </linearGradient>
      </defs>
      <path d="M30 0v66" stroke="#B9C6D3" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="0 6.5" />
      <circle cx="30" cy="72" r="5" fill="none" stroke="#B9C6D3" strokeWidth="2.2" />
      <path d="M16 112c0 8 2 18-2 26M25 113c0 10 3 16 0 28M35 113c0 10-3 16 0 28M44 112c0 8-2 18 2 26" stroke="#7FD7FF" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M8 110c0-16 10-30 22-30s22 14 22 30c-4 4-8 4-11 2-3 3-8 3-11 0-3 3-8 3-11 0-3 2-7 2-11-2Z" fill="url(#jelly-dome)" />
      <ellipse cx="22" cy="90" rx="5" ry="3" fill="#FFFFFF" opacity=".6" />
      <circle cx="23" cy="100" r="2.2" fill="#0B1F33" />
      <circle cx="37" cy="100" r="2.2" fill="#0B1F33" />
      <ellipse cx="18" cy="105" rx="3.2" ry="2" fill="#FFB4A6" opacity=".75" />
      <ellipse cx="42" cy="105" rx="3.2" ry="2" fill="#FFB4A6" opacity=".75" />
    </svg>
  );
}
