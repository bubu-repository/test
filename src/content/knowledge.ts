import { labItems, labUrl } from "./lab";
import { bio, experience, identity, modelCard, skills, socials, tagline } from "./profile";
import { projects } from "./projects";

/** Pages an agent or command may navigate to. */
export const siteMap = [
  { path: "/", title: "Home", description: "One small device, the AT-26, on white: its screen shows her name, role, city, her time next to yours and an ask line for Moci; a dial picks where to go; switches and keys run night mode, sound, the tour, the brief and the CV; P turns the screen off. Scroll down for polaroids of the three projects, a live board (her phone with the Bekasi sky, working-hours overlap, Ask Moci, find a time, workspaces, keycaps, the lab), the game on a PSP and a terminal on a laptop." },
  { path: "/work", title: "Work", description: "Three products as cards in a booster pack. Every case study reads as an article or plays out as a chat." },
  ...projects.map((p) => ({ path: `/work/${p.slug}`, title: `${p.name} case study`, description: p.tagline })),
  { path: "/lab", title: "Lab", description: "Every experiment: subdomain experiments and features built into this site. Has a gumball machine." },
  { path: "/about", title: "About", description: "About Adelia as a model card, CV download, and a job-description matcher." },
  { path: "/guestbook", title: "Guestbook", description: "A live scrapbook wall of notes from visitors." },
  { path: "/play", title: "Context Window (game)", description: "Snake, but you're an LLM eating tokens." },
] as const;

export type Doc = {
  id: string;
  title: string;
  text: string;
  /** Extra words that should match this doc even if they aren't in the text. */
  keywords: string[];
  href?: string;
};

/** Retrieval documents for the offline brain. Written as answer-ready sentences. */
export function buildDocs(): Doc[] {
  const docs: Doc[] = [
    {
      id: "who",
      title: "Who is Adelia",
      text: `${identity.name} is an ${identity.role} based in ${identity.location}. ${bio.short}`,
      keywords: ["who", "adelia", "about", "introduce", "yourself", "summary", "background", "tiara"],
      href: "/about",
    },
    {
      id: "what",
      title: "What she does",
      text: `${tagline} ${bio.long[0]}`,
      keywords: ["do", "does", "role", "job", "work", "end", "fullstack", "product", "engineer"],
      href: "/about",
    },
    {
      id: "approach",
      title: "How she works",
      text: bio.long[2],
      keywords: ["vibe", "coding", "approach", "process", "prototype", "method", "workflow", "ai", "pair"],
      href: "/about",
    },
    {
      id: "problems",
      title: "Favourite problems",
      text: bio.long[1],
      keywords: ["favourite", "favorite", "problems", "interest", "passion", "like", "enjoy", "agents"],
    },
    {
      id: "contact",
      title: "Contact",
      text: `The fastest way to reach Adelia is email: ${identity.email}. She replies within a day. You can also download her CV at /cv.pdf.`,
      keywords: ["contact", "email", "mail", "reach", "hire", "message", "talk", "call", "connect", "touch"],
      href: "/about",
    },
    {
      id: "availability",
      title: "Availability",
      text: `${bio.availability} She works ${identity.workingHours.start}:00–${identity.workingHours.end}:00 ${identity.timeZoneLabel} and is happy to overlap with other time zones for calls.`,
      keywords: ["available", "availability", "hire", "hiring", "open", "remote", "relocate", "job", "role", "full-time", "freelance", "start"],
      href: "/about",
    },
    {
      id: "location",
      title: "Location and time zone",
      text: `Adelia lives in ${identity.location}, just east of Jakarta. Her time zone is ${identity.timeZoneLabel}.`,
      keywords: ["where", "location", "based", "city", "country", "timezone", "time", "zone", "bekasi", "jakarta", "indonesia"],
    },
    {
      id: "cv",
      title: "CV",
      text: "Her CV is generated from the same data as this site, so it's always current. Download it at /cv.pdf.",
      keywords: ["cv", "resume", "résumé", "download", "pdf"],
      href: "/about",
    },
    {
      id: "skills",
      title: "Skills",
      text: skills.map((g) => `${g.name}: ${g.items.join(", ")}.`).join(" "),
      keywords: ["skills", "stack", "tech", "technologies", "tools", "languages", "know", "frameworks", "react", "next", "python", "typescript", "claude", "llm"],
      href: "/about",
    },
    {
      id: "experience",
      title: "Experience",
      text: experience.map((e) => `${e.period}: ${e.title}, ${e.org}. ${e.summary}`).join(" "),
      keywords: ["experience", "career", "history", "previous", "education", "degree", "university", "years", "worked"],
      href: "/about",
    },
    {
      id: "limits",
      title: "Honest limitations",
      text: `From her model card: ${modelCard.limitations.join("; ")}. Out of scope: ${modelCard.outOfScope.join("; ")}.`,
      keywords: ["weakness", "weaknesses", "limitations", "bad", "not", "scope"],
      href: "/about",
    },
    {
      id: "projects",
      title: "Projects overview",
      text: `Three featured products: ${projects.map((p) => `${p.name} (${p.kind}): ${p.tagline}`).join(" ")}`,
      keywords: ["projects", "work", "portfolio", "built", "shipped", "products", "case", "studies", "best"],
      href: "/work",
    },
    {
      id: "agents",
      title: "Agentic AI experience",
      text: `Every featured project ships an agent with tools and an eval set. ${projects
        .map((p) => `${p.name}: ${p.process.find((s) => s.call.startsWith("build") || s.call.startsWith("design(tools") || s.call.startsWith("agent"))?.body ?? p.summary}`)
        .join(" ")}`,
      keywords: ["agent", "agents", "agentic", "tool", "tools", "llm", "ai", "evals", "eval", "rag", "claude"],
      href: "/work",
    },
    {
      id: "lab",
      title: "Lab",
      text: `The Lab has experiments on their own subdomains (${labItems
        .filter((l) => l.where === "subdomain")
        .map((l) => `${l.name} at ${l.where === "subdomain" ? labUrl(l.subdomain) : ""}`)
        .join(", ")}) and interactive features built into this site, like the autopilot tour, the terminal and the Context Window game.`,
      keywords: ["lab", "experiments", "experiment", "playground", "fun", "creative", "webgl", "subdomain"],
      href: "/lab",
    },
    {
      id: "site",
      title: "About this site",
      text: "This site was designed and built by Adelia: Next.js, TypeScript, a raymarched WebGL mascot, a Claude-powered agent with tool use (that's me, Moci), live presence over Server-Sent Events, and everything synthesised in the browser, from sounds to the CV. Try X-ray mode to see how it's built.",
      keywords: ["site", "website", "built", "made", "stack", "this", "portfolio", "how", "nextjs", "tech"],
      href: "/lab",
    },
    {
      id: "moci",
      title: "Moci",
      text: "I'm Moci, Adelia's agent. I'm a jelly, I live on this site, and I can answer questions about her work, open pages, switch the theme, start a guided tour or copy her email for you.",
      keywords: ["moci", "you", "bot", "agent", "assistant", "jelly", "mascot", "name"],
    },
  ];

  for (const p of projects) {
    docs.push({
      id: `project-${p.slug}`,
      title: p.name,
      text: `${p.name} (${p.year}, ${p.kind}). ${p.summary} Her role: ${p.role.title}. ${p.role.summary} Stack: ${p.stack.join(", ")}. Results: ${p.results.metrics
        .map((m) => `${m.value} ${m.label}`)
        .join("; ")}.`,
      keywords: [p.slug, p.name.toLowerCase(), ...p.stack.map((s) => s.toLowerCase()), p.kind.toLowerCase()],
      href: `/work/${p.slug}`,
    });
    docs.push({
      id: `project-${p.slug}-lesson`,
      title: `${p.name}: lesson`,
      text: `On ${p.name}, the problem was: ${p.problem.body[0]} The key lesson: ${p.reflection}`,
      keywords: [p.slug, p.name.toLowerCase(), "lesson", "learned", "learn", "challenge", "hard", "problem", "difficult"],
      href: `/work/${p.slug}`,
    });
  }

  return docs;
}

/** The full knowledge base as text, for the server agent's system prompt. */
export function buildKnowledgeText(): string {
  const lines: string[] = [];
  lines.push(`# ${identity.name}`);
  lines.push(`Role: ${identity.role}. Location: ${identity.location}. Time zone: ${identity.timeZoneLabel}.`);
  lines.push(`Email: ${identity.email}. Website: ${identity.url}. CV: ${identity.url}/cv.pdf`);
  lines.push(`Tagline: ${tagline}`);
  lines.push(`Availability: ${bio.availability}`);
  lines.push(`Currently: ${bio.now}`);
  lines.push("", "## Bio", ...bio.long);
  lines.push("", "## Skills", ...skills.map((g) => `- ${g.name}: ${g.items.join(", ")}`));
  lines.push("", "## Experience", ...experience.map((e) => `- ${e.period} · ${e.title} · ${e.org}: ${e.summary}`));
  lines.push("", "## Model card (playful self-description)");
  lines.push(`Intended use: ${modelCard.intendedUse.join("; ")}`);
  lines.push(`Out of scope: ${modelCard.outOfScope.join("; ")}`);
  lines.push(`Limitations: ${modelCard.limitations.join("; ")}`);
  const socialLinks = socials.filter((s) => s.href);
  if (socialLinks.length) lines.push(`Socials: ${socialLinks.map((s) => `${s.label} ${s.href}`).join(", ")}`);

  lines.push("", "## Projects");
  for (const p of projects) {
    lines.push(``, `### ${p.name} (${p.year}) — ${p.kind}`, `Page: /work/${p.slug}`);
    lines.push(`Tagline: ${p.tagline}`);
    lines.push(`Summary: ${p.summary}`);
    lines.push(`Role: ${p.role.title}. ${p.role.summary} Team: ${p.team}. Timeline: ${p.timeline}.`);
    lines.push(`Stack: ${p.stack.join(", ")}`);
    lines.push(`Problem: ${p.problem.body.join(" ")} Constraints: ${p.problem.constraints.join("; ")}`);
    lines.push(`Process: ${p.process.map((s) => `${s.title} (${s.duration}): ${s.body}`).join(" ")}`);
    lines.push(`Results: ${p.results.metrics.map((m) => `${m.value} ${m.label}`).join("; ")}. ${p.results.body.join(" ")}`);
    lines.push(`Reflection: ${p.reflection}`);
    lines.push(`Links: live ${p.links.live}, repo ${p.links.repo}`);
  }

  lines.push("", "## Lab");
  for (const item of labItems) {
    const where = item.where === "subdomain" ? labUrl(item.subdomain) : "built into this site";
    lines.push(`- ${item.name} (${where}): ${item.blurb}`);
  }

  lines.push("", "## Site map", ...siteMap.map((s) => `- ${s.path}: ${s.title}. ${s.description}`));
  return lines.join("\n");
}
