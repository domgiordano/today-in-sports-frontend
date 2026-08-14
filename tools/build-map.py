"""Build the demo map from real geography.

The landing reel's "find the place" card used a CSS grid standing in for a map,
which read as an empty box rather than as a map. This renders actual country
and state outlines instead, projected equirectangularly so a latitude and
longitude convert to a position with two divisions and no library.

Input is fetched once and cached beside this script:

  countries: https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json
  us states: https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json

Usage: python3 tools/build-map.py <geojson-dir> <out-dir>
"""

import json
import pathlib
import sys

# The whole world, equirectangular. The card zooms into the answer on reveal,
# which is what lets the map be a world map and the pins still be legible when
# they are a few hundred kilometres apart.
LON0, LON1 = -180.0, 180.0
LAT0, LAT1 = 90.0, -90.0         # top, bottom
W = LON1 - LON0                  # 360 degrees
H = LAT0 - LAT1                  # 180 degrees

SEA    = "#0d131a"
LAND   = "#1c2836"
BORDER = "#44576d"
STATE  = "#303d4c"
CITY   = "#9dabbb"


def project(lon, lat):
    return (lon - LON0), (LAT0 - lat)


def rings(geom):
    """Every ring in a Polygon or MultiPolygon, outer rings only."""
    t = geom.get("type")
    if t == "Polygon":
        return [geom["coordinates"][0]]
    if t == "MultiPolygon":
        return [poly[0] for poly in geom["coordinates"]]
    return []


def ring_path(ring, precision=1):
    """
    One ring as an SVG path, dropping points that repeat after rounding.

    A tenth of a degree is about eleven kilometres, which is finer than a world
    map at this size can draw and cuts the file to a third of its size. Rounding
    is what does the simplifying: coincident points collapse and are dropped.
    """
    out, last = [], None
    for lon, lat in ring:
        x, y = project(lon, lat)
        p = (round(x, precision), round(y, precision))
        if p == last:
            continue
        out.append(p)
        last = p
    if len(out) < 3:
        return None
    head = f"M{out[0][0]} {out[0][1]}"
    body = "".join(f"L{x} {y}" for x, y in out[1:])
    return head + body + "Z"


def visible(ring):
    """Everything is in view on a world map; the filter stays for smaller views."""
    return True


def paths_from(collection):
    out = []
    for feature in collection["features"]:
        for ring in rings(feature.get("geometry") or {}):
            if not visible(ring):
                continue
            d = ring_path(ring)
            if d:
                out.append(d)
    return out


# A handful of anchors, so the shape is recognisable as a place and not just a
# coastline. Coordinates are the city centres.
CITIES = [
    ("New York",     40.71,  -74.01),
    ("Los Angeles",  34.05, -118.24),
    ("Mexico City",  19.43,  -99.13),
    ("Sao Paulo",   -23.55,  -46.63),
    ("London",       51.51,   -0.13),
    ("Lagos",         6.52,    3.38),
    ("Johannesburg",-26.20,   28.05),
    ("Moscow",       55.76,   37.62),
    ("Mumbai",       19.08,   72.88),
    ("Tokyo",        35.68,  139.69),
    ("Sydney",      -33.87,  151.21),
]


def build(geo_dir: pathlib.Path) -> str:
    countries = json.loads((geo_dir / "countries.geo.json").read_text())
    states = json.loads((geo_dir / "us-states.json").read_text())

    land = paths_from(countries)
    state_lines = paths_from(states)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:g}" '
        f'preserveAspectRatio="none" role="img" aria-label="World map">',
        '<title>World</title>',
        f'<rect x="0" y="0" width="{W:g}" height="{H:g}" fill="{SEA}"/>',
        # Landmass first, then state lines over it, then national borders on top.
        f'<g fill="{LAND}" stroke="none">',
        *(f'<path d="{d}"/>' for d in land),
        '</g>',
        f'<g fill="none" stroke="{STATE}" stroke-width="0.25">',
        *(f'<path d="{d}"/>' for d in state_lines),
        '</g>',
        f'<g fill="none" stroke="{BORDER}" stroke-width="0.4">',
        *(f'<path d="{d}"/>' for d in land),
        '</g>',
        f'<g fill="{CITY}">',
    ]
    for name, lat, lon in CITIES:
        x, y = project(lon, lat)
        parts.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="0.45"/>')
        parts.append(
            f'<text x="{x + 1.6:.2f}" y="{y + 0.9:.2f}" font-size="1.7" '
            f'font-family="ui-sans-serif,system-ui,sans-serif" fill="{CITY}">{name}</text>')
    parts.append('</g>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n"


geo_dir = pathlib.Path(sys.argv[1])
out_dir = pathlib.Path(sys.argv[2])
svg = build(geo_dir)
(out_dir / "world.svg").write_text(svg)
print(f"world.svg {len(svg)} bytes")
