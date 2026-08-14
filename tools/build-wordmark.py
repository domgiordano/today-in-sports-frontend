"""Build the wordmark as geometry.

The lockup is a scoreboard: TODAY IN in solid lamps, SPORTS in round ones. Both
are drawn from a 5x7 cell grid, so the whole thing is circles and squares and
stays sharp at any size — which a 534px crop of the master sheet does not.
"""

F = {
    'A': ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    'D': ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    'E': ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    'I': ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    'N': ["10001", "11001", "10101", "10101", "10011", "10001", "10001"],
    'O': ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    'P': ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    'Q': ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    'R': ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    'S': ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    'T': ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    'U': ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    'V': ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    'Y': ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    '5': ["11111", "10000", "10000", "11110", "00001", "10001", "01110"],
    '.': ["00", "00", "00", "00", "00", "11", "11"],
    ' ': ["00", "00", "00", "00", "00", "00", "00"],
}


def measure(text, pitch, gap):
    w = 0
    for ch in text:
        w += len(F[ch][0]) * pitch + gap
    return w - gap


def draw(text, x, y, pitch, colour, round_=True, gap=None, glyph=0.86):
    """Emit cells for `text` with its top-left at (x, y)."""
    gap = pitch if gap is None else gap
    out, cx = [], x
    for ch in text:
        rows = F[ch]
        for r, row in enumerate(rows):
            for c, bit in enumerate(row):
                if bit != "1":
                    continue
                px, py = cx + c * pitch, y + r * pitch
                if round_:
                    rr = pitch * glyph / 2
                    out.append(
                        f'<circle cx="{px + pitch/2:.2f}" cy="{py + pitch/2:.2f}" '
                        f'r="{rr:.2f}" fill="{colour}"/>')
                else:
                    s = pitch * glyph
                    o = (pitch - s) / 2
                    out.append(
                        f'<rect x="{px + o:.2f}" y="{py + o:.2f}" '
                        f'width="{s:.2f}" height="{s:.2f}" fill="{colour}"/>')
        cx += len(rows[0]) * pitch + gap
    return out


CHALK, AMBER, RED = "#eef2f7", "#f5a524", "#d6212f"


def streaks(x, y, w, colour, flip=False):
    """The three speed marks from the master sheet."""
    out = []
    for i, (dy, ln) in enumerate([(0, 1.0), (7, .72), (14, .46)]):
        lw = w * ln
        sx = x + (w - lw) if flip else x
        out.append(f'<rect x="{sx:.1f}" y="{y + dy}" width="{lw:.1f}" height="4" '
                   f'rx="2" fill="{colour}"/>')
    return out


# ------------------------------------------------------------------ horizontal
def horizontal():
    P_SM, P_LG = 5, 11
    top = draw("TODAY IN", 0, 0, P_SM, CHALK, round_=False)
    w_top = measure("TODAY IN", P_SM, P_SM)
    big = draw("SPORTS", 0, 0, P_LG, AMBER)
    w_big = measure("SPORTS", P_LG, P_LG)

    # Tight: this one sits inline in a 30px bar, so padding inside the viewBox
    # is height the glyphs do not get. Whitespace around it is the bar's job.
    pad = 7
    gapx = 20
    inner_w = w_top + gapx + w_big
    h_top, h_big = 7 * P_SM, 7 * P_LG
    W = inner_w + pad * 2
    H = h_big + pad * 2

    ty = pad + (h_big - h_top) / 2
    body = []
    body += [f'<g transform="translate({pad},{ty})">' + "".join(top) + '</g>']
    body += [f'<g transform="translate({pad + w_top + gapx},{pad})">' + "".join(big) + '</g>']
    # Red rule under TODAY IN — the trim colour, carried into the mark itself.
    body += [f'<rect x="{pad}" y="{ty + h_top + 7:.1f}" width="{w_top}" height="5" rx="2.5" fill="{RED}"/>']

    return svg(W, H, body)


# --------------------------------------------------------------------- stacked
def stacked():
    P_SM, P_LG, P_TAG = 6, 16, 4
    top = draw("TODAY IN", 0, 0, P_SM, CHALK, round_=False)
    w_top = measure("TODAY IN", P_SM, P_SM)
    big = draw("SPORTS", 0, 0, P_LG, AMBER)
    w_big = measure("SPORTS", P_LG, P_LG)
    tag = draw("5 QUESTIONS. EVERY DAY.", 0, 0, P_TAG, CHALK, round_=False)
    w_tag = measure("5 QUESTIONS. EVERY DAY.", P_TAG, P_TAG)

    pad = 34
    inner_w = max(w_top, w_big, w_tag + 44)
    W = inner_w + pad * 2

    y1 = pad
    y2 = y1 + 7 * P_SM + 22
    y3 = y2 + 7 * P_LG + 26
    H = y3 + 7 * P_TAG + 18 + pad

    cx = lambda w: pad + (inner_w - w) / 2
    body = []
    body.append(f'<g transform="translate({cx(w_top):.1f},{y1})">' + "".join(top) + '</g>')
    body.append(f'<g transform="translate({cx(w_big):.1f},{y2})">' + "".join(big) + '</g>')

    # The sheet flanks this with speed marks, but at the width the pill needs
    # they collapse into three specks. The pill carries the red on its own.
    pill_w = w_tag + 40
    pill_x = cx(pill_w)
    pill_y = y3 - 9
    pill_h = 7 * P_TAG + 18

    body.append(f'<rect x="{pill_x:.1f}" y="{pill_y}" width="{pill_w}" height="{pill_h}" '
                f'rx="{pill_h/2:.1f}" fill="{RED}"/>')
    body.append(f'<g transform="translate({cx(w_tag):.1f},{y3})">' + "".join(tag) + '</g>')

    return svg(W, H, body)


# ------------------------------------------------------------------ TIS mark
def icon():
    """The compact mark for the toolbar.

    Not the wordmark shrunk down — a different object, so a page showing the
    hero board is not showing the same lockup twice. Five lamps for five
    questions, and the red I from the master sheet.
    """
    P = 9
    letters = [("T", CHALK), ("I", RED), ("S", CHALK)]
    gap = P
    w_letters = sum(len(F[c][0]) * P for c, _ in letters) + gap * (len(letters) - 1)
    lamp_r = P * 0.40
    pad = 5
    lamp_y = pad
    letters_y = lamp_y + lamp_r * 2 + P * 0.9
    W = w_letters + pad * 2
    H = letters_y + 7 * P + pad

    body = []
    for i in range(5):
        cx = pad + w_letters * (i + 0.5) / 5
        body.append(f'<circle cx="{cx:.2f}" cy="{lamp_y + lamp_r:.2f}" '
                    f'r="{lamp_r:.2f}" fill="{AMBER}"/>')
    x = pad
    for ch, col in letters:
        body += draw(ch, x, letters_y, P, col)
        x += len(F[ch][0]) * P + gap
    return svg(W, H, body)


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
            f'width="{w:.0f}" height="{h:.0f}" role="img" '
            f'aria-label="Today in Sports">\n<title>Today in Sports</title>\n'
            + "\n".join(body) + "\n</svg>\n")


import pathlib, sys
out = pathlib.Path(sys.argv[1])
for name, fn in (("wordmark.svg", horizontal), ("logo.svg", stacked), ("icon.svg", icon)):
    body = fn()
    (out / name).write_text(body)
    print(f"{name:<14} {len(body)} bytes")
