# Yan Hladchenko, the old bento version: Lead's research

Researched by the Lead, 24 Nov 2026. Goal: understand why the old bento homepage of yanhladchenko.com
was so easy for a hiring manager to read, in my own words, from a screen I looked at myself.

## How I found it (and what failed)

| Source | Result | Trust |
|---|---|---|
| Wayback Machine (`web.archive.org`, CDX API and snapshots) | **Blocked from this cloud container** (TLS reset at the platform egress; the environment itself is "unrestricted"). The server-side fetch tool refuses the host too. Not available to us. | n/a |
| archive.today, Common Crawl index | Also blocked at the egress. | n/a |
| Live `yanhladchenko.com` (Playwright, 1440×900, 24 Nov 2026) | Works, but it is the **new** design: a sidebar "productivity tool" layout, not the bento. Screenshot `yan/img/02-new-sidebar-home-2026-11.jpg`. Its Settings panel (opened with Playwright) offers Sidebar / Right side / Hidden tab layouts and no bento mode. | High (I opened it) |
| Wall of Portfolios profile `wallofportfolios.in/portfolios/yan-hladchenko/` | Its `og:image` is a 1200×630 capture of the site named `thumbnail_yan-hladchenko_20260123211156.avif`, i.e. captured **23 Jan 2026**, before the redesign (LinkedIn and Awwwards date the new site's honourable mention to May 2026). Decoded and opened: it is the bento homepage. Saved as `yan/img/01-old-bento-home-2026-01.jpg`. | High for what it shows; it only shows the top ~630 px of the desktop page |
| Awwwards element pages ("about-page-yan-hladchenko", tagged bento) | The search engine lists them; `awwwards.com` refuses this container ("upstream request failed"). Not used. | n/a |

Limits, stated plainly: I saw **one** screen of the old site (desktop, above the fold, cropped to
1200×630). I did not see its mobile layout, its About or Contact pages, or the cards below the fold.
Anything about those is marked *unverified* below.

## What I actually see (01-old-bento-home-2026-01.jpg)

- **Nav:** one floating pill, centred at the top: `Home | About | Contact`, separated by hairlines,
  a very light grey fill (`#F8F8F8`) with a soft drop shadow. Three items, nothing else.
- **Page:** pure white `#FFFFFF`. Cards are a flat light grey `#F7F7F7` with large rounded corners
  (roughly 20–24 px at this scale), **no borders, no shadows**. Gutters are tight and even, about
  12–16 px (measured 13 px horizontally, 16 px vertically in the capture).
- **Grid:** the content block is ~1020 px wide in the capture, split about 40 / 60: a wide left
  column (~405 px) and a right side made of two equal columns (~295 px each). Cards span either one
  column or both right columns ("My design garden" spans the two right columns). Heights vary, so
  it reads as a masonry bento, not a uniform grid.
- **Cards I can see, in reading order:**
  1. **Intro card** (top-left, short, wide): a tiny avatar inline with the sentence
     "Yan is a Product Designer at [PDF Expert logo] PDF Expert with strong visual craft, a bias for
     action, and 5 years of experience across fintech, startups, and 0→1 products". One sentence =
     who, where, how long, which domains. Black text, medium weight, ~26 px.
  2. **Raiffeisen Bank** (left, tall): logo chip + company name top-left; a phone mockup bleeding off
     the right edge, a rotated "Cash loan" card and a floating check icon as props; the outcome line
     bottom-left: "Making cash loans easier to understand and nicer to use".
  3. **Bloop** (middle, tall): app icon + name; a centred product visual (three stacked planning
     cards and an orange "Start planning →" button); outcome line: "Designing trips, parties, and
     anniversaries to be easier to plan and more joyful to share".
  4. **Tema** (right, tall): logo + name; a tilted phone bleeding off the right edge with a floating
     "Creator · The Deep Work Champ" chip; outcome line: "Helping people find their best way of working".
  5. **My design garden** (spans middle + right, below): icon + title, a big orange "WELCOME" visual
     (cropped by the capture).
  6. **My Podcast** (left, below): icon + title (cropped). He hosts a design podcast, *Інтерфейсний*
     (confirmed by search results on ux.pub and Spotify), so this card is personal proof, not a project.
- **Colour:** the chrome is fully neutral (white, `#F7F7F7`, black text). All colour comes from inside
  the cards: the brand logos and the product screenshots (Raiffeisen yellow, Bloop orange, Tema blue).

## Why it is easy for an HRD (my reading)

1. **The first card is the CV in one sentence.** Role, current company, years, domains. You can stop
   reading there and already know if he fits.
2. **Every project card has the same anatomy:** *logo + company* (credibility) → *one product visual*
   (proof it shipped) → *one outcome sentence starting with a verb* ("Making…", "Designing…",
   "Helping…"). The eye learns the pattern after one card and scans the rest in a second.
3. **The work is the hero, the chrome disappears.** No borders, no shadows, no gradients on the
   frame; the product screens carry the colour, so the eye goes to the work.
4. **Three-item nav.** Home, About, Contact. Contact is always one click away.
5. **Personality is boxed.** The garden and the podcast are cards like the projects, below them, so
   they add character without getting in the way of the work.

## What we take, what we leave

**Take (for Screen 1, the bento):**
- One-sentence intro card first, top-left, that answers who/what/where/open-to.
- One shared card anatomy for the 3 projects: logo/name → one visual → one outcome sentence.
  (Outcome sentences stay `TODO_SEA` until Adelia supplies real ones; we do not invent them.)
- Visuals that bleed off the card edge (a phone or screen cropped by the card) for depth.
- A tiny, always-reachable nav with Contact in it.
- Personality cards after the work cards (for us: the room, the phone, the character).
- Tight, even gutters; big radii; masonry heights with a clear reading order.

**Leave:**
- Flat grey-on-white with no material. The brief is "cold and glassy", so our cards are frosted glass
  on a cool stage, with depth, not `#F7F7F7` slabs.
- His palette, his copy, his project content and his exact proportions.
- The new sidebar version: a good site, but it is the opposite of the bento the client asked for.
