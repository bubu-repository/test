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
| `/` | **One device, then the world as you scroll.** The hero is just the AT-26, a frosted-glass device under a vivid summer-blue sky: its LCD shows the name, role and city, her time next to yours, Bekasi weather, the resample-able sentence with temperature soft keys and an ask line for Moci; a dial picks where to go, switches turn on night and sound, keys start the tour, the brief and the CV, and the power key (or `P`) sleeps the screen. Scroll down for three sealed booster packs, one project in each: tap a pack or drag across its crimp to tear it, and the card pops out face down and flips over as a holographic trading card (holo, reverse holo, etched; the holo throws sparkles; each morphs into its case study). On phones the packs are a swipeable row. They reseal on every visit. Then the live board (her phone with the WebGL sky, the live sea off Jakarta from Open-Meteo's marine API with waves as tall and quick as the real ones, working-hours overlap, Ask Moci, find a time, project workspaces, keycaps, the availability card, the lab, and a pocket console to take a break that opens the game) and the terminal on a laptop with a sticky note of things to try. |
| `/work` | The same three booster packs and trading cards, plus a quick read of all three. Each case study ends with the other two projects as polaroids. |
| `/work/[slug]` | Case study: problem, role, process, architecture, before/after, results, reflection, plus live and repo links. Read it as an article or chat through it: the story unfolds message by message with verified numbers, and you can ask your own questions. |
| `/lab` | Gumball machine, the five subdomain experiments with live previews, and every feature built into the site with a button that runs it. |
| `/about` | Story, path, model card, skills, a contact card with live clock and visit counter, an Off the clock section (an MP3 player with a click wheel playing original synth loops from a small Web Audio sequencer, with a visualizer, and you can drop your own song on it; a CD shelf of the games that shaped her, where a disc slides out and spins and its mood plays on the player), her ID card on a lanyard (a CR80 card with a guilloche band, photo, fields, barcode and a hologram that catches the light as it swings; the back has a magnetic stripe, a QR code and a signature panel), and a job-description matcher (`/about#match`). |
| `/cv.pdf` | CV generated from the same content with `pdf-lib`, prerendered at build. |
| `/guestbook` | Moderated, rate-limited notes that appear for everyone live. |
| `/play` | Context Window: snake, but you're an LLM, on a PSP with a real D-pad and buttons, the 8-bit Moci walking underneath. On the home page it is a pocket console in the live board. |
| 404 | Moci confidently writes the missing page, then fact-checks itself and suggests real pages. |

Everywhere: a summer sky at the top of every page (vivid blue that fades to white under the page title, a frame of the live sky shader, two layers of drifting clouds, glints, a warm sun, and the moon and stars at night; tinted at dawn and dusk) and a summer-blue sea at the bottom of every page, where the footer's sky meets the horizon (a small island with swaying palms and a pink beach umbrella, drifting swell, glitter, a paper boat; tap the water and it ripples, and a button plays the sea, synthesised live). Moci, the agent mascot, is a drop of clear water (so is the cursor). Glass panels catch a light where your pointer is, the hero leans toward the pointer, sections fade up as you scroll (headings wipe up), cards lift under the pointer, pages drift and blur between routes, gulls cross the horizon, and the sound layer ticks on hover, taps on press and washes in a wave when you change page (sound is off by default). A glass label and the page's own object under every page title (the pack, the gumball machine, the ID card, the PSP, the keychain on the 404), the 24:QW poster next to the email in the footer, a spec-plate footer (base, focus, index, system), a dock of app icons as navigation (magnifies under the cursor, live calendar tile), ⌘K command palette (navigate, run actions, answer questions), terminal (`` ` ``), autopilot tour, 40-second brief for recruiters (`b`), sticker collection (`s`), X-ray mode showing how each part is built (`x`), live cursors, synthesised sound effects (off by default), light/dark theme, view transitions between pages, and a Konami code. Press `?` for every shortcut; single-key shortcuts can be turned off.

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

- Frosted glass with a fine edge on a neutral white page, under a vivid summer-blue sky at the top and a summer-blue sea at the bottom. Colour has a hierarchy: large surfaces stay calm and pale (white, glass, the pale LCD, `--accent-soft`), while the small things that guide the eye are vivid (the watermelon pink primary key, highlighted words on a yellow marker, app icons, bars, green LEDs, palms, the trading cards and packs), with navy ink. Watermelon pink `#FF3F86` is the brand mark. Real objects you can touch (booster packs of holo cards, polaroids, a phone, a PSP, a laptop, an ID card, an MP3 player, a CD shelf, a poster) sit on the glass world with soft shadows and a lot of air. One object per idea; the hero holds only the device, everything else is further down or on its own page.
- Materials live as tokens (`--sheen`, `--bevel`, `--lift*`, `--recess`, `--key-edge`, `--screen*`, `--metal-*`) and as components in `src/styles/globals.css` (`widget`, `well`, `screen`, `.pill`, `.toggle`, `.knob`, `.led`, `.device`, `.pack`, `.tcg`, `.idc`, `.polaroid`, `.phone`, `.psp`, `.laptop`, `.poster`, `.sticky-note`, `.spec-plate`, `.sky`, `.sea`, `.seawidget`). The site-wide sound, glass light and scroll reveals live in `src/features/world/WorldHost.tsx`.
- Type does the talking: Bricolage Grotesque for words, JetBrains Mono for printed labels (uppercase, letter-spaced).
- Watermelon pink `#FF3F86` is the one colour you always feel. White text sits on `--accent-strong` (4.9:1), never on `--accent`; small pink text uses `--accent-ink` (5.1:1) and highlighted headline words `--accent-display` (display size only). Summer blue (sky, sea, cobalt), palm green (`--green`, `--lime`: LEDs, success, the Guestbook icon) and sunshine yellow (`--sun`, `--highlighter`: the marker, the sun, the About icon) are the accents, used in small doses with navy text on them.
- No gradient text, glossy orbs, sparkles or decorative emoji.
- Every motion has a `prefers-reduced-motion` path (the boot sequence is skipped). Everything is reachable by keyboard: the dial is a slider (arrow keys), switches are `role="switch"`, the PSP's D-pad and buttons are buttons, single-key shortcuts can be turned off. Contrast pairs are checked on `/styleguide`.

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
