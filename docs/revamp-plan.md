# Revamp plan (October 2026)

Decisions from the design interview with Adelia, in the order they were made. Every phase below
follows them. Where a decision changes something the hiring reviews asked for, the review wins.

## Keep, whatever else changes

Everything the six hiring-review rounds produced stays, word for word unless a fact changes:

- every case study (problem, role, research, decisions, flows, engineering, evals with raw counts,
  costs with model versions, incidents, results, reflection) and the reading guide on `/work`
- About: the short story, path so far, practical details for hiring teams, the CV
- the 40-second brief, the JD matcher, the model card
- the agent's guardrails, claim check, signed history, budgets and its eval on `/colophon`
- product screens inside the work cards and case studies (they are evidence, not decoration)
- contrast checks, keyboard access, reduced-motion paths, cheap-phone performance

## Look

Changed in October 2026, after the first pass read as pale and templated: Adelia kept the Apple
design and asked for a sea theme with the sky kept in, coloured mainly in the blues of Frutiger Aero.
The pink of reference image 5 is retired.

- **Palette:** Frutiger Aero blues. Deep azure sky (`#0A58BE` to `#1570D6`) lightening to a pale
  horizon, aqua water (`#3CC8F0`) going down to deep sea blue (`#0A56B0`, `#073B86`), white clouds and
  sunlight, Aero grass green for "on" and "open". Aero blue `#1A8FE8` is the brand; text is a deep sea
  navy. Every pair is checked on `/styleguide`.
- **Where the colour lives:** two live scenes from one WebGL shader (`SeaSky`): the hero, a window of
  sky over sea, and the footer, the same water further down. The page between them is clear
  sky-white with Apple-style frosted glass, so the case studies stay calm and readable.
- **Interactive, quietly:** the sun and a soft underwater light follow the pointer, a press in the water
  lets out a ring of light and bubbles, a few bubbles rise on their own, and the water darkens a little
  as the hero scrolls away. Reduced motion gets one still frame; no WebGL keeps a CSS gradient.
- **Light only.** Dark mode and its toggle are removed. The water is a scene, not a theme.
- **Style:** Apple-like type and layout, frosted glass for the dock, keys and cards (dark glass with
  white text on the water, white glass with dark text on the page). Moci's mark is a glossy Aero
  bubble. No polka dots, stickers or toy effects.
- **Type:** Mona Sans for headings, text and keys; JetBrains Mono for printed labels. Nunito stays only
  for the playful corners (the Lab tools, the aquarium).
- The Lab tools and the guestbook have their own themes (a real photo booth, a craft table, an
  aquarium). The Lab index page itself is the plain page.

## Character

- Parked. A 3D character in the style of reference image 4, with her own design (reference image
  10), was built and reviewed, and Adelia asked to skip 3D for now because it didn't match the
  reference closely enough. The site uses no character until a version she approves exists.
- Until then, Moci (the agent, which keeps its name, guardrails and honesty) and the guided walk
  use a glossy Aero bubble as their mark. The hero is the name over a live sky and sea.

## Pages

- **Hero:** a live window of sky over sea. The name, one line, Open the work, CV and email in the sky;
  the four products with one number each just under the waterline. The floating phones and the
  AT-26 device are removed.
- **Contact:** stays, redesigned as a glass card in the deep sea at the bottom of the page. The "Let's
  build something people actually use" headline and the poster are removed.
- **Loading screen:** once per session, at most about one second, real progress (fonts, 3D),
  skippable, skipped for deep links to a case study and for reduced motion.
- **Tutorial:** only on demand, behind a help button, for visitors who aren't sure what to do.
- **About:** a 2.5D skeuomorphic desk. A laptop that opens to a mini desktop (Work, CV, chat with
  the agent, Terminal); an aquarium that links to the guestbook; a DAC that plays her songs
  through the YouTube IFrame API (full songs, no login; the player shows on a small monitor,
  at least 200 x 200 px as YouTube requires); the ID card hanging on the monitor (the drag bug
  fixed); original desk objects in the spirit of her references, all from the sea: a round
  white seal-pup desk clock, a whale plush, a jellyfish keychain on a ball chain (the chibi
  figure waits for her character). Licensed characters (Chiikawa and the others) are not drawn. The acrylic standee and keychain come
  later, when she sends them. The readable story, path and practical details stay below the
  desk.
- **Guestbook:** a big aquarium. Visitors pick a sea creature (fish, jellyfish, octopus, turtle,
  seahorse, pufferfish, crab, little whale) and its colour; creatures swim; click one to read
  its note. Moderation and rate limits stay.
- **Lab:** the five subdomain experiments and the toy box go. What stays or comes:
  - **Studio:** one tool, two inputs (text or photo). Materials shared by both: felt with running
    stitch, cross-stitch with a merrowed edge, embroidery, rhinestones and gems, glitter glue,
    clear jelly, chrome, crumpled foil, torn paper, holographic sticker, metal emboss, ASCII,
    acrylic (standee, block, keychain). Letters come from 6 to 8 expressive open fonts, each
    letter nudged by hand-like jitter. Camera filters, free decoration (stickers, text, pen,
    date stamp) and GIF or boomerang. Layouts: card, 4-strip, ID photo, TCG photocard, sticker
    PNG. Camera or upload from the gallery. Everything runs in the browser; photos never leave
    the device.
  - **Booster pack:** one pack a day per visitor. Cards are affirmations and small daily advice in
    English ("Cold water today, trust me", "Cloudy out there, pack a raincoat" from the live
    Bekasi weather, "Easy on the snacks or you'll be broke"). About one pack in eight holds a
    rare holo card of one of her products that opens its case study.
  - The JD matcher and the model card (from the hiring reviews).
- **Global features kept:** the command palette, the agent chat, live cursors, and achievements
  (the sticker book, presented anew in a later phase). Removed: X-ray mode, the PSP game,
  the jelly cursor, the Konami rave.

## Phases (each pushed for review)

1. Palette, fonts, light only, the new hero, the contact section, the loading screen, the help
   button and tutorial, the About ID-card fix. (Done; the 3D character is parked. Re-themed to sky
   and sea in Aero blues.)
2. The About desk. (Done. The DAC plays through YouTube; Kenshi Yonezu's "Umi no Yuurei" holds the
   place until her songs arrive. The synth MP3 player is gone; the CD shelf of games stays.)
3. The guestbook aquarium.
4. The Lab: Studio, booster pack, cleanup of the old experiments.

## Waiting on Adelia

- Photos of her acrylic standee and keychain.
- The YouTube links for the songs on the DAC (placeholder: "Umi no Yuurei", `src/content/playlist.ts`).
