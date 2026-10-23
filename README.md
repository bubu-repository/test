# Adelia's Room — adelia.cc

The portfolio of **Adelia Tiara**, AI Product Engineer (B.Sc. Informatics, class of 2026, Bekasi). Instead
of pages, it is one room you walk into: a pastel Y2K bedroom-studio where every object opens a piece of
her work. It is built for hiring teams first (read the case studies, check the fit, book a chat, get the
CV) and for everyone else second (play, collect stickers, sign the guestbook, climb the leaderboards).

The engine is a fork of [BUBU World](https://github.com/bubu-repository/dside): the same stage, camera,
director, cards and close-ups, re-themed and re-written for a personal portfolio.

---

## The experience

1. **The door.** A quiet, cool-white hallway and an icy-blue door with a chrome "Adelia's Room" sign.
   Knock (or use the keypad: the code is on the label, 2026), the door swings in and you walk through.
2. **One room.** A photoreal plate (6336×2688). On desktop the camera follows the mouse; click an empty
   spot to walk there, or scroll (swipe on phones) to glide along the five chapters.
3. **No markers.** Objects lift and glow when you hover them, and a label names what they do. Hold the
   eye key (or `H`) to reveal everything you can touch.
4. **House Rules.** The first time you find a key object, you write one line of her working principles:
   *Write the eval before the prompt · Show the receipts · One decision per screen · Make a wrong answer
   cheap · Go to the field first.*
5. **Everything happens in the room.** Small panels are cards that slide out beside their object;
   large ones are close-ups that rise out of it while the camera leans in.

### What each object opens

| Chapter | Object | Opens |
|---|---|---|
| I · Toolkit | the chrome shelf (cassette, CD, jar of marbles, robot, zines, USB stick) | **The Toolkit**: her capabilities as spec sheets, with evidence from real projects |
| | the pink gacha machine | **3D**: turn the crank, a capsule opens and the Tenderlens pipeline unfolds |
| II · Proof | the four posters | **Wall of Work**: the four case studies (Tenderlens, Ask HR, Catat, Lintas), each also at `/work/<slug>` |
| | the wall clock | live Bekasi time and how it overlaps with yours |
| | the lanyard ID card | **About**: who she is, practical details for hiring teams, path, skills, CV |
| | the instant camera | **The Studio**: words or a photo → 15 materials → 5 layouts → stickers → PNG/GIF |
| | the holo card beside it | **Guest Pass**: your loyalty card, hearts and tiers |
| | the receipt printer | **Book a chat**: an intro call for hiring teams, or a coffee chat; prints a ticket |
| | the newspaper | her paper: what she shipped, what she's doing now |
| | the pink mug | **Is she a fit?** a 60-second role-fit check, plus a job-description matcher |
| | the sticker binder | **The sticker book** (22 stickers, medals) |
| III · Build | the pink computer | **Adelia OS**: case files, terminal, mail, archive, her model card |
| | the holo booster pack | **Today's pack**: tear it open, flip the cards, keep them in a binder |
| IV · Play | the gingham board | the stickers you've earned, stuck on live |
| | the LED strip | a countdown to what's next; `/launch` |
| | the cloud handheld | the arcade: 3 games and leaderboards |
| | the synth | make a beat |
| | the heart phone | dial Adelia and hear her message |
| | Moci, the jelly plush | **Moci**, her AI agent: answers about her with sources, says when it can't tell |
| V · Hello | the window | live Bekasi weather |
| | the aquarium | **the guestbook**: release a jelly creature with a note; it swims in the tank |
| | the record player | change the music |
| | the big pink button | press to reach Adelia (email, CV, LinkedIn) |

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (front end; falls back to local demo storage without the API)
npm run serve      # API + static server on :8787 (2nd terminal; Vite proxies /api to it)
```

Production:

```bash
npm run build      # typecheck, build public/cv.pdf and server/knowledge.json, build to dist/
ADMIN_PASSWORD='choose-one' ADMIN_SECRET='long-random-string' ANTHROPIC_API_KEY='…' node server/index.mjs
npm run eval:moci  # Moci's offline eval (25 cases)
```

### Deploying

**Recommended: any Node host** (Railway, Render, Fly.io, a VPS). `server/index.mjs` has zero
dependencies: it serves `dist/` and the JSON API and stores data as JSON files in `DATA_DIR` (use a
persistent volume). It handles compression, caching, rate limits and a Content-Security-Policy.

| Variable | Default | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | `adelia-room-local` | Admin login. The default is for local use only: **set it**. |
| `ADMIN_SECRET` | random per boot | Signs admin tokens. **Set it**, or every restart signs admins out. |
| `ANTHROPIC_API_KEY` | none | Moci's online brain. Without it Moci answers with the offline brain. |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Model for Moci's online brain. |
| `AGENT_DAILY_CAP` / `AGENT_IP_DAILY_CAP` | 300 / per visitor | Daily answer caps for Moci. |
| `AGENT_HISTORY_SECRET` | random per boot | Signs Moci's answers in the chat history. |
| `PORT` / `HOST` | `8787` / all | Where the server listens. |
| `DATA_DIR` / `DIST_DIR` | `server/data` / `dist` | Data and the built front end. |
| `TRUST_PROXY` | off | `1` behind a load balancer, so rate limits apply per visitor. |
| `CSP` | built-in | `off` disables the Content-Security-Policy; any other value replaces it. |
| `QUIET` | off | `1` silences request logging. |

**Static hosting** (Vercel/Netlify via `vercel.json` / `public/_redirects`) works for the experience, but
bookings, the guestbook, scores and analytics then stay in each visitor's browser and Moci is offline
only. Use a Node host for real leads.

### Admin

`/admin`: KPIs and a funnel framed for her goals (visits → stations explored → case studies read →
reached out), bookings, enquiries, fit checks, the guestbook (hide/show/delete), Moci's questions,
leaderboard, launch list, analytics, CSV export, and a content editor for news, slots, the countdown and
the big button's destination.

---

## How the room is made

- `public/assets/room/room-*.webp`: an AI-rendered plate (Higgsfield · Nano Banana 2, art-directed from
  her Pinterest moodboard; the owner picked the render) at 6336×2688. Retouched only where the site needs
  it: the clock hands painted out (they're drawn live), a rainbow stripe on the instant camera and a logo
  on the computer removed, and a small holo card added next to the camera (the Guest Pass).
- `public/assets/room/cut/*.webp`: transparent cut-outs of every object (BiRefNet via rembg) for the hover
  lift and the product photos. `window-mask.png` lets the live sky show through the glass and, faintly,
  through the sheer curtains.
- `public/assets/door/door-*.webp`: the hallway and door; the leaf, sign and keypad light are live layers.
- Every coordinate lives in `src/stage/plate.ts` (hit areas, camera framings, live overlays).

## Content

Facts about Adelia live in `src/content/*.ts` (profile, projects, knowledge…); the room's copy and data
(chapters, toolkit, work, news, slots, quiz, tracks) in `src/lib/content.ts`; stickers and tiers in
`src/state/achievements.ts`. Values marked **CONTOH** are placeholders for her to replace (search the
repo for `CONTOH`), including her real LinkedIn/GitHub links, news dates and the availability date.
News, slots, the countdown and the big button can also be edited in `/admin`.

## Stack

Vite 7 · React 19 · TypeScript · zustand · Web Audio (every sound is synthesised) · three.js / React
Three Fiber (only the gacha, loaded when it opens) · Open-Meteo (live weather, no key) · Claude (Moci's
online brain, optional) · pdf-lib (the CV, at build time) · a zero-dependency Node server.
