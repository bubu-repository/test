import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sticker } from "@/components/Sticker";
import { contrastRatio, isHexColor } from "@/lib/contrast";
import { resolveToken, tokens } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Design tokens",
  description: "The design tokens behind adelia.cc and every *.adelia.cc experiment, with live contrast checks.",
  alternates: { canonical: "/styleguide" },
};

type Theme = "light" | "dark";

const colorNames = Array.from(new Set([...tokens.light, ...tokens.dark].map((t) => t.name))).filter((n) => !n.startsWith("--font"));

const contrastPairs = [
  { fg: "--ink", bg: "--sky-tone", use: "Body text on the veiled sky", min: 4.5 },
  { fg: "--ink", bg: "--glass-tone", use: "Text on glass", min: 4.5 },
  { fg: "--muted", bg: "--sky-tone", use: "Secondary text on the sky", min: 4.5 },
  { fg: "--muted", bg: "--glass-tone", use: "Secondary text on glass", min: 4.5 },
  { fg: "--accent-ink", bg: "--sky-tone", use: "Blue as text", min: 4.5 },
  { fg: "--accent-ink", bg: "--glass-tone", use: "Blue text on glass", min: 4.5 },
  { fg: "--on-fill", bg: "--accent-soft", use: "Label on a pale blue fill", min: 4.5 },
  { fg: "--on-accent", bg: "--accent-strong", use: "White on the blue key", min: 4.5 },
  { fg: "--accent-display", bg: "--sky-tone", use: "Highlighted headline words (display size)", min: 3 },
  { fg: "--on-cobalt", bg: "--cobalt", use: "Label on blue", min: 4.5 },
  { fg: "--on-fill", bg: "--butter", use: "Label on butter", min: 4.5 },
  { fg: "--on-fill", bg: "--sun", use: "Label on lilac", min: 4.5 },
  { fg: "--on-fill", bg: "--lime", use: "Label on aqua", min: 4.5 },
  { fg: "--screen-ink", bg: "--screen", use: "LCD segments", min: 4.5 },
  { fg: "--screen-muted", bg: "--screen", use: "Dim LCD segments", min: 4.5 },
];

function Section({ index, title, children, lead }: { index: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`sg-${index}`} className="container-page py-14 md:py-20">
      <p className="type-pixel text-accent-ink">{index}</p>
      <h2 id={`sg-${index}`} className="type-title mt-2">
        {title}
      </h2>
      {lead && <p className="mt-3 max-w-[64ch] text-muted">{lead}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Ratio({ theme, fg, bg, min }: { theme: Theme; fg: string; bg: string; min: number }) {
  const f = resolveToken(theme, fg);
  const b = resolveToken(theme, bg);
  if (!f || !b || !isHexColor(f) || !isHexColor(b)) return <td className="py-3 pr-4">n/a</td>;
  const ratio = contrastRatio(f, b);
  return (
    <td className="py-3 pr-4 whitespace-nowrap">
      <span className="type-code mr-2">{ratio.toFixed(2)}:1</span>
      <span className="chip" data-tone={ratio >= min ? "lime" : "magenta"}>
        {ratio >= min ? "Pass" : "Fail"}
      </span>
    </td>
  );
}

export default function StyleguidePage() {
  return (
    <>
      <header className="pt-36 pb-14 md:pt-44">
        <div className="container-page">
          <p className="type-eyebrow">The system behind the site</p>
          <h1 className="type-display mt-3">Design tokens</h1>
          <p className="type-lead mt-5 max-w-[60ch]">
            One file, <code>packages/tokens/tokens.css</code>, styles this site and every experiment on its own subdomain. Values on this page are read
            from that file at build time, so it can&apos;t drift.
          </p>
        </div>
      </header>

      <Section index="01" title="Colour" lead="A neutral white page and navy ink. Wii blue is the brand you always feel; the rest are small, vivid, cool accents.">
        <div className="grid gap-5 md:grid-cols-2">
          {(["light", "dark"] as const).map((theme) => (
            <div key={theme} data-theme={theme} className="widget bg-surface p-5 text-ink">
              <p className="type-pixel">{theme === "light" ? "Light" : "Dark"}</p>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {colorNames.map((name) => {
                  const value = resolveToken(theme, name);
                  return (
                    <li key={name} className="min-w-0">
                      <span aria-hidden="true" className="block h-14 rounded-sm border border-line" style={{ background: `var(${name})` }} />
                      <code className="mt-1.5 block truncate text-12 font-semibold">{name}</code>
                      <code className="block truncate text-12 text-muted">{value}</code>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section index="02" title="Contrast" lead="Computed from the token values. Text needs 4.5:1; markers need 3:1.">
        <div className="widget overflow-x-auto p-4" tabIndex={0} role="region" aria-label="Contrast table">
          <table className="w-full min-w-[640px] border-collapse text-left text-14">
            <thead>
              <tr className="border-b border-line">
                {["Pair", "Use", "Need", "Day", "Night"].map((h) => (
                  <th key={h} scope="col" className="type-pixel py-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contrastPairs.map((pair) => (
                <tr key={`${pair.fg}-${pair.bg}-${pair.min}`}>
                  <th scope="row" className="py-3 pr-4 font-normal">
                    <code>
                      {pair.fg} on {pair.bg}
                    </code>
                  </th>
                  <td className="py-3 pr-4">{pair.use}</td>
                  <td className="type-code py-3 pr-4">{pair.min}:1</td>
                  <Ratio theme="light" {...pair} />
                  <Ratio theme="dark" {...pair} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section index="03" title="Type" lead="Bricolage Grotesque for everything: its optical-size axis gives tight display cuts and open text cuts. JetBrains Mono for code; Pixelify Sans only for the odd easter egg.">
        <div className="grid gap-4">
          <p className="type-hero">Adelia Tiara</p>
          <p className="type-display">Display, 700</p>
          <p className="type-title">Title for sections</p>
          <p className="type-lead max-w-[60ch]">Lead paragraph. I build AI products end to end, from the interface to the agents behind it.</p>
          <p className="type-pixel">Small caps label</p>
          <code className="type-code">const answer = await moci.ask(&quot;Is she available?&quot;);</code>
        </div>
      </Section>

      <Section index="04" title="Components">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="pill" data-variant="magenta">
            Primary
          </button>
          <button type="button" className="pill">
            White pill
          </button>
          <button type="button" className="pill" data-variant="cobalt">
            Cobalt
          </button>
          <button type="button" className="pill" data-variant="sun">
            Sun
          </button>
          <button type="button" className="pill" data-variant="lime">
            Lime
          </button>
          <button type="button" className="pill" data-variant="ink">
            Ink
          </button>
          <button type="button" className="pill" data-variant="ghost">
            Ghost
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {["magenta", "lime", "sun", "sky", "violet", "mint", "ink"].map((tone) => (
            <span key={tone} className="chip" data-tone={tone}>
              {tone}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Sticker shape="circle" tone="sky" emoji="👋" />
          <Sticker shape="star" tone="violet" emoji="🦉" />
          <Sticker shape="heart" tone="lime" emoji="💬" />
          <Sticker shape="scallop" tone="magenta" emoji="🃏" />
          <Sticker shape="blob" tone="mint" emoji="🍡" />
          <Sticker shape="ticket" tone="sun" emoji="🎴" />
          <Sticker shape="circle" tone="sky" emoji="" locked />
          <p className="type-display">
            One <span className="sticker-text">accent</span> word
          </p>
        </div>
      </Section>
    </>
  );
}
