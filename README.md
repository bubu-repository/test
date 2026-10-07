# adelia.cc

Portfolio of **Adelia Tiara**, AI Product Engineer in Bekasi, Indonesia. The main site lives at `adelia.cc`; five interactive experiments live on their own subdomains (`bloom`, `tokens`, `swarm`, `type`, `palette`.adelia.cc) and everything is indexed at `/lab`.

The whole site is in English. Sample copy is marked `CONTOH — ganti dengan data asli` (see [Placeholders](#placeholders-to-replace)).

## Run it

Requires Node 22+ and npm 10+.

```bash
npm install
npm run dev          # http://localhost:3000 (also builds the labs into public/labs)
npm run build && npm start
npm run lint
npm run typecheck
```

`npm run labs` rebuilds only the subdomain experiments (`node scripts/build-labs.mjs [slug]`).

## Environment variables

Everything works without any of them; each one upgrades a feature.

| Variable | What it enables | Without it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Moci, the site agent (`/api/agent`), answers with Claude and can act on the page (navigate, switch theme, start the tour, copy the email, download the CV). | An offline brain (BM25 retrieval over the site content in `src/content/knowledge.ts`) answers instead. The UI shows which one answered. |
| `ANTHROPIC_MODEL` | Overrides the model (default `claude-opus-5-5`). | Default model. |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel KV) or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Persistent guestbook notes and the "visits today" counter. | In-memory storage: works, but resets when the server restarts. |

Live presence and cursors use server-sent events from `/api/live` with an in-memory hub. On serverless hosting with many instances, visitors on different instances won't see each other; same-browser tabs always sync through `BroadcastChannel`.

## Deploying, including the subdomains

1. Deploy the Next.js app (e.g. Vercel) on `adelia.cc`.
2. Add a wildcard domain `*.adelia.cc` (or each of `bloom`, `tokens`, `swarm`, `type`, `palette`) to the same project. `src/proxy.ts` serves `<slug>.adelia.cc` from `public/labs/<slug>/`, which the build creates from `labs/<slug>/`.
3. Prefer separate hosting for an experiment? `dist-labs/<slug>/` is a self-contained static site; point the subdomain at it.

## What's in it

| Route | What it is |
| --- | --- |
| `/` | Name, role, city and live Bekasi time above the fold; an ask box for Moci; two ways in (the work, or a 40-second autopilot tour); three case studies; six live widgets (Bekasi weather with a WebGL sky shader driven by real weather, working-hours overlap ring, Ask Moci, swipe-up availability card, the lab, the game). |
| `/work` | The three projects as cards in a booster pack you tear open. |
| `/work/[slug]` | Case study: problem, role, process, architecture, before/after, results, reflection, plus live and repo links. Read it as an article or chat through it: the story unfolds message by message with verified numbers, and you can ask your own questions. |
| `/lab` | Gumball machine, the five subdomain experiments with live previews, and every feature built into the site with a button that runs it. |
| `/about` | Story, path, model card, skills, a contact card with live clock and visit counter, a lanyard ID badge, and a job-description matcher (`/about#match`). |
| `/cv.pdf` | CV generated from the same content with `pdf-lib`, prerendered at build. |
| `/guestbook` | Moderated, rate-limited notes that appear for everyone live. |
| `/play` | Context Window: snake, but you're an LLM. |
| 404 | Moci confidently writes the missing page, then fact-checks itself and suggests real pages. |

Everywhere: a dock of app icons as navigation (magnifies under the cursor, live calendar tile), ⌘K command palette (navigate, run actions, answer questions), terminal (`` ` ``), autopilot tour, 40-second brief for recruiters (`b`), sticker collection (`s`), X-ray mode showing how each part is built (`x`), live cursors, synthesised sound effects (off by default), light/dark theme, view transitions between pages, and a Konami code. Press `?` for every shortcut; single-key shortcuts can be turned off.

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components, `proxy.ts`), React 19, TypeScript strict
- Tailwind CSS 4 mapped to the design tokens only (default colours, shadows, radii and fonts are cleared)
- Bricolage Grotesque (variable, optical sizes 12–96), JetBrains Mono and Pixelify Sans, self-hosted through `next/font/local`
- `@anthropic-ai/sdk` for the agent (streaming tool use), `pdf-lib` for the CV, `next/og` for share images
- `packages/tokens` (npm workspace) is shared by the site and every subdomain experiment

## Structure

```
packages/tokens/tokens.css   the design tokens: the single source of truth for every colour, radius, shadow, easing and size
labs/<slug>/                 the subdomain experiments (plain HTML/CSS/JS); labs/_shared is their common chrome
scripts/build-labs.mjs       copies labs + tokens + fonts into public/labs/ and dist-labs/
src/content/                 profile, projects, lab registry, guestbook seeds, agent knowledge
src/app/                     routes, API routes (agent, live, guestbook, views, weather), share images, sitemap, robots
src/features/                one folder per feature (agent, case, hero, lab, palette, shell, terminal, tour, widgets, …)
src/components/, src/lib/    shared UI and utilities
src/proxy.ts                 routes <slug>.adelia.cc to its lab
```

## Design rules

- White paper, near-black ink, light grey cards with hairlines; type does the talking.
- Magenta `#F41B8D` is the one colour you always feel. White text sits on `--accent-strong` (5.0:1), never on `--accent` (3.9:1). Other colours appear only as small accents (the dock's app icons, a dot, a chart line).
- No gradient text, glass-everything, glossy orbs, sparkles or decorative emoji.
- Every motion has a `prefers-reduced-motion` path. Everything is reachable by keyboard; contrast pairs are checked on `/styleguide`.

## Placeholders to replace

Search the repo for `CONTOH` to find every value. The main ones:

| What | Where |
| --- | --- |
| The three projects: names, copy, numbers, live and repo URLs, mockups, icons | `src/content/projects.ts`, `src/features/work/ProjectMockup.tsx`, `src/features/work/ProjectIcon.tsx` |
| Bio, skills, experience, model card | `src/content/profile.ts` |
| Social links (`href: null` hides a link) | `socials` in `src/content/profile.ts` |
| Photo on the About contact card (currently a monogram) | `src/features/about/ProfileCard.tsx` |
| What the JD matcher counts as a skill and its evidence | `src/features/about/jd.ts` |

The CV, the agent's knowledge, the share images and the sitemap all read from these files, so they update with them.
