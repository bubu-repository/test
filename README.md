# adelia.cc

Portfolio of **Adelia Tiara**, AI Product Engineer (B.Sc. Informatics, class of 2026) in Bekasi, Indonesia. It lives at `adelia.cc`; the things to make and play with are at `/lab`.

The whole site is in English. Sample copy is marked `CONTOH — ganti dengan data asli` (see [Placeholders](#placeholders-to-replace)).

## Run it

Requires Node 22+ and npm 10+.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm run lint
npm run typecheck
```

## Environment variables

Everything works without any of them; each one upgrades a feature.

| Variable | What it enables | Without it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Moci, the site agent (`/api/agent`), answers with Claude and can act on the page (navigate, sound, start the tour, copy the email, download the CV, open a panel). | An offline brain (BM25 retrieval over the site content in `src/content/knowledge.ts`) answers instead. The UI shows which one answered. |
| `ANTHROPIC_MODEL` | Overrides the model (default `claude-opus-5-5`). | Default model. |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel KV) or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Persistent guestbook notes and the "visits today" counter. | In-memory storage: works, but resets when the server restarts. |

Live presence and cursors use server-sent events from `/api/live` with an in-memory hub. On serverless hosting with many instances, visitors on different instances won't see each other; same-browser tabs always sync through `BroadcastChannel`.

## Deploying

Deploy the Next.js app (e.g. Vercel) on `adelia.cc`. The five subdomain experiments (`bloom`, `tokens`, `swarm`, `type`, `palette`) were retired in October 2026; if those subdomains still point at the project, they now serve the main site.

## What's in it

| Route | What it is |
| --- | --- |
| `/` | **Who she is, then the work.** Her name stands in the sky at the top of the world, and the first screen ends in a bank of cloud. Her name, open to work with her time and Bekasi's weather, the role, one sentence (each underlined word can be resampled), Open the work, CV and Email sit in the sky; the four products float on the clouds with one number each, so the work is on the first screen on every device. Then, on the white page under the clouds, the four case cards (each with its real screen, three numbers, her role, and whether it was in-house or her own product), how she works, and a door to the lab. |
| `/work` | A reading guide (which case answers which hiring question), the four case cards, and links to the design system, the lab and the CV. Each case study ends with the neighbouring projects as polaroids. |
| `/work/[slug]` | A case study: a cover with three shipped screens, a twenty-second version (problem, what I did, what happened), role, team, timeline, tools and where the product is now; then the problem and constraints, her role with the calls that were hers and who she worked with, research methods, insights, a board of raw research notes and a consent note, the design decisions (options, the call, why, what it cost, and an evidence table where there is one), three rounds of wireframes with test findings, a click-through prototype of the main flow (`FlowPlayer`, hotspots placed on the real elements), every shipped state including uncertainty and errors, what didn't work, accessibility and inclusion, then the engineering (architecture map with model and code steps, the pipeline, which steps are a model and why, evals with a chart per metric across versions and a table of what changed, budgets, failure handling, an error log and a code excerpt), results with how each was measured and the business outcome, and a reflection. At the end, the same story can be told as a chat. |
| `/lab` | **Make something, take a card.** The Studio (`/lab#studio`): your words or a photo (camera or gallery, with filters) made out of felt with a running stitch, cross-stitch, embroidery, rhinestones, glitter glue, clear jelly, chrome, crumpled foil, torn paper, a holo sticker, embossed metal, ASCII or acrylic (standee, block, keychain); lettering in eight expressive open fonts, each letter nudged by hand; laid out as a card, a photo-booth strip, a sheet of 3 × 4 ID photos (red or blue), a trading card or a die-cut sticker; decorated with stickers, words, a pen and a date stamp; saved as a PNG, a GIF or a boomerang. It all happens on the visitor's device. Then today's pack (`/lab#pack`: one booster pack a day per visitor, three cards: kind words, advice from the live Bekasi weather, and advice or, about one pack in eight, a holo rare of one of her products), the live widget board, the job-description matcher (`/lab#match`) and her model card. |
| `/about` | **Her desk first**, in 2.5D, standing in the sky where the clouds begin: a DAC that plays her songs in full through the YouTube player on the monitor (YouTube loads only when you press play; songs whose label blocks other sites show "YouTube only" and a link out), her ID card hanging off the monitor (a CR80 card on a lanyard with spring physics: guilloche band, monogram, fields, barcode and a hologram that catches the light; flip it for the magnetic stripe, a QR code and a signature panel), a laptop that opens to a small desktop (work, CV, Moci, terminal, guestbook), an aquarium that leads to the guestbook, a seal-pup clock on Bekasi time, a whale plush and a jellyfish keychain. On phones the same things stand in a column. Then the story and path (with highlights), a contact card with a live clock, the practical details for hiring teams (level, experience, location and time zones, start date, languages, references, why full-time now), skills, and a CD shelf of the games that shaped her. |
| `/colophon` | How this site is built: Moci the agent (online: Claude with tool use, server-side validation of every tool call, streaming, citations; offline: BM25 retrieval with abstention), Moci's eval (20 cases, run in the browser, known failures kept visible), and the stack. |
| `/cv.pdf` | CV generated from the same content with `pdf-lib`, prerendered at build. |
| `/guestbook` | **The sea.** Every note is a sea creature (fish, jellyfish, octopus, turtle, seahorse, pufferfish, crab or little whale, in one of six jelly colours) that swims in the open water under the header; point at one to see its name, press it to read its note. The release form floats over the water (under it on phones) with a live preview of the creature and what it will say. New creatures drop in from the surface for everyone live. Moderated and rate-limited; notes left before the sea had creatures get one from their id. A list of every note is one button away. |
| 404 | Moci confidently writes the missing page, then fact-checks itself and suggests real pages. |

Everywhere: one continuous world in Frutiger Aero blues behind every page (a single WebGL shader on a fixed canvas): the sky at the top, where each page's header stands (sun and lens flare, clouds), the clear sky-white page in the middle, where the content reads as frosted acrylic, and the sea at the bottom (caustics, light rays, motes; the water lights up under the pointer and a press in it lets out bubbles). Nothing is boxed in a section: the sky closes into a bank of cloud that dissolves into the white, and the white thins into a pale haze and mist over the water, which deepens into the deep sea at the footer: a glass contact card (the email as the headline, Copy, Download CV, the 40-second brief) above a calm index (base, focus, pages, how it's built). A loading screen plays once per session for at most a second (skipped for reduced motion and for links straight into a case study). A question mark at the bottom right starts "How this site works", a few spotlights explaining the dock, the work, the agent and where the CV is; it only runs when asked. Next to it is Moci, her agent, as a glossy Aero bubble. Also: a dock of illustrated app icons as navigation (it magnifies under the cursor), ⌘K command palette (navigate, run actions, answer questions), terminal (`` ` ``), 40-second brief for recruiters (`b`), sticker collection (`s`), live cursors, synthesised sound effects (off by default) and view transitions between pages. Press `?` for every shortcut; single-key shortcuts can be turned off. The site is light only.

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components), React 19, TypeScript strict
- Tailwind CSS 4 mapped to the design tokens only (default colours, shadows, radii and fonts are cleared)
- Mona Sans (variable, weight 200–900 and width 75–125), JetBrains Mono and Pixelify Sans, self-hosted through `next/font/local`
- `@anthropic-ai/sdk` for the agent (streaming tool use), `pdf-lib` for the CV, `next/og` for share images
- `packages/tokens` (npm workspace) holds the design tokens
- `gifenc` for the Studio's GIFs; the Studio's fonts (Bagel Fat One, Rubik Bubbles, Mochiy Pop One, Rampart One, Shrikhand, Gochi Hand, Bungee) come from Fontsource, all under the SIL Open Font License

## Structure

```
packages/tokens/tokens.css   the design tokens: the single source of truth for every colour, radius, shadow, easing and size
src/content/                 profile, projects, lab registry, guestbook seeds, agent knowledge
src/app/                     routes, API routes (agent, live, guestbook, views, weather), share images, sitemap, robots
src/features/                one folder per feature (agent, case, hero, lab, palette, shell, terminal, tour, widgets, …)
src/components/, src/lib/    shared UI and utilities
```

## Design rules

- One seamless world in the blues of Frutiger Aero (docs/revamp-plan.md), drawn behind every page by `src/features/world/World.tsx`: sky at the top, the white page (`--bg`) in the middle, sea at the bottom. The layout steers it with markers, each the top edge of the highest-priority visible one: `[data-sky-end="N"]` (the sky has gone pale and clouds close in; they turn to white under it), `[data-sky-text]` (the sky stays deep and clouds stay away behind words in the sky), `[data-waterline="N"]` (the sea's surface: the shore above the footer in `SiteLayout`, or the guestbook's water under its header), and the footer, which pulls in the deep sea. Words in the sky and the deep sea sit in `.on-water` (white text, dark glass); on the white page the normal tokens apply; words right on the guestbook's water are navy. While only the white page is on screen the world draws nothing. Without WebGL, gradients on `<html>` and the shore stand in.
- Real objects, not blocks: cards are frosted acrylic (white glass with grain, a top sheen, a thickness edge and a light that follows the pointer); eyebrow labels are die-cut holographic stickers whose foil moves with the pointer (`--wx`/`--wy`, 0 to 1, set by the world; `--mx`/`--my` are the trading cards' own percentages); the guestbook's creatures are clear jelly (`src/features/guestbook/Creature.tsx`).
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
| The songs on the DAC (YouTube ids) | `src/content/playlist.ts` |
| The games on the CD shelf | `src/content/games.ts` |
| The cards in today's pack (kind words, advice, the weather lines) | `src/content/daily.ts` |
| Moci's three creatures that keep the sea from being empty on a fresh deploy | `SEED_NOTES` in `src/content/guestbook.ts` |

The CV, the agent's knowledge, the share images and the sitemap all read from these files, so they update with them.
