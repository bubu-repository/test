# adelia.cc

Portfolio of **Adelia Tiara**, AI Product Engineer (B.Sc. Informatics, class of 2026) in Bekasi, Indonesia. The main site lives at `adelia.cc`; five interactive experiments live on their own subdomains (`bloom`, `tokens`, `swarm`, `type`, `palette`.adelia.cc) and everything is indexed at `/lab`.

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
| `/` | **Who she is, then the work.** The hero is a live window of sky over sea in Frutiger Aero blues (a WebGL shader: sun and lens flare, clouds, a swelling waterline, caustics, light rays; the sun follows the pointer and a press in the water lets out bubbles). Her name, open to work with her time and Bekasi's weather, the role, one sentence (each underlined word can be resampled), Open the work, CV and Email sit in the sky; the four products float just under the waterline with one number each, so the work is on the first screen on every device. Then the four case cards (each with its real screen, three numbers, her role, and whether it was in-house or her own product), how she works, and a door to the lab. |
| `/work` | A reading guide (which case answers which hiring question), the four case cards, and links to the design system, the lab and the CV. Each case study ends with the neighbouring projects as polaroids. |
| `/work/[slug]` | A case study: a cover with three shipped screens, a twenty-second version (problem, what I did, what happened), role, team, timeline, tools and where the product is now; then the problem and constraints, her role with the calls that were hers and who she worked with, research methods, insights, a board of raw research notes and a consent note, the design decisions (options, the call, why, what it cost, and an evidence table where there is one), three rounds of wireframes with test findings, a click-through prototype of the main flow (`FlowPlayer`, hotspots placed on the real elements), every shipped state including uncertainty and errors, what didn't work, accessibility and inclusion, then the engineering (architecture map with model and code steps, the pipeline, which steps are a model and why, evals with a chart per metric across versions and a table of what changed, budgets, failure handling, an error log and a code excerpt), results with how each was measured and the business outcome, and a reflection. At the end, the same story can be told as a chat. |
| `/lab` | The toys live here: the gumball machine, the live board (her phone with the WebGL sky, the live sea, overlap, Ask Moci, find a time, workspaces, keycaps, availability, a pocket console), the terminal on a laptop with the keys to the site hanging beside it, her own products as booster packs that tear open into holographic trading cards (`/lab#packs`), a job-description matcher (`/lab#match`), her model card, the five subdomain experiments (each opens in a glance: a window nearly as big as the page, growing out of its card, with the arrow keys to move between them), and every feature built into the site. |
| `/about` | Story and path (with highlights), a contact card with a live clock, the practical details for hiring teams (level, experience, location and time zones, start date, languages, references, why full-time now), skills, and an Off the clock section (an MP3 player with a click wheel playing original synth loops from a small Web Audio sequencer, with a visualizer, and you can drop your own song on it; a CD shelf of the games that shaped her, where a disc slides out and spins and its mood plays on the player). Her ID card hangs on a lanyard (a CR80 card with a guilloche band, monogram, fields, barcode and a hologram that catches the light as it swings; the back has a magnetic stripe, a QR code and a signature panel). |
| `/colophon` | How this site is built: Moci the agent (online: Claude with tool use, server-side validation of every tool call, streaming, citations; offline: BM25 retrieval with abstention), Moci's eval (20 cases, run in the browser, known failures kept visible), and the stack. |
| `/cv.pdf` | CV generated from the same content with `pdf-lib`, prerendered at build. |
| `/guestbook` | Moderated, rate-limited notes that appear for everyone live. |
| 404 | Moci confidently writes the missing page, then fact-checks itself and suggests real pages. |

Everywhere: a clear sky-white page with Apple-style frosted glass, Aero blue `#1A8FE8` as the brand, and a footer in the deep sea (the same shader, further down): a glass contact card (the email as the headline, Copy, Download CV, the 40-second brief) above a calm index (base, focus, pages, how it's built). A loading screen plays once per session for at most a second (skipped for reduced motion and for links straight into a case study). A question mark at the bottom right starts "How this site works", a few spotlights explaining the dock, the work, the agent and where the CV is; it only runs when asked. Next to it is Moci, her agent, as a glossy Aero bubble. Also: a dock of illustrated app icons as navigation (it magnifies under the cursor), ⌘K command palette (navigate, run actions, answer questions), terminal (`` ` ``), 40-second brief for recruiters (`b`), sticker collection (`s`), live cursors, synthesised sound effects (off by default) and view transitions between pages. Press `?` for every shortcut; single-key shortcuts can be turned off. The site is light only.

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components, `proxy.ts`), React 19, TypeScript strict
- Tailwind CSS 4 mapped to the design tokens only (default colours, shadows, radii and fonts are cleared)
- Mona Sans (variable, weight 200–900 and width 75–125), JetBrains Mono and Pixelify Sans, self-hosted through `next/font/local`
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

- Sky and sea in the blues of Frutiger Aero (docs/revamp-plan.md): Apple-like type and layout on a clear sky-white page, frosted glass for chrome and cards, and the colour itself in two live scenes, the sky over the hero and the deep sea under the footer (`src/features/world/SeaSky.tsx`). Inside a scene (`.on-water`) text is white and glass is dark.
- Materials live as tokens (`--sheen`, `--bevel`, `--lift*`, `--recess`, `--key-edge`, `--screen*`, `--metal-*`) and as components in `src/styles/globals.css` (`widget`, `well`, `screen`, `.pill`, `.toggle`, `.knob`, `.led`, `.device`, `.pack`, `.tcg`, `.idc`, `.polaroid`, `.phone`, `.psp`, `.laptop`, `.poster`, `.sticky-note`, `.spec-plate`, `.sky`, `.sea`, `.seawidget`). The site-wide sound and glass light live in `src/features/world/WorldHost.tsx`; scroll reveals are a CSS view timeline in `globals.css`.
- Type does the talking: Mona Sans for words and keys, JetBrains Mono for printed labels (uppercase, letter-spaced). Nunito (rounded) is kept for the playful corners (the lab tools, the aquarium).
- Aero blue `#1A8FE8` is the brand. White text sits on `--accent-strong` (5.4:1), never on `--accent`; small blue text uses `--accent-ink` (6.4:1) and highlighted headline words `--accent-display`. Text is deep sea navy `--ink` (15.6:1); pale fills carry `--on-fill` text. In the hero the sky stays at least as deep as `--sky-mid` behind the words (white 4.9:1), and clouds keep out of their way.
- No gradient text or decorative emoji. The one glossy orb is Moci's mark.
- Every motion has a `prefers-reduced-motion` path (the loading screen is skipped). Everything is reachable by keyboard: switches are `role="switch"`, the guided walk takes the arrow keys and Esc, single-key shortcuts can be turned off. Contrast pairs are checked on `/styleguide`.

## Placeholders to replace

Search the repo for `CONTOH` to find every value. The main ones:

| What | Where |
| --- | --- |
| The four projects: names, copy, numbers, status, live and repo URLs, icons | `src/content/projects.ts`, `src/features/work/ProjectIcon.tsx` |
| The product screens in the phones, and each case's click-through flow | `src/features/screens/` (one file per product, `registry.tsx`, `flows.ts`) |
| Each case's engineering: pipeline, models, evals and their history, budgets, failures, error log, code excerpt | `engineering` in `src/content/projects.ts`, rendered by `src/features/case/Engineering.tsx` |
| Moci's eval cases (shown and runnable on /colophon) | `src/features/agent/evals.ts` |
| Bio, practical details, skills, experience, model card | `src/content/profile.ts` |
| Social links (`href: null` hides a link) | `socials` in `src/content/profile.ts` |
| Photo on the About contact card (currently a monogram) | `src/features/about/ProfileCard.tsx` |
| What the JD matcher counts as a skill and its evidence | `src/features/about/jd.ts` |

The CV, the agent's knowledge, the share images and the sitemap all read from these files, so they update with them.
