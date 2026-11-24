# adelia.cc: concept (v1, for critique)

Lead, 24 Nov 2026. Based only on what the research showed: `docs/research/{yan,shanison,gakumas,trends}.md`.

## The idea in one line
**The bento is the frosted menu of a room you are already in.** In Shanison, opening the menu blurs the
live room behind frosted panels (shanison 07, 08). We start with the menu open: the HRD reads the
bento, frosted glass over Adelia's room. "Enter the room" closes the menu: the frost clears, the tiles
fly home to the objects they belong to, and you are standing in the room.

## Screen 1: the bento (the HRD read, 5 seconds)
Learned from Yan (yan 01): the first card is the CV in one sentence; every project card has one
anatomy (name → one visual → one result sentence); the chrome disappears so the work carries colour.

- **Header (liquid glass pill, always visible on both screens):** `adelia.cc` mark · Work · Room ·
  **Contact** (the only orange on the site: Gakumas rations orange to one commit action per screen,
  gakumas §3, measured 0–2.7 % of pixels).
- **ID tile:** "Adelia Tiara", *Product Designer & AI Product Engineer*, one sentence in her words,
  status chip "Open to remote roles abroad · UTC+7", CV and links (TODO_SEA). Her acrylic figure stands
  in the tile (see Character).
- **3 project tiles:** the run anatomy: RUN 01–03 tag, name, one visual, one result sentence, an
  evidence ring (Gakumas CLEAR ring). All TODO_SEA until she sends them. Never invented.
- **Skills tile:** skill chips grouped by discipline, shape-coded (circle = design, hexagon = build,
  diamond = AI; gakumas steal 14). No percentages, no fake levels.
- **Phone tile:** the in-room phone peeks out of the tile, lock screen live: her time in WIB and a
  gauge of **how many working hours overlap with yours** (real, computed in the browser).
- **Room tile:** the one clear pane, a window onto the sharp room. "Enter the room".
- Desktop 1440×900: everything above in one viewport (4 × 3 grid). Phone 390×844 and 360×740: who,
  3 projects, skills and Contact before the fold; phone and room tiles after.

## The transition (Screen 1 → Screen 2), the client's priority
Trends §7 A + B, chosen over a scroll-driven door (C) to keep scroll untouched.
1. The room is rendered behind the bento from the first frame, but shown as a **pre-baked blurred
   veil** (a 120 px image of the real room, scaled up): no live blur, cheap on phones.
2. **Enter**: tiles part outward from the tapped tile (240 ms, 25 ms stagger), the veil fades
   (480 ms), the room settles from scale 1.06 to 1 (560 ms, `cubic-bezier(.32,.72,0,1)`).
3. **Tiles go home** (View Transitions where supported): the figure flies to the character, the 3
   project tiles to 3 frames on the wall, skills to the desk board, the phone tile to the phone on
   the table. Max 7 named elements. Without VT, step 2 runs alone.
4. **Back to Bento** (top-left, always visible, first in tab order) reverses it. URL `/` ↔ `/room`;
   the browser Back button works. Reduced motion: a 150 ms cross-fade.

## Screen 2: the room (the long read)
**An acrylic diorama of her room.** Idol fans collect acrylic stands and dioramas; acrylic is glass you
can hold, so the room is cold and glassy by material, not by a filter. A 2.5D CSS box (back wall,
floor, side walls) with flat illustrated objects printed on die-cut clear acrylic, standing at real
depths, with pointer parallax on desktop and a swipe pan (3 snap points) on phones. No WebGL.
**Cold but lived-in:** Shanison's room is warm (shanison §10) and the specialist warns a fully cold
room reads sci-fi. The client asked for cold. Decision: cool daylight, pale blue-grey walls, bleached
ash floor, ice-blue textiles, plants, objects with use marks. Cosy-cold, not sci-fi.
**The window shows her sky:** the room follows the time in Bekasi (morning / dusk / night;
shanison 05 follows time of day). A recruiter in London at 10:00 sees her dusk.

Every object opens something; nothing is decoration:
| Object | Opens |
|---|---|
| Adelia's acrylic figure | taps: she wobbles on her base and says a line (her real copy); "Profile" opens About |
| Phone on the coffee table | the phone (below) |
| 3 frames on the wall | the 3 project runs |
| Desk and monitor | Skills board: skill cards by discipline, what each was used for |
| Frosted "today" board | status: availability, focus now, roles wanted (shanison 25c) |
| Window | her time vs yours, overlap gauge, time-of-day switch |
| Mirror | dress-up: room time, figure finish (Prism / Frost / Clear / Holo), glass level |
| Shelf album | archive (Wall of Work, TODO_SEA) |
| Sofa | sit: photo mode, all UI hides (shanison 02) |
| Easter egg | a glass jellyfish in a bottle on the windowsill. Tap it three times. |

**Visit run (Gakumas energy, honest):** a small HUD ring counts objects found ("3 / 9"). When all
are found, a result card plays the rank reveal (title, 250 ms beat, letter slams in at 2.5× and
settles in 100 ms; gakumas 20) for **the visitor's** exploration, with its table shown, and one
orange "Contact Adelia". The only rank on the site that is measured, by construction.

## The phone (it works)
Opens like Shanison's (shanison 11): HUD fades, room blurs, phone rises tilted from below,
straightens, wallpaper, icons fade in; about 1 s; close reverses. Big and cut by the bottom edge on
desktop, full-screen on phones. Controls inside the device, Esc closes.
Apps (own names): **Posts** (her About, long version, as a feed), **Chat** (recruiter FAQ answered
in bubbles from real facts), **Call** (voice intro with captions; audio TODO_SEA), **Time** (overlap),
**Mail** (compose → email), **Settings** (time of day, figure finish, glass level, reduce motion).

## Project runs (Gakumas, honest)
Each project opens as a run sheet: brief and criteria first (gakumas 17), then an **evidence ring**
(CLEAR = shipped + role stated; PERFECT = + a measured outcome with its source), timeline of real
phases, result sentence, visual, links. While evidence is missing: "Result pending", empty ring.

## Character, without art
Adelia is the room's idol as an **acrylic stand**. Until photos arrive (TODO_SEA: 1–3 full-body
photos on a plain background), the stand holds a **prism-cut glass silhouette**: faceted, catching
light; Shanison's prism motif, her shape. Any transparent PNG dropped in later gets the same acrylic
treatment.

## Not doing
No loader gate, no WebGL, no scroll-jacking, no gacha, no red dots everywhere, no franchise
characters, logos, app names or the Vo/Da/Vi trio, no warm cream page, no invented results.
