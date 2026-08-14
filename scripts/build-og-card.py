#!/usr/bin/env python3
"""
Render the link-preview card from the wordmark.

    python3 scripts/build-og-card.py

Writes public/og-card.png at 1200x630, the size every unfurler crops to.

A share button that produces a bare URL is a share button nobody uses: the
score copies to the clipboard as block characters, and what lands in iMessage
or Slack is an unadorned link with no title and no picture. The card is what
makes a shared score look like something worth tapping.

Drawn with Pillow rather than an SVG engine on purpose. There is no SVG
delegate on this machine - ImageMagick's is wired to rsvg-convert, which is not
installed, and its internal renderer refuses the file - but the wordmark is
plain shapes inside three translated groups, so rendering it exactly needs
arithmetic and nothing else. No fonts are loaded and no text is drawn, which is
also why this cannot drift from the brand: every pixel comes from the same
logo.svg the site ships.

Two shape types, which is worth saying because the first version of this read
only rectangles: "TODAY IN" and the tagline are rects, and "SPORTS" is ninety
circles. The card rendered cleanly with the middle line simply absent. Hence
the count check below - a shape the reader does not understand is an error,
never a silent omission.
"""

import os
import re
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LOGO = os.path.join(ROOT, "public", "brand", "logo.svg")
OUT = os.path.join(ROOT, "public", "og-card.png")

# The card, at the size Slack, iMessage, X and Facebook all crop toward.
WIDTH, HEIGHT = 1200, 630

# Straight from src/styles.scss - the dark around the board, the panel face,
# the lit rim, and the lamp amber.
BG = "#070b11"
BOARD = "#131a22"
BORDER = "#232d3a"
BEZEL = "#333d49"
AMBER = "#f5a524"

# Rendered at 3x and downsampled, because the wordmark is built from 5px cells
# whose edges land on fractional pixels at final size.
SUPERSAMPLE = 3

# The board inset inside the card, and the wordmark inset inside the board.
BOARD_MARGIN = 48
LOGO_WIDTH_FRACTION = 0.74

# The amber rule under the wordmark.
RULE_GAP = 30
RULE_HEIGHT = 4
RULE_WIDTH_FRACTION = 0.44


def _shapes(svg_path):
    """
    Every shape in the wordmark as a bounding box, in the SVG's coordinates.

    A circle becomes its bounding box because the cells are two pixels across
    at final size, where a box and a disc are the same handful of pixels.
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()
    ns = "{http://www.w3.org/2000/svg}"

    view = [float(v) for v in root.get("viewBox").split()]
    out, seen = [], 0

    for group in root.iter(f"{ns}g"):
        transform = group.get("transform") or ""
        match = re.search(r"translate\(([-\d.]+)[ ,]+([-\d.]+)\)", transform)
        dx, dy = (float(match.group(1)), float(match.group(2))) if match else (0.0, 0.0)

        for shape in group:
            tag = shape.tag.replace(ns, "")
            fill = shape.get("fill") or "#ffffff"
            seen += 1

            if tag == "rect":
                out.append((
                    float(shape.get("x", 0)) + dx,
                    float(shape.get("y", 0)) + dy,
                    float(shape.get("width", 0)),
                    float(shape.get("height", 0)),
                    fill, tag,
                ))
            elif tag == "circle":
                cx, cy = float(shape.get("cx", 0)), float(shape.get("cy", 0))
                r = float(shape.get("r", 0))
                out.append((cx - r + dx, cy - r + dy, r * 2, r * 2, fill, tag))
            else:
                raise SystemExit(
                    f"{svg_path}: unhandled shape <{tag}>. Add it rather than "
                    f"letting the card render without it.")

    if len(out) != seen:
        raise SystemExit(f"dropped {seen - len(out)} shapes")
    return out, view[2], view[3]


def build():
    shapes, logo_w, logo_h = _shapes(LOGO)

    scale = SUPERSAMPLE
    card = Image.new("RGB", (WIDTH * scale, HEIGHT * scale), BG)
    draw = ImageDraw.Draw(card)

    # The board: a panel face with a lit top edge, the way the site draws one.
    margin = BOARD_MARGIN * scale
    draw.rectangle([margin, margin, WIDTH * scale - margin, HEIGHT * scale - margin],
                   fill=BOARD, outline=BORDER, width=2 * scale)
    draw.line([margin, margin, WIDTH * scale - margin, margin],
              fill=BEZEL, width=3 * scale)

    # The wordmark with the amber rule under it, centred as one block. Centring
    # the wordmark alone left the rule stranded near the bottom edge.
    target_w = WIDTH * scale * LOGO_WIDTH_FRACTION
    k = target_w / logo_w
    # Measured from the shapes, not the viewBox: the viewBox carries trailing
    # whitespace below the tagline, so a gap measured from its bottom edge left
    # the rule stranded near the card's own border.
    content_top = min(y for _, y, _, _, _, _ in shapes)
    content_bottom = max(y + h for _, y, _, h, _, _ in shapes)
    content_h = content_bottom - content_top

    gap = RULE_GAP * scale
    rule_h = RULE_HEIGHT * scale
    block_h = content_h * k + gap + rule_h

    offset_x = (WIDTH * scale - logo_w * k) / 2
    offset_y = (HEIGHT * scale - block_h) / 2 - content_top * k

    for x, y, w, h, fill, tag in shapes:
        x0, y0 = offset_x + x * k, offset_y + y * k
        box = [x0, y0, x0 + w * k, y0 + h * k]
        if tag == "circle":
            draw.ellipse(box, fill=fill)
        else:
            draw.rectangle(box, fill=fill)

    rule_y = offset_y + content_bottom * k + gap
    rule_half = target_w * RULE_WIDTH_FRACTION / 2
    draw.rectangle([WIDTH * scale / 2 - rule_half, rule_y,
                    WIDTH * scale / 2 + rule_half, rule_y + rule_h],
                   fill=AMBER)

    card = card.resize((WIDTH, HEIGHT), Image.LANCZOS)
    card.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({os.path.getsize(OUT) // 1024} KB, "
          f"{WIDTH}x{HEIGHT}, {len(shapes)} shapes)")


if __name__ == "__main__":
    build()
