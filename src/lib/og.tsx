import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { identity } from "@/content/profile";

/** Share images: 1200×630, white paper, Bricolage, a row of dock icons. Same look as the site. */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const fontDir = join(process.cwd(), "node_modules/@fontsource/bricolage-grotesque/files");
const fonts = Promise.all([readFile(join(fontDir, "bricolage-grotesque-latin-400-normal.woff")), readFile(join(fontDir, "bricolage-grotesque-latin-700-normal.woff"))]);

const ICONS = ["linear-gradient(180deg, #6CC4FF, #1F7BFF)", "linear-gradient(180deg, #C995FF, #7A3CF0)", "linear-gradient(180deg, #7FE3F2, #0EA5C6)", "linear-gradient(180deg, #99F6E4, #14B8A6)", "linear-gradient(180deg, #C7D2FE, #5B6CF0)", "radial-gradient(120% 120% at 30% 15%, #FF9BD0 0%, #F41B8D 48%, #B8006A 100%)"];

export async function renderOg({ eyebrow, title, accent, subtitle }: { eyebrow: string; title: string; accent?: string; subtitle: string }) {
  const [regular, bold] = await fonts;
  const parts = accent && title.includes(accent) ? title.split(accent) : [title];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#FFFFFF", padding: "64px 72px", fontFamily: "Bricolage", color: "#111111" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 15, background: "#FFFFFF", border: "2px solid #E7E8EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, letterSpacing: -2 }}>
            a<span style={{ color: "#1E9BE0" }}>.</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{identity.domain}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, color: "#666666", textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: title.length > 28 ? 76 : 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1, marginTop: 18 }}>
            {parts.length === 2 ? (
              <>
                <span>{parts[0]}</span>
                <span style={{ color: "#1488CC" }}>{accent}</span>
                <span>{parts[1]}</span>
              </>
            ) : (
              <span>{title}</span>
            )}
          </div>
          <div style={{ fontSize: 30, color: "#666666", marginTop: 22, lineHeight: 1.35, maxWidth: 900 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 48 }}>
          <div style={{ display: "flex", fontSize: 22, color: "#666666" }}>{`${identity.name} · ${identity.role} · ${identity.location}`}</div>
          <div style={{ display: "flex", gap: 10 }}>
            {ICONS.map((bg, i) => (
              <div key={i} style={{ width: 38, height: 38, borderRadius: 10, background: bg }} />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Bricolage", data: regular, weight: 400, style: "normal" },
        { name: "Bricolage", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
