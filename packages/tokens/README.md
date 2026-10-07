# @adelia/tokens

Shared design tokens for `adelia.cc` and every `*.adelia.cc` experiment. This is the only place in the ecosystem that declares colors, radii, shadows, easing, durations and the type scale.

```css
@import "@adelia/tokens/tokens.css";
```

Switch themes with `data-theme="light"` or `data-theme="dark"` on any element. Light is the default on `:root`.

Rules that come with the tokens:

- One neon for action (`--accent`), one pastel for fields (`--accent-soft`), the rest neutral.
- Neon and pastel are fills or markers. Text on a fill uses `--on-fill`.
- `--muted` is for decorative text or text 24px and larger. Small labels use `--ink`.
- Need a variant? Derive it with opacity (`color-mix(in srgb, var(--ink) 10%, transparent)`). Never add a new hex.
