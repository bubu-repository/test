import { labItems } from "@/content/lab";
import { nav } from "@/content/profile";
import { projects } from "@/content/projects";
import type { SiteAction } from "@/lib/actions";
import { labGlyphText } from "../lab/glyphs";

export type CommandGroup = "Navigate" | "Projects" | "Actions" | "Lens" | "Lab" | "Settings";

export type Command = {
  id: string;
  group: CommandGroup;
  title: string;
  subtitle?: string;
  keywords?: string;
  /** A short printed glyph (1–3 characters), shown on a small key. */
  icon: string;
  /** Visible shortcut hint, e.g. ["G", "W"]. */
  keys?: string[];
} & ({ action: SiteAction } | { external: string });

export const commands: Command[] = [
  { id: "home", group: "Navigate", title: "Home", subtitle: "The hub", icon: "⌂", keys: ["G", "H"], action: { type: "navigate", href: "/" } },
  ...nav.map(
    (item): Command => ({
      id: `nav-${item.href}`,
      group: "Navigate",
      title: item.label,
      icon: { "/work": "◆", "/lab": "◎", "/about": "ID", "/guestbook": "✎" }[item.href] ?? "→",
      keys: ["G", item.label[0]],
      action: { type: "navigate", href: item.href },
    }),
  ),
  ...projects.map(
    (p): Command => ({
      id: `project-${p.slug}`,
      group: "Projects",
      title: p.name,
      subtitle: p.tagline,
      keywords: `${p.kind} ${p.stack.join(" ")} case study`,
      icon: p.index,
      action: { type: "navigate", href: `/work/${p.slug}` },
    }),
  ),
  { id: "ask", group: "Actions", title: "Ask Moci", subtitle: "Questions about Adelia's work", keywords: "agent ai chat question", icon: "/", keys: ["/"], action: { type: "open", panel: "agent" } },
  { id: "tour", group: "Actions", title: "How this site works", subtitle: "A short guided walk, one spotlight at a time", keywords: "guide help tutorial walkthrough tour", icon: "➤", keys: ["T"], action: { type: "tour" } },
  { id: "brief", group: "Actions", title: "40-second brief", subtitle: "Everything a recruiter needs", keywords: "recruiter summary hr quick tl;dr", icon: "40", keys: ["B"], action: { type: "open", panel: "brief" } },
  { id: "email", group: "Actions", title: "Copy email address", subtitle: "aadeliatiara@gmail.com", keywords: "contact mail hire", icon: "@", action: { type: "copyEmail" } },
  { id: "cv", group: "Actions", title: "Download CV", subtitle: "PDF, generated from this site", keywords: "resume pdf", icon: "CV", action: { type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" } },
  { id: "terminal", group: "Actions", title: "Open terminal", subtitle: "Explore the site from a CLI", keywords: "cli shell console command", icon: ">_", keys: ["`"], action: { type: "open", panel: "terminal" } },
  { id: "stickers", group: "Actions", title: "Sticker book", subtitle: "Collect and place stickers", keywords: "achievements badges collect", icon: "★", keys: ["S"], action: { type: "open", panel: "stickers" } },
  { id: "shortcuts", group: "Actions", title: "Keyboard shortcuts", keywords: "keys help hotkeys", icon: "?", keys: ["?"], action: { type: "open", panel: "shortcuts" } },
  { id: "lens-recruiter", group: "Lens", title: "I'm a recruiter", subtitle: "Brief, CV and contact first", keywords: "hr hiring lens view", icon: "R", action: { type: "lens", value: "recruiter" } },
  { id: "lens-engineer", group: "Lens", title: "I'm an engineer", subtitle: "Stack, agents and the terminal first", keywords: "developer dev lens view", icon: "E", action: { type: "lens", value: "engineer" } },
  { id: "lens-designer", group: "Lens", title: "I'm a designer", subtitle: "Work, stickers and the lab first", keywords: "design ux lens view", icon: "D", action: { type: "lens", value: "designer" } },
  { id: "lens-curious", group: "Lens", title: "Just curious", subtitle: "The fun stuff first", keywords: "explore lens view fun", icon: "C", action: { type: "lens", value: "curious" } },
  ...labItems
    .filter((item) => item.onLab)
    .map(
      (item): Command => ({
        id: `lab-${item.slug}`,
        group: "Lab",
        title: item.name,
        subtitle: item.actionLabel,
        keywords: `${item.tags.join(" ")} ${item.blurb}`,
        icon: labGlyphText(item.slug),
        action: item.action,
      }),
    ),
  { id: "sound", group: "Settings", title: "Toggle sound", subtitle: "Soft interface sounds", keywords: "audio mute", icon: "♪", action: { type: "sound" } },
  { id: "live", group: "Settings", title: "Toggle live cursors", subtitle: "Show or hide other visitors", keywords: "presence multiplayer realtime", icon: "➶", action: { type: "liveCursors" } },
];
