import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const bold = readFile(join(process.cwd(), "node_modules/@fontsource/mona-sans/files/mona-sans-latin-700-normal.woff"));

/** The dock's home icon: a white squircle with "a." and the raspberry dot. */
export async function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFFFF",
          borderRadius: size * 0.23,
          fontFamily: "Mona Sans",
          fontWeight: 700,
          fontSize: size * 0.56,
          letterSpacing: -size * 0.04,
          color: "#111111",
        }}
      >
        a<span style={{ color: "#FF7EB6" }}>.</span>
      </div>
    ),
    { width: size, height: size, fonts: [{ name: "Mona Sans", data: await bold, weight: 700, style: "normal" }] },
  );
}
