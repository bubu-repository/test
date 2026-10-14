import { labItems, labUrl } from "./lab";
import { bio, experience, identity, modelCard, skills, socials, tagline } from "./profile";
import { projects } from "./projects";

/** Pages an agent or command may navigate to. */
export const siteMap = [
  {
    path: "/",
    title: "Home",
    description:
      "A small frosted-glass device with her name, 'AI Product Engineer, class of 2026', Bekasi and one line on what she designs, plus three buttons: open the work, the CV and email. On wide screens the key screens of her products float in the sky beside it. Below: four case cards (Tenderlens, Ask HR, Catat, Lintas) with real screens and numbers, the four rules she builds by, and a door to the lab. Every page ends at the sea, where you can tap the water and sail a paper boat.",
  },
  {
    path: "/work",
    title: "Work",
    description:
      "Four case studies (Tenderlens, Ask HR, Catat, Lintas) with a reading guide: which case answers which hiring question. Each case reads as an article, and can also play out as a chat at the end.",
  },
  ...projects.map((p) => ({ path: `/work/${p.slug}`, title: `${p.name} case study`, description: p.tagline })),
  {
    path: "/colophon",
    title: "How this site is built",
    description:
      "The engineering behind the site: Moci the agent (Claude with tool use, server-side validation, a claim check on every answer, signed history, a daily budget, an offline retrieval fallback that cites its sources), guardrail checks run at build time, an eval of Moci you can run in the browser, the site's speed on a cheap phone, and the stack.",
  },
  {
    path: "/lab",
    title: "Lab",
    description:
      "Experiments on their own subdomains, a job-description matcher and her model card. At the bottom, in a box that starts closed: the toys (a gumball machine, a live board from Bekasi, a terminal, her products as booster packs of trading cards, and the features built into this site).",
  },
  {
    path: "/about",
    title: "About",
    description:
      "About Adelia: her ID card on a lanyard, the short story and path, an MP3 player of the songs she codes to (original synth loops; you can drop your own song on it), a CD shelf of the games that taught her about design (Story of Seasons, Kingdom Hearts, Stardew Valley, Animal Crossing, Persona 5) with what each one taught her, the practical details for hiring teams (level, location, notice, languages, references) and the CV.",
  },
  { path: "/guestbook", title: "Guestbook", description: "A live scrapbook wall of notes from visitors." },
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
      text: `${identity.name} is a fresh graduate and an ${identity.role}, Informatics class of 2026, based in ${identity.location}. ${bio.short}`,
      keywords: ["who", "adelia", "about", "introduce", "yourself", "summary", "background", "tiara", "graduate", "new", "grad", "junior", "fresh", "level", "experience", "senior"],
      href: "/about",
    },
    {
      id: "what",
      title: "What she does",
      text: `${tagline} ${bio.long[0]}`,
      keywords: ["do", "does", "role", "job", "work", "end", "product", "designer", "design", "ux", "ui", "engineer", "code"],
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
      text: `Four featured products: ${projects.map((p) => `${p.name} (${p.kind}): ${p.tagline}`).join(" ")}`,
      keywords: ["projects", "work", "portfolio", "built", "shipped", "products", "case", "studies", "best"],
      href: "/work",
    },
    {
      id: "agents",
      title: "Designing AI products",
      text: `She designs and builds how AI shows its work: sources, abstaining, evals, and a cheap way to fix mistakes. ${projects.map((p) => `${p.name}: ${p.decisions[0].title}. ${p.decisions[0].why}`).join(" ")}`,
      keywords: ["agent", "agents", "agentic", "tool", "tools", "llm", "ai", "evals", "eval", "trust", "uncertainty", "design", "claude"],
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
      text: "This site was designed and built by Adelia in Next.js and TypeScript. I'm Moci, its agent: Claude with tool use, streamed to your browser, with every tool call checked on the server before anything happens on your screen, and an offline retrieval brain that answers from the same knowledge base when the API isn't available. The CV is generated from the same data as the pages. The full write-up is at /colophon.",
      keywords: ["site", "website", "built", "made", "stack", "this", "portfolio", "how", "nextjs", "tech", "colophon", "moci", "agent"],
      href: "/colophon",
    },
    {
      id: "moci",
      title: "Moci",
      text: "I'm Moci, Adelia's agent. I live on this site wearing a little version of her, and I can answer questions about her work, open pages, turn the sound on or off, show you how the site works or copy her email for you. I'm an AI agent, not Adelia.",
      keywords: ["moci", "you", "bot", "agent", "assistant", "mascot", "character", "name"],
    },
  ];

  for (const p of projects) {
    docs.push({
      id: `project-${p.slug}`,
      title: p.name,
      text: `${p.name} (${p.year}, ${p.kind}). ${p.summary} Her role: ${p.role.title}. ${p.role.summary} Stack: ${p.stack.join(", ")}. Results: ${p.results.metrics
        .map((m) => `${m.value} ${m.label}`)
        .join("; ")}.`,
      keywords: [
        p.slug,
        p.name.toLowerCase(),
        ...p.stack.map((s) => s.toLowerCase()),
        p.kind.toLowerCase(),
        p.context.toLowerCase(),
        ...(p.company ? ["company", "startup", "in-house", "intern", "internship"] : []),
      ],
      href: `/work/${p.slug}`,
    });
    // The engineering, split by question so retrieval finds the right part.
    const e = p.engineering;
    const eng = `/work/${p.slug}#engineering`;
    const base = [p.slug, p.name.toLowerCase()];
    docs.push({
      id: `project-${p.slug}-engineering`,
      title: `${p.name}: how it's built`,
      text: `${e.summary} The pipeline: ${e.pipeline.map((x) => `${x.step}: ${x.detail}`).join(" ")}`,
      keywords: [...base, "built", "build", "engineering", "architecture", "pipeline", "works", "system", "stack"],
      href: eng,
    });
    docs.push({
      id: `project-${p.slug}-evals`,
      title: `${p.name}: evals`,
      text: `${e.evals.set} ${e.evals.gate}`,
      keywords: [...base, "eval", "evals", "evaluate", "evaluated", "evaluation", "test", "tested", "accuracy", "measure", "measured", "frozen", "labelled", "quality"],
      href: eng,
    });
    docs.push({
      id: `project-${p.slug}-models`,
      title: `${p.name}: models`,
      text: e.models.map((m) => `For ${m.task.toLowerCase()}, ${p.name} uses ${m.model}: ${m.why}`).join(" "),
      keywords: [...base, "model", "models", "llm", "claude", "use", "uses", "why", "which", "choose", "chose"],
      href: eng,
    });
    docs.push({
      id: `project-${p.slug}-budgets`,
      title: `${p.name}: cost and latency`,
      text: e.budgets.map((b) => `${b.label}: ${b.value}, ${b.note}.`).join(" "),
      keywords: [...base, "cost", "costs", "latency", "fast", "slow", "budget", "budgets", "price", "run", "money", "expensive", "cheap"],
      href: eng,
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
    const e = p.engineering;
    lines.push(`Engineering: ${e.summary} Pipeline: ${e.pipeline.map((x) => `${x.step}: ${x.detail}`).join(" ")}`);
    lines.push(`Models: ${e.models.map((m) => `${m.task}: ${m.model} (${m.why})`).join("; ")}`);
    lines.push(
      `Evals: ${e.evals.set} ${e.evals.gate} Latest (${e.evals.history.at(-1)?.version}): ${e.evals.series.map((x, i) => `${x.name} ${e.evals.history.at(-1)?.values[i]}${x.unit}`).join(", ")}.`,
    );
    lines.push(`Budgets: ${e.budgets.map((b) => `${b.label} ${b.value} (${b.note})`).join("; ")}`);
    lines.push(`Failure handling: ${e.failures.map((f) => `${f.when}: ${f.then}`).join(" ")}`);
    lines.push(`Results: ${p.results.metrics.map((m) => `${m.value} ${m.label} (${m.how})`).join("; ")}. ${p.results.body.join(" ")} Business: ${p.results.business}`);
    lines.push(`Reflection: ${p.reflection}`);
    lines.push(p.links.live ? `Links: live ${p.links.live}${p.links.repo ? `, repo ${p.links.repo}` : ""}` : `Where: ${p.company ?? "in-house"}`);
    lines.push(`Status: ${p.status}`);
  }

  lines.push("", "## Lab");
  for (const item of labItems) {
    const where = item.where === "subdomain" ? labUrl(item.subdomain) : "built into this site";
    lines.push(`- ${item.name} (${where}): ${item.blurb}`);
  }

  lines.push("", "## Site map", ...siteMap.map((s) => `- ${s.path}: ${s.title}. ${s.description}`));
  return lines.join("\n");
}
