import { labItems, labUrl } from "@/content/lab";
import { nav } from "@/content/profile";
import { projects } from "@/content/projects";
import type { SiteAction } from "@/lib/actions";

export type CommandGroup = "Navigate" | "Projects" | "Actions" | "Lens" | "Lab" | "Settings";

export type Command = {
  id: string;
  group: CommandGroup;
  title: string;
  subtitle?: string;
  keywords?: string;
  icon: string;
  /** Visible shortcut hint, e.g. ["G", "W"]. */
  keys?: string[];
} & ({ action: SiteAction } | { external: string });

export const commands: Command[] = [
  { id: "home", group: "Navigate", title: "Home", subtitle: "The hub", icon: "🏠", keys: ["G", "H"], action: { type: "navigate", href: "/" } },
  ...nav.map(
    (item): Command => ({
      id: `nav-${item.href}`,
      group: "Navigate",
      title: item.label,
      icon: { "/work": "🃏", "/lab": "🧪", "/about": "🪪", "/guestbook": "📒" }[item.href] ?? "→",
      keys: ["G", item.label[0]],
      action: { type: "navigate", href: item.href },
    }),
  ),
  { id: "play", group: "Navigate", title: "Play Context Window", subtitle: "Snake, but you're an LLM", keywords: "game snake fun", icon: "🐍", action: { type: "navigate", href: "/play" } },
  ...projects.map(
    (p): Command => ({
      id: `project-${p.slug}`,
      group: "Projects",
      title: p.name,
      subtitle: p.tagline,
      keywords: `${p.kind} ${p.stack.join(" ")} case study`,
      icon: p.slug === "tenderlens" ? "📑" : p.slug === "catat" ? "🎙️" : "🚆",
      action: { type: "navigate", href: `/work/${p.slug}` },
    }),
  ),
  { id: "ask", group: "Actions", title: "Ask Moci", subtitle: "Questions about Adelia's work", keywords: "agent ai chat question", icon: "🫧", keys: ["/"], action: { type: "open", panel: "agent" } },
  { id: "tour", group: "Actions", title: "Start the autopilot tour", subtitle: "Moci drives for 40 seconds", keywords: "guide demo walkthrough", icon: "🛸", keys: ["T"], action: { type: "tour" } },
  { id: "brief", group: "Actions", title: "40-second brief", subtitle: "Everything a recruiter needs", keywords: "recruiter summary hr quick tl;dr", icon: "⏱️", keys: ["B"], action: { type: "open", panel: "brief" } },
  { id: "email", group: "Actions", title: "Copy email address", subtitle: "aadeliatiara@gmail.com", keywords: "contact mail hire", icon: "✉️", action: { type: "copyEmail" } },
  { id: "cv", group: "Actions", title: "Download CV", subtitle: "PDF, generated from this site", keywords: "resume pdf", icon: "📄", action: { type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" } },
  { id: "terminal", group: "Actions", title: "Open terminal", subtitle: "Explore the site from a CLI", keywords: "cli shell console command", icon: "⌨️", keys: ["`"], action: { type: "open", panel: "terminal" } },
  { id: "stickers", group: "Actions", title: "Sticker book", subtitle: "Collect and place stickers", keywords: "achievements badges collect", icon: "🌟", keys: ["S"], action: { type: "open", panel: "stickers" } },
  { id: "shortcuts", group: "Actions", title: "Keyboard shortcuts", keywords: "keys help hotkeys", icon: "⌨️", keys: ["?"], action: { type: "open", panel: "shortcuts" } },
  { id: "lens-recruiter", group: "Lens", title: "I'm a recruiter", subtitle: "Brief, CV and contact first", keywords: "hr hiring lens view", icon: "💼", action: { type: "lens", value: "recruiter" } },
  { id: "lens-engineer", group: "Lens", title: "I'm an engineer", subtitle: "Stack, agents and the terminal first", keywords: "developer dev lens view", icon: "🛠️", action: { type: "lens", value: "engineer" } },
  { id: "lens-designer", group: "Lens", title: "I'm a designer", subtitle: "Work, stickers and the lab first", keywords: "design ux lens view", icon: "🎨", action: { type: "lens", value: "designer" } },
  { id: "lens-curious", group: "Lens", title: "Just curious", subtitle: "The fun stuff first", keywords: "explore lens view fun", icon: "✨", action: { type: "lens", value: "curious" } },
  ...labItems
    .filter((item) => item.where === "subdomain")
    .map(
      (item): Command => ({
        id: `lab-${item.slug}`,
        group: "Lab",
        title: item.name,
        subtitle: item.where === "subdomain" ? `${item.subdomain}.adelia.cc` : undefined,
        keywords: `${item.tags.join(" ")} ${item.blurb}`,
        icon: "🧪",
        external: item.where === "subdomain" ? labUrl(item.subdomain) : "/lab",
      }),
    ),
  { id: "theme", group: "Settings", title: "Toggle night sky", subtitle: "Dark / light theme", keywords: "dark light mode theme", icon: "🌙", keys: ["D"], action: { type: "theme" } },
  { id: "sound", group: "Settings", title: "Toggle sound", subtitle: "Synthesised jelly sounds", keywords: "audio mute", icon: "🔊", action: { type: "sound" } },
  { id: "xray", group: "Settings", title: "Toggle X-ray mode", subtitle: "See how the page is built", keywords: "debug components outline inspect", icon: "🩻", keys: ["X"], action: { type: "xray" } },
  { id: "live", group: "Settings", title: "Toggle live cursors", subtitle: "Show or hide other visitors", keywords: "presence multiplayer realtime", icon: "🫧", action: { type: "liveCursors" } },
];
