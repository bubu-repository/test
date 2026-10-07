import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { bio, experience, identity, skills } from "@/content/profile";
import { projects } from "@/content/projects";

/**
 * The CV, generated from the same content as the site (so it never drifts out of date).
 * Static: it is rendered once at build time. CONTOH: the copy comes from content/*.ts.
 */

const INK = rgb(0.067, 0.067, 0.067);
const MUTED = rgb(0.4, 0.4, 0.4);
const LINE = rgb(0.9, 0.9, 0.92);
const ACCENT = rgb(0.957, 0.106, 0.553);

const A4 = { w: 595.28, h: 841.89 };
const M = 48;

/** Helvetica only speaks WinAnsi: swap the few characters the content uses that it can't draw. */
function clean(text: string) {
  return text
    .replace(/→/g, "->")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/≈/g, "~")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E -ÿ–—•…]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = clean(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

class Writer {
  y = A4.h - M;
  constructor(
    private page: PDFPage,
    private regular: PDFFont,
    private bold: PDFFont,
  ) {}

  text(text: string, { size = 10, bold = false, color = INK, x = M, width = A4.w - M * 2, leading = 1.4, after = 0 } = {}) {
    const font = bold ? this.bold : this.regular;
    for (const line of wrap(text, font, size, width)) {
      this.page.drawText(line, { x, y: this.y - size, size, font, color });
      this.y -= size * leading;
    }
    this.y -= after;
  }

  label(text: string) {
    this.y -= 14;
    this.page.drawRectangle({ x: M, y: this.y - 8, width: 6, height: 6, color: ACCENT });
    this.page.drawText(clean(text.toUpperCase()), { x: M + 12, y: this.y - 8, size: 8, font: this.bold, color: MUTED });
    this.y -= 18;
  }

  rule() {
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.6, color: LINE });
    this.y -= 6;
  }
}

async function buildCv() {
  // updateMetadata: false keeps the file deterministic (no creation date), so it can be prerendered.
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setTitle(`${identity.name}: CV`);
  pdf.setAuthor(identity.name);
  pdf.setSubject(`${identity.role}, ${identity.location}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([A4.w, A4.h]);
  const w = new Writer(page, regular, bold);

  page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: ACCENT });

  w.text(identity.name, { size: 26, bold: true, leading: 1.15 });
  w.text(`${identity.role} · ${identity.location} · ${identity.timeZoneLabel}`, { size: 11, color: MUTED, after: 2 });
  w.text(`${identity.email}   ·   ${identity.url.replace("https://", "")}`, { size: 10, color: ACCENT, after: 8 });
  w.text(bio.short, { size: 10.5, leading: 1.5, after: 2 });
  w.text(bio.availability, { size: 10, color: MUTED });

  w.label("Selected work");
  for (const p of projects) {
    w.text(`${p.name} — ${p.kind}, ${p.year}`, { size: 11.5, bold: true, leading: 1.3 });
    w.text(p.summary, { size: 9.5, color: INK, leading: 1.45 });
    w.text(`${p.role.title}. ${p.results.metrics.slice(0, 3).map((m) => `${m.value} ${m.label}`).join("; ")}.`, { size: 9, color: MUTED, leading: 1.45 });
    w.text(`${identity.url}/work/${p.slug}`, { size: 8.5, color: ACCENT, after: 6 });
  }

  w.label("Experience");
  for (const e of experience) {
    page.drawText(clean(e.period), { x: M, y: w.y - 10, size: 9, font: regular, color: MUTED });
    const startY = w.y;
    w.text(`${e.title}, ${e.org}`, { size: 10.5, bold: true, x: M + 92, width: A4.w - M * 2 - 92, leading: 1.35 });
    w.text(e.summary, { size: 9.5, x: M + 92, width: A4.w - M * 2 - 92, leading: 1.45, after: 6 });
    if (w.y > startY - 20) w.y = startY - 20;
  }

  w.label("Skills");
  for (const g of skills) {
    page.drawText(clean(g.name), { x: M, y: w.y - 9.5, size: 9.5, font: bold, color: INK });
    w.text(g.items.join(" · "), { size: 9.5, x: M + 92, width: A4.w - M * 2 - 92, leading: 1.45, after: 3 });
  }

  w.y = M + 20;
  w.rule();
  w.text(`Generated from ${identity.domain}. The interactive version, with live demos and case studies told as chats, is at ${identity.url}.`, { size: 8, color: MUTED });

  return pdf.save();
}

export async function GET() {
  const bytes = await buildCv();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Adelia-Tiara-CV.pdf"`,
      "cache-control": "public, max-age=3600, must-revalidate",
    },
  });
}
