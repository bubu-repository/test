# Shanison (THE iDOLM@STER Shiny Colors Song for Prism): UI/UX research

Phase 1, research only. Author: Shanison player and UI/UX specialist. Compiled 2026-11-24.

All images in `docs/research/shanison/img/` are third-party screenshots (Bandai Namco, press, or fan captures). They are kept only as internal research references and must never ship on the site. Each one was opened and checked by eye before it was kept.

## 0. Read this first: which version of the game you are looking at

- **Release date correction.** The brief says 2024. The game actually launched on **2023-11-14** (Game Watch, Pixiv encyclopedia). Google Play shows that it is still live: v2.20.0, last updated 2026-11-02.
- The UI changed a lot over time. The screenshots below come from four eras:
  - **Launch build** (2023-11 to 2024). Source: the official guide.
  - **Feb 2024 build** (v1.2.x). Source: the appgameui captures.
  - **Feb 2025 "Renewal", Ver 2.0.0.** Rhythm game first, Produce becomes optional, graphics overhaul.
  - **Nov 2025, Ver 2.8.0.** Dress-up rebuilt as "Dress Order".
- In May 2026 the update pace was cut, for example to about one 3D MV per month. This comes from a fan blog summarising the official notice; I did not open the official notice. The game continues.
- I could **not** obtain a screenshot of the 2026 home screen. Anything said about the *current* home is marked unverified.

## 1. Sources

| # | URL | What it is | Trust | Why |
|---|---|---|---|---|
| S1 | https://shinycolors-song-for-prism.idolmaster-official.jp/guide/ (detail-1 to detail-8) | Official play guide with in-game captures | High for the launch build | First party. Pre-renewal UI. |
| S2 | https://apps.apple.com/jp/app/id1669389369 | Official App Store listing: 6 screenshots, 30 s trailer, description | High | First party. These are marketing frames. |
| S3 | https://play.google.com/store/apps/details?id=com.bandainamcoent.shinycolorsprism | Official Play listing | High | First party. Used for version and date only (same art as S2). |
| S4 | https://idolmaster-official.jp/news/01_14334 | Official summary of the 2025-01-27 operator-letter stream: 37 slides | High, but the slides say "画面は開発中" | First party. One slide shows the renewal menu and produce hub. |
| S5 | https://idolmaster-official.jp/news/01_14685 and https://idolmaster-official.jp/news/01_14631 | Official notices before and at the renewal | High | First party. Text only for my purposes. |
| S6 | https://dengekionline.com/article/202501/31771 | Dengeki Online captures of the same stream, including a live dev-build home and menu | High for what was on stream | Major press. Direct stream captures. Dev build. |
| S7 | https://dengekionline.com/article/202502/33869 | Dengeki interview on the renewal, including the Feb 2025 song-select capture | High | Major press. |
| S8 | https://www.famitsu.com/article/202502/34745 and https://www.famitsu.com/article/202502/34824 | Famitsu dev interview (toon plus photoreal rendering) and the renewal press kit | High | Major press. Contains official key art. |
| S9 | https://automaton-media.com/articles/newsjp/the-idol-master-shiny-colors-song-for-prism-20250226-329720/ | Automaton renewal summary | High (text) | Press. |
| S10 | https://appgameui.hatenablog.com/entry/2024/02/21/002009 , .../2024/02/22/210449 , .../2024/04/09/003109 | Independent game-UI designer's blog with first-hand captures and GIFs of the home, phone and login, Feb to Apr 2024 | High for the pixels, medium for interpretation | Real device captures, including animated GIFs that I split into frames. The opinions are the author's. |
| S11 | https://gameo.jp/imassc/130123 , /154716 , /169599 , /149255 | Fan aggregator of 2chan threads. Embeds official X images | High for the embedded official images, medium for user captures | The official "dress-up room" and "Dress Order" promo images come from here. |
| S12 | https://crow-diary.com/the-idolmster-shiny-colors-song-for-prism-november-10-2025/ | Fan blog on the Ver 2.8.0 patch, with captures | Medium | The captures match the official promo. |
| S13 | https://kamigame.jp/shinycolors-songforprism/page/291104058758983704.html | Strategy-wiki settings guide (2024-01) | Medium | Text only. Gives the Live options "レーン透明度" and "背景の明るさ". |
| S14 | https://wikiwiki.jp/songforprism/ (ホーム, アップデート履歴) | Community wiki | **Low: blocked, not opened** | I saw only search-engine snippets. Each claim from it below is marked unverified. |
| S15 | https://aimasupay.hatenablog.com/entry/2026/05/30/223211 | Fan blog on the 2026 scale-down | Low to medium | Secondary summary of an official notice. |
| S16 | https://game.watch.impress.co.jp/docs/news/1546961.html | Press: release on 2023-11-14 | High (seen as a search snippet) | Used only for the date. |

## 2. Home

### What it is
The home screen is **the 283 Production office**, rendered in 3D anime-toon style. The default view is the staff lounge, which really does read as a living room: sofa, TV and coffee table. It is warm and sunlit, **not** cold. The office is made of several rooms, and idols turn up in different ones from visit to visit.

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Lounge with the full HUD | `shanison/img/01-home-lounge-hud.jpg` | S1 | One idol stands front and centre facing the camera, two sit on the sofa behind, looking down at a phone or book, and the HUD covers all four edges. |
| Lounge with the UI hidden | `shanison/img/02-home-lounge-ui-hidden.jpg` | S10 | The same lounge with no HUD at all, so a view-the-room mode exists. I believe the ⤢ icon at top right toggles it, but that is **unverified**. |
| Idol speaks on the home screen | `shanison/img/03-home-idol-line.jpg` | S10 | A white speech box with a cyan name tag sits at mid-left beside the standing idol. A second idol sits on the sofa looking at her phone. |
| Other rooms | `shanison/img/04-home-other-rooms.jpg` | S10 | Six other places, each with idols doing something: (a) dance studio, (b) storage room with steel shelves, boxes and a clothes rail, (c) kitchenette with fridge, counter and snacks, (d) meeting room, (e) wall of binder shelves, (f) the producer's desk with a schedule whiteboard. Panel (f) has no HUD. |
| Time of day and events | `shanison/img/05-home-time-weather-event.jpg` | S10 | The same lounge by day, dusk and night (sky in the window), plus a Valentine version with a heart garland, "VALENTINE" letters on the window and a cake stand. |
| Renewal dev-build home (Jan 2025) | `shanison/img/06-home-renewal-corridor.jpg` | S6 | The home is now an entrance corridor: wooden cabinets, an office logo plaque, flowers, two idols chatting. The phone tile is gone from the right-hand icon cluster. |

**Lounge objects (verified in 01, 02, 03, 05):**
- a big window with office lettering on the glass and a bare tree outside
- an L-shaped cream sofa with blue and white cushions
- a low table with a lace doily, a TV remote and a small ribbed green vase of yellow flowers
- a wide TV on a wooden stand, showing an MV or a programme
- three small yellow chick figures on a plate
- a silver first-aid box with a green cross
- low shelves of binders and boxes
- a yellow school backpack (randoseru) on a shelf
- a tall potted plant on the right, a small cactus, a pink flower pot on the sill
- a blue partition on the left with posters and a hanging jacket
- a pink stool

**Where the menus live.** They are **not hidden in objects.** Everything is a 2D HUD layered over the 3D room (verified in 01 and 03):
- **Top left:** the ST and LB stamina gauges, each with a "+" button.
- **Top right:** the jewel counter with "+", a round icon (probably home settings, **unverified**), ⤢ and a ⋮⋮⋮ global-menu button.
- **Left:** stacked campaign banners and a carousel banner at the bottom.
- **Right:** an "Event list" badge and a row of icon tiles: phone, bell (notices), clipboard (missions), gift (presents), exchange shop.
- **Bottom:** the footer bar (section 3).

None of the furniture in any capture is a menu. **This contradicts the assumption in our brief.**

**Idol behaviour.**
- Verified: one idol stands front and centre with idle motion, other idols sit or move in the background, and the standing idol's lines appear in a speech box (03).
- S10 says some lines are tied to the season and that unit skits play now and then (one GIF shows them moving outdoors).
- **What tapping the idol does is unverified.** Every "tap the idol" source I found describes the older browser game (enza Shiny Colors), not Shanison.

**Disputes and unverified points:**
- S10 claims the home also changes with the weather. I saw only time of day and event props, so weather is **unverified**.
- S14 (snippet only) says the current home has a "ホーム設定" button at top right that sets "the idol in front of the desk", and that Ver 2.8.0 put a "モバイル" button back on the home screen. **Both are unverified.** They fit 06, where the phone has left the home HUD.

## 3. Main menu and navigation

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Launch footer | `01`, `03` | S1, S10 | Six labels on a frosted white strip: キャラクター / ストーリー / プロデュース / ライブ / ショップ / ガシャ. Each icon is a small illustrated object (chibi face, open book, calendar and mug, stage, trolley, crown) that pokes up above the strip. Pink dots and small blue callouts ("エピソード追加！") sit above some of them. |
| Global menu, launch | `shanison/img/07-menu-launch.jpg` | S1 | The ⋮⋮⋮ button opens a grid of opaque white cards over the **blurred** live room. A cyan "メニュー" tab sits top left and ✕ top right. A ホーム tab is added to the footer. "DM" is greyed out. |
| Global menu, renewal | `shanison/img/08-menu-renewal.jpg` | S6 | プロデュース and モバイル become the top two cards. The cards are now **translucent frosted glass with a faint faceted prism texture** (I checked this zoomed in). News banners fill the left column. |
| Footer, renewal | `06` | S6 | The tabs become キャラクター / ドレスオーダー / ストーリー / ショップ / ガシャ, and **ライブ moves to its own larger slanted tile at far right**. The strip is a translucent parallelogram. プロデュース leaves the footer. |
| Character hub | `shanison/img/09-character-hub-prism.jpg` | S1 | Pale cyan prism-facet background with drifting white feathers. The assistant stands at left. Four tiles (育成, 編成, 一覧, 詳細) are each a tiny diorama of chibi idols in a room. |

Nav model: a persistent footer, a global-menu overlay, a screen-title tag at top left on every sub-screen, ◀ back at bottom left, ✕ close at top right.

## 4. The in-game phone (モバイル)

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Home screen of the phone | `shanison/img/10-phone-homescreen.jpg` | S10 | A portrait phone with a silver-white bezel stands centred on the landscape screen, its bottom edge cut off by the screen edge. The room behind is blurred. Four app icons with red unread dots sit on a navy, violet and cyan gradient wallpaper with diagonal light planes. |
| Boot and close animation | `shanison/img/11-phone-boot-sequence.jpg` | S10 (GIF split into frames) | The HUD fades and the room blurs. The phone rises from below, tilted, then straightens showing only the wallpaper. Icons fade in, then the outer controls (tag, ✕, ◀) appear. Closing tilts the phone and drops it. |
| Twesta (SNS) | `shanison/img/12-phone-twesta.jpg` | S10 | Blue-to-pink gradient header with a wordmark and a heart button. The feed shows posts from idols and the agency, each with avatar, text, hashtags, comment count and a heart like. In the GIF frames the heart turns pink with a small burst. |
| CHAIN (chat) | `shanison/img/13-phone-chain.jpg` | S10 | Cyan header with the contact's name and ☰. Cream wallpaper with a smiley stamp watermark. Idol bubbles are white on the left with an avatar, the producer's bubbles are cyan on the right, and an input bar with a pencil sits at the bottom. |
| 電話 (calls) | `shanison/img/14-phone-call.jpg` | S10 | (a) Green header, tabs アイドル順 and 着信順, contact rows with unread dots. (b) During a call: a round avatar, the name and a frosted subtitle box. The background changes per idol: pink bokeh for one, a starry navy sky for another (seen in GIF frames). The producer's lines show in green, and a "もう一度再生する" replay button appears at the end. |
| OurSTREAM (video) | `shanison/img/15-phone-ourstream.jpg` | S10 | Red header with a logo. A video card shows thumbnail, duration, title, date and channel. The "視聴チェック" button has an external-link icon; S10 says it opens the real YouTube video. |

- **App switcher and navigation sit outside the device:** a dock of the four apps on the right, ◀ at bottom left, ✕ at top right. S10 criticises this split. I agree; see DO NOT COPY.
- **Entry point:** a pink phone tile in the home's right-hand icon cluster in 2024 (03), then the "モバイル" card in the global menu after the renewal (08).
- **Unverified:**
  - whether any apps were added after Feb 2024;
  - S10's claim that the call audio is "muffled like a phone";
  - search snippets saying calls also arrive as rewards and trust events.

## 5. Dressing room (衣装 / dress-up)

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Stage outfit select, launch | `shanison/img/16-dress-stage-costume-2023.jpg` | S1 | The backdrop is a real dressing room: bulb vanity mirror, striped wallpaper, pink checkerboard floor, fitting curtain, hanger rail. The 3D idol stands left of centre. On the right is a frosted white grid of outfit thumbnails with an "着用中" badge, plus a vertical category rail (SET, outfit, hair, glasses, earrings, lipstick). Along the top are a 試着モード toggle, a 着用可能のみ filter and お気に入り. A big blue 決定 button sits at bottom right. |
| Dress-up Room (Mar 2024) | `shanison/img/17-dressup-room-2024.jpg` | S11 (official promo) | Opened from the Character hub. The idol stands in the dressing room and greets you. Pick an outfit and she is wearing it; then you view her close up or full body. |
| Dress Order rebuild (Nov 2025) | `shanison/img/18-dress-order-2025.jpg` | S11 (official promo) | One screen with 衣装 and ドレスオーダー tabs, filter and sort chips, and a grid with locks on outfits you do not own. **You can try on locked outfits.** A gold 解放 (unlock) button, and a modal for choosing the idol with unit filters. |
| View Mode, portrait | `shanison/img/19-dress-viewmode-vertical.jpg` | S11 (user capture) | Full-screen portrait view with no UI, shown from the front and from behind. |

Preview model: a live 3D model updates the moment you tap a thumbnail. According to S1, outfits are also changed from the Live formation screen.

## 6. Live (rhythm game)

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Launch-era Live | `shanison/img/20-live-guide.jpg` | S1 | The 3D MV plays full screen. A **translucent trapezoid "highway"** recedes upward over the idol, and a segmented judgement line sits near the bottom. Notes are flat glowing cyan bars; green chevrons are directional notes. "PERFECT" appears in rainbow-gradient letters. A large thin "291 COMBO" sits at right, with SCORE, a +delta and a C/B/A/S/SS bar at top left, and LIFE with a green bar plus pause at top right. A skill cut-in slides in from the left. |
| App Store Live | `shanison/img/21-live-appstore.jpg` | S2 | Violet hold-note ribbons, green or cyan flower-shaped hit bursts, and two PERFECT judgements at once. The penlight crowd is visible through the highway. |
| Renewal Live (MASTER) | `shanison/img/22-live-master-renewal.jpg` | S8 | The same highway with a MASTER badge at top left, wide green and cyan notes, and a pink "356 COMBO". The neon stage is more saturated. |

- The highway is literally a frosted glass plane: inside it the floor reads #423c5e, outside it #645a97 (palette table).
- According to S13, players can set lane transparency and background brightness.
- The **lane count is unverified.** One secondary source says four lanes, and I could not count them reliably from stills.

## 7. Produce

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Schedule (2023) | `shanison/img/23-produce.jpg` (a) | S1 | Three idol portraits on yellow at left, with Vo/Da/Vi/Me stats and a rainbow stamina bar. On the right, weekly rows of schedule cards with location photos (lesson room, park, sky, shops) stack and recede upward. |
| Audition (2023) | `23` (b) | S1 | A deck-building card battle on a 3D stage: a hand of cards, appeal bars, a timer, judge silhouettes. |
| Produce hub (2025) | `23` (c) | S4 | Reached from the global menu. The assistant stands at left, with three tiles: プロデュース, チャレンジツアー and a greyed-out シャイニーコンペティション. |

In Shanison, Produce is a 7-week × 3-season training sim whose best run ends in a "Memorial Live", an MV that cuts in scenes from your run (S1 text, App Store description). Since the renewal it is optional and has left the footer.

## 8. Song select

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Feb and Nov 2025 | `shanison/img/24-song-select.jpg` | S7, S12 | A left rail of unit logos plus SOLO and OTHER. In the centre, a **stack of skewed glass song cards** in which the selected card pops forward with a cyan-to-magenta glow border. Each card has a jacket with a waveform overlay, title, artist, Lv and clear dots. A large jacket sits at right with 報酬 and ランキング. Difficulty orbs run EASY (blue), NORMAL (green), HARD (orange), EXPERT (pink), MASTER (purple). At the bottom are MV視聴 and a blue 決定. A TECHNICAL RATE emblem sits at top centre. The background is a blurred 3D stage. |

## 9. Title, loading and transitions

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Title to login to home | `shanison/img/25-title-loading-login-transition.jpg` | S10 | Title: idols on a cyan **crystal-faceted floor**. Loading: a white-to-pale-cyan prism-facet field. Login bonus: a **frosted see-through whiteboard** beside the assistant in the office. The board then leaves and the camera moves through the office into the lounge. I cannot tell from the 400 px GIF whether the last step is a continuous pan or a cut. |

## 10. Palette and material

Every sample below was measured with PIL on the saved files in `shanison/img/`. Coordinates are pixels in that file; each value is the mean of a (2r+1)² box.

| Hex | Image | x,y (r) | UI element | Read |
|---|---|---|---|---|
| #ddceb4 | 01 | 1120,180 (8) | Lounge wall | warm neutral |
| #e1ded9 | 01 | 650,430 (6) | Sofa | warm neutral |
| #5d3a27 | 01 | 250,560 (5) | Wooden TV stand | warm |
| #ece7e3 | 01 | 1045,565 (3) | Frosted footer strip, tinted by the room behind | neutral frost |
| #fcfcf9 | 03 | 560,560 (2) | Footer strip | neutral white |
| #9adbf9 | 03 | 80,38 (1) | ST gauge fill | cool |
| #f3396c | 03 | 720,402 (2) | Notification dot | hot accent |
| #26a3dc | 07 | 120,28 (4) | "メニュー" screen-title tag | **cool signature accent** |
| #ffffff | 07 | 520,150 (6) | Menu card, launch (opaque) | neutral |
| #496d8e | 07 | 80,470 (8) | Blurred room behind the menu | cool (blur cools it) |
| #e9e8e5 | 08 | 470,90 (4) | Renewal frosted faceted menu card | neutral frost |
| #69d1de | 08 | 110,20 (3) | Renewal menu tag | cool |
| #c5f1fa | 09 | 430,60 (8) | Prism background, Character hub | cool |
| #daf4fe | 09 | 1150,380 (8) | Prism background, Character hub | cool |
| #2ca9df | 10 | 110,27 (3) | "モバイル" tag | cool accent |
| #09030d | 10 | 300,70 (6) | Phone wallpaper, top | cool dark |
| #590678 | 10 | 300,540 (6) | Phone wallpaper, bottom left | cool violet |
| #0d8bd2 | 10 | 760,500 (6) | Phone wallpaper, right | cool |
| #dddddd / #1a191a | 10 | 215,300 / 226,300 (1) | Phone bezel, outer silver and inner black | neutral |
| #46b7f6 → #e673ae | 12 | 270,95 → 770,95 (4) | Twesta header gradient | cool to accent |
| #73d8ea | 13 | 330,80 (5) | CHAIN header | cool |
| #fff9d7 | 13 | 650,450 (5) | CHAIN chat wallpaper | warm neutral |
| #73c9dc / #f7f7f4 | 13 | 600,290 / 455,172 | Producer bubble / idol bubble | cool / neutral |
| #fdcae6 | 14 | 843,205 (4) | In-call background (pink idol) | accent |
| #9bf2fb | 20 | 512,398 (2) | Tap note | cool accent |
| #17fea5 | 20 | 1000,42 (2) | LIFE gauge | accent |
| #423c5e vs #645a97 | 20 | 240,585 vs 50,585 (5) | Floor seen through the highway vs bare floor | evidence the highway is translucent and darkening |
| #f6f4fa | 24 | 404,639 (5) | Selected song card body | neutral (cool-tinted white) |
| #1c75bf | 24 | 737,782 (3) | 決定 button | cool |
| #c5be62 | 24 | 608,783 (3) | MV視聴 button | accent |
| #6ecbec / #54e4fb | 25 | 53,150 / 103,60 | Crystal floor on the title screen | cool |
| #e4f7fd | 25 | 629,100 (6) | Loading prism facets | cool white |

**Why it feels cool and glassy, and where it does not.** Honestly, **the room is warm**: cream walls, wood and beige sofa (#ddceb4, #5d3a27). The cool feeling comes from the **layer on top of it**:

1. **A prism and crystal motif in faceted triangles**: title floor, loading screen, Character hub background, and the frosted renewal menu cards. The game's name is "Prism", and the motif is everywhere.
2. **Cyan-and-white chrome.** A cyan parallelogram screen-title tag (#26a3dc) at top left of every screen, white or frosted cards, and thin light borders.
3. **Real depth-of-field blur on the 3D room** whenever an overlay opens (menu, phone). The panels feel frosted because what is behind them is soft, not because they are tinted.
4. **Translucency wherever possible:** the footer strip, menu cards, the login whiteboard, the call subtitle box and the Live highway.
5. **White feathers and light planes:** feathers drift on the hub, and diagonal light streaks cross the phone wallpaper.
6. **Type:** a rounded Japanese gothic for labels, white labels with cyan outlines on the footer, and very thin geometric numerals for the combo count. The exact typeface is **unverified**.

Shanison's mood is **"frosted white glass floating over a warm, lived-in, sunlit room."** If everything were made cold, including the room, it would stop feeling like Shanison and start feeling like sci-fi.

## 11. STEAL list (patterns, not assets)

| # | Pattern | Goes to | Evidence |
|---|---|---|---|
| 1 | Warm, lived-in room under a frosted glass HUD. Contrast is the point. | room | 01, 03 |
| 2 | Opening any overlay blurs the live room with real depth-of-field, and the panel stays translucent. | room, bento, phone | 07, 08, 10 |
| 3 | Phone boot choreography: HUD out, blur in, phone rises tilted and straightens, wallpaper, then icons fade in, then chrome. Closing reverses it. About 1 s. | phone | 11 |
| 4 | A phone with 3 to 4 apps modelled on real app genres, given our own names and icons, with red unread dots. For us: Posts (work log), Chat (Q&A with Adelia), Call (voice intro), Stream (demo videos). | phone | 10, 12-15 |
| 5 | The chat layout: left/right bubbles, a soft wallpaper with a stamp watermark, an input bar. Use it for "Ask me" or a recruiter FAQ that plays like a conversation. | phone | 13 |
| 6 | An in-call screen with a round avatar, a name and a frosted subtitle box, where the visitor's lines are highlighted in another colour and a replay button appears at the end. Use it for a 30 s voice intro with captions. | phone | 14 |
| 7 | The room changes with the visitor's local time (day, dusk, night through the window), plus a few seasonal props. | room | 05 |
| 8 | Move the camera between places instead of cutting pages: login board leaves, the camera pans through the space, arrive. Use it for bento to room. | transitions | 25 |
| 9 | Pale cyan prism-facet field (#c5f1fa to #daf4fe, #e4f7fd) for "system" screens and the loader. | bento background, loading | 09, 25 |
| 10 | One consistent screen-title tag at top left on every overlay (メニュー, モバイル, キャラクター) so you always know where you are. | all overlays | 07, 09, 10 |
| 11 | Footer icons as small illustrated **objects** that pop out of a frosted strip, with one primary action given its own larger slanted tile (renewal ライブ). | room nav | 03, 06 |
| 12 | Hub tiles that are tiny dioramas of a place rather than flat icons. Each bento project tile could be a mini scene. | bento | 09 |
| 13 | Dress-up layout: model on the left, frosted grid on the right, vertical category rail, a try-on toggle, a "try locked items" preview, and a View Mode that hides all UI. | dress-up | 16, 18, 19 |
| 14 | Song-select skewed glass card stack, where the selected card glows with a gradient border and a large preview sits at right. "Difficulty" orbs could become reading depth: TL;DR, Standard, Deep dive. | project picker | 24 |
| 15 | A frosted see-through "today" board in the room (adapted from the login board): availability, timezone, current focus. | room | 25 (c) |
| 16 | A "photo mode" that hides all UI to look at the room. | room | 02 |
| 17 | Translucent highway over a performance, with a rainbow judgement word and large thin numerals. Only for a short "energy" moment. | live-ish moment | 20-22 |

## 12. DO NOT COPY

1. **Any Shiny Colors or 283 IP.** That covers characters and look-alikes (including an assistant who resembles the office assistant), the "283" window lettering, the swan emblem, the feather logo, unit logos, chibi art, the app names Twesta, CHAIN and OurSTREAM, the app icons, music and MVs. It is an IP problem, and fans spot it instantly.
2. **Real-app look-alikes.** The 電話 icon is a green speech-bubble phone, and CHAIN apes LINE. Do not mimic LINE, Instagram, WhatsApp or YouTube brand marks. Take the genre, not the trade dress.
3. **The gacha and stamina HUD.** ST and LB gauges, the jewel counter with "+", stacked campaign banners, a red dot on everything, "10回無料！" callouts and the GET-stamp reward grid. To a recruiter these read as monetised clutter and dark patterns.
4. **Putting the phone's navigation outside the device.** Shanison puts back, close and the app switcher around the phone (see 10, 12-15), and S10 rightly criticises it. On the web, keep controls inside the device and support Esc and the back button.
5. **Making HRD play anything.** No rhythm game, no deck building, no Produce loop. The 5-second read must not depend on a mechanic. Keep the Live idea to a passive or optional moment.
6. **The saturated neon Live palette as the site palette** (magenta, lime and lasers in 21 and 22). It fights the "cold glassy" brief. Energy belongs in a small, scoped moment.
7. **The exact cyan tag shape, rounded font and white-outlined labels together, at Shanison's proportions.** Any one of them is fine. All three at once reads as a skin of the game.
8. **The specific props.** Yellow randoseru, chick figures, first-aid box, giant window lettering. They are 283-specific and add nothing to a portfolio. Choose props that are Adelia's.
9. **Full 3D toon characters.** The cost and performance are disproportionate for a portfolio, and the uncanny risk is high. The pattern works with a 2D or illustrated character.

## 13. Player's gut check

- **Right:** you open a menu and the room is still there, softly blurred behind frosted glass. That moment is Shanison.
- **Right:** the phone *rises* into view, tilted, then settles. It does not slide in like a modal. Get this motion wrong and players feel it immediately.
- **Right:** the room is sunny and lived-in, people are doing small things in it, and the window changes with the hour. A cold, empty blue room feels like a different game.
- **Wrong:** menus hidden inside furniture. Shanison never does this; its menus are a clean HUD. If we hide navigation in objects, that is our own idea (fine), but do not call it Shanison and do not make it the only way to navigate.
- **Wrong:** a frosted panel with no faceted or prism detail and no cyan tag looks generic iOS, not Shanison. The prism shard texture is the tell.
- **Wrong:** red badges and "+" buttons everywhere looks like a gacha game, not a portfolio.
- **Right:** chat bubbles that arrive one by one with a soft pop, and a call screen with captions. That is the "she is real" feeling the phone exists for.
- **Wrong:** a portrait phone mockup that shows the whole device floating mid-screen. In Shanison the phone is big and cut off by the bottom edge, as if you were holding it.

## 14. Unverified or disputed (summary)

- What happens when you tap the home idol. Sources describe the older browser game, not Shanison.
- Weather-based home variation (S10 claim only).
- The current (2026) home layout: the desk view, the home-settings button, and whether the モバイル button returned in Ver 2.8.0 (S14 snippets only).
- Any phone apps added after Feb 2024. The phone audio filter (S10 claim).
- The Live lane count (one secondary source says four).
- The UI typeface.
- Whether the login-to-home move is one continuous camera pan.
- The brief's "2024" release year is wrong. The game launched on 2023-11-14 (S16, Pixiv).
