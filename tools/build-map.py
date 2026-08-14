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

# The view: North America, wide enough to read as a continent and tight enough
# that state borders and a few hundred kilometres are both legible.
LON0, LON1 = -130.0, -60.0
LAT0, LAT1 = 55.0, 25.0          # top, bottom
W = LON1 - LON0                  # 70 degrees
H = LAT0 - LAT1                  # 30 degrees

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


def ring_path(ring, precision=2):
    """One ring as an SVG path, dropping points that repeat after rounding."""
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
    """Keep rings with any point near the view; the rest are dead weight."""
    pad = 25
    for lon, lat in ring:
        if LON0 - pad <= lon <= LON1 + pad and LAT1 - pad <= lat <= LAT0 + pad:
            return True
    return False


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
    ("New York",    40.71,  -74.01),
    ("Chicago",     41.88,  -87.63),
    ("Los Angeles", 34.05, -118.24),
    ("Denver",      39.74, -104.99),
    ("Toronto",     43.65,  -79.38),
    ("Atlanta",     33.75,  -84.39),
]


def build(geo_dir: pathlib.Path) -> str:
    countries = json.loads((geo_dir / "countries.geo.json").read_text())
    states = json.loads((geo_dir / "us-states.json").read_text())

    land = paths_from(countries)
    state_lines = paths_from(states)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:g}" '
        f'preserveAspectRatio="none" role="img" aria-label="Map of North America">',
        '<title>North America</title>',
        f'<rect x="0" y="0" width="{W:g}" height="{H:g}" fill="{SEA}"/>',
        # Landmass first, then state lines over it, then national borders on top.
        f'<g fill="{LAND}" stroke="none">',
        *(f'<path d="{d}"/>' for d in land),
        '</g>',
        f'<g fill="none" stroke="{STATE}" stroke-width="0.09">',
        *(f'<path d="{d}"/>' for d in state_lines),
        '</g>',
        f'<g fill="none" stroke="{BORDER}" stroke-width="0.16">',
        *(f'<path d="{d}"/>' for d in land),
        '</g>',
        f'<g fill="{CITY}">',
    ]
    for name, lat, lon in CITIES:
        x, y = project(lon, lat)
        parts.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="0.22"/>')
        parts.append(
            f'<text x="{x + 0.5:.2f}" y="{y + 0.25:.2f}" font-size="0.85" '
            f'font-family="ui-sans-serif,system-ui,sans-serif" fill="{CITY}">{name}</text>')
    parts.append('</g>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n"


geo_dir = pathlib.Path(sys.argv[1])
out_dir = pathlib.Path(sys.argv[2])
svg = build(geo_dir)
(out_dir / "map-na.svg").write_text(svg)
print(f"map-na.svg {len(svg)} bytes")
