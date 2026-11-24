# adelia.cc: concept v2 (after critique)

Lead, 24 Nov 2026. Based on `docs/research/{yan,shanison,gakumas,trends}.md` and one critique round
from the three specialists. What changed from v1, and why, is at the bottom.

## The idea in one line
**The bento is the frosted menu of a room you are already in.** In Shanison, opening the menu blurs
the live room behind frosted panels (shanison 07, 08). We start with the menu open: the recruiter
reads the bento, frosted acrylic over Adelia's room. "Enter the room" closes the menu: the frost
clears, the tiles fly to the objects they belong to, and you are standing in her room.

## Screen 1: the bento (the 5-second read)
From Yan (yan 01): the first card is the CV in one sentence; every project card has one anatomy;
the chrome disappears so the work carries the colour.

- **Header pill** (liquid glass, on both screens): `adelia.cc` · Work · Room · **Contact**, the only
  orange on the site (Gakumas rations orange to one commit action per screen; gakumas §3). Ink text
  on the orange for contrast.
- **ID tile** (wide): name, role, her one sentence, status chip "Open to remote roles abroad",
  WIB · UTC+7, CV and links. No figure here: a faceless shape in the 5-second tile reads "no photo".
- **3 project tiles**: visual first, cropped tight (Yan's bleed), then name and one result line.
  Factual chips only (role, year, status). No rings on the bento. All TODO_SEA until she sends them.
- **Skills tile**: one row of chips per discipline, shape-coded outline marks (circle = design,
  hexagon = build, diamond = AI). No levels, no percentages.
- **Phone tile**: the phone pokes out past the tile edge, lock screen live: her time and a flat ring
  of how many working hours overlap with yours (computed in the browser).
- **Room tile**: a sharp, clear pane onto her room. "Enter the room".
- Tiles are sized by content, never an equal grid. Tiles are acrylic slabs: a lit top-left edge and a
  2 px tinted thickness bottom-right, lit from the room side. Objects (phone) cross tile borders.
- Fits: desktop 1440×900 in one viewport. 360×740 shows name, role, status, the 3 projects (rows of
  76 px: thumb, name, result line), skills and Contact above the fold.

## The transition (Screen 1 → Screen 2)
1. The room exists behind the bento from the first paint as a **baked veil**: the real room blurred
   offline, a 96 px image per time of day with tint and grain baked in, picked before first paint from
   the Bekasi clock. No live blur. The room's DOM mounts after the bento has painted.
2. **Enter**: tiles part outward from the tapped tile (240 ms, 25 ms stagger), the veil fades (480 ms),
   the room settles from scale 1.06 to 1 (560 ms, `cubic-bezier(.32,.72,0,1)`). Interruptible.
3. **Tiles go home** with View Transitions where supported: project tiles land on the 3 frames, the
   phone tile on the phone, skills on the desk. Only flat elements are named. The room scroller jumps to
   the right panel inside the update so nothing flies off-screen. No VT: step 2 alone.
4. **Back to Bento**: top left, always visible, first in tab order, reverses the path. `/` ↔ `/room`,
   browser Back works. Reduced motion: 150 ms cross-fade.

## Screen 2: the room
**Eye level, inside her room.** 4 to 5 flat depth layers (back wall and window, far furniture, mid,
figure, a blurred foreground plant). The screen crops the walls; no box edges, no base. Parallax
≤ 12 px from the pointer on desktop; on phones the room pans sideways (3 snap points) and the layers
move by depth as you pan. No WebGL, no `preserve-3d`.
**Cosy-cold.** Cool walls (mid-tone, so frost reads ≥ 10 L* lighter), bleached floor, ice textiles.
One warm light, ≤ 8 % of pixels: a sun patch in the morning, a lamp pool at night (the research says a
fully cold room reads sci-fi). Traces of use: mug ring, open notebook, cardigan on the chair, cable,
sticky notes, one plant with a dry leaf. One line weight, one hand, flat shapes.
**Her sky.** The window follows Bekasi time: morning, dusk, night. Flat hard-edged bands and a low
Bekasi roofline (houses, a dome, distant towers, power lines). No gradient-blob sunset.

| Object | Opens |
|---|---|
| **Her acrylic stand** (clear blank cut to her outline, name on the printed base) | bobs 2 px; tap: wobbles, says a line (also as text); "About" button |
| Phone on the coffee table | the phone |
| 3 acrylic frames on the wall | the 3 project runs |
| Desk and monitor | skills board: each skill and where to check it |
| Frosted "today" board | availability, focus, roles wanted, start date |
| Window | her time vs yours, overlap gauge |
| Mirror | dress-up: stand finish (Clear, Frost, Smoke), glass level; same state as the menu |
| Shelf album | archive (Wall of Work, TODO_SEA) |
| Sofa | sit: photo mode, UI hides, exit always visible, Esc |
| Clear "Esc" keycap on the desk | the easter egg |

Touch: labels always visible after the first tap on "Show objects"; a plain list view of every object.

**Visit run (no grades).** A small ring counts down objects left ("6 left"). CLEAR when the essentials
are found (3 frames, desk, today board); PERFECT at all 10. Each tier stamps once after the open panel
closes: the word drops 2.5× → 1× in 100 ms (ease-in, no overshoot), one hairline ripple, then a clear
acrylic card of Adelia with one orange Contact. Skippable, never blocks Contact. No letters, no
sparkles, no rays.

## The phone
Choreography from shanison 11: room UI fades, room dims, phone rises tilted from below, straightens,
wallpaper, icons fade in. ≤ 700 ms, interruptible, controls inside the device, Esc closes the top
layer (app, then home, then phone). `/room/phone` so Android back closes it. Desktop: big, cut by the
bottom edge. Phones: rises as a sheet with its top bezel visible.
Apps: **Posts** (her long About as a feed), **Chat** (recruiter FAQ; bubbles one at a time; answers
are chips; the last chip is "Email me"), **Call** (captions now, voice later), **Work** (the 3 runs).
One unread dot, on Chat. Icons drawn from objects in her room, not a generic glyph set.

## Project runs
Opens as a run sheet over the dimmed room. White frost body (read), one cool dark-glass verdict card
(ink #403B52 / slate #545F7C at ~70 %). Criteria first; evidence ring: CLEAR = shipped + role stated,
PERFECT = + a measured outcome with its source. Missing evidence: "Result pending", only here.

## Materials (one system, split by role)
White frost + cyan tag = the world (bento, room panels, phone, menus). Dark glass = verdicts only (run
verdict, visit stamp). Liquid glass = controls only. Acrylic = the stand, the 3 frames, the bento
slabs. Never glass on glass. Flat single-colour strokes on every ring and gauge.

## After the MVP (her list, in order of value)
Gacha (what is pulled must be hers: process cards, sketches, real prompts; never paid, never random
rewards that gate content), music (a record player object), a short rhythm moment, outfits (needs her
photos). See `docs/roadmap.md`. WebGL only if one of these needs it.

## Changed after critique
- Visitor letter grade → CLEAR/PERFECT countdown (all three: never grade the recruiter).
- Evidence rings off the bento (Gakumas, Scout: three empty rings read "no results").
- Figure out of the ID tile (Gakumas). Prism crystal and Holo finish cut (Shanison, Gakumas: AI-art look).
- `preserve-3d` box and SVG-filter borders → flat depth layers and vector die-cuts (Scout: flattening,
  Safari flicker, VT snapshots, CPU filters).
- Acrylic only on the stand, frames and slabs (Shanison: edges everywhere make a toy shelf).
- One warm light allowed, ≤ 8 % (Shanison: cold and empty reads sci-fi). The client's "cold" holds.
- Phone apps: Settings and Time out; Work in (Shanison). Posts kept: the client asked for it.
- Jellyfish → keycap; gradient dusk → flat bands; sparkles and rays cut (slop risk).
- Contact text: ink on orange (Scout: white on orange fails contrast).
