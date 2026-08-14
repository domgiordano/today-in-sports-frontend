# Today in Sports — brand

The mark is a scoreboard. That was not a costume chosen for the logo; the app
was already one. `--bg` is night navy, the accent is amber, and the toolbar
declared `--bulb: #f5a524` before there was a logo to match it to. Picking the
scoreboard meant the brand and the interface stopped arguing.

## Palette

| Token | Value | Job |
|---|---|---|
| `--bg` | `#0b1220` | The night. Page ground. |
| `--brand-panel` | `#0f1728` | The board face. Icon ground, raised brand surfaces. |
| `--surface` | `#131c2e` | Cards, menus. |
| `--border` | `#22304a` | Rules and hairlines. |
| `--text` | `#e8edf5` | Chalk. Primary type. |
| `--text-dim` | `#7c8ca6` | Secondary type. |
| `--accent` | `#f5a524` | Amber. **The interactive colour** — links, focus, primary buttons, active nav. |
| `--brand-red` | `#d6212f` | **Chrome only.** The wordmark, the `I` in TIS. |
| `--bad` | `#e5646d` | Wrong answer, errors, danger. |
| `--good` | `#4fd1c5` | Correct answer. |

### The two reds

`--brand-red` and `--bad` share a hue — 355.4° and 355.8° — and differ only in
lightness (48% against 65%). That is deliberate. The brand red never signals
state and the state red never appears in the mark, so the two never compete for
meaning; and because they are the same hue, a red button beside a wrong answer
reads as one family rather than two arguments.

Red is not an interactive colour. Amber does that job everywhere.

## Two cuts of the wordmark

The wordmark splits the name in two: `TODAY IN` in chalk, `SPORTS` in amber.
That split is constant. What changes is the face.

**Display cut** — `SPORTS` in the amber dot matrix, on a bevelled board with the
red tagline pill. Hero, social cards, merch. It needs roughly 200px of width to
hold together.

**UI cut** — the same split set in the condensed face, flat, on a transparent
ground. Toolbar, anywhere inside the product. This is what
`app-toolbar.component.html` uses.

Do not use the display cut in the interface. `TODAY IN SPORTS` is fifteen
characters; in dot matrix at a 24px toolbar it aliases to grey. And the bevelled
plate sits badly on a bar that is translucent and blurred — it reads as pasted
on.

Reserve true dot-matrix and seven-segment forms for **numerals**: score, streak,
the 5.

## The square mark

`public/favicon.svg` — five amber lamps over `TIS`, the `I` in brand red.

It is the board cropped square, and it is deliberately *not* a shrunk copy of
the hero lockup:

- **Solid letterforms, not dot matrix.** `TIS` in dot matrix is about twenty dot
  columns wide. At a 32px favicon each dot falls under two pixels and the mark
  greys out.
- **No ball illustrations.** Four balls in a 16px square is mud. The hockey puck
  is worse than mud — a black disc on a near-black panel reads as a hole.
- **No bevel.** A gradient bezel at favicon size is noise.

The five lamps are the one device worth protecting: five questions, every day.
They are also a progress indicator waiting to be wired — lamps filling left to
right as a player answers would make the mark and the game state the same
object. Not built yet.

## Assets

| File | Use |
|---|---|
| `public/favicon.svg` | Browser favicon, PWA (`sizes: any`) |
| `public/icon-192.png` | PWA |
| `public/icon-512.png` | PWA, splash |
| `public/apple-touch-icon.png` | iOS home screen — flattened onto `--brand-panel` so iOS applies its own corner mask |
| `public/site.webmanifest` | Install metadata, `theme_color: #0b1220` |

PNGs are generated from the SVG. To regenerate after editing it:

```sh
cd public
magick favicon.svg -resize 512x512 icon-512.png
magick favicon.svg -resize 192x192 icon-192.png
magick favicon.svg -resize 180x180 -background "#0f1728" -flatten apple-touch-icon.png
```

## Retired from the option sheets

- **Ball rows.** Generic, and they cost the most legibility at the smallest
  sizes. The toolbar keeps a *single* rotating ball instead — it already existed,
  and the landing page swaps the sport while scrolling.
- **The shield badge.** A third silhouette alongside the rounded panel and the
  plate, earning nothing.
- **The hockey puck**, everywhere. Invisible on a dark ground.
- **The italic/speed and brush-script cuts.** They fight the condensed geometry
  of the rest of the interface, and the navy-on-navy versions had no contrast
  against `--bg`.

## Known gaps

- `src/index.html` still carries `noindex, nofollow`. That is a launch decision,
  not a branding one, and was left alone.
- No Open Graph or Twitter card image. The display cut is the asset for it.
- `npm run lint:css` fails — no stylelint config exists in the repo.
