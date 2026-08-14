# Today in Sports — brand

The whole interface is one stadium scoreboard. Not a logo applied to a website —
a black arena, panels bolted onto it, amber lamps for anything that matters, red
for the trim.

The app was already halfway there: `--bg` was night navy, the accent was amber,
and the toolbar named its own colour `--bulb` before there was a logo to match.

## The lockup is geometry, not a crop

The dot matrix is the brand, so it is **drawn**, not sampled. The master sheet
gives a 534px-wide logo; anything larger than that on a retina screen is an
upscale, which is what "blurry" was. Both lockups are now generated as SVG from
a 5×7 cell grid — circles for `SPORTS`, squares for `TODAY IN` — so they are
exact at any size.

| File | Use | Rendered at |
|---|---|---|
| `public/brand/wordmark.svg` | Toolbar, footer | 32px tall (26px under 640px) |
| `public/brand/logo.svg` | Landing hero | `min(460px, 80vw)` wide |
| `public/brand/icon.png` | Source for the icon set | — |

Regenerate both after editing the generator:

```sh
python3 tools/build-wordmark.py public/brand
```

The horizontal cut carries almost no padding inside its viewBox — it sits inline
in a 32px bar, so any padding there is height the glyphs do not get. Space
around it is the bar's job.

`icon.png` is still a crop from the sheet, cleaned with a **corner floodfill** —
not `-transparent white`, which would punch holes through the white letterforms.

### One logo at a time

The toolbar lockup is hidden until the bar sticks, so the landing hero is not
showing the same mark twice. Every other page mounts the toolbar already stuck,
so it is visible immediately there.

### No glow on the matrix

A drop-shadow behind a dot matrix reads as the matrix being out of focus. The
hero logo has no filter on it, and the eyebrow lost its text-shadow for the same
reason.

## Type

Two display faces, self-hosted in `public/fonts/` (10KB total, no CDN):

- **Jersey 25** (`--display`) — the stadium board face. Headings, nav, buttons,
  numerals. This is what makes the whole site read as a scoreboard rather than
  just the logo.
- **Silkscreen** (`--pixel`) — bitmap, for the small engraved labels screwed onto
  a board. Eyebrows, stat captions.
- `--condensed` and `--mono` remain for anything needing more legibility.

Body copy stays in the system sans. A page of pixel type is unreadable, and the
questions are the product.

## Palette

Defined once, in `src/styles.scss`.

| Token | Value | Job |
|---|---|---|
| `--bg` | `#070b11` | The dark around the board |
| `--board` | `#131a22` | Panel face, sampled from the logo |
| `--board-2` | `#0d131a` | Recessed wells inside a panel |
| `--bezel` | `#333d49` | The lit top edge of a panel rim |
| `--amber` | `#f5a524` | The lamp. Interactive colour everywhere |
| `--amber-hot` | `#ffc65a` | Hover |
| `--red` | `#d6212f` | Trim. The tagline pill, the rule under every section head, the rotating word in the headline, the secondary button |
| `--chalk` | `#eef2f7` | Primary type |
| `--dim` | `#8494a6` | Secondary type |
| `--good` / `--bad` / `--warn` | unchanged | State only |

`--surface`, `--text`, `--accent` etc. are kept as **aliases** onto these, so the
admin panels and shared components inherit the board without being touched.

### One palette, not five

`landing`, `play`, `docs`, and `app-toolbar` each used to define a private copy
of the scheme in `:host`. They now alias the global tokens instead. A change to
the board happens in one file.

## Helpers

- `.board-panel` — dark face, lit top rim, dark underside
- `.lamp` / `.lamp-red` — lit readings, with the glow
- `.engraved` — the little bitmap labels
- `.readout` — display face with tabular figures, so digits don't jitter as they tick

`body::before` lays a fixed 4px LED grid over the arena so flat areas read as
board rather than as empty page.

## Icons

Generated from `public/brand/icon.png`, squared on a transparent canvas first so
nothing distorts:

```sh
magick brand/icon.png -background none -gravity center -extent 264x264 sq.png
magick sq.png -resize 512x512 icon-512.png
magick sq.png -resize 192x192 icon-192.png
magick sq.png -resize 32x32   favicon-32.png
magick sq.png -resize 16x16   favicon-16.png
magick sq.png -resize 180x180 -background "#12181f" -flatten apple-touch-icon.png
```

The icon keeps its ball row and dot-matrix `TIS`. At 16px that detail does go
soft — a known, accepted trade for using the real artwork everywhere.

## Fixed along the way

The section rail on the landing page is pinned to the viewport edge while the
hero is centred in 1080px, so the two overlapped anywhere under ~1400px — the
labels ran under the headline and the CTA buttons. It now falls back to the menu
button at 1400px instead of 900px. This was pre-existing, not introduced by the
restyle.

## Known gaps

- `src/index.html` still carries `noindex, nofollow`. A launch decision.
- No Open Graph or Twitter card image. `brand/logo.png` is the asset for it.
- `npm run lint:css` fails — no stylelint config exists in the repo.
- The five lamps in the icon are still decorative. Filling them left to right as
  a player answers would make the mark and the game state the same object.
