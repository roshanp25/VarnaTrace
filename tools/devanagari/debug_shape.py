"""Standalone diagnostic: visualize a single shape's outline, its detected
tips, the two split chains, and the resulting averaged centerline — to debug
why extract_centerline() might zigzag on a particular shape."""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from geometry import extract_centerline, farthest_pair, split_loop_into_two_chains, resample_by_arc_length
from svg_path import flatten_path

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO_ROOT / "development" / "source-data" / "wikimedia-devanagari"
NS = {"svg": "http://www.w3.org/2000/svg", "inkscape": "http://www.inkscape.org/namespaces/inkscape"}


def main(svg_file, frame_label, slot):
    tree = ET.parse(SOURCE_DIR / svg_file)
    root = tree.getroot()
    for g in root.findall("svg:g", NS):
        if g.get("{http://www.inkscape.org/namespaces/inkscape}label") == frame_label:
            paths = g.findall("svg:path", NS)
            d = paths[int(slot)].get("d")
            break
    else:
        raise SystemExit("frame not found")

    outline = flatten_path(d)[0]
    pts = outline[:-1] if outline[0] == outline[-1] else outline
    i, j = farthest_pair(pts)
    chain_a, chain_b = split_loop_into_two_chains(outline, i, j)
    centerline = extract_centerline(outline, sample_count=40)

    minx = min(p[0] for p in pts) - 1
    miny = min(p[1] for p in pts) - 1
    maxx = max(p[0] for p in pts) + 1
    maxy = max(p[1] for p in pts) + 1
    w, h = maxx - minx, maxy - miny
    scale = 500 / max(w, h)

    def tx(p):
        return ((p[0] - minx) * scale, (p[1] - miny) * scale)

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w*scale:.0f} {h*scale:.0f}" width="600">']
    parts.append(f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x,y in map(tx, pts))}" fill="#eee" stroke="#999" stroke-width="1"/>')

    def path_of(chain, color):
        d2 = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in map(tx, chain))
        return f'<path d="{d2}" fill="none" stroke="{color}" stroke-width="2"/>'

    parts.append(path_of(chain_a, "blue"))
    parts.append(path_of(chain_b, "green"))
    parts.append(path_of(centerline, "red"))
    for idx, p in enumerate(pts):
        x, y = tx(p)
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2" fill="black"/>')
        parts.append(f'<text x="{x+2:.1f}" y="{y-2:.1f}" font-size="8">{idx}</text>')
    tix, tiy = tx(pts[i])
    tjx, tjy = tx(pts[j])
    parts.append(f'<circle cx="{tix:.1f}" cy="{tiy:.1f}" r="5" fill="orange"/>')
    parts.append(f'<circle cx="{tjx:.1f}" cy="{tjy:.1f}" r="5" fill="purple"/>')
    parts.append("</svg>")

    out = REPO_ROOT / "development" / "debug" / f"shape-{frame_label}-{slot}.svg"
    out.write_text("\n".join(parts), encoding="utf-8")
    print(f"wrote {out}")
    print(f"tips: i={i} {pts[i]} j={j} {pts[j]}")
    print(f"chain_a len={len(chain_a)} chain_b len={len(chain_b)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
