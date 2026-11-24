# Gakumas (学園アイドルマスター) UI research: what we can borrow for adelia.cc

Phase 1 research by the Gakumas player and UI/UX specialist. Research only, nothing designed yet.

I opened every image listed here and named only what I could see. Three labels are used throughout:

- **Verified**: seen in a screenshot or video frame.
- **Inferred**: a reading of what I saw, with the reason given.
- **Unverified**: I could not see it, so it is not claimed.

The screenshots in `gakumas/img/` are third-party images, kept for internal reference only. They must never ship in the portfolio.

---

## 1. Sources

| # | Source | What it is | Trust | Why |
|---|---|---|---|---|
| S1 | https://gakuen.idolmaster-official.jp/system/ (`assets/img/system/thumb_*.png`) | Official site, "Game System" page. Promo phone screenshots. | High, with one caveat | First party. The page says "※画像や動画は開発中のものです", so the images may come from a development build. The PNGs use 256-colour palettes, so gradients are flattened. Do not use them to read gradient colours. |
| S2 | https://gakuen.idolmaster-official.jp/road-to-a-plus/ (`assets/img/road/accordion_img_*.png`) | Official "Road to A+" advice page | High | First party. States which inputs the final evaluation depends on. |
| S3 | https://apps.apple.com/jp/app/id6446659989 | App Store JP listing screenshots | High | First party. Each image has an orange marketing banner on top; that banner is store art, not game UI. |
| S4 | https://play.google.com/store/apps/details?id=com.bandainamcoent.idolmaster_gakuen | Google Play listing | High | Same images as S3. Viewed, not reused. |
| S5 | https://www.4gamer.net/games/778/G077853/20240703024/ | 4Gamer, 2024-07-03, deck-building feature | High for UI as of mid-2024 | Real device captures at 576×1024 (`/SS/NNN.jpg`). |
| S6 | https://www.4gamer.net/games/778/G077853/20240722027/ | 4Gamer, 2024-07-22, Sense/Logic plan guide | High for mid-2024 | Real captures. |
| S7 | https://www.4gamer.net/games/778/G077853/20240816019/ | 4Gamer, 2024-08-16, A+ guide | High for mid-2024 | Real captures, including the produce history record. |
| S8 | https://www.famitsu.com/article/202405/6339 | Famitsu, 2024-05-28, A+ guide | High | Real captures at 750×1334, including the final evaluation screen and the completion card. |
| S9 | niconico `so44509882`, official channel: はつみちゃんのキラっと☆プロデュース教室 2時間目「目指せ！A+(好調編)」 | Official tutorial video with real gameplay in a left-hand panel (~262×480 inside an 854×480 video) | High for sequence and in-shot timing. Low for fine detail. | The video is edited, with cuts between scenes, but each in-game shot plays continuously. I extracted it at 30 fps, so timing is accurate to about ±33 ms. Resolution is low. |
| S10 | niconico `so44455457`, official tutorial 1時間目 | Mostly a mascot re-enactment | Medium | Used only to confirm the official A+ guidance. Not used for motion, because the motion shown is cartoon, not game. |
| S11 | i.ytimg.com thumbnails of official PVs: `cQcdUgNMgB0` (PV1), `fDTkgTGyK9A` (N.I.A), `kYJqwyrqolw` (H.I.F) | Official YouTube thumbnails | Medium | Thumbnails only. YouTube blocked video download ("Sign in to confirm you're not a bot"). |
| S12 | bilibili `BV138yGz7EE6` storyboard sprites | Third-party automated play of the H.I.F mode. One frame every 6 s, about 120 px wide. | Low | Used only to see that later modes show big score pop-ups and use blue geometric loading screens. Not saved. |
| S13 | Text-only web search summaries (Game8, Gamerch, Altema, 4Gamer blog) | Rank tiers above S (SS, "S4+", etc.) | Unverified visually | No image confirms them, so I make no claims about tiers above S. |

Blocked or not used: YouTube video (bot check), bilibili video CDN (403/567), wikiwiki.jp and web.archive.org (blocked, as briefed). The newest UI capture I have of the home screen is from July 2024. **The current home screen layout is unverified.**

---

## 2. Screens

### 2.1 Title and Home

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Title screen | `gakumas/img/01-title-screen.jpg` | S3 | A cool blue sky and a wet rooftop at dusk, with the white handwritten-script logo top-centre. Sky samples #5481A3 and #447091. The cast stands small at the bottom. The mood is cold, airy and quiet. |
| Home: the idol is the centre | `gakumas/img/02-home.jpg` | S5 | One 3D idol stands full height in the middle of a classroom. Her face sits in the upper third, and everything tappable is arranged around her rather than over her. |
| Home: side menus | same | S5 | Left side: small round "活動費 8%" and "お仕事 20:49" timers, plus a large round "イベント" button. Right side: four small round icon buttons (プレゼント, ミッション, アチーブ, パス) and a large orange round "ショップ" button (#FFB252). |
| Home: primary action | same | S5 | A wide pill labelled "プロデュース" in a pearl/iridescent pink-lavender-cyan gradient, with a pink "キャンペーン中" tag. It is the only large text button on screen. |
| Home: navigation | same | S5 | A **curved, smile-shaped bottom nav bar** with コミュ / アイドル / ホーム / コンテスト / ガシャ. The active item is orange. In this capture the bar is cream/peach (#FFEECF / #F5CFA7). Inferred: it may be partly translucent and warmed by the classroom light. |
| Home: header | same | S5 | Top-left: an orange "PLv 45" disc (#FFA85D). Top-centre: stamina "48/100". Top-right: gem currency and a rotating banner. |

### 2.2 Produce: the run structure

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Choosing a mode | `gakumas/img/03-produce-mode-select.jpg` | S5 | A dark navy night stage with a large "定期公演 初 HAJIME" crest. There are two difficulty pills: "レギュラー" in an orange gradient and "プロ" in a blue-to-pink gradient, each showing a stamina cost. |
| Week HUD | `gakumas/img/04-produce-week-hud.jpg` | S1 | A white card at top-left reads "最終まで 4週" (4 weeks to the final) with a thin red rule and a ✦ mark. Top-centre: a green stamina bar showing 24/32 and P-points 83. Top-right: a "審査基準" mini bar chart with pink, blue and yellow bars against a 200 dotted line. In the middle are three horseshoe gauges with grade letters (C+, B, B+), values (565, 685, 923) out of /1000, and growth % pills. Below: "行動を選択してください" and three big square lesson buttons (Vo pink, Da blue, Vi yellow), with a "休む" (rest) button on the right. |
| Schedule overview | `gakumas/img/05-schedule-timeline.jpg` | S5 | A vertical timeline labelled 1週 to 6週. The current week is a blue pill with the idol's avatar. Each week shows the action icons available that week: Vo, Da and Vi lessons, 授業 (class), おでかけ (outing), 相談 (consult/shop) and 活動支給 (activity supply). Week 6 is a rainbow-gradient "追い込みレッスン" (final-push lesson) bar. The header reads "中間まで 6週" and shows the three current parameter values. The tabs are スケジュール, 育成目標 and 編成. |
| Non-lesson weeks | `gakumas/img/06-week-other-actions.jpg` | S6 | Three square buttons: 活動支給 (orange, gift box), おでかけ (teal, people), 相談 (green, face). The gauges read C 304, D 209 and D 238 out of /1500. A "課題解放" tag sits on the P手帳 notebook. |
| Shop (相談) | `gakumas/img/14-shop-card-upgrade.jpg` | S7 | "Pポイントと交換するものを選んでください". Cards and drinks carry P prices, with strike-through "SALE" prices. Upgrading a card makes it glow gold, with a burst of diamond particles, a thin circle outline, and a "-100" P cost bubble. |
| The run's goals | `gakumas/img/25-growth-info-goals.jpg` | S6 | The "育成情報" sheet shows a bar chart titled "最終試験の審査基準" (pink Vo tall, blue Da, yellow Vi) against a dashed 500 line. Below it, "育成課題" goal cards read "ボーカル200以上" → reward "Pポイント+50", then "ダンス450以上", and so on. |

Observed run shape, all seen across S1 and S5-S8: weekly turns counting down to "中間" (midterm), then a final-push lesson, then 中間試験 (midterm exam), then weeks counting down to "最終", then 最終試験 (final exam), then the final produce evaluation, then the completion card. **Unverified:** whether a live performance always plays between the final exam ranking and the evaluation. The S9 video cuts straight from the exam to the evaluation, but the video is edited.

### 2.3 A Lesson

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Lesson HUD | `gakumas/img/07-lesson-hud.jpg` | S3 | Top-left: a translucent slate panel reading "残りターン数 5" (#545F7C). Top-centre: a **big round ring**, white inside, with "CLEARまで" and a large number "30" in the lesson's colour. Top-right: a param pill ("D 235", where D is the current grade letter), and below it the stamina bar with a teal shield (元気/genki) and a heart value. Three skill cards sit at the bottom, with a "SKIP" button above the right-hand card. |
| The CLEAR ring fills | `gakumas/img/08-lesson-ring-before-after.jpg` | S7 | Before: the ring track is empty grey and the number reads 30. After one card: a pink arc fills clockwise from 12 o'clock to about 4 o'clock, and the number reads 21. The arc ends flat, and the start point is marked by a small ✦ at 12 o'clock. |
| Two-tier goal: CLEAR, then PERFECT | `gakumas/img/09-lesson-clear-perfect-tooltip.jpg` | S6 | Tapping the ring opens a dark tooltip: "あと90でCLEAR / あと360でPERFECT". CLEAR is the pass mark and PERFECT is the ceiling. |
| PERFECT state | `gakumas/img/10-perfect-burst.jpg` | S5 | Left: a "+60" gain in big white numerals with a blue outline under the param pill, and a red "-1" stamina chip. Right: the ring reads "PERFECTまで 0 CLEAR" and breaks into concentric thin rings with ✦ and diamond particles. |
| Ring colour follows the lesson | 08 and `gakumas/img/11-perfect-countdown-filmstrip.jpg` | S7, S9 | Vo lessons use a pink arc (#F770BF), Vi lessons a gold arc (#FEBA32), Da lessons blue numerals and line (#6A9EF7). The final-push lesson uses a conic **rainbow** ring. |

### 2.4 Gauges and parameters

| Gauge | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Vo / Da / Vi parameters | `gakumas/img/04-produce-week-hud.jpg`, `gakumas/img/18-param-gauges.jpg` | S1, S8 | **Horseshoe arcs** open at the bottom: about a 270° sweep from roughly 7 o'clock clockwise to 5 o'clock. They have a thick stroke and a dark translucent track (#353336 over a light scene). Fill colours: Vo pink #FF3698, Da blue #01B7FB, Vi amber #FFAE01. A glossy **grade letter** sits in the centre. Below it: attribute icon + value + "/cap", then a dark pill with "≈ 16.4%" (lesson bonus). |
| Grade letter colour = tier, not parameter | 18, 22, 19 | S1, S7, S8 | C/C+ is mint (#B2FFE3) with a green outline (#11A52D). B/B+ is cream-peach with a red-orange outline (#FB4C0F). A/A+ is glossy pink (#FE95BF) with a dark red outline (#B90614). S is gold (#F1D440) with a brown outline (#853C01). The "+" is a small separate glyph at the lower right. |
| How the ring fills (inferred) | 18 | S1, S8 | The fill is **not value÷cap**. In S1, B 685/1000 shows *less* arc than C+ 565/1000. In S8, A+ 1230/1500 shows only a short stub. Inferred: the arc shows progress toward the next grade letter. A maxed parameter (S 1500/1500) shows a full **navy** ring (#364F7A). |
| Cap changes | 04 vs 06/18 | S1 vs S6/S8 | S1 shows /1000 and S6/S8 show /1500. Inferred: the cap depends on mode or difficulty (Regular vs Pro). Unverified. |
| Stamina (体力) | 07, 04, 15 | S3, S1, S5 | A rounded bar in a dark capsule with a heart and number. In S3 the full bar is a **lime → green → cyan gradient**: #E4FD1B → #61FD44 → #2BF098 → #1DE2EA. At low stamina in the exam (15) the visible fill is yellow-lime. Inferred: either one fixed gradient revealed by the fill amount, or a colour shift at low stamina. I cannot tell which. S1 shows flat green #32FF1C, but that PNG is palette-quantized, so I trust S3 for gradients. |
| 元気 (genki) | 07, 15 | S3, S5 | A **teal shield badge** (#8DF5EC) with a number, attached to the right end of the stamina bar. The same shield appears top-right on skill cards (inferred: the genki that card grants). |
| Buffs: 好調 / 集中 / 好印象 / やる気 | `gakumas/img/13-plans-buffs.jpg` | S5 | Each buff is a **cyan rounded diamond** with a white glyph. センス plan: 好調 (swan; "パラメータ上昇量を50%増加") and 集中 (flame; "パラメータ上昇量を増加"). ロジック plan: 好印象 (thumbs-up; adds to the parameter at turn end, then decreases by 1 each turn) and やる気 (fist; raises genki gain). In play they stack down the left edge with turn counts ("35ターン", "2ターン"). A third plan, アノマリー, exists per a YouTube video title. **Unverified visually.** |
| Number count-up | 11 | S9 | See Motion. Verified ease-out ticker. |

### 2.5 The card battle (skill cards)

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Card anatomy | `gakumas/img/12-skill-cards-closeup.jpg` | S5, S7 | A rounded rectangle with a dark slate outline and a name strip at the bottom. **The art window's shape encodes type: circle = Mental ("M" tab), hexagon = Active ("A" tab).** Top-left: the value preview in big pink numerals ("7063" in exam). Top-right: a teal shield number. Bottom-right: a green-to-yellow heart with the stamina cost ("-2"). Bottom-left: small cyan diamond buff icons. A red-orange "+" on the right edge marks an upgraded card; the name also ends in "+". |
| Frame tiers | 12 | S5 | Frame backgrounds are rainbow iridescent (アイドル魂), gold-amber (静かな意志), pale blue (ハイタッチ+) and off-white (表情の基本). Inferred: these encode rarity. Unverified mapping. |
| Card art | 12 | S5 | **Flat single-colour pictograms** (lavender or orange silhouettes: a hand high-five, feet, a lightbulb) on white, with a faint school-building watermark. The only illustrated cards are the idol's unique ones. |
| Playing a card | `gakumas/img/10-perfect-burst.jpg` | S5 | Tapping lifts the card and shows "SELECT" under it in yellow-orange, with a white tooltip above it: name, a "Active"/"Mental" subtitle between ✦ rules, effect lines with diamond icons, and a "レッスン中1回" limit in blue. A second tap plays it. Inferred from the two-state captures. |
| P-drinks / items | 07, 15 | S3, S5 | Three round drink slots bottom-left, and dark round buttons bottom-right (deck list, P-items, menu). |

### 2.6 Audition / exam (中間試験・最終試験)

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Briefing before the exam | `gakumas/img/17-exam-briefing.jpg` | S8 | Frosted, translucent dark panels over the 3D idol. "審査基準" shows a mini bar chart. **"合格条件: 3位以上 もしくはスコア1700以上"** states the pass condition up front. Per parameter: 278 ≫ 380% (pink), 548 ≫ 774% (blue), 465 ≫ 627% (amber), each rated "◎ すばらしい！". "タップして次へ". |
| What changes vs a lesson | `gakumas/img/15-exam-hud.jpg` | S5, S7 | The CLEAR ring is replaced by a **turn dial**: a dark navy disc (#403B52) with the remaining-turn number, ringed by **one dashed segment per remaining turn, coloured by that turn's attribute** (pink/blue/yellow), with a white triangle pointer. A pink glow label beside it shows the current turn's attribute and multiplier ("ボーカル 1587%", #F45A8A). Cards preview **score**, not parameter gain. |
| Ranking vs rivals | 15 | S5, S7 | A top strip of six portrait tiles with ordinals "1st 2nd 3rd 4th 5th 6th". The ordinal colours differ: 1st gold gradient, 2nd blue-lavender, 3rd red. Each tile has a score and a vertical stacked Vo/Da/Vi score bar. **A white vertical divider after 3rd is the pass line.** |
| Exam result | `gakumas/img/16-exam-ranking-result.jpg` | S7 | A gold "1位" laurel medallion (#F7B730), then **frosted dark rows over a blurred, dimmed scene** (#495054-#595959). Each row has a big "1st" ordinal, avatar, name, "75,104 Pt" and a horizontal stacked bar (pink #F23585, blue #1B84ED, amber #F6B12F). The 1st row has a white outline. A **thin orange line after 3rd** marks the pass cut. Bottom: "再挑戦" (retry, "あと3回") in a white pill and **"次へ" as the one orange gradient pill** (#FD7041 → #FFA22B). |

### 2.7 Result screen and the produce rank

| Pattern | Screenshot | Source | What I actually saw |
|---|---|---|---|
| Final produce evaluation | `gakumas/img/19-final-eval-rank.jpg` | S8 | A charcoal screen (#2C2C2C) with a **large geometric tile pattern** in a slightly darker tone (#212121): quarter circles, squares and diamonds. Title "最終プロデュース評価". A **thin silver diamond frame** (#ACACAC) with internal arcs and hatching sits behind a soft white glow. Inside it is a big glossy pink **"A"**. Below: the evaluation number **"11459"** in white bold, then a **progress bar from "A" to "A+"** (white → cyan, #F2FCFF → #48DBFE) that is almost full. "TAPで次へ". |
| Rank = a band on a continuous number | 19, 21, 22 | S8, S7 | 11,459 is A with the bar nearly at A+; S8's other captures show 11,553 to 11,863 as A+; S7 shows 13,045 to 13,113 as S. Inferred: the letter is a band over the evaluation points, and the bar shows progress through the band. Exact thresholds are not needed and are not claimed. |
| What the rank is computed from | `gakumas/img/24-official-a-plus-criteria.jpg` | S2 | The official page: "A+を取るにはアイドルのパラメータの合計値をあげることが大事", "最終試験のスコアも最後の評価に関わってきます". The official guide for A+ is a parameter total of about 3,100 and a final exam score of about 13,000. **The rank comes from two inputs, both stated openly.** The exact formula is not given officially. |
| Completion card | `gakumas/img/21-completion-card.jpg` | S8 | A white "certificate" page with a faint line pattern and "line-sparkle-line" rules at top and bottom. A pink header band carries the idol's name in **handwritten script**. A **tilted photo** (white border, slight rotation, shadow) shows a live-performance still, over a yellow band with the romanized name. Two "stamps" side by side: a gold laurel **"1位 / 最終試験"** and a pink **"A+ / プロデュース評価"**. One orange "完了する" CTA, plus a white "プロデュース履歴" secondary pill. |
| Produce history record | `gakumas/img/22-produce-history.jpg` | S7 | A white sheet. Header: mode "定期公演『初』", a "プロ" pill (blue → violet gradient #92AEFF → #D480FF) and the date. A gold "S" with "13,113 Pt" and a thumbnail of the live. The idol card shows final Vo/Da/Vi with grade letters (B 798, A+ 1443, A+ 1310) and stamina. Below that: the support cards and memories used, final P-items and final skill cards. The bottom edge is a coral gradient band. |
| Archive of runs | `gakumas/img/23-memory-archive.jpg` | S5 | "Memories": a grid of **date-stamped tiles ("24/06/27")**, each a frozen frame from that run's live with skill-card chips on top. A large hero preview above has a gold "S" in the corner. There are filter chips by idol and an orange "詳細を見る" CTA. |

---

## 3. Palette samples

Method: `python3 -I` with PIL. Each value is the median of a 7×7 box at a point, or the median of pixels that pass a colour test inside a region (`findcol`), or the dominant colour of a region (`quantize`). JPEG captures are ±3-5 per channel.

| Hex | Image (in `/tmp/gakumas-work/dl/`, copy in `gakumas/img/`) | Coords / region | UI element | Read |
|---|---|---|---|---|
| #FF3698 | official thumb_1.png (img 04) | (117,615) | Vo gauge arc | Hot magenta-pink. The Vocal colour. |
| #FF54B7 → #FF3698 | thumb_1.png | (100,900) / (100,845) | Vo lesson button | Pink, lighter low and stronger high. |
| #01B7FB / #0287FC | thumb_1.png | (222,900) / (452,142) | Da button / Da criteria bar | Azure-cyan. The Dance colour. |
| #FFDD15 / #FFAE01 | thumb_1.png | (345,900) / (323,612) | Vi button / Vi gauge arc | Lemon to amber. The Visual colour, and the only native warm hue in the HUD. |
| #FF1F82 · #0287FC · #FFB617 | thumb_1.png | (433,145) (452,142) (470,140) | 審査基準 criteria bars | The Vo/Da/Vi trio at full saturation. |
| #353336 | thumb_1.png | (216,600) | Gauge track | Dark translucent charcoal. |
| #364F7A | fam/full_f20.jpg (img 18) | region 250-480 × 170-330 (blue pixels) | Maxed (S) Da gauge | Deep navy: "full" reads darker, not brighter. |
| #B2FFE3 / #11A52D | thumb_1.png | (140-176, 625) / (164,600) | C+ grade letter fill / outline | Mint + green. |
| #FCFDC5-#FFE09D / #FB4C0F | thumb_1.png | (248-268, 600-625) / (272,600) | B grade letter fill / outline | Cream-peach + red-orange. |
| #E4FD1B → #61FD44 → #2BF098 → #1DE2EA | appstore/as10.jpg (img 07) | row y=262, x=577 → 709 | Stamina bar (full) | Lime → green → mint → cyan. Cool-leaning. |
| #8DF5EC | as10.jpg | (742,262) | 元気 shield | Pale aqua. |
| #545F7C / #50586C | as10.jpg | 25-195 × 135-225 | "残りターン数" panel | **Translucent cool slate**: the game's own glass. |
| #6A9EF7 | as10.jpg | 290-520 × 120-360 (blue pixels) | Da CLEAR ring line + numerals | Periwinkle. |
| #F770BF | 4g_full/a816_013.jpg (img 08) | 255-372 × 0-200 (pink pixels) | Vo CLEAR ring arc | Soft pink. Lighter than the gauge pink because it sits over the scene. |
| #FEBA32 | 4g_full/a816_024.jpg | 255-372 × 0-200 (gold pixels) | Vi CLEAR ring arc | Gold. |
| #403B52 | 4g_full/a816_025.jpg (img 15) | 10-90 × 30-110 | Exam turn dial disc | Ink violet-navy. |
| #F45A8A | a816_025.jpg | 85-180 × 60-100 | "ボーカル 1587%" | Pink attribute label. |
| #495054 / #595959 | 4g_full/a816_026.jpg (img 16) | 20-560 × 560-860 | Exam result rows | **Frosted dark glass over a blurred scene.** |
| #F23585 · #1B84ED · #F6B12F | a816_026.jpg | (330,286) (400,286) (445,286) | Stacked score bar | Vo/Da/Vi in a data bar. |
| #FD7041 → #FFA22B | a816_026.jpg | 190-240 × 905-950 → 340-385 × 905-950 | "次へ" primary CTA | **The orange.** Red-orange to amber gradient. |
| #F7B730 / #E69713 | a816_026.jpg | 50-130 × 100-190 | "1位" medal | Warm gold. |
| #2C2C2C / #212121 | fam/full_f05.jpg (img 19) | 0-750 × 250-300 and 1050-1330 | Final evaluation background + tile pattern | Neutral charcoal, tone-on-tone geometry. |
| #FE95BF / #B90614 | full_f05.jpg | 250-500 × 420-660 | Rank letter "A" fill / outline | Glossy pink with a deep red outline. |
| #ACACAC | full_f05.jpg | (140,540) | Diamond frame line | Silver. |
| #F2FCFF → #48DBFE (end #1CD3FF) | full_f05.jpg | 175-560 × 975-1015 | Progress-to-next-rank bar | White → cyan. **The rank screen's accent is cold.** |
| #F1D440 / #853C01 | 4g_full/a816_019.jpg (img 22) | 50-105 × 180-240 | "S" rank letter / outline | Gold + brown. |
| #92AEFF → #D480FF | a816_019.jpg | 190-290 × 100-125 | "プロ" difficulty pill | Periwinkle → violet. |
| #FFB7CE · #FACE53 | fam/full_f22.jpg (img 21) | 40-700 × 130-180 · 40-700 × 700-760 | Completion card bands | Sakura pink, butter yellow. |
| #F3B03C / #FC75A6 | full_f22.jpg | 1位 laurel (60-330 × 780-1030) / A+ (420-700 × 800-1020) | Completion stamps | Gold + pink. |
| #FFA85D | 4g_full/a703_006.jpg (img 02) | 20-110 × 20-100 | PLv badge | Orange. |
| #FFB252 | a703_006.jpg | 470-560 × 700-790 | Home "ショップ" button | Orange. |
| #FFEECF / #F5CFA7 | a703_006.jpg | 30-550 × 870-960 | Home curved nav bar | Cream/peach (possibly tinted by the scene). |
| #5481A3 / #447091 | appstore/as2.jpg (img 01) | 0-800 × 0-300 | Title screen sky | Dusty steel blue. |
| #6F63F4 / #5E50F4 / #A49BF7 | ytthumb/kYJqwyrqolw_maxresdefault.jpg | full frame | H.I.F mode key visual | Electric violet with geometric tiles. |

**Is the warm accent earned?** I measured the share of strongly orange pixels (hue 11-40°, saturation >0.55, value >0.75) per screen:

| Screen | Orange share |
|---|---|
| Final evaluation (img 19) | 0.0% |
| Produce history (img 22) | 0.2% |
| Lesson (img 08) | 0.3% |
| Week HUD | 0.4% |
| Schedule | 0.6% |
| Exam briefing | 1.2% |
| Mode select | 1.3% |
| Home | 1.9% |
| Completion card | 2.4% |
| Exam result | 2.7% |

The exam screen is 6.6% only because of a sunset scene and orange card pictograms. The store screenshot is 8.7% only because of the marketing banner.

In-game, orange is **rationed**. It marks the single "go forward / commit" action (次へ, 完了する, 詳細を見る, 特訓) and a few status badges (PLv, Shop). Gold is kept for 1st place and S. The **marketing layer** (S1-S4 banners, S2 cards) is orange-heavy. Verdict: one warm accent has earned its place **only as the commit/CTA colour plus the achievement gold**. Never use it as a surface. The rank screen itself uses no orange at all.

---

## 4. Type and material

- **Numerals.** Heavy geometric sans, slightly condensed. HUD numbers are white with a dark outline and a soft shadow. Ring numbers use a vertical gradient fill (pink, lighter at the bottom). Exam previews are flat pink. Font name: unverified. I won't guess.
- **Ordinals.** "1st/2nd/3rd" pair a huge numeral with a small suffix. In the exam strip each ordinal has its own gradient (gold, blue-lavender, red).
- **Latin labels.** Geometric caps: "CLEARまで", "PERFECT", "SKIP", "SELECT", "TAPで次へ".
- **Japanese UI.** A clean gothic sans, bold for titles. Not rounded.
- **Editorial touches.** The logo and the idol's name on the completion card are in **handwritten script**, set against geometric sans. **"line-sparkle-line" thin rules with a centre sparkle** recur as dividers (week card, tooltips, completion card). A **geometric tile pattern** (quarter circles, squares, diamonds) is used as texture in several places: dark on the rank screen, violet on the H.I.F key visual, blue on loading screens (S12), and pale on menus. Pictogram card art adds to the graphic, poster-like feel.
- **Material.** Three layers:
  1. Solid white cards with soft shadows for planning info (week, criteria, tooltips, records).
  2. **Translucent slate or charcoal glass over a blurred, dimmed 3D scene** for anything about performance and judgement (turn panel, exam briefing, ranking rows).
  3. Iridescent or pearl gradients reserved for special moments: the Produce button, rainbow card frames, the final-push rainbow ring, and the holo reward burst.

---

## 5. Motion notes

All timings come from S9 at 30 fps (1 frame ≈ 33 ms). Frames are in `gakumas/img/11-…` and `gakumas/img/20-…`.

### PERFECT countdown in a lesson (img 11, t = 0 at 501.3 s)

1. A card is played. The ring stays at "109" for about 160 ms, an impact beat.
2. The number then **ticks down with ease-out**: 108 (166 ms), 76 (233), 63 (266), 54 (300), 52 (333). That is about 170 ms for a 57-point drop, with big steps first and small steps last.
3. In sync, the param pill ticks **up** (326 → 383) and a "+57" gain pill appears.
4. Thin white outline circles ripple outward from the ring for about 0.3-0.5 s.
5. The next card drops 52 → 40 → 30 → 6 → 2 → 0 in about 200 ms (866 → 1033 ms).
6. At 0, the ring ripples for about 300 ms. Then a **"PERFECT" wordmark** fades and zooms in across the whole screen (about 1333 ms) with a pink-to-cyan chromatic glow and light rays, and holds for 1 s or more.
7. A white flash then cuts to a close-up of the idol with a concentric-ring motif. This is from the 5 fps pass, so it is approximate.

### Rank reveal (img 20, t = 0 at crossfade start)

| Time | What happens |
|---|---|
| 0-266 ms | The exam scene crossfades into the charcoal pattern. The title "最終プロデュース評価" fades in **during** the crossfade. |
| 266-500 ms | **Empty beat**: only the title on charcoal. |
| 533 ms | The grade letter **slams in oversized** (about 2.5× final size, overflowing the frame). |
| 533-633 ms | It shrinks to final size in about 100 ms, a stamp. The silver diamond appears behind it at about 633 ms. |
| 666 ms | Settled, with a white glow. |
| 666-933 ms | Hold. |
| 966-1066 ms | The **number and the next-rank bar fade up from a few px lower** (blurred at first). |

In total it takes about **1.1 s** to reach the full information screen, and then it waits for "TAPで次へ". The order is fixed: letter → number → next-band bar. The bar appeared already at its value; **no bar-fill animation was visible in this clip** (unverified whether one exists elsewhere).

### Other motion

- **Exam / midterm result.** The "1位" gold medallion pops over the idol with a thin ring and sparkles, and holds about 1.3-1.7 s (from a 3 fps pass, approximate). The reward pick then plays an **iridescent pink → violet → cyan radial burst**.
- **Gauges in the week HUD.** A static capture (img 18) shows a "+4" white pill with a cyan glow above the gauge that grew. **The arc-fill animation itself is unverified** (no 30 fps footage of it).
- **Exam scores in later modes.** Very large white score numerals with a thin circle at top-centre (S12; low resolution, low confidence).

---

## 6. STEAL list (mapped to where it belongs)

1. **CLEAR → PERFECT two-tier goal ring.** A ring counting *remaining* down to a pass mark, then on to a ceiling (img 07, 08, 09, 11). Belongs on **project "run" pages + gauges**: CLEAR = shipped/delivered (verifiable), PERFECT = outcome measured with a cited source.
2. **Rank reveal choreography.** Title → ~250 ms empty beat → letter slams in at about 2.5× and settles in about 100 ms → frame and glow → number and next-band bar rise in. About 1.1 s total (img 19, 20). Belongs on **result-and-rank**, at the end of each project page, played once per session.
3. **Band + "progress to next band" bar.** Shows the rank is measured, not awarded (img 19). Belongs on **result-and-rank** (see Honest rank).
4. **State the criteria before the run.** "審査基準 / 合格条件" briefing (img 17) and "育成課題" goals (img 25). Belongs on **project run pages**: a "Brief & criteria" glass card at the top.
5. **Frosted dark rows over a blurred, dimmed scene** for judged or ranked lists (img 16, 17). Gakumas already uses cold glass for judgement, which fits the brief. Belongs on the **bento "3 best projects" tile** expanded state and **room** overlays.
6. **Completion card as a certificate.** Script name, a tilted photo, two side-by-side "stamps", one orange CTA (img 21). Belongs on **result-and-rank** as the closing card of a project; the first stamp could be "Shipped" and the second the evidence rank.
7. **The history record** as a case-study spine: mode/difficulty pill, date, a hero still, inputs (support cards = team, tools) and outputs (img 22). Belongs on **project run pages** (summary header).
8. **Dated memory archive.** Date-stamped frozen frames (img 23). Belongs in the **room** (an album or shelf) and the project index.
9. **Ease-out count-up with a "+N" gain pill.** About 160 ms delay, then a ~170-200 ms ease-out tick, with a thin ripple (img 11, 18). Belongs on **gauges**.
10. **Segmented turn dial.** One segment per remaining turn, coloured by type (img 15). Belongs on **project run pages** as the project timeline: each segment is a phase coloured by discipline. Real phases only.
11. **Horseshoe gauge with a letter or value in the centre, open at the bottom** (img 04, 18). Belongs on **bento skills tile / gauges**, with honest content (see Do not copy #2 and Honest rank).
12. **Orange rationed to one commit action per screen, gold only for achievement** (measured in §3). Belongs **globally**: the Contact button is the orange.
13. **Geometric tile pattern + "line-sparkle-line" rules** as quiet texture (img 19, 21). Belongs on **transitions** (bento → room wipe) and section dividers.
14. **Shape encodes type** (circle vs hexagon art windows) with corner badges (img 12). Belongs on **skill chips** in the bento, e.g. circle for design skills and hexagon for engineering skills.
15. **"PERFECT" wordmark cut-in with a white flash** (img 11). Belongs on **transitions**: use rarely, only when opening a project that truly reached PERFECT (verified outcome).

## 7. DO NOT COPY

1. **Characters, 3D idols, voices, card illustrations, logos and crests.** The script logo, the 初/N.I.A/H.I.F marks, the Hatsuboshi motifs. This is an IP problem.
2. **The exact Vo/Da/Vi trio**: magenta/azure/amber with mic, shoe and face icons. As a set it reads as Gakumas data at a glance. Recolour into a cool family and use her own skill axes and icons.
3. **The glossy bevelled grade letters and the silver diamond emblem with internal arcs.** These are specific assets. Make a flat or glass letter and our own frame shape.
4. **Gacha and progression vocabulary**: SSR/SR rainbow rarity frames, P-drinks, PLv, stamina hearts on cards, "SKIP" with costs, a shop. HRD would read monetization, not craft, and it adds learning cost to a 5-second scan.
5. **Fake rivals and fake points.** "1st vs 2nd-6th" leaderboards, invented "Pt" scores. A portfolio has no rivals, and inventing them breaks the honesty constraint. The only exception is a real, citable placement such as a hackathon result.
6. **Home layout clone**: the curved smile-shaped bottom nav, round side buttons around a central character, the big pearl "Produce" pill. Too recognisable as a direct screen copy.
7. **Verbatim Japanese UI strings** ("CLEARまで", "TAPで次へ", "最終プロデュース評価"). Write our own English microcopy. "Clear" and "Perfect" as plain words are fine; the PERFECT wordmark treatment is not.
8. **Warm surfaces**: the cream home nav, brown round buttons, the orange marketing frames. They work against "cold and glassy".

## 8. Honest rank (proposal)

What Gakumas does right, and why it isn't fake:

- The criteria are shown before the run (img 17, 25).
- The rank comes from openly stated inputs: the parameter total plus the final exam score (S2, img 24).
- The rank is a band on a number, with the distance to the next band (img 19).
- The result card separates the placement from the evaluation (img 21).

Translation for adelia.cc, with nothing invented:

1. **Rank = evidence, not quality.** Call it an evidence rank, or simply "Clear / Perfect", so nobody reads it as a judgement of talent. Each project gets the same short **criteria checklist**, shown openly on the run page (the "合格条件" card). Each item counts only with a link or artefact:
   - Shipped / delivered (link)
   - Her role and scope stated (owned end to end / co-owned / contributed)
   - Users or stakeholders named (no numbers unless she provides them)
   - Outcome measured (metric + source)
   - Process artefacts public (case study, prototype, repo)
   - Reflection written
2. **Two tiers, like the lesson ring.** **CLEAR** = shipped plus role stated. **PERFECT** = CLEAR plus a measured outcome with a cited source. The ring counts down the remaining criteria ("2 to Perfect"), so the number is a real count by construction.
3. **Optional letter band.** Map the met-criteria count to letters with a published table (for example 2 = C, 3 = B, 4 = A, 5 = S). Show the "next band" bar as "1 more criterion to S", and link it to the table. A letter without its table is not allowed.
4. **TODO state.** While Adelia has not supplied evidence, the ring shows an empty dashed track, a dash placeholder for the number, and a hollow outline letter with "Result pending". In the build, a visible `TODO(adelia): metric + source` chip sits under it. **In production, show "In progress / result pending" honestly, or hide the rank component, rather than showing a placeholder that looks broken to recruiters.** The Lead decides which; I recommend "Result pending".
5. **Never**: rival ordinals, "Pt" scores, percentages or multipliers unless they are her real, sourced numbers.

## 9. Player's gut check

- **Right:** a ring that counts *down* what's left to CLEAR, then keeps going to PERFECT. That is the Gakumas feeling in my thumbs. A bar filling *up* reads as any other game.
- **Right:** the letter lands *first* and lands *hard* (oversized slam, about 100 ms), then the number, then "next band". A slow fill-then-reveal reads as a different genre.
- **Right:** one orange button per screen, everything else cool. Gakumas players won't miss the orange if Contact is the only orange thing.
- **Wrong:** sparkle, heart and star confetti everywhere. Gakumas is cleaner than people remember: white cards, thin "line-sparkle-line" rules, pictograms, and glass over a blurred scene.
- **Wrong:** a rank with no visible criteria. Every player knows A+ comes from parameter total plus exam score. A letter with no "why" feels like a gacha pull.
- **Wrong:** pink/cyan/yellow Vo/Da/Vi with mic, shoe and face icons. Fans will recognise it instantly as lifted.
- **Right:** a dated archive of past runs with one frozen frame each. That is the "memories" habit players have, and it maps perfectly onto a project index.
- **Wrong:** a "1st place" leaderboard. Without real rivals it reads as fake straight away, and the honesty constraint forbids it anyway.

## 10. Open items / unverified

- The current (2026) home screen layout. The latest capture is from July 2024.
- The exact grade thresholds, and any tiers above S (SS etc.): text sources only.
- The fill animation of the week-HUD horseshoe gauges.
- Whether the stamina bar is one fixed gradient or changes colour at low stamina.
- The rarity mapping of the card frames.
- The third plan (アノマリー) icons and buffs.
- Font families.
