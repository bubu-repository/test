# Design review (October 2026)

Two rounds of review after the revamp, at Adelia's request: first five specialists, then five senior
designers whose only brief was "make it look as good as it can, with nothing that reads as AI
slop". Each round's findings were applied before the next one started. The full reviews (with
screenshots and scripts) were working files; this page keeps what they found and what changed.

## Round 1: five specialists

| Lens | The one-line verdict |
| --- | --- |
| Interaction | The objects people grab (the pack's tear strip, the DAC knob, the Studio stickers, the daily cards) behaved like form controls in costume: they didn't follow the finger, lift, land or spring back. |
| Gamification | The pieces were good and the ethics clean (no streaks, odds printed, quiet while reading), but they didn't add up to a loop: unlocks were a plain dot, the book was a wall of "Locked", and full completion was impossible on any device. |
| Skeuomorphism | Islands of real craft (the ID card, the gel keys, the Studio's shadow model) next to cards that read as grey stone, a desk with no ground, and two suns: the sky lit from the top right, most objects from the top left. |
| Apple design | The world and the case-study system were right; there were too many surface treatments, glass on content, eleven font weights, three H2 sizes, tiny mono-caps headings, and a few contrast and focus failures on the sky. |
| Art direction (Frutiger Aero × kawaii) | The architecture was right, the finish wasn't: a grey band under the clouds, three different pinks (one a leftover raspberry), four drawing hands, and Moci as a generic AI sparkle. |

### What changed

**World and materials**
- Luminous clouds (no grey band, no vignette in the sky); the cloud bank fades in below the hero
  words; the sun rides above the words and is smaller on phones; the sea deepens as you go down;
  an antialiased meniscus; no neon at the surface.
- Cards on the white page are white acrylic (brighter than the page, a cyan polished edge, navy
  shadows, no blur). Glass blur only over the sky, the sea and floating panels.
- One light, the sun at the top right: Studio materials, phone frames, the tank glare, the seal
  clock and the creatures' highlights all follow it.
- Pink is one token family (`--pink`, `--pink-soft`, `--pink-ink`), placed on things you touch or
  collect. The old raspberry and bubblegum hexes are gone, and the blue that was still called
  "magenta" in the code is now `primary` and `accent`.
- About 600 lines of CSS from retired experiments deleted.

**Type and layout**
- One H2 size, `type-title-2` and `type-headline` below it, weights 400–700 only, one mono label
  style. Section labels are plain blue text; the holographic sticker label appears once per page.
- Case studies: the H1 is the name alone; subheads are headlines, not 11px mono caps; rejected
  options are readable ("Not chosen" instead of strikethrough).
- Measure fixes, one rhythm (`--section`, `--subsection`, `--section-end`), the lens picker as a
  segmented control, one filled key per group, `lg` keys only in the home hero and the contact card.

**Character and art**
- Moci is a drop of clear jelly with a face, everywhere it appears, and floats beside the hero words
  on desktop.
- Guestbook creatures are clear jelly; the floor is a sandbar of light with a reef in the same hand.
- All 16 achievement stickers and the Studio's 12 decorations redrawn in that hand, with subjects
  from the sea (a paper boat, a message in a bottle, a conch, a compass, a whale tail).
- The about desk has ground (a Bondi-blue translucent front, contact shadows), a glass tank with
  three of the guestbook's creatures, brushed metal, a laptop on a pink gingham mat, and toys that
  answer touch.
- Studio: holo is silver foil with a rainbow band, acrylic is clear, photo emboss is soft.

**Interaction and the game layer**
- Today's pack: a tear strip that follows the finger and springs back, two-faced cards turned one at
  a time, a product card in the first pack, a holo guaranteed by the third, collector numbers.
- The sticker book: silhouettes with names, hints, progress and "Show me"; medals at 3, 5, 8, 11, 14
  and the whole set; every sticker earnable on a phone; read stamps on the work cards; the guestbook
  remembers your creature.
- Dialogs animate out, the tour's card lands after its spotlight, the dock no longer grows while it
  magnifies and confirms "Copied ✓" where you clicked, a small hint names gestures you can't see,
  the DAC knob turns relative to your press, the ID card lets phones scroll.

## Round 2: five senior designers, against AI slop

Round 2's notes (labels stacking, generic type, a stock OG card, a heavy WebGL world, too many
surface treatments) were not applied to the Next.js site. Instead the site was rebuilt as
**Adelia's Room** (October 2026, see the README): one photoreal room you walk into, on the engine of
dside's BUBU World, with every feature and all the hiring content moved into objects in the room. The
pages above describe the previous version; it stays in the git history.
