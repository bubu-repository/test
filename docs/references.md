# Visual references: what we take, what we leave

Notes from the reference screenshots the client shared (spec §0b). The images themselves are not committed: they are third-party work and this repo may become public. Sources are linked so they can be reopened.

Not seen yet: **L03** (Daily UI notes app, the folder metaphor for the entry) and **19** (UOMI on Behance, the case-study order). Both are needed before Phase 3 and Phase 2 respectively.

## L01 · Are.na "24:QW — GRAPH DUMP" (https://www.are.na/colon-period/colon-dash-ubtl-aipkto)

Seen: board for 24qw.app, "an app with cute collectable widgets". Acid-yellow fields with grey device widgets and magenta toggles; a "Typical day duration" widget with a thick yellow ring, black pill and pixel lettering on a sky-blue cloud photo; a magenta app icon on sky.

Take: magenta + acid yellow + sky blue on a neutral scaffold matches our tokens (`--accent` light/dark, `--accent-soft`). Chunky iOS-widget shapes: thick rounded containers, pills with round icons. Pixel lettering only for one or two words.

Leave: acid yellow as a full background. Neon stays an accent (≤5% of the screen).

## L02 · Pinterest "24:QW — GRAPH DUMP" (https://id.pinterest.com/24qwapp/24qw-graph-dump/)

Seen (partly covered by a login modal): pill bars with round colored icons, stacked highlight labels (STAY TUNED / SESSION TIME / DATE), sky-and-cloud backgrounds carrying white, black, yellow and magenta pill tags, a glossy chrome 3D app icon with sparkles, a chat-bubble widget with yellow and white answer pills.

Take: pill tags as the main small-label shape; glossy 3D object on a sky stage as the hero/404 moment; widget answers as pills.

Leave: many saturated colors in one frame.

## 18 · layers.to/jeffinsam (https://layers.to/jeffinsam)

Seen: grid of white rounded tiles with a hairline border, each filled with the same dreamy pastel sky; phone mockups centered; glossy 3D stickers (coins, badges); collectible cards.

Take: one sky stage repeated behind every mockup, so different projects read as one family. This is `StageFrame`. Glossy stickers as accents.

Leave: lavender-heavy sky (ours is the `--stage-from` → `--stage-to` blue), and too many stickers at once.

## 10 · yahengli.co (https://www.yahengli.co/)

Seen: left sidebar with logo, role, info and a selected-works list split by hairlines; work shown as photographed objects floating on light grey with soft shadows; a mono caption `PROJECT 0X | CATEGORY` above every object; a blue "Projects Folder (2018–25)" icon.

Take: the caption pattern above each thumbnail (spec §9), and treating work as objects with depth, not flat cards. The folder icon as "the archive" confirms the Work folder metaphor.

Leave: irregular object sizes. Our grid keeps every thumbnail at 4:3 inside `StageFrame` (spec §0c).

## 04 · hirotos.com (https://www.hirotos.com/)

Seen: tiny grey uppercase role ("CREATIVE DEVELOPER") above a large uppercase name; stacked uppercase nav top-right with the active item darker; one chrome 3D object in the center; footer bottom-left with three compact columns BASE / FOCUS / INDEX, each opened by its own hairline, grey label over a small black uppercase value ("PORTFOLIO 2026").

Take: the footer layout exactly (implemented in `SpecSheetFooter`), the tiny-label / huge-name contrast, one 3D object with lots of negative space.

Leave: grey small labels. `--muted` fails AA at that size, so our labels use `--ink`.
