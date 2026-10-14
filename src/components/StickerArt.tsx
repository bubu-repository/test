import type { ReactNode } from "react";

/*
 * The sticker illustrations: flat colour, a darker outline in the same hue and one highlight, each
 * drawn in a 100×100 box and kept inside 12–88 so the die-cut edge (added by a filter in Sticker)
 * has room. One per sticker id.
 */

const NAVY = "#1D2A4D";
const GRAPHITE = "#2B2D34";
const PINK = "#FF7EB6";
const PINK_DEEP = "#C2286F";
const BLUE = "#499FE3";
const BLUE_DEEP = "#1260C9";
const YELLOW = "#F4CC64";
const YELLOW_DEEP = "#D99A00";
const GREEN = "#4FB772";
const GREEN_DEEP = "#3A965C";
const PURPLE = "#8968D4";
const PURPLE_DEEP = "#5B2DD1";

const spark = (x: number, y: number, r: number, fill = "#FFFFFF") => (
  <path
    d={`M${x} ${y - r}l${r * 0.28} ${r * 0.72} ${r * 0.72} ${r * 0.28}-${r * 0.72} ${r * 0.28}-${r * 0.28} ${r * 0.72}-${r * 0.28}-${r * 0.72}-${r * 0.72}-${r * 0.28} ${r * 0.72}-${r * 0.28}Z`}
    fill={fill}
  />
);

export const STICKER_ART: Record<string, ReactNode> = {
  // "HI!" in fat pink letters, like a text sticker.
  hello: (
    <g transform="rotate(-8 50 50)">
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontSize="50"
        fontWeight="800"
        letterSpacing="-2"
        fill={PINK}
        stroke={PINK_DEEP}
        strokeWidth="3"
        paintOrder="stroke"
        strokeLinejoin="round"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
      >
        HI!
      </text>
      {spark(80, 26, 8, YELLOW)}
    </g>
  ),
  // A puffy cloud.
  clouds: (
    <g>
      <path d="M30 70a14 14 0 0 1-2-27.8A20 20 0 0 1 66 36a15 15 0 0 1 6 34Z" fill="#FFFFFF" stroke="#5BB8F5" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M26 62c6 4 34 5 46 0" stroke="#D6ECFF" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M40 34a14 14 0 0 1 12-6" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ),
  // A booster pack with crimped ends and a star.
  pack: (
    <g transform="rotate(-9 50 50)">
      <path d="M30 18h40l-2 4 2 4v48l-2 4 2 4H30l2-4-2-4V26l2-4Z" fill={PINK} stroke={PINK_DEEP} strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 26h40M30 74h40" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M38 30h6v40h-6Z" fill="#FFFFFF" opacity=".28" />
      <path d="M50 38l3.2 7.4 8 .7-6 5.3 1.8 7.8L50 55l-7 4.2 1.8-7.8-6-5.3 8-.7Z" fill={YELLOW} stroke={YELLOW_DEEP} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  ),
  // A holo trading card with a star, the foil a little rainbow.
  rare: (
    <g transform="rotate(8 50 50)">
      <defs>
        <linearGradient id="sticker-rare-foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD6E8" />
          <stop offset=".35" stopColor="#B5E8FF" />
          <stop offset=".65" stopColor="#C9B8FF" />
          <stop offset="1" stopColor="#FFE9A6" />
        </linearGradient>
      </defs>
      <rect x="29" y="16" width="42" height="64" rx="6" fill="url(#sticker-rare-foil)" stroke={PURPLE_DEEP} strokeWidth="3" />
      <rect x="34" y="22" width="32" height="28" rx="3" fill="#FFFFFF" opacity=".7" />
      <path d="M50 27l3 6.6 7.2.6-5.4 4.8 1.6 7L50 42.3 43.6 46l1.6-7-5.4-4.8 7.2-.6Z" fill={YELLOW} stroke={YELLOW_DEEP} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M36 58h28M36 64h18" stroke={PURPLE_DEEP} strokeWidth="2.6" strokeLinecap="round" opacity=".55" />
      <path d="M33 74 66 20" stroke="#FFFFFF" strokeWidth="5" opacity=".45" />
    </g>
  ),
  // A felt heart with a running stitch, cut a little wonky.
  studio: (
    <g transform="rotate(-6 50 50)">
      <path d="M50 80C30 66 18 54 18 39c0-10 7-17 16-17 7 0 12 4 16 10 4-6 9-10 16-10 9 0 16 7 16 17 0 15-12 27-32 41Z" fill={PINK} stroke={PINK_DEEP} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 71C35 60 26 51 26 40c0-6 4-10 9-10 6 0 10 4 15 11 5-7 9-11 15-11 5 0 9 4 9 10 0 11-9 20-24 31Z" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeDasharray="5 4" strokeLinecap="round" />
      <path d="M31 33c2-3 5-4 8-4" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    </g>
  ),
  // Headphones over a little note.
  dj: (
    <g>
      <path d="M22 60V50a28 28 0 0 1 56 0v10" fill="none" stroke={BLUE_DEEP} strokeWidth="6" strokeLinecap="round" />
      <rect x="14" y="54" width="16" height="26" rx="7" fill={BLUE} stroke={BLUE_DEEP} strokeWidth="3" />
      <rect x="70" y="54" width="16" height="26" rx="7" fill={BLUE} stroke={BLUE_DEEP} strokeWidth="3" />
      <path d="M46 70V44l14-4v24" stroke={PINK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="42" cy="70" r="5" fill={PINK} />
      <circle cx="56" cy="64" r="5" fill={PINK} />
      <path d="M26 40a24 24 0 0 1 12-12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ),
  // Three trading cards, fanned.
  collector: (
    <g>
      {[
        { r: -18, fill: BLUE, edge: BLUE_DEEP },
        { r: 0, fill: YELLOW, edge: YELLOW_DEEP },
        { r: 18, fill: PINK, edge: PINK_DEEP },
      ].map((c) => (
        <g key={c.r} transform={`rotate(${c.r} 50 84)`}>
          <rect x="35" y="20" width="30" height="44" rx="4" fill={c.fill} stroke={c.edge} strokeWidth="3" />
          <rect x="39" y="24" width="22" height="20" rx="2" fill="#FFFFFF" opacity=".75" />
          <path d="M40 50h20M40 55h13" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity=".8" />
        </g>
      ))}
    </g>
  ),
  // A tiny terminal window with a prompt.
  shell: (
    <g transform="rotate(-6 50 50)">
      <rect x="18" y="24" width="64" height="52" rx="9" fill={GRAPHITE} stroke="#14151A" strokeWidth="3" />
      <path d="M18 36h64" stroke="#41444E" strokeWidth="2" />
      <circle cx="27" cy="30" r="2.6" fill={PINK} />
      <circle cx="35" cy="30" r="2.6" fill={YELLOW} />
      <circle cx="43" cy="30" r="2.6" fill={GREEN} />
      <path d="M29 47l9 7-9 7" stroke="#5FCE8C" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M44 63h16" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
    </g>
  ),
  // A stopwatch.
  speed: (
    <g>
      <rect x="44" y="14" width="12" height="9" rx="3" fill={BLUE_DEEP} />
      <path d="M71 26l6 6" stroke={BLUE_DEEP} strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="56" r="28" fill="#FFFFFF" stroke={BLUE} strokeWidth="7" />
      <circle cx="50" cy="56" r="28" fill="none" stroke={BLUE_DEEP} strokeWidth="1.6" strokeOpacity=".5" />
      <path d="M50 34v5M50 73v5M28 56h5M67 56h5" stroke="#9FB2CF" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 56l11-12" stroke={PINK} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="50" cy="56" r="4" fill={NAVY} />
    </g>
  ),
  // A flying saucer.
  passenger: (
    <g transform="rotate(-8 50 50)">
      <path d="M32 50a18 18 0 0 1 36 0Z" fill="#BDE7FF" stroke={BLUE_DEEP} strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 42a9 9 0 0 1 8-6" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="50" cy="56" rx="36" ry="12" fill={PURPLE} stroke={PURPLE_DEEP} strokeWidth="3" />
      <path d="M18 54c10 5 54 5 64 0" stroke="#C9B3FF" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="32" cy="58" r="3" fill={YELLOW} />
      <circle cx="50" cy="61" r="3" fill={YELLOW} />
      <circle cx="68" cy="58" r="3" fill={YELLOW} />
    </g>
  ),
  // A green speech bubble with a question mark.
  curious: (
    <g transform="rotate(5 50 50)">
      <path d="M30 20h40a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12H48L33 78v-12h-3a12 12 0 0 1-12-12V32a12 12 0 0 1 12-12Z" fill={GREEN} stroke={GREEN_DEEP} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M26 30a8 8 0 0 1 6-5" stroke="#B9F5CF" strokeWidth="3" strokeLinecap="round" fill="none" />
      <text x="50" y="58" textAnchor="middle" fontSize="34" fontWeight="800" fill="#FFFFFF" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
        ?
      </text>
    </g>
  ),
  // A die showing five.
  sampler: (
    <g transform="rotate(12 50 50)">
      <rect x="24" y="24" width="52" height="52" rx="12" fill="#FFFFFF" stroke={NAVY} strokeWidth="3.5" />
      <path d="M28 66c6 6 30 7 44 2" stroke="#E2E8F2" strokeWidth="5" strokeLinecap="round" fill="none" />
      {[
        [37, 37],
        [63, 37],
        [50, 50],
        [37, 63],
        [63, 63],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill={PINK} />
      ))}
    </g>
  ),
  // A compass.
  lost: (
    <g>
      <circle cx="50" cy="50" r="31" fill={BLUE} stroke={BLUE_DEEP} strokeWidth="3" />
      <circle cx="50" cy="50" r="23" fill="#FFFFFF" />
      <path d="M50 30l7 20H43Z" fill={PINK} />
      <path d="M50 70l-7-20h14Z" fill="#C7D1E0" />
      <circle cx="50" cy="50" r="3.6" fill={NAVY} />
      <path d="M28 32a26 26 0 0 1 12-9" stroke="#9CD3FF" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ),
  // A curling wave.
  wave: (
    <g>
      <path d="M16 78c0-26 14-46 38-48 18-2 30 10 30 24 0 10-8 14-14 10-5-3-2-11-9-14-8-4-17 3-13 13 4 9 18 12 36 11v4Z" fill={BLUE} stroke={BLUE_DEEP} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M38 40c6-5 13-7 20-6" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M22 70c4 2 10 3 16 2" stroke="#9CD3FF" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      {spark(78, 28, 7)}
    </g>
  ),
  // A pencil.
  signed: (
    <g transform="rotate(-38 50 50)">
      <rect x="22" y="40" width="44" height="20" fill={YELLOW} stroke={YELLOW_DEEP} strokeWidth="3" />
      <path d="M22 46.7h44M22 53.3h44" stroke={YELLOW_DEEP} strokeWidth="1.6" opacity=".6" />
      <path d="M66 40l16 10-16 10Z" fill="#FFE7C2" stroke={YELLOW_DEEP} strokeWidth="3" strokeLinejoin="round" />
      <path d="M77 46.8 82 50l-5 3.2Z" fill={GRAPHITE} />
      <rect x="12" y="40" width="10" height="20" rx="3" fill={PINK} stroke={PINK_DEEP} strokeWidth="3" />
      <rect x="20" y="39" width="5" height="22" fill="#C7D1E0" />
    </g>
  ),
  // A gamepad.
  konami: (
    <g transform="rotate(-8 50 50)">
      <path d="M30 34h40c10 0 16 8 17 20 1 10-3 16-9 16-5 0-8-4-11-8H33c-3 4-6 8-11 8-6 0-10-6-9-16 1-12 7-20 17-20Z" fill="#8ED8F8" stroke={BLUE_DEEP} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M22 44c2-4 5-6 9-6" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M30 44v12M24 50h12" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
      <circle cx="66" cy="46" r="4" fill={PINK} />
      <circle cx="74" cy="53" r="4" fill={YELLOW} />
      <circle cx="58" cy="53" r="4" fill={GREEN} />
    </g>
  ),
};
