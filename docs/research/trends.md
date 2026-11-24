# Trends and design engineering: research for the adelia.cc revamp

*Phase 1 research by the UI/UX trend and design engineering scout, 24 November 2026. This is research only, with no design yet.*

**Method.** I took every screenshot myself with headless Chromium (Playwright) at a device scale factor of 1, at 1440×900 for desktop and 390×844 for phone. I opened each one, and each sentence under an image describes what I actually saw. Composite images put the desktop and phone views of the same visit side by side. Headless Chromium renders WebGL in software, so load times on 3D sites look worse here than on a real GPU, but the UX gates I describe are real either way. web.archive.org is blocked here, so every site was checked live today.

**Files.** The 25 images are in `docs/research/trends/img/`, each at most 1280 px wide and between 35 and 152 KB.

---

## TL;DR

- **The 2026 glass trend is moving towards readability.** On its iOS 27 page Apple writes that Liquid Glass now has *"more uniform refraction and improved contrast"* and *"a new slider ... from ultraclear to fully tinted"* (img 02). The HIG says *"Don't use Liquid Glass in the content layer"*. So the bento tiles should be frost (a standard, thicker material) and only the controls should be liquid glass. This settles the brief's "glassy bento" against sea-style's ban on *"every card glassy"*.
- **Glass needs something real behind it, and here that should be the room.** Put the room behind the bento from the first paint, under a frost veil. Then "enter the room" means the frost clears and the tiles fly home to their objects, and the two screens read as one space. The proposals and how to build them are in §7.
- **Don't gate the site.** Today Henry Heffernan opens with "Click start", Bruno Simon was still a loading ring after about 45 s headless, Messenger opens with "BEGIN", and davesocozy shows "Almost there. Thanks for waiting." Each one would fail the recruiter's 5-second test.
- **The client's own sources point the same way.** vibedesign.tips is the closest public match to the target craft. Its liquid glass, holo card, continuity, scroll-card and loading tips give exact values, and I took them (§11).

---

## Sources

The status column is what I saw when checking on 24 November 2026.

| # | Source | URL | Used for | Status |
|---|---|---|---|---|
| S1 | Apple HIG, Materials | https://developer.apple.com/design/human-interface-guidelines/materials | Liquid Glass rules (quotes in §1) | live; text extracted via browser |
| S2 | Apple Newsroom, new software design (June 2025) | https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/ | Liquid Glass definition | live |
| S3 | Apple iOS 27 page | https://www.apple.com/os/ios/ | Liquid Glass refinements and tint slider (img 02) | live, shows "iOS 27" |
| S4 | Apple macOS 27 page | https://www.apple.com/os/macos/ | Liquid Glass Siri pill (img 01) | live, "macOS 27 Golden Gate" |
| S5 | Apple Vision Pro | https://www.apple.com/apple-vision-pro/ | window in a room (img 03) | live |
| S6 | Apple Watch page | https://www.apple.com/watch/ | Health Sleep ring and Readiness gauge (img 18) | live |
| S7 | Mercury | https://mercury.com | glass over a photographic world (img 04) | live |
| S8 | kube.io, Liquid Glass in the Browser (Sep 2025) | https://kube.io/blog/liquid-glass-css-svg/ | SVG refraction (img 06) | live |
| S9 | vibedesign.tips (client-sent) | https://vibedesign.tips/ | glass, holo, continuity, scroll, loading, mobile tips | live |
| S10 | Supabase | https://supabase.com | product bento (img 07) | live |
| S11 | Daryl Patigas | https://imdaryl.com/ | spec frame and 9-cell grid (img 08) | live, updated Sep 2026 |
| S12 | Bento Grids | https://bentogrids.com | bento gallery (img 09) | live |
| S13 | davesocozy | https://davesocozy.com | page over the room, then Enter Studio (img 10) | live (three.js forum, Oct 2026) |
| S14 | Chloe Yan | https://www.chloeyan.me/ | objects as menu, mobile labels (img 11) | live |
| S15 | Melike Turgut | https://meliketurgut.com/ | 8 jelly objects as 8 chapters (img 12) | live |
| S16 | Blue Archive event "Pandemonium Upon the Waves" | https://bluearchive.nexon.com/events/2026/11/pandemonium | hidden-object room event microsite (img 13) | live until 30 Nov 2026 |
| S17 | Honkai: Star Rail | https://hsr.hoyoverse.com | character splash, does not fit (img 14) | live, v4.7 |
| S18 | Reflect | https://reflect.app | AI glow, does not fit (img 14) | live |
| S19 | Henry Heffernan, Bruno Simon, Messenger (Abeto) | https://henryheffernan.com, https://bruno-simon.com, https://messenger.abeto.co | start gates (img 15) | live |
| S20 | Pokémon Cards CSS (Simon Goellner) | https://poke-holo.simey.me | holo foil (img 16) | live |
| S21 | web.dev, backdrop-filter | https://web.dev/articles/backdrop-filter | support and the "may harm performance" warning | live |
| S22 | web.dev, LCP | https://web.dev/articles/lcp | thresholds, candidates | live |
| S23 | web.dev, animations guide | https://web.dev/articles/animations-guide | compositor-only properties | live |
| S24 | web.dev, same-document view transitions Baseline (Oct 2025) | https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available | VT support | live |
| S25 | web.dev, New in October 2026 | https://web.dev/blog/web-platform-10-2026 | scroll-driven animations Baseline with Firefox 159 | live |
| S26 | Chrome, element-scoped view transitions (Chrome 147, Mar 2026) | https://developer.chrome.com/blog/element-scoped-view-transitions | concurrent and nested VTs | live |
| S27 | Chrome DevRel VT demos and scroll-driven demos | https://view-transitions.chrome.dev, https://scroll-driven-animations.style | reference demos | live |
| S28 | Motion docs, transitions | https://motion.dev/docs/react-transitions | `visualDuration`, `bounce` (default 0.25) | live |
| S29 | WWDC23 "Animate with springs" | https://developer.apple.com/videos/play/wwdc2023/10158/ | duration and bounce model; 0, 0.15, 0.3 at 0.5 s | live |
| S30 | Material 3, motion physics | https://m3.material.io/styles/motion/overview/how-it-works | spatial vs effects springs; numbers from community packages | live (JS-rendered) |
| S31 | MDN, prefers-reduced-transparency | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency | "Limited availability ... Experimental" | live |
| S32 | WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | 1.4.3, 1.4.11, 2.2.2, 2.4.7, 2.4.11, 2.5.8 | live |
| S33 | Mozilla and WebKit bugs on backdrop-filter cost | https://bugzilla.mozilla.org/show_bug.cgi?id=1732817, https://bugs.webkit.org/show_bug.cgi?id=271340 | low-end GPU jank, root compositing memory | live |
| S34-S37 | Client-sent: inspora.design, saved.design, vibedesign.tips, directoryyy.com | see §11 | taste signals | live (inspora post pages sit behind a Vercel bot checkpoint) |

**Dead or blocked links.** nevflynn.com, the well-known bento portfolio, returns `500 Internal Server Error`. andrewwoan.com is "Site under construction". godly.website now 301-redirects to recent.design. awwwards.com is blocked from this container, land-book.com returns 403 and siteinspire.com returns 429. I did not cite anything from those sites. The Lead covers yanhladchenko.com.

---

## 1. Glass done well, 2025-26

### What Apple actually says (S1, extracted from the live HIG page)

- *"Liquid Glass forms a distinct functional layer for controls and navigation elements ... that floats above the content layer."*
- *"Don't use Liquid Glass in the content layer ... use standard materials for elements in the content layer."* The one exception is transient controls such as sliders and toggles while someone is using them.
- *"Use Liquid Glass effects sparingly ... Limit these effects to the most important functional elements."*
- *"Only use clear Liquid Glass for components that appear over visually rich backgrounds"*. Over bright content, *"consider adding a dark dimming layer of 35% opacity."*
- *"Thicker materials, which are more opaque, can provide better contrast for text"*. iOS has four standard materials: ultraThin, thin, regular and thick.

### Examples

| Example | Image | What I saw | What to take |
|---|---|---|---|
| **macOS 27 Siri pill** ([S4](https://www.apple.com/os/macos/)) | `trends/img/01-apple-macos27-liquid-glass.jpg` | A thick dark-glass capsule ("What are some other examples of superhydrophobicity...") and a smaller glass "Show Results" pill float over a warm silver liquid-metal backdrop. The rim catches a bright specular edge, and the dot pager and pause button are also glass. | Glass reads as real when the backdrop has light and curvature to refract. The rim highlight does more work than the blur. Controls are pills, and the content is the world behind them. |
| **iOS 27 "Design refinements"** ([S3](https://www.apple.com/os/ios/)) | `trends/img/02-apple-ios27-glass-tint-slider.jpg` | A three-icon Liquid Glass toolbar (trash, folder, reply) over a satin backdrop. The caption reads: *"Updates to Liquid Glass ensure exceptional readability with more uniform refraction and improved contrast ... a new slider lets you easily customize how Liquid Glass looks, from ultraclear to fully tinted."* | **This is the 2026 direction: glass is becoming more legible and user-tunable.** We should ship a tint control too (see "push" in §9). |
| **Apple Vision Pro** ([S5](https://www.apple.com/apple-vision-pro/)) | `trends/img/03-apple-vision-pro-window-in-room.jpg` | A wide curved window showing a misty city at dawn floats inside a softly lit living room, with a sofa, a lamp and a rug. | This is the closest real reference for "a room with glass in it". The room is the world and the panels float in it, which is the model for our Screen 2 HUD. |
| **Mercury** ([S7](https://mercury.com)) | `trends/img/04-mercury-glass-over-world.jpg` | A photographic world (a desk on a misty hill) with the email field and the "Launch demo" pill as translucent glass capsules. The headline sits on the sky without any panel. | Glass over a photographic world, with small glass areas only for the controls and calm type. Translate this to cold blue-hour light. |
| **vibedesign.tips #010 "Liquid glass material"** ([S9](https://vibedesign.tips/010-liquid-glass/), client-sent, 131K views) | `trends/img/05-vibedesign-010-liquid-glass.jpg` | A "Glass Hours" music player in glass over a deep blue wave. It shows a dot-matrix album tile, a progress bar and transport icons, with the code `.player { background: var(--glass-tint); backdrop-filter: var(--glass-blur) var(--glass-lens); box-shadow: var(--glass-edge); color: var(--glass-ink); }`. | It gives the best public recipe, with **six layers: shadow, blur and lift, rim refraction, tint veil, rim highlights and adaptive ink**. Turning any component into glass means changing just those four declarations. Exact values are in §8.1. |
| **kube.io refraction** ([S8](https://kube.io/blog/liquid-glass-css-svg/)) | `trends/img/06-kube-refraction-lens.jpg` | A circular glass lens over a magenta-and-navy gradient, with its edge visibly bending the shapes behind it. | This is real Snell's-law displacement with `feDisplacementMap` inside `backdrop-filter`, but it is **Chromium-only**. Mobile Firefox and Safari get no bend. Use it only as an enhancement on 1-2 small controls. |
| *also:* inspora frosted "quick actions" tile and Daryl's "Properties / Presets" glass pill over a cloudy sky | `trends/img/21-client-inspora.jpg`, `trends/img/08-imdaryl-spec-frame-grid.jpg` | Inspora shows four action keys ("Chase overdue · Offer a plan · New invoice · Ask the agent") frosted over a pastel gradient. Daryl shows a glass segmented pill over sky and cloud. | A cold sky behind glass is the palette we want. |

### What makes glass read as real, and what makes it look cheap

| Real | Cheap |
|---|---|
| A **meaningful backdrop** with light and texture behind it (a photo, a 3D world, our room) | Glass on flat white or flat grey, which sea-style bans: *"glass on flat white is banned"* |
| **A rim highlight on two sides** (top-left bright, bottom-right dimmer) plus a 0.5px inner contour | A uniform 1px white border all round |
| A **shallow blur with saturation and brightness lift**: vibedesign uses `blur(2px) saturate(180%) brightness(1.06)` for controls, and thicker frost for content | A heavy blur with no saturation boost, which goes milky grey (vibedesign: *"over-blurring with low saturation makes the glass look milky"*) |
| **Tint density that adapts** to how busy the backdrop is. Raise density, not ink opacity, to pass contrast. | A fixed 10% white whatever is behind it |
| A **specular sheen** (a radial gradient from the top-left) and 2-4% **grain** so the surface doesn't band | Gradient banding and a perfectly smooth wash |
| **Real thickness**: rim refraction, or a bottom inner shadow to fake it | A flat sheet with a drop shadow |
| **Hierarchy**: one or two glass controls, with the content on calmer material | Every card glassy, or glass on glass (HIG: *"sparingly"*; sea-style: *"every card glassy"* banned) |
| **Adaptive ink**: dark text with `multiply` on light glass, light text with `plus-lighter` on dark glass | Grey text that disappears on the brightest spot behind it |

---

## 2. Bento grids

| Example | Image | What I saw | What to take |
|---|---|---|---|
| **Supabase product bento** ([S10](https://supabase.com)) | `trends/img/07-supabase-bento.jpg` | One wide tile (Postgres Database, with three check-marked facts and an elephant line drawing), then six single tiles. Each has an icon and title, one sentence, and a small live diagram (auth emails, a deploy globe, a vector cube, an API list). | This is the scannable formula: **icon + 2-word title + one sentence + one visual proof** per tile, with exactly one wide tile carrying priority. |
| **Daryl Patigas** ([S11](https://imdaryl.com/)) | `trends/img/08-imdaryl-spec-frame-grid.jpg` | Pixel rulers along the top and left edges, the label "Column 1060 · Scale 1:1", crosshair marks, and a live London time and weather chip. Below a short bio sits "Fig 0.1 · Nine pieces. Each cell is one thing I made.", an edge-to-edge 3×3 grid of live motion pieces. On phone the bio comes first and the grid stacks under it. | This is a **real portfolio using sea-style's spec-sheet framing** (pillar 6), and it reads as craft rather than gimmick. The grid caption tells a recruiter what a cell is. Steal the "Fig" captions and the live time chip (Adelia: WIB, open to remote). |
| **Bento Grids gallery** ([S12](https://bentogrids.com)) | `trends/img/09-bentogrids-gallery.jpg` | A gallery of 2-4-tile bento compositions with Dark/Light filters. Most are SaaS feature grids, many dark-on-dark. | Use it for references. The good ones vary tile size by importance; the bad ones are uniform piles of dark tiles with tiny text. |
| **Masonry as a cousin**: vibedesign.tips, saved.design, inspora (client-sent) | `trends/img/21-23-client-*.jpg` | Three to four column masonry of demo cards, each with a single media area plus a title and view/like counts in small type, filtered by black pill tabs. | The client already likes dense, quiet, media-first grids with tiny metadata. Our bento can be denser than Apple's. |

**What makes a bento scannable for a recruiter, rather than a pile of tiles**

1. **Fixed reading order.** Who she is (portrait or character tile, name, role, location and time zone), then 3 projects, then skills, then Contact. A Z-pattern on desktop; on phone the same order in one column, with **Contact always visible** as a sticky glass pill.
2. **One wide hero tile, everything else smaller.** Size signals priority without words (Supabase).
3. **Each project tile carries one number** (an outcome, users, latency) as large tabular figures, because recruiters scan numbers.
4. **Captions say what a cell is**: "Fig 0.1 · Nine pieces. Each cell is one thing I made."
5. **No tile without a job.** Decorative weather or Spotify tiles go, unless they prove something (sea-style: *"objects must mean something"*).
6. **The first viewport holds the whole HRD test at 390×844 and 360×740.** Test both.
7. **Every tile is one link or button** with a visible focus ring. No nested interactive traps.

---

## 3. Character-first hubs and game-like sites

| Example | Image | What I saw | What to take |
|---|---|---|---|
| **davesocozy** ([S13](https://davesocozy.com), Oct 2026) | `trends/img/10-davesocozy-page-over-room.jpg` | Left: "Hey, I'm davesocozy!" with a photo on a green cutting mat, sitting over a **washed-out still of his 3D studio** (posters, desk, Game Boy), with an "ENTER STUDIO" button. Middle: after the click the page dissolves, and over the same still it reads "ALMOST THERE. THANKS FOR WAITING." with a progress bar, still loading after 15 s headless. Right: on phone the same page says "SWIPE" and keeps "ENTER STUDIO". | **The shape of our transition is right**: a readable 2D page over the room, then enter. **The gate is wrong**: the room must be ready, or itself be the poster. Warm cozy palette does not fit. |
| **Chloe Yan** ([S14](https://www.chloeyan.me/)) | `trends/img/11-chloeyan-objects-as-menu.jpg` | Desktop: a watercolour garden on a grainy peach gradient, with **mono labels in the corners** ("Mediterranean climate", "33566 plants watered", a live clock). Phone: the plants carry **visible labels** ("shaders ↗", "say hi ↗"), and a pill says "Visit on desktop to water plants". | **Objects are the menu, and on touch the labels are always visible** because there is no hover. Graceful mobile degradation. Live counters in corners make the place feel alive. |
| **Melike Turgut** ([S15](https://meliketurgut.com/)) | `trends/img/12-meliketurgut-object-chapters.jpg` | "me [8 glossy jelly objects] like" across a quiet grey stage. The bow, flower, moon, pretzel, squiggle, heart, swirl and clover are **the 8 chapters** ("Along the way were these 8 chapters"), with tiny caps labels in the corners. | Tactile objects *as* navigation on a calm stage. This is sea-style exactly: one material (jelly) and a calm stage, and it echoes the jelly creatures already on Adelia's site. |
| **Blue Archive, "Pandemonium Upon the Waves"** ([S16](https://bluearchive.nexon.com), live now) | `trends/img/13-bluearchive-cabin-event.jpg` | An illustrated captain's cabin (desk, globe, lantern, map wall) with the event logo and a login. The copy reads: *"Follow the Drift Journal, one page released a day, to search for objects left around the captain's cabin!"* On phone it is the same scene cropped tall, then a full-width cookie banner. | Proof that **a hidden-object room microsite** is a live 2026 pattern from a game studio. Take the daily-reveal mechanic and the room-as-menu. Leave the warm wood and the cookie wall. |
| **Apple Vision Pro** | `trends/img/03-apple-vision-pro-window-in-room.jpg` | (see §1) | A cold, premium room with floating glass. This is the mood answer to "cold room". |
| **Inspora "Interactive folding rooms"** by @duckwhocodes (client-sent) | `trends/img/21-client-inspora.jpg` (second tile) | An isometric line-drawn kitchen ("kitchen") with left and right arrows. Per the post, the walls and floor fold like a pop-up book to reveal the next room. | A cheap, non-WebGL way to move **between** rooms (the closet for dress-up, the desk): a CSS 3D hinge fold. |
| **Gates (trap)**: Henry Heffernan, Bruno Simon, Messenger | `trends/img/15-dnf-start-gates.jpg` | Henry: a black screen with "Henry Heffernan Portfolio Showcase 2022 / Click start to begin _ / START". Bruno: a purple grid with a glowing loading ring, still there after about 45 s headless. Messenger on phone: blocky "MESSENGER" letters over a tiny planet with a "BEGIN" button. | All three are award-level craft, and all three **put a gate in front of content**. That fails the HRD 5-second test. |

**What works on mobile:** a 2D or 2.5D scene cropped to portrait with a focal point; labels always visible; tap targets bigger than the art; one obvious "Back" control; content reachable without the scene (Chloe's "visit on desktop" note, davesocozy's page-first approach).

**Traps:** orbit or walk camera controls on touch; start gates; a WebGL-only path; hover-only discovery; cookie walls covering the scene (Blue Archive, HSR); multi-megabyte key art as the LCP.

---

## 4. Collectible cards (holo) and gauges that feel alive

| Example | Image | What I saw | What to take |
|---|---|---|---|
| **Pokémon Cards CSS** ([S20](https://poke-holo.simey.me)) | `trends/img/16-pokeholo-card.jpg` | A gold-bordered Pikachu card tilted in 3D with the pointer, a rainbow holo field and a yellow glow. The copy reads: "advanced CSS ... 3d transforms, filters, blend modes, css gradients". | This is still the canonical web holo, driven by CSS custom properties from the pointer. |
| **vibedesign.tips #018 "3D holographic cards that tilt and flip"** ([S9](https://vibedesign.tips/018-holo-card/)) | `trends/img/17-vibedesign-018-holo-card.jpg` | A deep-blue "Prism" member card mid-tilt with a QR code and "Add to Wallet", finish tabs (Prism, Rainbow, Pearl, Sparkle, Chrome, Etched), and rim and foil CSS snippets. | **One pointer-driven light drives the tilt, foil, glare and lit rim together.** Tilt ±12° with spring 140/15 (Quiet preset: 6°, 120/18). Light spring 160/25.3. Flip spring 70/11 with a 10px physical edge. The rim is a 1.5px ring masked to `mask-composite: exclude`. Set custom properties **on the card face only**, because inherited variable changes restyle the whole subtree. Reduced motion: no tilt or sway, and the flip becomes an instant swap or 200ms fade. |
| **Apple Health (late 2026)** on the Watch page ([S6](https://www.apple.com/watch/)) | `trends/img/18-gauges-apple-health-and-slider.jpg` (left) | A Sleep "High Score" ring with **84** in the centre, built from segmented arcs in teal, coral and blue; a "Readiness · Ready" semi-arc dial reading **7**; the same 84 ring on the Watch. A one-sentence explanation sits under each. A Liquid Glass tab bar (Insights / Longevity / Browse) runs along the bottom. | A gauge = **one big number + a ring + a word + a sentence**. The ring segments carry the colour, and the chrome stays neutral (sea-style pillar 3). |
| **Gabriel, "Smooth Volume Slider"** (saved.design, client-sent) | `trends/img/18-gauges-apple-health-and-slider.jpg` (right) | A thick orange fill, a pill thumb with a ring, five tick dots below, and mute and volume glyphs at either end. | A meter that you can also drag. Tick dots and a soft thumb, with colour only in the fill. |

**What makes a gauge feel alive (and not like a loading bar)**

- It **animates on change, not on a loop**. It springs from the old value to the new one, and only the changed digit flips (sea-motion §13: 180ms, y 6px, blur 2px).
- A **needle with a little wobble** (vibedesign's compass needle uses an acceleration of 60×Δ − 5.5×v, about ζ 0.36) next to a **fill that is critically damped** (no overshoot).
- **Dot-matrix numerals** (sea-style's Geist Pixel / Doto, already in the repo), plus a dotted track ring.
- **Real data**: years shipping, products live, eval pass rate, a GitHub streak, local time in WIB. Fake animated numbers read as template.
- Accessibility: `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext`. Under reduced motion it shows the final value at once.

---

## 5. Motion that feels expensive

**Platform status in November 2026**

- **View Transitions (same-document)**: Baseline newly available since Firefox 144, released 14 Oct 2025 ([S24](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available)). Chrome 111+ and Safari 18+. The first Firefox version lacks view-transition *types*. **Element-scoped and nested VTs** (`Element.startViewTransition()`) arrived in Chrome 147 in March 2026 ([S26](https://developer.chrome.com/blog/element-scoped-view-transitions)), as a Chromium-only enhancement.
- **Scroll-driven animations** (`animation-timeline: scroll()/view()`): **Baseline newly available in October 2026**, with Chrome 115, Safari 26 and Firefox 159 ([S25](https://web.dev/blog/web-platform-10-2026)).
- **`linear()` easing** for CSS springs: shipped in all three engines.
- **`backdrop-filter`**: Chrome 76, Firefox 103, Safari 18 unprefixed (keep `-webkit-` for older Safari). web.dev warns: *"backdrop-filter may harm performance. Test it before deploying."* ([S21](https://web.dev/articles/backdrop-filter))

**Real motion specs from real sources**

| Source | Spec |
|---|---|
| Apple WWDC23 ([S29](https://developer.apple.com/videos/play/wwdc2023/10158/)) | Springs are two numbers, **duration + bounce**. The examples use 0, 0.15 and 0.3 at 0.5 s; these are the presets `.smooth` (0), `.snappy` (small bounce) and `.bouncy` (higher bounce). |
| Motion ([S28](https://motion.dev/docs/react-transitions)) | `visualDuration` (s) plus `bounce` (default **0.25**; 0 is critically damped; negative values overdamp but arrive at the same time). Setting stiffness, damping or mass overrides both. |
| Material 3 Expressive ([S30](https://m3.material.io/styles/motion/overview/how-it-works)) | Verified on m3.material.io: **spatial** springs (position, size, rotation, corners) overshoot; **effects** springs (colour, opacity) don't; each has three speeds (fast for small elements, default, slow for large). The numbers come from community Flutter packages, not verified on m3.io: standard spatial default 700 / 0.9, expressive spatial default 380 / 0.8, expressive effects 1600 / 1.0. |
| sea-style (client signature) | Chrome 150-250ms `cubic-bezier(.22,1,.36,1)` with no bounce; hover and press 150ms `(.4,0,.2,1)`; hero spring 260/20/m1 (about bounce 0.25); tilt 150/15; layout and morph 400/30; shimmer loops 4-6 s. |
| vibedesign #011 easing (client-sent) | out `(0,0,.58,1)` for entrances · out-strong `(.22,1,.36,1)` for settling (**identical to sea-style**) · in `(.42,0,1,1)` for exits only · in-out `(.42,0,.58,1)` for things on screen · overshoot `(.34,1.56,.64,1)` for small confirmations only, never over 64px · spring `linear(0,.32,.78,1.04,1.09,1.06,1.02,1,.99,.99,1)` for gesture releases. Durations: small 150-250 in / 120-200 out; medium 250-350; large 350-500; hover and press 100-150; springs about 1.5× the plain duration; stagger 100-200 for child parts. |
| vibedesign #015 UI continuity (client-sent) | `cubic-bezier(.32,.72,0,1)`, a fast start with a long settle. Phone: full-screen becoming 450-700ms, menus and sheets 350-500ms; desktop about ⅔ of that. Stagger 20-50ms (about 25 for menus). The page behind a presented panel goes to scale **0.94** and dims **30%**. Origin-only content fades out over the first 25-35%; destination-only content fades in after 45-55%. **Never block input**; reversal retraces the path. Reduced motion: a 150ms cross-fade. |

Images: `trends/img/19-vibedesign-015-ui-continuity.jpg` shows a phone "Library" demo mid-morph over a grainy painted field, with the title doubling as it moves into the header, and pattern tabs for Navigation, Card, Player, Search, Chart and Menu. `trends/img/20-vibedesign-019-021-017.jpg` shows three tips. Scroll cards: "Bloom" and "Signal" cards stacking with a "0.89 progress" chip and "The golden rule: scrubbed directly by scroll position". Ring cards: a curved ring of watercolour gradient cards with Perspective 860 / Glass rim 160 / Dispersion 25% / Flow 20% / Corner 32 sliders. Loading states: a task app with a Spinner / Skeleton / Progress / Optimistic switcher.

---

## 6. Design engineering budgets: what the sources say

| Topic | Source fact | Our rule (§8.3) |
|---|---|---|
| backdrop-filter cost | web.dev: *"may harm performance. Test it."* Mozilla bugs: jank on low-end Android Adreno GPUs, *"well short of hitting a smooth 60FPS"*. WebKit bug: forces root compositing and uses extra memory ([S33](https://bugs.webkit.org/show_bug.cgi?id=271340)). No source gives a per-layer number; practitioner guides say 3-5, unmeasured. | **≤ 3 live blurred surfaces visible at once on phone, ≤ 6 on desktop**. Blur ≤ 16px on phone and ≤ 24px on desktop. **Never animate the blur radius.** Never put backdrop-filter on the scroller or on anything larger than about half the viewport; use a pre-blurred image layer instead. |
| Compositor-only animation | web.dev: *"restrict animations to opacity and transform"*. `top`/`left` dropped 50% of frames against 1% for `transform`. `will-change` *"sparingly"*. | transform, opacity, plus `filter` and `clip-path` on small elements only. Add `will-change` just before an animation and remove it after. |
| LCP | Good ≤ **2.5 s** at p75 (mobile and desktop measured separately). Elements with `opacity:0` are ignored, and full-viewport background-like images are excluded. | LCP ≤ **2.0 s** p75 on a mid-range Android over 4G. The LCP element is bento text or the portrait tile, never a fading-in element. |
| Long blank load | vibedesign #017: no loader under 300ms; once shown, hold ≥ 500ms; one indicator per wait. | No splash. The bento is prerendered HTML. The room is a poster first, with progress only if a wait passes 300ms. |
| Fonts | (standard practice) | ≤ 2 families and ≤ 4 WOFF2 files, Latin subset. Preload one display weight. `font-display: swap` with `size-adjust` fallback metrics so CLS stays ≤ 0.05. |
| Images | (standard practice) | AVIF with a WebP fallback, `srcset`, `width`/`height` attributes, `fetchpriority="high"` only on the bento LCP image, lazy-load the rest. |
| Reduced motion | WCAG 2.2.2: auto-moving content lasting more than 5 s needs pause, stop or hide. Apple: Reduce Motion replaces movement. | Covered in §8.5. Add a global motion toggle in the UI. |
| Reduced transparency | MDN: `prefers-reduced-transparency` has *"Limited availability ... Experimental"* (Chromium only). Apple adapts glass to Reduce Transparency and Increase Contrast. | Honour the query, and also ship our own "Glass" control so Safari users get it too. |
| Touch targets | WCAG 2.5.8: **24×24 CSS px** minimum (AA). Apple HIG: 44×44 pt. | **44×44** for all room hotspots and controls. A hit area may be larger than the art. |
| Contrast on glass | WCAG 1.4.3: 4.5:1 text, 3:1 large; 1.4.11: 3:1 UI and focus. Apple: thicker material and a 35% dim layer under clear glass over bright content. vibedesign: *"Increase density, not ink opacity."* | Test against the **brightest and busiest** spot under each surface. |
| Focus | WCAG 2.4.7 focus visible; 2.4.11 focus not obscured (AA). | A two-colour ring that works on any glass (§8.4). The sticky HUD must never cover the focused object. |

---

## 7. Bento → room transition (Lead's priority)

**Goal.** One continuous journey. The recruiter gets everything on the bento within 5 s; then the room opens *from* the bento, not after it.

**Principle from the sources.** The element you tap becomes its next form, nothing reappears from nowhere, and reversing retraces the path (vibedesign #015). Glass needs a real world behind it (Apple HIG, sea-style). davesocozy shows the right shape (page over room, then enter) and the wrong execution (a loader gate).

### Proposal A · "The frost clears" (the room is behind the bento from the first frame) ★ ship this first

The bento tiles sit on a **frost veil over the room itself**. Entering the room means the frost clears, the tiles part, and the camera settles.

- **Layers.** L0 is the room plate, the real Screen 2 art. A tiny inline placeholder (about a 40px AVIF/base64, around 1 KB) paints instantly and the full plate loads at low priority. It is a full-viewport background, so it doesn't become LCP. L1 is the **veil**: the same plate pre-blurred (blurred once with `filter: blur(24px) saturate(140%)` or baked into a 96px AVIF and scaled up) plus a cool tint `rgb(238 245 255 / .55)`. L2 is the bento tiles in **frost** (content layer). The veil does most of the blurring, so tiles can be almost solid (`rgb(248 251 255 / .78)`) with **no live backdrop-filter**, which is a big win on mobile. L3 is the controls (dock, Contact, Enter) in **liquid** glass, the only live blurs.
- **Enter, phone timing; desktop runs at about 0.7×.**
  - 0ms: tiles exit outward from the tapped tile: `translate(±16px) scale(.96)`, `opacity 1→0`, 240ms `cubic-bezier(.42,0,1,1)`, stagger 25ms.
  - 80ms: veil `opacity 1→0`, 480ms `cubic-bezier(.22,1,.36,1)`.
  - 0ms: plate `scale(1.06→1)`, 560ms `cubic-bezier(.32,.72,0,1)`, so the camera settles.
  - 300ms: character reaction with the hero spring 260/20.
  - 420ms: room HUD (Back to Bento, the phone) fades in over 200ms.
- **Back to Bento** runs the same animations reversed (about 0.85× the duration).
- **Build.** Plain CSS plus WAAPI (`el.animate`). Animations are **interruptible**: `anim.reverse()` from wherever they are, so input is never blocked. `history.pushState('/room')`, and `popstate` reverses. Every browser supports this; there is no VT dependency.
- **Mobile cost.** Two full-screen composited layers plus N tiles, transform and opacity only, with no blur animation. Decode the plate ahead with `img.decode()` once the bento is interactive. Keep room details under `content-visibility: hidden` until entry.
- **Reduced motion.** Tiles and veil cross-fade in 150ms with no scale or translate. The character stays in pose.
- **Why it wins.** It fixes "glass on flat white", makes the glass look real because a real place is behind it, and makes the room part of the first impression. Then the HRD scan and the wow happen in one frame.
- **Design constraint.** The room plate must read well *blurred*. The character's silhouette and the room's palette show through the frost, and that alone says "who she is".

### Proposal B · "Tiles go home" (multi shared-element morph with View Transitions) ★ layer on top of A

Every bento tile has a home object in the room, and on Enter **each tile flies to it**:

| Bento tile | Home object in the room |
|---|---|
| portrait | the character |
| 3 projects | 3 holo cards or cartridges on the shelf |
| skills | the gauge board |
| Contact | the in-room phone |

- **Build.** One call: `document.startViewTransition(() => flushSync(() => setScreen('room')))`. Matching `view-transition-name`s go on both sides (`vt-hero`, `vt-p1`…`vt-p3`, `vt-skills`, `vt-contact`).
  - `::view-transition-group(*) { animation-duration: 520ms; animation-timing-function: cubic-bezier(.32,.72,0,1); }`
  - Stagger with `animation-delay` per name (0/30/60/90ms).
  - For the aspect-ratio change (card to object), set `::view-transition-old(x), ::view-transition-new(x) { height: 100%; overflow: clip; object-fit: cover; }`.
  - Keep tile text **out** of the shared element so it fades in the first 30% (vibedesign: origin-only content fades out over 25-35%).
  - Run A's veil-clearing and tile-exit for everything that isn't named.
- **Support and fallback.** Same-document VT is Baseline (Chrome 111+, Safari 18+, Firefox 144+). Without it, A runs alone. A FLIP fallback through Motion `layoutId` is only worth it if Motion is adopted anyway.
- **Gotchas.**
  - During a VT the page doesn't take input. Keep it ≤ 600ms and call `transition.skipTransition()` on Esc or Back.
  - A VT can't be reversed mid-flight; a new one skips the old.
  - Snapshots freeze canvas and video, which is fine here.
  - **Name ≤ 8 elements**, and only ones on screen.
  - Each snapshot is a GPU texture. My estimate is about 12 MB for a full-screen root at DPR 3 (1179×2556×4 B), so old plus new is about 24 MB plus the groups. Fine on modern phones; test on a 3-4 GB RAM Android.
- **Reduced motion.** Skip the VT and run A's 150ms cross-fade.
- **Why it wins.** The menu *becomes* the room: "my 3 projects" turn into 3 objects you can pick up, so the bento and the room are the same inventory seen two ways. This is the one designers will screenshot.

### Proposal C · "Scroll is the door" (a scrubbed transition for the first-scroll wow)

The bento is the first viewport and the room is the next. **Scrolling scrubs Proposal A's keyframes.** Tiles recede like stacked cards (scale → 0.94, dim 0.3, per vibedesign #019 and #015), the veil fades, and the plate settles. At the end the room is `position: sticky` and becomes interactive.

- **Build.** Write the transition as keyframes once. **Drive them with time on click (A) and with `animation-timeline: view()` on scroll (C)**: one set of keyframes, two drivers. Room objects get `inert` until the room is fully entered (IntersectionObserver at 0.95).
- **Rules.** Per vibedesign #019, *never* alter wheel speed or force snapping. The "Enter the room" button calls `scrollIntoView({behavior: 'smooth'})` (instant under reduced motion), and "Back to Bento" scrolls up. Use `svh`/`lvh`, and ignore height-only resizes under 120px so the address bar doesn't jolt the stack.
- **Support.** Scroll-driven animations are Baseline as of October 2026. As a fallback, one passive scroll listener writes `--p` per frame on the section only.
- **Risk.** It only works if the room fits one viewport, with a focal-point crop on phone. Panning inside the room is drag-only, never scroll.

**Recommendation.** **A + B as the Enter action, C as the scroll path to the same end state.** The Back to Bento button is always visible, is first in the room's tab order, and retraces the path.

For moving *between* rooms inside Screen 2 (living room → closet for dress-up), use the inspora "folding rooms" idea: a CSS 3D hinge fold of `rotateX` or `rotateY` 90° around the floor edge, 600ms `(.32,.72,0,1)`, with no WebGL.

---

## 8. Proposed engineering spec

### 8.1 Glass recipe (two materials, cold palette, with fallbacks)

```css
:root {
  /* cold stage: sea-style cool neutrals + Pastel Frost / Ocean Fuzz families only */
  --ink:   oklch(0.21 0.034 264.7);
  --ink-2: oklch(0.446 0.03 256.8);
  --shadow-ink: 8 20 40;                       /* cool navy, never pure black */

  /* FROST = content layer (bento tiles, room panels): Apple "standard material", thick */
  --frost-bg:   rgb(246 250 255 / .66);
  --frost-blur: 20px;                           /* 16px on (max-width: 600px) */
  --frost-edge: inset 0 1px 0 rgb(255 255 255 / .75),
                inset 0 -1px 0 rgb(var(--shadow-ink) / .06),
                0 1px 2px rgb(var(--shadow-ink) / .08),
                0 16px 40px -16px rgb(var(--shadow-ink) / .28);

  /* LIQUID = control layer (dock, Contact, Back to Bento, phone chrome): vibedesign #010 values */
  --glass-tint: linear-gradient(180deg, rgb(255 255 255 / .24), rgb(255 255 255 / .06));
  --glass-filter: blur(3px) saturate(180%) brightness(1.06);
  --glass-edge: inset 1.5px 1.5px 1px -1px rgb(255 255 255 / .95),
                inset -1.5px -1.5px 1px -1px rgb(255 255 255 / .55),
                inset 0 0 0 .5px rgb(255 255 255 / .30),
                0 0 0 .5px rgb(var(--shadow-ink) / .06),
                0 6px 24px rgb(var(--shadow-ink) / .10);
}

.frost {
  position: relative; isolation: isolate; border-radius: 20px; color: var(--ink);
  background: var(--frost-bg);
  -webkit-backdrop-filter: blur(var(--frost-blur)) saturate(160%);
          backdrop-filter: blur(var(--frost-blur)) saturate(160%);
  box-shadow: var(--frost-edge);
}
.frost::before {                                 /* specular sheen, top-left light */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(120% 80% at 15% 0%, rgb(255 255 255 / .35), transparent 55%);
}
.frost::after {                                  /* 3-4% grain kills banding */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: url("/tex/noise-128.png"); opacity: .035; mix-blend-mode: overlay;
}
.frost.on-veil { background: rgb(248 251 255 / .78); -webkit-backdrop-filter: none; backdrop-filter: none; } /* Proposal A: no live blur */

.liquid {
  border-radius: 999px; color: rgb(0 0 0 / .86);
  background: var(--glass-tint);
  -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter);
  box-shadow: var(--glass-edge);
  transition: background-color 150ms cubic-bezier(.22,1,.36,1);
}
.liquid:hover { background-color: rgb(255 255 255 / .14); }          /* hover adds tint, not shadow */
.liquid.clear::before { /* Apple: dim 35% under clear glass over bright content */
  content: ""; position: absolute; inset: 0; border-radius: inherit; background: rgb(var(--shadow-ink) / .35); z-index: -1;
}
@supports (backdrop-filter: url(#lens)) {        /* Chromium only: rim refraction, ≥32px controls only */
  .liquid.lens { backdrop-filter: blur(3px) saturate(180%) brightness(1.06) url(#lens); }
}

/* fallbacks */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .frost, .liquid { background: rgb(240 245 252 / .96); }
}
@media (prefers-reduced-transparency: reduce) {  /* Chromium; Safari users get the in-UI Glass control */
  .frost, .liquid { background: rgb(240 245 252); -webkit-backdrop-filter: none; backdrop-filter: none; }
}
:root[data-glass="tinted"] { --frost-bg: rgb(246 250 255 / .92); }  /* the in-UI "ultraclear ↔ tinted" control */
@media (prefers-contrast: more) {
  .frost, .liquid { background: rgb(246 250 255); border: 1px solid oklch(0.45 0.03 260); }
}
@media (forced-colors: active) {
  .frost, .liquid { background: Canvas; color: CanvasText; border: 1px solid CanvasText; }
}
```

Rules:

- One hero material per view.
- Glass never sits on glass.
- Liquid glass only on controls.
- Frost tiles are thicker, so their text passes 4.5:1 against the brightest spot of the room plate.
- The rim lens is an enhancement only: skip it under 32px and on Safari or Firefox.

### 8.2 Motion tokens

```css
:root {
  --dur-press: 100ms;  --dur-1: 150ms;  --dur-2: 200ms;  --dur-3: 300ms;  --dur-4: 450ms;
  --dur-room: 560ms;   /* phone; desktop 400ms (≈ ⅔-0.7×) */
  --stagger: 25ms;     /* max 8 staggered items */
  --ease-out:        cubic-bezier(.22, 1, .36, 1);   /* chrome + settle (sea-style = vibedesign) */
  --ease-enter:      cubic-bezier(0, 0, .58, 1);     /* toasts, popovers */
  --ease-exit:       cubic-bezier(.42, 0, 1, 1);     /* exits only; exits ≈ 0.8× entrance */
  --ease-move:       cubic-bezier(.42, 0, .58, 1);   /* things that stay on screen */
  --ease-continuity: cubic-bezier(.32, .72, 0, 1);   /* shared element, sheets, bento→room */
  --ease-overshoot:  cubic-bezier(.34, 1.56, .64, 1);/* ≤64px confirmations only */
  --ease-spring:     linear(0, .32, .78, 1.04, 1.09, 1.06, 1.02, 1, .99, .99, 1);
}
```

| Spring token | Params | ζ (approx.) | Use | Source |
|---|---|---|---|---|
| `spring.chrome` | visualDuration .25, bounce 0 | 1.0 | nav, sheets, panels | Apple `.smooth`, M3 effects |
| `spring.layout` | stiffness 400, damping 30 | 0.75 | tile morph, Dynamic Island on the phone | sea-style |
| `spring.hero` | 260 / 20 / mass 1 | 0.62 | character reactions, phone pop-up | sea-style |
| `spring.tilt` | 150 / 15 (Quiet: 120 / 18) | 0.61 | holo cards, hover tilt ≤ 8-12° | sea-style ≈ vibedesign 140/15 |
| `spring.light` | 160 / 25.3 | 1.0 | glare and light position | vibedesign #018 |
| `spring.meter` | 170 / 26 | 1.0 | gauge fills (no overshoot) | derived, critically damped |
| `spring.needle` | 60 / 5.5 | 0.36 | live needle wobble on one hero gauge | vibedesign #018 compass |
| `spring.flip` | 70 / 11 | 0.66 | card flip | vibedesign #018 |

Chrome never bounces. Only the character, the phone and the holo cards get life. Ambient loops of 4-6 s run on the hero only, and pause when off-screen or when the tab is hidden.

**Library note.** The repo has no Motion today. Either adopt `motion/react` (check the bundle cost on the bento route) or use CSS `linear()` springs plus a tiny spring integrator in one rAF loop for pointer-driven values.

### 8.3 Performance budgets

| Budget | Target |
|---|---|
| LCP (p75, mid Android over 4G) | ≤ 2.0 s; the LCP element is bento text or the portrait tile |
| INP | ≤ 200 ms |
| CLS | ≤ 0.05 |
| First meaningful paint | bento HTML prerendered at build (Vite SSG/prerender); no JS needed to read it |
| Bento-route JS | ≤ 90 KB gzip. **No three.js, R3F or postprocessing on this route** (all are in `package.json` today) |
| Room chunk | lazy; prefetched on idle after bento LCP and on Enter hover, focus or touchstart; ≤ 200 KB gzip excluding art |
| Room art | plate AVIF ≤ 150 KB @1440w and ≤ 80 KB @780w; character layers or sprites ≤ 250 KB total; prefer **2.5D layered art over WebGL** |
| Live blur surfaces | ≤ 3 visible on phone, ≤ 6 on desktop; radius ≤ 16 / 24px; never animated |
| Frame rate | 60 fps on a mid-range Android (for example a Galaxy A-series), measured with the DevTools performance panel and 4× CPU throttle |
| Animated properties | transform and opacity (filter and clip-path on small elements only) |
| View transitions | ≤ 8 named elements, ≤ 600 ms, skippable |
| rAF loops | one, paused when off-screen or the tab is hidden |
| Loading UI | none under 300 ms; once shown, ≥ 500 ms; poster-first, never a gate |
| Fonts | ≤ 2 families, ≤ 4 WOFF2 files, one preloaded, `size-adjust` fallbacks |

### 8.4 Accessibility rules for a hidden-object room

1. **Every hotspot is a real `<button>` or `<a>`** in the DOM, in a logical order (importance, then left to right). Each has an accessible name that says the object *and* the job: "Phone, contact Adelia"; "Shelf card, Project 1: …".
2. **Discoverable without hover.** Labels show on focus, and on `(hover: none)` they are **always visible** (Chloe Yan pattern). A "Show all objects" hint button outlines every hotspot once, like the hint button in hidden-object games.
3. **List view escape hatch.** "Objects in this room" opens a plain list of the same buttons, for screen readers and impatient recruiters.
4. **Targets** are ≥ 44×44 CSS px, and a hit area may exceed the art.
5. **Focus ring visible on any backdrop:** `outline: 2px solid #fff; outline-offset: 2px; box-shadow: 0 0 0 4px oklch(0.25 0.06 260);`. The HUD must never cover the focused item (WCAG 2.4.11).
6. **Back to Bento** is always visible, first in the room's tab order, and retraces the transition. Focus returns to the bento tile that opened the room. On entering, focus moves to the room's `<h1>` ("Adelia's room").
7. **Object panels are `<dialog>`s** with an `inert` background, closed with Esc, returning focus to the object. Don't trap focus inside the phone unless it is presented modally.
8. **No single-key shortcuts** (WCAG 2.1.4) unless they can be turned off. Esc and arrow keys inside widgets are fine.
9. **Dress-up** is a radio group with arrow keys. **Gauges** are `role="meter"` with `aria-valuetext`.
10. **The character's gaze follows keyboard focus**, so focus is visible in the world as well as in the ring. This is delight and accessibility at once.
11. **Sound is off by default**, with a mute toggle always present.
12. **A motion and glass control** lives in the HUD (and in the phone's Settings app): Reduce motion, and Glass (ultraclear to tinted). The defaults come from the media queries.

### 8.5 Reduced-motion behaviour

| Thing | Default | `prefers-reduced-motion: reduce` |
|---|---|---|
| Bento → room | A + B morph, 560 ms | 150 ms cross-fade; no scale or translate; no VT |
| Scroll door (C) | scrubbed keyframes | disabled: plain sections, and the Enter button jumps |
| Character idle (blink, breathe 4-6 s) | on | one still pose; reactions become a 150 ms swap |
| Holo cards | tilt, sway, flip | no tilt or sway; flip becomes an instant swap or 200 ms fade; glare may still follow the pointer |
| Gauges | spring to value, digit flip | final value at once |
| Ambient (dust, light shimmer) | on hero only, 4-6 s | off |
| Hover and press feedback | 100-150 ms | kept (opacity or colour only) |
| Folding rooms | 600 ms hinge | 150 ms cross-fade |

A global pause toggle covers WCAG 2.2.2 for anyone without the OS setting.

---

## 9. FITS and DOES NOT FIT

### FITS (ranked)

1. **Glass over a real world, where the world is the room** (img 01, 03, 04, 10). This is the core idea, and it is §7 A.
2. **Two-material system**: liquid glass for controls and frost for content, plus a user tint control following iOS 27 (img 02, 05; HIG quotes).
3. **Shared-element continuity**, so that tiles go home into the room (img 19; VTs are Baseline).
4. **Spec-sheet framing with an evidence grid**: "Fig 0.1", rulers, a live time chip (img 08). It is sea-style's own signature, proven on a real 2026 portfolio.
5. **Objects as the menu with visible labels on touch**, plus a daily-reveal hidden-object mechanic (img 11, 12, 13).
6. **Holo collectible project cards** driven by one pointer light, using the Quiet preset (img 16, 17).
7. **Gauges that move because the data is real**, with rings and dot-matrix digits (img 18).
8. **Scroll-scrubbed (never jacked) depth**: stacked or receding cards on a scroll timeline, Baseline as of October 2026 (img 20).
9. *(bonus)* **Poster-first loading** following vibedesign #017's timings: no loader under 300 ms, ≥ 500 ms once shown (img 20).

### DOES NOT FIT

1. **Start gates and WebGL loaders** (img 15, img 10 middle). They fail the 5-second recruiter test, and on cheap phones they fail outright.
2. **Gacha splash maximalism**: warm, loud key art, heavy pages, cookie walls covering the scene (HSR and Blue Archive, img 13 and 14). Character-first is right; burying the content isn't. It is also warm, not cold.
3. **AI glow and dark purple neon** (Reflect's black-hole glow, img 14). It reads as an AI template, and sea-style bans *"purple→blue page backgrounds with nothing to light"* and *"glow on many elements"*.
4. **Glass everywhere**: glass in the content layer, every tile glassy, glass on flat white, glass on glass (HIG and sea-style). Also **SVG refraction as the main effect**, because it is Chromium-only (img 06): Safari users, who include most designers on iPhone, would see plain blur.
5. **Warm cozy or cream aesthetics and walkable 3D on mobile**. davesocozy's studio, mrncst's cream and red pixel type, Chloe's peach and Messenger's planet are lovely, but the brief says cold, and camera or walk controls are a touch trap.

Also out: scroll-jacking or forced snapping (vibedesign #019 golden rule); a WebGL depth-of-field ring carousel (vibedesign #021 is two-pass WebGL 2, so at most its CSS fallback); custom cursors; gradient text; glow on many elements; autoplay sound.

### What I'll push the team to do (they may be too safe)

- **Make the room visible behind the bento in the first frame**, under frost. There is no "page two"; the frost just clears.
- **Make the tiles physically fly home**: each project becomes the object you pick up in the room.
- **Make the in-room phone a real app** built from the same component as the Contact tile. Its **Settings app holds the Glass slider (ultraclear to tinted, like iOS 27) and Reduce motion, and they drive the CSS tokens for the whole site.** It is a working phone and an accessibility feature in one.
- **Make the character's gaze follow keyboard focus and the pointer.**
- **Wire the gauges to real numbers**, and show the live WIB time and an "open to remote" chip in mono spec labels.
- **Do a daily-reveal object** (Blue Archive mechanic): one new note, card or sticker in the room per day.

---

## 10. Where trends agree or conflict with the client's sea-style ("Calm Tactile")

**Agree**

- Glass needs a meaningful backdrop (sea-style §4 "Liquid glass ... Glass on flat white is banned" = Apple HIG = vibedesign "where not to use it").
- One hero material per view; calm chrome and a lively object (= HIG "sparingly").
- The motion tokens are nearly identical. sea-style's chrome curve `(.22,1,.36,1)` is vibedesign's out-strong; tilt 150/15 ≈ vibedesign 140/15; hero spring 260/20 ≈ Motion's default bounce of 0.25.
- Holo foil as a collectible (sea-motion recipe 1 = vibedesign #018 = poke-holo).
- Dot-matrix numerals and dotted rings for gauges (sea-motion §13). The repo already has the Doto font.
- Spec-sheet framing (sea-style pillar 6) is proven live by imdaryl.com.
- The Dynamic Island morph (sea-motion §8) fits the in-room phone.
- Reduced-motion rules match across sources (keep opacity, drop movement).

**Conflict, and how to resolve it**

| Conflict | Resolution |
|---|---|
| The brief's "glassy bento" vs sea-style's *"every card glassy"* banned and HIG *"Don't use Liquid Glass in the content layer"* | Tiles are **frost** (standard material, thick); only the controls are **liquid**. The hero tile carries the colour. |
| sea-style's *"Never two heroes in one view"* and 70-80% quiet stage vs a room with "objects everywhere" | Colour and saturation go only on the character and the 3 project objects. Everything else is desaturated cool, and other objects reveal on focus or hint. |
| sea-style's warm gradient families (Sunset Haze, Golden Fog, Ember Mesh) vs the "cold" brief | Restrict to **Pastel Frost, Ocean Fuzz, Sky Cloud, Iris Holo (on foil only) and Chrome**. |
| sea-style's "glass on white is banned" vs `docs/revamp-plan.md`'s *"white glass with dark text on the page"* | The plan's page glass is exactly the banned case. Proposal A fixes it with the room behind the glass. |
| sea-style's type (Space Grotesk + Geist + Geist Mono) vs the repo's Mona Sans + JetBrains Mono | The team must pick one. Don't ship four families. |
| sea-style's shimmer loops of 4-6 s vs WCAG 2.2.2 (> 5 s needs a pause) | Hero only, pause off-screen, and a global motion toggle. |
| sea-style's sound ("Sound is soft and physical") vs accessibility | Off by default, with a toggle (sea-style already says "Mute toggle always"). |

---

## 11. Client-sent sources

| Site | What it is (one sentence, from my screenshot) | Image | What the site does well as UI (taste signals) |
|---|---|---|---|
| **inspora.design** | A curated archive of design work as a 4-column masonry of video and image tiles on white, with grey filter tabs (All, Web, Branding, Product, Motion, Illustration, 3D, Print, the active one black) and a "Latest" sort. On phone it is one column with tabs that scroll sideways. | `trends/img/21-client-inspora.jpg` | Media-first tiles with no captions until opened, tiny avatar chips, near-zero chrome, sponsor cards blended in. |
| **saved.design** | A "daily design inspiration" masonry ("Updated daily" with a green dot, Subscribe pill) with rounded pill filters (Web, Interface, Branding, Motion, 3D, Illustration, Typography, Posters). On phone it is two columns. | `trends/img/22-client-saved.jpg` | Density, pill filters, and a detail view laid out as Esc / Prev / Next with a "See original" black pill (img 25). |
| **vibedesign.tips** | A numbered tips publication ("NO. 023/999 · SINCE 2026" in mono over a ruler, a giant outline vertical "999 TIPS", an iridescent strip). Each card is a live demo over a photographic backdrop with view and like counts, and opens as a sheet over the feed. On phone a **floating glass tab bar** (Tips, Skills, Resources, Saved). | `trends/img/23-client-vibedesign.jpg` | **The closest public match to the target**: spec-sheet mono labels, glass controls only, demos over real imagery, sheet continuity, numbers in small mono. |
| **directoryyy.com ("perfolios.")** | A directory of 309 portfolios with a fanned 3D card stack hero, a left text filter list (Minimal, Thoughtful, Playful, Creative, Showcase), a search field with a "/" shortcut hint, a list/grid toggle and a floating "Surprise me" pill. Light and dark toggle at top. | `trends/img/24-client-directoryyy.jpg` | Quiet, text-first, a coverflow-like card fan, keyboard hint, a playful randomiser. |

**Entries I dug into and verified with my own screenshots**

| Entry | Found on | Image | Verdict |
|---|---|---|---|
| **vibedesign #010 Liquid glass** | vibedesign | `05-…` | **Taken.** The glass recipe in §8.1. |
| **vibedesign #015 UI continuity** | vibedesign | `19-…` | **Taken.** Timings and principles for §7. |
| **vibedesign #018 Holo card** | vibedesign | `17-…` | **Taken.** Springs, layers and the a11y rules in §4 and §8. |
| **vibedesign #019 / #021 / #017** (scroll cards, ring cards, loading) | vibedesign | `20-…` | #019 and #017 **taken** (§7 C, §8.3). #021 **rejected for the build**: two-pass WebGL 2, per-pixel DOF. The idea of a ring of cards could inspire a project picker in CSS-3D fallback form only. |
| **vibedesign #023 mobile web** | vibedesign (text) | - | **Taken**: `-webkit-tap-highlight-color: transparent`, all `:hover` inside `@media (hover:hover)`, `:active` everywhere, a floating bottom bar at `bottom: calc(12px + env(safe-area-inset-bottom))` with height 56, which folds to a 40px capsule after 8px of downward scroll travel. iOS 26+ Safari samples the top fixed element for the toolbar tint, so hide inactive layers with `visibility:hidden`, not `opacity:0`. |
| **Daryl Patigas** (imdaryl.com) | directoryyy | `08-…` | **Taken**: spec frame, Fig captions, 9-cell evidence grid, glass pill over sky. |
| **Chloe Yan** (chloeyan.me) | directoryyy | `11-…` | **Taken**: objects as menu, always-visible labels on touch, live counters in the corners. **Rejected**: warm peach palette. |
| **Melike Turgut** (meliketurgut.com, "Halloween portfolio" on saved.design) | saved | `12-…`, `25-…` | **Taken**: 8 tactile jelly objects = 8 chapters on a calm stage (the live site today shows the non-Halloween version). |
| **Inspora "Interactive folding rooms"** (@duckwhocodes) | inspora | tile in `21-…` | **Taken** for room-to-room transitions (CSS hinge fold). Post pages are behind a Vercel bot checkpoint for headless browsers; I verified it from the home grid tile and the post text. |
| **Inspora "Carousel turns into top navigation"** (@rakshaa_t) | inspora | tile in `21-…` (iPhone "Studio" with colour-dot spaces) | **Taken as a pattern**: the room's object rail could collapse into the bento's nav on Back. |
| **Gabriel "Smooth Volume Slider"** | saved | `18-…` (right) | **Taken** for the meter and slider feel (fill, ticks, ringed thumb). |
| **Marina "Interactive 3D Gift Card website"** | saved | `25-…` (right) | **Rejected**: warm saturated flowers on black. Kept only the lesson that oversized type plus one object works. |
| mrncst.computer, pancake.wtf | directoryyy | (not exported) | **Rejected**: warm cream with red pixel type, and dark warm. pancake's "work / words / crafts" stacked-thumbnail lists are a good *secondary* index pattern. |
| saved.design AI agent brand and dark node tools; inspora sponsor and AI prompt bars | saved, inspora | visible in `21`, `22` | **Rejected**: AI-gradient mush and dark dev-tool look. |

**What the client's taste signals say:** quiet white (or near-white) chrome; dense media grids; black pill as the active filter; mono micro-labels and numbers; glass reserved for floating controls; demos over real photographic or painterly backdrops; continuity sheets. None of the four uses gradient blobs or neon, and none gates its content.

---

## 12. Sharp notes for the critique round

- `package.json` ships `three`, `@react-three/fiber`, `@react-three/drei` and `@react-three/postprocessing`. None of these may load on the bento route. I'd push for a 2.5D room (layered AVIF plus CSS transforms) and keep WebGL only if it earns its weight.
- `docs/revamp-plan.md` already has a "loading screen once per session, at most about one second". Replace it with poster-first: no loader at all unless a wait passes 300 ms.
- The plan's WebGL "World" sky and sea shader sits behind every page. With a room behind the bento there must be **one** world, not two. Decide which.
- The HRD test must pass at **360×740** too, not just 390×844.
- Any proposal that hides Contact behind the room fails. Contact is a visible pill on both screens.
- Character art is parked in the plan ("no character until a version she approves exists"). Every character-first idea depends on that asset. Get it scheduled, or design the room to work with a silhouette first.
