import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { identity } from "@/content/profile";

/** Share images: 1200×630, white paper, Mona Sans, a row of dock icons. Same look as the site. */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const fontDir = join(process.cwd(), "node_modules/@fontsource/mona-sans/files");
const fonts = Promise.all([readFile(join(fontDir, "mona-sans-latin-400-normal.woff")), readFile(join(fontDir, "mona-sans-latin-700-normal.woff"))]);

const ICONS = ["linear-gradient(180deg, #8DC7F0, #3B82D6)", "linear-gradient(180deg, #C3AEE8, #6E52C4)", "linear-gradient(180deg, #9ADAE6, #3EA7C2)", "linear-gradient(180deg, #B0E8DC, #3FAE9C)", "linear-gradient(180deg, #CCD3F0, #5A6CC9)", "radial-gradient(120% 120% at 30% 15%, #F3A9C6 0%, #D8588F 48%, #AB366C 100%)"];

export async function renderOg({ eyebrow, title, accent, subtitle }: { eyebrow: string; title: string; accent?: string; subtitle: string }) {
  const [regular, bold] = await fonts;
  const parts = accent && title.includes(accent) ? title.split(accent) : [title];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#FFFFFF", padding: "64px 72px", fontFamily: "Mona Sans", color: "#111111" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 15, background: "#FFFFFF", border: "2px solid #E7E8EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, letterSpacing: -2 }}>
            a<span style={{ color: "#D8588F" }}>.</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{identity.domain}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, color: "#666666", textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: title.length > 28 ? 76 : 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1, marginTop: 18 }}>
            {parts.length === 2 ? (
              <>
                <span>{parts[0]}</span>
                <span style={{ color: "#D8588F" }}>{accent}</span>
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
        { name: "Mona Sans", data: regular, weight: 400, style: "normal" },
        { name: "Mona Sans", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
