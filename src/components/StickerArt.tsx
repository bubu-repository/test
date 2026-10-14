import { useId, type ReactNode } from "react";

/*
 * The sticker illustrations, in the site's one hand: Frutiger Aero objects lit by a sun at the top
 * right. Every body is a gradient, lighter on top (or, for clear jelly, colour pooled low), with
 * navy-tinted shading away from the sun, a soft white highlight and a hard white dot towards the
 * top right, and a thin white rim just inside its edge: never a darker outline. Faces only go on
 * creatures. Each sticker picks a finish: holo (pearl pastels with fine diagonal lines), puffy
 * epoxy (a domed white band across the top) or clear jelly (colour pooled at the bottom, an inner
 * white rim). Drawn in a 100×100 box with a compact silhouette kept inside 12–88, so the die-cut
 * edge (added by a filter in Sticker) has room and the locked silhouette still reads. Gradient and
 * clip ids come from useId, so two copies of a sticker never share one. One per sticker id.
 */

const WHITE = "#FFFFFF";
const NAVY = "#082850";
const EYE = "#0B1F33";
const BLUSH = "#FF8FB8";
const SKY = "#D4F3FF";
const SKY_2 = "#BFE8FF";
const AQUA = "#7FE3F7";
const AZURE = "#5CB8F5";
const BLUE = "#1A8FE8";
const BLUE_DEEP = "#0A68D0";
const GLASS = "#93ECDC";
const SEA = "#22CDB0";
const PINK = "#FF7EB6";
const PINK_SOFT = "#FFD6E8";
const PINK_INK = "#C2286F";
const SUN = "#FFE27A";
const PEACH = "#FFB08A";
const LILAC = "#C9B8FF";
const PEARL_LILAC = "#E4DCFF";
const PEARL_PINK = "#FFE0F0";
const PEARL_MINT = "#D2FBEF";
const PEARL_SUN = "#FFF4C9";

type Pt = readonly [x: number, y: number];
type Stop = readonly [offset: number, color: string, opacity?: number];
/** A flat colour, or a gradient across the shape's own box (top to bottom unless `from`/`to` say otherwise). */
type Paint = string | { stops: readonly Stop[]; from?: Pt; to?: Pt } | { stops: readonly Stop[]; at: Pt; r: number };

/** Holo foil: the pearl pastels, run on a diagonal. */
const PEARL: Paint = {
  stops: [
    [0, SKY],
    [0.3, PEARL_PINK],
    [0.55, PEARL_LILAC],
    [0.78, PEARL_MINT],
    [1, PEARL_SUN],
  ],
  from: [0, 0],
  to: [1, 1],
};
const SUNNY: Paint = { stops: [[0, PEARL_SUN], [0.55, SUN], [1, SUN]] };
const PINKY: Paint = { stops: [[0, PINK_SOFT], [0.42, PINK], [1, PINK]] };

const r2 = (v: number) => Math.round(v * 100) / 100;
const circle = (cx: number, cy: number, r: number) => `M${r2(cx - r)} ${cy}a${r} ${r} 0 1 0 ${r2(2 * r)} 0a${r} ${r} 0 1 0 ${r2(-2 * r)} 0Z`;
const oval = (cx: number, cy: number, rx: number, ry: number) => `M${r2(cx - rx)} ${cy}a${rx} ${ry} 0 1 0 ${r2(2 * rx)} 0a${rx} ${ry} 0 1 0 ${r2(-2 * rx)} 0Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${r2(w - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${r2(h - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${r}h${r2(2 * r - w)}a${r} ${r} 0 0 1 ${-r} ${-r}v${r2(2 * r - h)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;

/** A polygon with every corner cut back by `t` of its sides and bridged with a curve through it. */
function roundPoly(pts: readonly Pt[], t: number | readonly number[]): string {
  const n = pts.length;
  return (
    pts
      .map(([x, y], i) => {
        const [px, py] = pts[(i + n - 1) % n];
        const [nx, ny] = pts[(i + 1) % n];
        const k = typeof t === "number" ? t : t[i % t.length];
        return `${i ? "L" : "M"}${r2(x + (px - x) * k)} ${r2(y + (py - y) * k)}Q${r2(x)} ${r2(y)} ${r2(x + (nx - x) * k)} ${r2(y + (ny - y) * k)}`;
      })
      .join("") + "Z"
  );
}

/** A star's corners, tip first: `arms` angles in degrees (0 is right, -90 up), tips at `R`, valleys at `r`. */
function starPts(cx: number, cy: number, r: number, arms: readonly (readonly [angle: number, R: number])[]): Pt[] {
  const rad = (a: number) => (a * Math.PI) / 180;
  return arms.flatMap(([a, R], i) => {
    const next = arms[(i + 1) % arms.length][0];
    const mid = a + ((((next - a) % 360) + 360) % 360) / 2;
    return [
      [cx + Math.cos(rad(a)) * R, cy + Math.sin(rad(a)) * R],
      [cx + Math.cos(rad(mid)) * r, cy + Math.sin(rad(mid)) * r],
    ] as Pt[];
  });
}
const five = (R: number, rot = -90) => Array.from({ length: 5 }, (_, i) => [rot + i * 72, R] as const);

/** A four-pointed sparkle with pinched, curved sides. */
function sparkle(x: number, y: number, r: number): string {
  const a = r * 0.1;
  const b = r * 0.32;
  const p = (dx: number, dy: number) => `${r2(x + dx)} ${r2(y + dy)}`;
  return `M${p(0, -r)}C${p(a, -b)} ${p(b, -a)} ${p(r, 0)}C${p(b, a)} ${p(a, b)} ${p(0, r)}C${p(-a, b)} ${p(-b, a)} ${p(-r, 0)}C${p(-b, -a)} ${p(-a, -b)} ${p(0, -r)}Z`;
}

function Gradient({ id, paint }: { id: string; paint: Exclude<Paint, string> }) {
  const stops = paint.stops.map(([o, c, a = 1]) => <stop key={o} offset={o} stopColor={c} stopOpacity={a} />);
  if ("at" in paint)
    return (
      <radialGradient id={id} cx={paint.at[0]} cy={paint.at[1]} r={paint.r}>
        {stops}
      </radialGradient>
    );
  const [x1, y1] = paint.from ?? [0, 0];
  const [x2, y2] = paint.to ?? [0, 1];
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops}
    </linearGradient>
  );
}

/** A shape filled with a paint. */
function Fill({ d, paint, opacity, transform }: { d: string; paint: Paint; opacity?: number; transform?: string }) {
  const id = useId();
  if (typeof paint === "string") return <path d={d} fill={paint} opacity={opacity} transform={transform} />;
  return (
    <>
      <defs>
        <Gradient id={id} paint={paint} />
      </defs>
      <path d={d} fill={`url(#${id})`} opacity={opacity} transform={transform} />
    </>
  );
}

/**
 * One lit body: its paint, navy-tinted shading away from the sun, then `children` (pooled colour,
 * highlights, details) clipped to its silhouette, then a thin white rim just inside its edge.
 */
function Body({ d, paint, shade = 0.16, rim = 0.85, children }: { d: string; paint: Paint; shade?: number; rim?: number; children?: ReactNode }) {
  const id = useId();
  return (
    <>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <Fill d={d} paint={paint} />
      <g clipPath={`url(#${id})`}>
        {shade > 0 && <Fill d={d} paint={{ stops: [[0, NAVY, 0], [0.5, NAVY, 0], [1, NAVY, shade]], from: [0.9, 0], to: [0.1, 1] }} />}
        {children}
        {rim > 0 && <path d={d} fill="none" stroke={WHITE} strokeOpacity={rim} strokeWidth="2.8" />}
      </g>
    </>
  );
}

/** The sun's reflection: a soft white ellipse leaning with the surface, and a hard dot just past its end. */
function Gloss({ x, y, rx = 6, ry = 2.6, rot = 35, dot = 1.9, o = 0.62 }: { x: number; y: number; rx?: number; ry?: number; rot?: number; dot?: number; o?: number }) {
  const a = (rot * Math.PI) / 180;
  return (
    <>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} fill={WHITE} opacity={o} />
      {dot > 0 && <circle cx={r2(x + Math.cos(a) * (rx + dot + 1.6))} cy={r2(y + Math.sin(a) * (rx + dot + 1.6))} r={dot} fill={WHITE} />}
    </>
  );
}

/** Puffy epoxy: a domed white band across the top of a body. */
function Dome({ x, y, w, h, o = 0.72 }: { x: number; y: number; w: number; h: number; o?: number }) {
  const d = `M${x} ${y + h}C${x} ${r2(y + h * 0.3)} ${r2(x + w * 0.2)} ${y} ${r2(x + w / 2)} ${y}S${x + w} ${r2(y + h * 0.3)} ${x + w} ${y + h}C${r2(x + w * 0.66)} ${r2(y + h * 0.6)} ${r2(x + w * 0.34)} ${r2(y + h * 0.6)} ${x} ${y + h}Z`;
  return <Fill d={d} paint={{ stops: [[0, WHITE, o], [1, WHITE, o * 0.15]] }} />;
}

/** Holo foil: fine diagonal lines across a box, at fractions `at` of the way along it. */
function Holo({ x, y, w, h, at = [0.18, 0.24, 0.5, 0.56, 0.8], o = 0.6 }: { x: number; y: number; w: number; h: number; at?: number[]; o?: number }) {
  return (
    <g stroke={WHITE} strokeOpacity={o} strokeWidth=".9" strokeLinecap="round">
      {at.map((f) => (
        <path key={f} d={`M${r2(x - h + (w + h) * f)} ${y + h}l${h} ${-h}`} />
      ))}
    </g>
  );
}

/** A tiny face for the creatures: navy eyes with a glint, a small smile, pink cheeks. */
function Face({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="-8.6" cy="4.6" rx="3.6" ry="2.2" fill={BLUSH} opacity=".5" />
      <ellipse cx="8.6" cy="4.6" rx="3.6" ry="2.2" fill={BLUSH} opacity=".5" />
      <circle cx="-5.4" cy="0" r="2.5" fill={EYE} />
      <circle cx="5.4" cy="0" r="2.5" fill={EYE} />
      <circle cx="-4.6" cy="-0.9" r=".85" fill={WHITE} />
      <circle cx="6.2" cy="-0.9" r=".85" fill={WHITE} />
      <path d="M-2 3.3q2 1.9 4 0" stroke={EYE} strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </g>
  );
}

/** A small sun-yellow sparkle with a white heart, for the stickers that shine. */
function Glint({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <>
      <Body d={sparkle(x, y, r)} paint={SUNNY} shade={0} rim={0} />
      <circle cx={x} cy={y} r={r * 0.2} fill={WHITE} />
    </>
  );
}

// "HI!" as puffy pink letters, one epoxy band across the word.
const HI = [
  "M18 28h3a5 5 0 0 1 5 5v10h8V33a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v34a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5V56h-8v11a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5V33a5 5 0 0 1 5-5Z",
  rrect(52, 28, 13, 44, 5.5),
  "M75.5 28h2a5.5 5.5 0 0 1 5.5 5.8l-1.4 21.2a3.6 3.6 0 0 1-3.6 3.4h-3a3.6 3.6 0 0 1-3.6-3.4l-1.4-21.2a5.5 5.5 0 0 1 5.5-5.8Z",
  circle(76.5, 66.5, 5.5),
];
const HI_DOTS: Pt[] = [
  [43.2, 32.4],
  [61.3, 32.4],
  [79.6, 32.6],
  [79, 63.6],
];

function Hello() {
  return (
    <g>
      <g transform="rotate(-8 50 50) translate(49 51) scale(.95) translate(-48 -50)">
        {HI.map((d, i) => (
          <Body key={d} d={d} paint={PINKY} shade={0.18}>
            <Dome x={8} y={30.5} w={80} h={15} />
            <circle cx={HI_DOTS[i][0]} cy={HI_DOTS[i][1]} r="1.7" fill={WHITE} />
          </Body>
        ))}
      </g>
      <Glint x={83} y={22} r={7.5} />
    </g>
  );
}

const CLOUD = "M28 75A13 13 0 1 1 40.46 58.3A17 17 0 1 1 61.71 41.48A14 14 0 0 1 81.94 55.46A11 11 0 0 1 75 75Z";

function Clouds() {
  return (
    <g transform="translate(0 3)">
      <Body d={circle(65, 31, 15.5)} paint={SUNNY} shade={0.1}>
        <Gloss x={69} y={22.5} rx={5} ry={2.2} />
      </Body>
      <Body d={CLOUD} paint={{ stops: [[0, WHITE], [0.45, "#F2FBFF"], [1, SKY_2]] }} shade={0.2}>
        <ellipse cx="50" cy="80" rx="40" ry="10" fill={AZURE} opacity=".45" />
        <Gloss x={52} y={38.5} rx={6.5} ry={2.6} rot={20} />
      </Body>
    </g>
  );
}

const PACK = `M30 22${"l2-4 2 4".repeat(10)}V78${"l-2 4-2-4".repeat(10)}Z`;

function Pack() {
  return (
    <g transform="rotate(-9 50 50)">
      <Body d={PACK} paint={PEARL} shade={0.14}>
        <Fill d="M28 16h44v70H28Z" paint={{ stops: [[0, NAVY, 0.12], [0.22, NAVY, 0], [0.8, NAVY, 0], [1, NAVY, 0.1]], from: [0, 0], to: [1, 0] }} />
        <Holo x={28} y={26} w={44} h={46} />
        <path d="M28 27.5h44M28 72.5h44" stroke={WHITE} strokeWidth="1.4" strokeOpacity=".9" />
        <path d="M28 29h44M28 74h44" stroke={NAVY} strokeWidth="1" strokeOpacity=".08" />
        <g stroke={WHITE} strokeOpacity=".7" strokeWidth=".8">
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={`M${32 + i * 4} 19v7M${32 + i * 4} 74v7`} />
          ))}
        </g>
        <path d="M58 18h9L44 84h-9Z" fill={WHITE} opacity=".32" />
        <Gloss x={63} y={33} rx={5} ry={2.2} rot={60} />
      </Body>
      <Body d={circle(50, 50, 12.5)} paint={{ stops: [[0, AQUA], [0.55, AZURE], [1, BLUE]] }}>
        <Gloss x={54.5} y={42.5} rx={4} ry={1.8} dot={1.3} />
      </Body>
      <Body d={roundPoly(starPts(50, 51, 3.4, five(7.6)), [0.22, 0.12])} paint={SUNNY} shade={0.06} rim={0} />
    </g>
  );
}

const RARE_STAR = roundPoly(starPts(50, 39.5, 5.4, five(12)), [0.2, 0.12]);

function Rare() {
  return (
    <g transform="rotate(8 50 50)">
      <Body d={rrect(29, 17, 42, 66, 6)} paint={PEARL}>
        <Holo x={29} y={17} w={42} h={66} at={[0.12, 0.17, 0.42, 0.47, 0.7, 0.75, 0.92]} />
        <path d="M56 17h10L36 83H26Z" fill={WHITE} opacity=".3" />
        <path d="M37 61h26M37 67h16" stroke={NAVY} strokeOpacity=".18" strokeWidth="2.6" strokeLinecap="round" />
      </Body>
      <Body d={rrect(34.5, 23, 31, 31, 3.5)} paint={{ stops: [[0, SKY_2], [0.6, AZURE], [1, BLUE]] }} rim={0.7}>
        <circle cx="50" cy="40" r="15" fill={WHITE} opacity=".22" />
      </Body>
      <Body d={RARE_STAR} paint={SUNNY} shade={0.1}>
        <Gloss x={54} y={33.5} rx={3.6} ry={1.6} rot={50} dot={1.2} />
      </Body>
      <Glint x={64} y={75} r={5} />
    </g>
  );
}

const PALETTE = "M50 22C70 22 86 33 86 49C86 65 73 77 55 77C47 77 45 70 38 70C31 70 30 77 23.5 75.5C16 73.5 14 64 14 54C14 34 30 22 50 22Z";
const PAINTS: [x: number, y: number, top: string, bottom: string][] = [
  [41, 33, PINK_SOFT, PINK],
  [58, 30.5, SKY_2, BLUE],
  [72.5, 39.5, GLASS, SEA],
  [74, 56, PEARL_LILAC, LILAC],
  [59, 63.5, PEARL_PINK, PEACH],
];

function Studio() {
  return (
    <g transform="rotate(-10 50 50)">
      <Body d={PALETTE} paint={{ stops: [[0, AQUA], [0.55, SKY], [1, "#F4FCFF"]], at: [0.5, 1], r: 0.95 }} shade={0.12}>
        <Gloss x={70} y={29} rx={7} ry={2.6} rot={28} />
      </Body>
      <circle cx="29" cy="55" r="5.8" fill={WHITE} />
      <path d="M23.4 55a5.6 5.6 0 0 1 9.4-4.1" stroke={NAVY} strokeOpacity=".2" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {PAINTS.map(([x, y, top, bottom]) => (
        <Body key={x} d={circle(x, y, 6.6)} paint={{ stops: [[0, top], [0.5, bottom], [1, bottom]] }} rim={0.7}>
          <circle cx={x + 2.4} cy={y - 2.6} r="1.6" fill={WHITE} />
          <ellipse cx={x + 0.6} cy={y - 3.6} rx="2.8" ry="1.2" transform={`rotate(20 ${x + 0.6} ${y - 3.6})`} fill={WHITE} opacity=".55" />
        </Body>
      ))}
    </g>
  );
}

const NOTE_STEMS = "M44.5 71V46L63.5 41V67H60.5V47.8L47.5 51.2V71Z";

function Dj() {
  return (
    <g transform="translate(0 -2)">
      <Body d="M16.5 58A33.5 33.5 0 0 1 83.5 58H75.5A25.5 25.5 0 0 0 24.5 58Z" paint={{ ...PEARL, from: [0, 0.2], to: [1, 0.8] }}>
        <Holo x={16} y={24} w={68} h={34} at={[0.2, 0.25, 0.6, 0.65, 0.9]} />
        <Gloss x={66} y={31} rx={5} ry={2} rot={42} />
      </Body>
      <Body d={NOTE_STEMS} paint={PINKY} rim={0.6} />
      <Body d={oval(40.5, 71.5, 6.2, 4.8)} paint={PINKY}>
        <circle cx="43" cy="69" r="1.3" fill={WHITE} />
      </Body>
      <Body d={oval(56.5, 67.5, 6.2, 4.8)} paint={PINKY}>
        <circle cx="59" cy="65" r="1.3" fill={WHITE} />
      </Body>
      {[13, 69].map((x) => (
        <g key={x}>
          <Body d={rrect(x === 13 ? 28 : 66, 55, 6, 24, 3)} paint={{ stops: [[0, WHITE], [1, PINK_SOFT]] }} rim={0.6} />
          <Body d={rrect(x, 51, 18, 32, 8.5)} paint={{ stops: [[0, AQUA], [0.5, AZURE], [1, BLUE]] }}>
            <Dome x={x + 1} y={52} w={16} h={11} o={0.6} />
            <Gloss x={x + 13} y={58} rx={3.2} ry={1.5} rot={70} dot={1.4} />
          </Body>
        </g>
      ))}
    </g>
  );
}

const CARD = rrect(34, 18, 32, 46, 5);
const DROP_ICON = "M50 25c-2.6 4.2-6 7.2-6 10.8a6 6 0 0 0 12 0c0-3.6-3.4-6.6-6-10.8Z";
const HEART_ICON = "M50 41.5c-5-3.4-7.6-6-7.6-9.2 0-2.3 1.7-4 3.8-4 1.6 0 2.9.9 3.8 2.2.9-1.3 2.2-2.2 3.8-2.2 2.1 0 3.8 1.7 3.8 4 0 3.2-2.6 5.8-7.6 9.2Z";
const CARDS: { r: number; paint: Paint; icon: string; ink: Paint }[] = [
  { r: -17, paint: { stops: [[0, SKY_2], [0.5, AZURE], [1, BLUE]] }, icon: DROP_ICON, ink: { stops: [[0, AQUA], [1, BLUE]] } },
  { r: 0, paint: { stops: [[0, SKY], [0.5, AQUA], [1, "#3FC6E8"]] }, icon: roundPoly(starPts(50, 35, 3.4, five(7.6)), [0.22, 0.12]), ink: SUNNY },
  { r: 17, paint: PINKY, icon: HEART_ICON, ink: PINKY },
];

function Collector() {
  return (
    <g transform="translate(0 6)">
      {CARDS.map((c) => (
        <g key={c.r} transform={`rotate(${c.r} 50 88)`}>
          <Body d={CARD} paint={c.paint}>
            <Dome x={34} y={18} w={32} h={10} o={0.5} />
            <path d="M40 52h20M40 57.5h12" stroke={WHITE} strokeOpacity=".85" strokeWidth="2.4" strokeLinecap="round" />
            <Gloss x={60} y={22.5} rx={3.6} ry={1.5} rot={40} dot={1.3} />
          </Body>
          <Body d={rrect(38.5, 23, 23, 22, 3)} paint={{ stops: [[0, WHITE], [1, SKY]] }} shade={0.08} rim={0} />
          <Body d={c.icon} paint={c.ink} shade={0.08} rim={0.6} />
        </g>
      ))}
    </g>
  );
}

const BOTTLE = "M34 36H57C63 36 66 41 70 43H77a2 2 0 0 1 2 2V55a2 2 0 0 1-2 2H70C66 59 63 64 57 64H34a14 14 0 0 1 0-28Z";

function Shell() {
  return (
    <g transform="rotate(-32 52 50) translate(-1 0)">
      <Body d={BOTTLE} paint={{ stops: [[0, "#F2FFFC"], [0.55, GLASS], [1, SEA]] }} shade={0.12}>
        <ellipse cx="42" cy="63" rx="24" ry="5" fill={SEA} opacity=".55" />
      </Body>
      {/* The rolled note inside, seen through the glass. */}
      <Body d={rrect(28, 43.5, 30, 13, 6.5)} paint={{ stops: [[0, WHITE], [1, PINK_SOFT]] }} shade={0.1} rim={0.6}>
        <path d="M34.5 47l3.6 3-3.6 3M40.5 53.2h5.5" stroke={PINK_INK} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M50 43.5h3v13h-3Z" fill={PINK} />
        <path d="M53.8 44v12" stroke={NAVY} strokeOpacity=".12" strokeWidth="1" />
      </Body>
      <path d="M30 40.5h26" stroke={WHITE} strokeOpacity=".7" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="62" cy="41.5" r="1.6" fill={WHITE} />
      <Body d={rrect(76, 41.5, 4.5, 17, 2)} paint={{ stops: [[0, "#F2FFFC"], [1, GLASS]] }} rim={0.7} />
      <Body d={rrect(79.5, 43.5, 9.5, 13, 3)} paint={{ stops: [[0, PEARL_SUN], [0.6, PEACH], [1, PEACH]] }} shade={0.14} rim={0.7}>
        <circle cx="83" cy="48" r=".9" fill={NAVY} opacity=".15" />
        <circle cx="86" cy="52" r=".9" fill={NAVY} opacity=".15" />
      </Body>
    </g>
  );
}

function Speed() {
  return (
    <g>
      <Body d={rrect(46.5, 18, 7, 10, 2)} paint={{ stops: [[0, SKY_2], [1, AZURE]] }} rim={0.6} />
      <Body d={rrect(41, 13, 18, 7.5, 3.75)} paint={{ stops: [[0, SKY], [0.6, AZURE], [1, BLUE]] }}>
        <circle cx="54.5" cy="15.6" r="1.2" fill={WHITE} />
      </Body>
      <g transform="rotate(45 72 34)">
        <Body d={rrect(68.5, 27, 7, 9, 2.5)} paint={{ stops: [[0, SKY], [1, AZURE]] }} rim={0.6} />
      </g>
      <Body d={circle(50, 56, 28.5)} paint={{ stops: [[0, BLUE], [0.55, AZURE], [1, SKY]], at: [0.5, 1], r: 0.95 }} shade={0.12}>
        <Gloss x={66} y={36} rx={6.5} ry={2.6} rot={42} />
      </Body>
      <Body d={circle(50, 56, 20.5)} paint={{ stops: [[0, WHITE], [1, SKY]] }} shade={0.1} rim={0}>
        <path d="M50 38.5v3.5M67.5 56H64M50 73.5V70M32.5 56H36" stroke={NAVY} strokeOpacity=".3" strokeWidth="2" strokeLinecap="round" />
        {/* Forty seconds round the dial. */}
        <path d="M50 40.5A15.5 15.5 0 1 1 36.58 63.75" stroke={PINK} strokeWidth="3.4" strokeLinecap="round" fill="none" opacity=".9" />
        <path d="M50 56 39.2 62.2" stroke={PINK_INK} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="50" cy="56" r="3" fill={PINK_INK} />
        <circle cx="50.8" cy="55.2" r=".9" fill={WHITE} />
        <ellipse cx="58" cy="44" rx="7" ry="2.6" transform="rotate(30 58 44)" fill={WHITE} opacity=".7" />
      </Body>
    </g>
  );
}

const SAIL_L = roundPoly([[50, 20], [50, 58], [33, 58]], [0.12, 0.05, 0.12]);
const SAIL_R = roundPoly([[50, 20], [67, 58], [50, 58]], [0.12, 0.12, 0.05]);
const HULL = roundPoly([[13, 50], [34, 57], [66, 57], [87, 50], [72, 74], [28, 74]], [0.18, 0.1, 0.1, 0.18, 0.15, 0.15]);
const WATER = "M14 77c5-5 11-5 16 0s11 5 16 0 11-5 16 0 11 5 16 0c3-3 6-4 8-3v6a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5Z";

function Passenger() {
  return (
    <g transform="rotate(-6 50 52)">
      <Body d={SAIL_L} paint={PEARL} shade={0.22}>
        <Holo x={30} y={20} w={22} h={40} at={[0.3, 0.38, 0.7]} />
      </Body>
      <Body d={SAIL_R} paint={{ stops: [[0, WHITE], [1, SKY]] }} shade={0.08}>
        <Gloss x={55} y={34} rx={4.5} ry={1.6} rot={66} dot={1.4} />
      </Body>
      <Body d={HULL} paint={{ stops: [[0, WHITE], [0.6, SKY], [1, SKY_2]] }} shade={0.18}>
        <path d="M34 57 50 74 66 57" stroke={NAVY} strokeOpacity=".1" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
        <path d="M34 57 50 72" stroke={WHITE} strokeOpacity=".8" strokeWidth="1.2" />
        <Gloss x={76} y={55.5} rx={4} ry={1.5} rot={-20} dot={1.3} />
      </Body>
      <Body d={WATER} paint={{ stops: [[0, AQUA], [0.5, AZURE], [1, BLUE]] }}>
        <Gloss x={68} y={76.5} rx={4} ry={1.4} rot={-10} dot={1.2} />
      </Body>
    </g>
  );
}

const SPEECH_DROP = "M20.42 76.96L25.28 42.01A29 29 0 1 1 57.99 74.72L23.04 79.58Q20 80 20.42 76.96Z";

function Curious() {
  return (
    <g transform="translate(1 0)">
      <Body d={SPEECH_DROP} paint={{ stops: [[0, BLUE], [0.5, AZURE], [1, SKY]], at: [0.45, 1], r: 1 }} shade={0.12}>
        <Gloss x={71} y={27} rx={7} ry={2.8} rot={42} />
      </Body>
      {/* A puffy question mark, with a soft shadow under it. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M45 39.5a9.5 9.5 0 1 1 13.5 8.6c-3.3 1.6-4.5 3.4-4.5 7" stroke={NAVY} strokeOpacity=".18" strokeWidth="7.5" transform="translate(-.8 1.6)" />
        <path d="M45 39.5a9.5 9.5 0 1 1 13.5 8.6c-3.3 1.6-4.5 3.4-4.5 7" stroke={WHITE} strokeWidth="7.5" />
      </g>
      <circle cx="53.2" cy="66.1" r="4.6" fill={NAVY} opacity=".18" />
      <circle cx="54" cy="64.5" r="4.6" fill={WHITE} />
    </g>
  );
}

const BUBBLES: [x: number, y: number, r: number][] = [
  [43, 57, 24],
  [71, 34, 14],
  [75, 67, 10],
  [24, 26, 6.5],
];

function Sampler() {
  return (
    <g>
      {BUBBLES.map(([x, y, r]) => (
        <Body key={x} d={circle(x, y, r)} paint={{ stops: [[0, AZURE], [0.45, AQUA], [0.8, SKY], [1, "#F4FCFF"]], at: [0.5, 1.05], r: 1 }} shade={0.1}>
          {/* A film of holo where the light catches it. */}
          <path d={`M${x - r} ${y}a${r} ${r} 0 0 0 ${r * 0.9} ${r * 0.95}`} stroke={PINK_SOFT} strokeWidth={r * 0.28} fill="none" opacity=".8" />
          <path d={`M${x - r * 0.98} ${y - r * 0.3}a${r} ${r} 0 0 1 ${r * 0.5} ${-r * 0.6}`} stroke={PEARL_LILAC} strokeWidth={r * 0.2} fill="none" opacity=".8" />
          <Gloss x={x + r * 0.42} y={y - r * 0.55} rx={r * 0.32} ry={r * 0.13} rot={40} dot={Math.max(1.2, r * 0.09)} o={0.8} />
        </Body>
      ))}
      <path d="M35.5 65 43 49l7.5 16M38.6 59h8.8" stroke={PINK} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="46.2" cy="50.4" r="1.1" fill={WHITE} />
    </g>
  );
}

function Lost() {
  return (
    <g>
      <Body d={circle(50, 17.5, 5.5)} paint={{ stops: [[0, SKY], [1, AZURE]] }} rim={0.6} />
      <circle cx="50" cy="17.5" r="2.3" fill={WHITE} />
      <Body d={circle(50, 54, 31)} paint={{ stops: [[0, AQUA], [0.5, AZURE], [1, BLUE_DEEP]] }}>
        <Dome x={22} y={24} w={56} h={16} o={0.55} />
        <Gloss x={74} y={36} rx={4.5} ry={1.8} rot={52} />
      </Body>
      <Body d={circle(50, 54, 23)} paint={{ stops: [[0, WHITE], [1, SKY]] }} shade={0.12} rim={0}>
        <g fill={NAVY} opacity=".28">
          <circle cx="50" cy="35" r="1.5" />
          <circle cx="69" cy="54" r="1.5" />
          <circle cx="50" cy="73" r="1.5" />
          <circle cx="31" cy="54" r="1.5" />
        </g>
        <g transform="rotate(32 50 54)">
          <Fill d="M50 34.5 56 54H44Z" paint={PINKY} />
          <Fill d="M50 73.5 44 54H56Z" paint={{ stops: [[0, SKY_2], [1, AZURE]] }} />
          <path d="M50 34.5 56 54H50Z" fill={WHITE} opacity=".25" />
        </g>
        <circle cx="50" cy="54" r="3.4" fill={WHITE} />
        <circle cx="50" cy="54" r="1.5" fill={PINK_INK} />
        <ellipse cx="60" cy="40" rx="8" ry="3" transform="rotate(35 60 40)" fill={WHITE} opacity=".55" />
      </Body>
    </g>
  );
}

const STARFISH = roundPoly(
  starPts(48, 55, 15.5, [
    [-96, 31],
    [-36, 34],
    [50, 30],
    [126, 31],
    [200, 31],
  ]),
  [0.3, 0.14],
);

function Wave() {
  return (
    <g>
      <Body d={STARFISH} paint={{ stops: [[0, SEA], [0.55, GLASS], [1, "#F2FFFC"]], at: [0.5, 1], r: 1 }} shade={0.14}>
        <Gloss x={60} y={34} rx={4.5} ry={1.8} rot={-36} dot={0} />
        <circle cx="68" cy="39" r="1.7" fill={WHITE} />
        <g fill={WHITE} opacity=".65">
          <circle cx="46" cy="33" r="1.4" />
          <circle cx="29" cy="49" r="1.4" />
          <circle cx="35" cy="70" r="1.4" />
          <circle cx="60" cy="71" r="1.4" />
        </g>
      </Body>
      <Face x={48} y={55} s={0.92} />
      {/* Waving. */}
      <g stroke={AQUA} strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M82 22.5q4 4.5 3 10" />
        <path d="M76.5 15.5q3.5 1 6 3.5" />
      </g>
    </g>
  );
}

const BELL = "M22 52C22 32 35 19 51 19S80 32 80 52c-4.3 4.5-10.2 4.5-14.5 0-4.3 4.5-10.2 4.5-14.5 0-4.3 4.5-10.2 4.5-14.5 0-4.3 4.5-10.2 4.5-14.5 0Z";

function Signed() {
  const tentacle: Paint = { stops: [[0, PEARL_LILAC], [1, LILAC]] };
  return (
    <g>
      <g fill="none" strokeLinecap="round">
        <Tentacle d="M30 54c-3 6 3 10 0 16s1 9 0 12" paint={tentacle} />
      </g>
      <g transform="rotate(-7 60 70)">
        <Body d={rrect(42, 58, 34, 25, 4)} paint={{ stops: [[0, WHITE], [1, PINK_SOFT]] }} shade={0.12}>
          <path d="M48 75c2.5-5 4.5-6 4.5-2.5s2 3.5 4.5-.5 3.5-3 4 0 2.5 2.5 5.5-1" stroke={PINK_INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M48 79.5h22" stroke={NAVY} strokeOpacity=".14" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M69 69.2c-2.6-1.8-4-3.1-4-4.8 0-1.2.9-2.1 2-2.1.8 0 1.5.5 2 1.1.5-.6 1.2-1.1 2-1.1 1.1 0 2 .9 2 2.1 0 1.7-1.4 3-4 4.8Z" fill={PINK} />
        </Body>
      </g>
      <g fill="none" strokeLinecap="round">
        <Tentacle d="M46 55c-1 4 1 6 1 9" paint={tentacle} />
        <Tentacle d="M62 55c1 4-1 6 0 9" paint={tentacle} />
      </g>
      <Body d={BELL} paint={{ stops: [[0, LILAC], [0.55, PEARL_LILAC], [1, "#FAF8FF"]], at: [0.5, 1], r: 1 }} shade={0.14}>
        <ellipse cx="51" cy="50" rx="22" ry="7" fill={PINK_SOFT} opacity=".6" />
        <Dome x={28} y={21} w={46} h={14} o={0.55} />
        <Gloss x={67} y={30} rx={5} ry={2.1} rot={45} />
      </Body>
      <Face x={51} y={39} s={0.95} />
    </g>
  );
}

/** A soft jelly tentacle: a fat round stroke with a white core. */
function Tentacle({ d, paint }: { d: string; paint: Paint }) {
  const id = useId();
  return (
    <>
      <defs>{typeof paint !== "string" && <Gradient id={id} paint={paint} />}</defs>
      <path d={d} stroke={typeof paint === "string" ? paint : `url(#${id})`} strokeWidth="5.5" />
      <path d={d} stroke={WHITE} strokeOpacity=".55" strokeWidth="1.4" transform="translate(.8 -.4)" />
    </>
  );
}

const TAIL = "M44 77C45 67 45 59 43 53C30 51 20 43 15 30C25 35 39 35 50 42C61 35 75 35 85 30C80 43 70 51 57 53C55 59 55 67 56 77Z";
const SPLASH = "M14 76c5-5.5 11-5.5 16-1 4-4.5 9-6 14-3 3-1.5 9-1.5 12 0 5-3 10-1.5 14 3 5-4.5 11-4.5 16 1v4a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6Z";

function Konami() {
  return (
    <g>
      <Body d={TAIL} paint={{ stops: [[0, AQUA], [0.45, AZURE], [1, BLUE_DEEP]] }}>
        <path d="M17 31c8 4 20 5 31 11.5" stroke={WHITE} strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <Gloss x={72} y={37} rx={5.5} ry={2} rot={-22} dot={0} />
        <circle cx="80.5" cy="34.5" r="1.7" fill={WHITE} />
      </Body>
      <Body d={SPLASH} paint={{ stops: [[0, SKY], [0.45, AQUA], [1, AZURE]] }} shade={0.12}>
        <Gloss x={67} y={74} rx={4} ry={1.4} rot={-8} dot={1.2} />
      </Body>
      <Body d={circle(24, 22, 2.8)} paint={{ stops: [[0, SKY], [1, AQUA]] }} rim={0.6} />
      <Body d={circle(17, 20, 1.8)} paint={{ stops: [[0, SKY], [1, AQUA]] }} rim={0} />
      <Glint x={72} y={19} r={7.5} />
    </g>
  );
}

export const STICKER_ART: Record<string, ReactNode> = {
  // "HI!" in fat puffy pink letters, glossed with epoxy, and a sparkle.
  hello: <Hello />,
  // A puffy cumulus with the sun peeking over it, top right.
  clouds: <Clouds />,
  // A pearl foil booster pack with crimped ends and a star badge.
  pack: <Pack />,
  // A holo trading card with a star in its window.
  rare: <Rare />,
  // A clear jelly paint palette with five dollops of paint.
  studio: <Studio />,
  // Pearl and azure headphones round a pink pair of notes.
  dj: <Dj />,
  // Three cards fanned out: two blues and a pink.
  collector: <Collector />,
  // A sea-glass message in a bottle, its rolled note reading ">_".
  shell: <Shell />,
  // A jelly stopwatch with forty seconds marked round the dial.
  speed: <Speed />,
  // A paper boat, one sail folded from holo paper, on a little wave.
  passenger: <Passenger />,
  // A speech bubble shaped like a water drop, with a puffy "?".
  curious: <Curious />,
  // A cluster of soap bubbles, the big one holding a letter.
  sampler: <Sampler />,
  // A compass whose needle has wandered off north.
  lost: <Lost />,
  // A sea-glass starfish waving hello.
  wave: <Wave />,
  // A lilac jellyfish holding a signed note.
  signed: <Signed />,
  // A whale's tail breaching with a sparkle.
  konami: <Konami />,
};
