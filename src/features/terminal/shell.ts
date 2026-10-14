import { labItems } from "@/content/lab";
import { bio, experience, identity, skills, tagline } from "@/content/profile";
import { projects } from "@/content/projects";
import type { SiteAction } from "@/lib/actions";
import { visitorTimeZone, formatTime } from "@/lib/time";
import { think } from "../agent/brain";

/**
 * A tiny shell over a virtual filesystem that mirrors the site.
 * Directories map to routes, so `cd work` also navigates the page.
 */

export type Line =
  | { kind: "out"; text: string; tone?: "muted" | "accent" | "ok" | "warn" }
  | { kind: "link"; text: string; href: string; external?: boolean }
  | { kind: "art"; text: string };

export type ShellResult = { lines: Line[]; actions?: SiteAction[]; cwd?: string; clear?: boolean; close?: boolean };

type Dir = { route: string; children: Record<string, Dir | string> };

const file = (text: string) => text;

function buildFs(): Dir {
  const work: Dir = {
    route: "/work",
    children: Object.fromEntries(
      projects.map((p) => [
        `${p.slug}.md`,
        file(
          [
            `# ${p.name} (${p.year})`,
            p.tagline,
            "",
            p.summary,
            "",
            `role:     ${p.role.title}`,
            `team:     ${p.team}`,
            `timeline: ${p.timeline}`,
            `stack:    ${p.stack.join(", ")}`,
            "",
            ...p.results.metrics.map((m) => `  • ${m.value}  ${m.label}`),
            "",
            `→ open ${p.slug}`,
          ].join("\n"),
        ),
      ]),
    ),
  };
  const lab: Dir = {
    route: "/lab",
    children: Object.fromEntries(
      labItems.map((l) => [`${l.slug}.feature`, file(`${l.name}\n${l.blurb}\n→ open ${l.slug}`)]),
    ),
  };
  return {
    route: "/",
    children: {
      work,
      lab,
      about: {
        route: "/about",
        children: {
          "bio.txt": file(bio.long.join("\n\n")),
          "skills.txt": file(skills.map((g) => `${g.name}\n  ${g.items.join(" · ")}`).join("\n\n")),
          "experience.txt": file(experience.map((e) => `${e.period}  ${e.title}\n  ${e.org}\n  ${e.summary}`).join("\n\n")),
          "cv.pdf": file("Binary file. Run `cv` to download it."),
        },
      },
      guestbook: { route: "/guestbook", children: { "README.txt": file("Leave a creature: open the guestbook, pick a sea creature and a colour, write a line and let it swim.") } },
      "README.md": file(`# adelia.cc\n${identity.name} · ${identity.role} · ${identity.location}\n${tagline}\n\nTry: ls, cd work, cat README.md, open tenderlens, ask "is she available?", help`),
      "contact.txt": file(`email: ${identity.email}\nhours: ${identity.workingHours.start}:00–${identity.workingHours.end}:00 ${identity.timeZoneLabel}\n${bio.availability}`),
      "now.txt": file(bio.now),
      ".secret": file("↑ ↑ ↓ ↓ ← → ← → B A\nPress it anywhere on the site.\nOn a phone, swipe it and then tap twice.\nNo patience? Type `konami`."),
    },
  };
}

const fs = buildFs();

function resolve(cwd: string, target = "."): string {
  const parts = (target.startsWith("/") ? target : `${cwd}/${target}`).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === "." || part === "~") {
      if (part === "~") out.length = 0;
      continue;
    }
    if (part === "..") out.pop();
    else out.push(part);
  }
  return `/${out.join("/")}`;
}

function lookup(path: string): Dir | string | null {
  let node: Dir | string = fs;
  for (const part of path.split("/").filter(Boolean)) {
    if (typeof node === "string") return null;
    const next: Dir | string | undefined = node.children[part];
    if (next === undefined) return null;
    node = next;
  }
  return node;
}

export function routeToCwd(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && first in fs.children && typeof fs.children[first] !== "string" ? `/${first}` : "/";
}

export const COMMANDS = [
  "help", "ls", "cd", "pwd", "cat", "open", "whoami", "neofetch", "ask", "moci", "sound", "tour",
  "email", "cv", "clear", "history", "date", "echo", "stickers", "brief", "exit", "sudo",
  "konami",
];

export function complete(input: string, cwd: string): string | null {
  const parts = input.split(" ");
  if (parts.length === 1) {
    const matches = COMMANDS.filter((c) => c.startsWith(parts[0]));
    return matches.length === 1 ? `${matches[0]} ` : null;
  }
  const partial = parts[parts.length - 1];
  const base = partial.includes("/") ? partial.slice(0, partial.lastIndexOf("/") + 1) : "";
  const dirNode = lookup(resolve(cwd, base || "."));
  if (!dirNode || typeof dirNode === "string") return null;
  const stem = partial.slice(base.length);
  const options = Object.keys(dirNode.children).filter((name) => name.startsWith(stem) && (stem.startsWith(".") || !name.startsWith(".")));
  if (parts[0] === "open") options.push(...projects.map((p) => p.slug).filter((s) => s.startsWith(stem)));
  if (options.length !== 1) return null;
  const node = dirNode.children[options[0]];
  parts[parts.length - 1] = base + options[0] + (node && typeof node !== "string" ? "/" : "");
  return parts.join(" ");
}

const MOCI = String.raw`
     .-""""-.
   .'  ●  ●  '.
  /     ▾      \
 |   ˘       ˘  |
  \            /
   '-.______.-'`;

export function run(raw: string, cwd: string, history: string[]): ShellResult {
  const input = raw.trim();
  if (!input) return { lines: [] };
  const [cmd, ...args] = input.match(/"[^"]*"|\S+/g)?.map((a) => a.replace(/^"|"$/g, "")) ?? [];
  const arg = args.join(" ");

  switch (cmd) {
    case "help":
      return {
        lines: [
          { kind: "out", text: "Commands", tone: "accent" },
          { kind: "out", text: "  ls [dir]        list a directory          cd <dir>     change directory (and page)" },
          { kind: "out", text: "  cat <file>      print a file              open <name>  open a page or project" },
          { kind: "out", text: "  ask <question>  ask Moci (offline brain)  moci <q>     ask Moci in the chat panel" },
          { kind: "out", text: "  whoami · neofetch · date · history · echo · clear · exit" },
          { kind: "out", text: "  sound [on|off] · tour · brief · stickers" },
          { kind: "out", text: "  email (copies it) · cv (downloads it)" },
          { kind: "out", text: "Tab completes, ↑ ↓ walk history, Ctrl+L clears.", tone: "muted" },
        ],
      };
    case "ls": {
      const showHidden = args.includes("-a") || args.includes("-la");
      const target = args.find((a) => !a.startsWith("-"));
      const node = lookup(resolve(cwd, target));
      if (!node) return { lines: [{ kind: "out", text: `ls: ${target}: No such file or directory`, tone: "warn" }] };
      if (typeof node === "string") return { lines: [{ kind: "out", text: target ?? "" }] };
      const names = Object.entries(node.children)
        .filter(([name]) => showHidden || !name.startsWith("."))
        .map(([name, child]) => (typeof child === "string" ? name : `${name}/`));
      return { lines: [{ kind: "out", text: names.join("   ") }] };
    }
    case "cd": {
      const path = resolve(cwd, arg || "~");
      const node = lookup(path);
      if (!node || typeof node === "string") return { lines: [{ kind: "out", text: `cd: ${arg}: Not a directory`, tone: "warn" }] };
      return { lines: [], cwd: path, actions: [{ type: "navigate", href: node.route }] };
    }
    case "pwd":
      return { lines: [{ kind: "out", text: `~${cwd === "/" ? "" : cwd}` }] };
    case "cat": {
      if (!arg) return { lines: [{ kind: "out", text: "cat: which file? Try `cat README.md`", tone: "warn" }] };
      const node = lookup(resolve(cwd, arg));
      if (node === null) return { lines: [{ kind: "out", text: `cat: ${arg}: No such file`, tone: "warn" }] };
      if (typeof node !== "string") return { lines: [{ kind: "out", text: `cat: ${arg}: Is a directory`, tone: "warn" }] };
      return { lines: node.split("\n").map((text) => ({ kind: "out" as const, text })) };
    }
    case "open": {
      if (!arg) return { lines: [{ kind: "out", text: "open: open what? Try `open tenderlens` or `open lab`", tone: "warn" }] };
      const name = arg.replace(/\.(md|url|feature)$/, "").replace(/\/$/, "").toLowerCase();
      const project = projects.find((p) => p.slug === name || p.name.toLowerCase() === name);
      if (project) return { lines: [{ kind: "out", text: `Opening ${project.name}…`, tone: "ok" }], actions: [{ type: "navigate", href: `/work/${project.slug}` }] };
      const lab = labItems.find((l) => l.slug === name || l.name.toLowerCase() === name);
      if (lab) return { lines: [{ kind: "out", text: `Running ${lab.name}…`, tone: "ok" }], actions: [lab.action] };
      const dir = lookup(resolve("/", name));
      if (dir && typeof dir !== "string") return { lines: [{ kind: "out", text: `Opening ${dir.route}…`, tone: "ok" }], actions: [{ type: "navigate", href: dir.route }], cwd: resolve("/", name) };
      return { lines: [{ kind: "out", text: `open: nothing called “${arg}”. Try \`ls work\` or \`ls lab\`.`, tone: "warn" }] };
    }
    case "whoami": {
      const zone = visitorTimeZone();
      return {
        lines: [
          { kind: "out", text: "visitor (a curious human, probably)" },
          { kind: "out", text: `local time: ${formatTime(zone)} (${zone})`, tone: "muted" },
          { kind: "out", text: `in Bekasi it's ${formatTime(identity.timeZone)}`, tone: "muted" },
        ],
      };
    }
    case "neofetch":
      return {
        lines: [
          { kind: "art", text: MOCI },
          { kind: "out", text: `${identity.name.toLowerCase().replace(" ", "")}@${identity.domain}`, tone: "accent" },
          { kind: "out", text: "-----------------------" },
          { kind: "out", text: `role      ${identity.role}` },
          { kind: "out", text: `location  ${identity.location} · ${identity.timeZoneLabel}` },
          { kind: "out", text: "shell     moci-sh 1.0 (jelly)" },
          { kind: "out", text: "stack     Next.js · TypeScript · Claude · Postgres · WebGL" },
          { kind: "out", text: `projects  ${projects.map((p) => p.name).join(", ")}` },
          { kind: "out", text: "uptime    since 2018, with coffee breaks" },
        ],
      };
    case "ask": {
      if (!arg) return { lines: [{ kind: "out", text: 'ask: what? e.g. ask "what is her strongest project?"', tone: "warn" }] };
      const answer = think(arg);
      return {
        lines: [
          { kind: "out", text: `moci> ${answer.text}`, tone: "accent" },
          ...(answer.href ? [{ kind: "link" as const, text: `→ ${answer.href}`, href: answer.href }] : []),
        ],
        actions: answer.actions,
      };
    }
    case "moci":
      return { lines: [{ kind: "out", text: "Opening the chat with Moci…", tone: "ok" }], actions: [{ type: "ask", question: arg || "Hi Moci!" }], close: true };
    case "sound":
      return { lines: [{ kind: "out", text: `sound → ${arg || "toggled"}`, tone: "ok" }], actions: [{ type: "sound", value: arg ? arg === "on" : undefined }] };
    case "tour":
      return { lines: [{ kind: "out", text: "Starting the guided walk…", tone: "ok" }], actions: [{ type: "tour" }], close: true };
    case "brief":
      return { lines: [], actions: [{ type: "open", panel: "brief" }], close: true };
    case "stickers":
      return { lines: [], actions: [{ type: "open", panel: "stickers" }], close: true };
    case "email":
      return { lines: [{ kind: "out", text: `${identity.email} (copied to your clipboard)`, tone: "ok" }], actions: [{ type: "copyEmail" }] };
    case "cv":
      return { lines: [{ kind: "out", text: "Downloading Adelia-Tiara-CV.pdf…", tone: "ok" }], actions: [{ type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" }] };
    case "clear":
      return { lines: [], clear: true };
    case "history":
      return { lines: history.map((h, i) => ({ kind: "out" as const, text: `${String(i + 1).padStart(4)}  ${h}` })) };
    case "date":
      return { lines: [{ kind: "out", text: new Date().toString() }] };
    case "echo":
      return { lines: [{ kind: "out", text: arg }] };
    case "exit":
      return { lines: [], close: true };
    case "sudo":
      if (/hire\s+adelia/i.test(arg)) {
        return {
          lines: [
            { kind: "out", text: "[sudo] password for visitor: ••••••••", tone: "muted" },
            { kind: "out", text: "Permission granted. Excellent decision.", tone: "ok" },
            { kind: "out", text: `Her email is on your clipboard: ${identity.email}`, tone: "accent" },
          ],
          actions: [{ type: "copyEmail" }],
        };
      }
      return { lines: [{ kind: "out", text: "visitor is not in the sudoers file. This incident will be reported to Moci. (Try `sudo hire adelia`.)", tone: "warn" }] };
    case "konami":
    case "uuddlrlrba":
      return { lines: [{ kind: "out", text: "↑ ↑ ↓ ↓ ← → ← → B A. Close enough.", tone: "accent" }], actions: [{ type: "konami" }], close: true };
    case "rm":
      return { lines: [{ kind: "out", text: "rm: Moci is jelly, not reckless. Nothing was deleted.", tone: "warn" }] };
    case "vim":
    case "vi":
    case "emacs":
    case "nano":
      return { lines: [{ kind: "out", text: `${cmd}: this terminal only has one editor, and it's the guestbook.`, tone: "muted" }] };
    default:
      return { lines: [{ kind: "out", text: `${cmd}: command not found. Type \`help\`.`, tone: "warn" }] };
  }
}
