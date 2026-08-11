"""Diagnostic pass over a Wikimedia Devanagari stroke-order SVG.

Prints frame groups, per-shape reveal state, start markers, and arrows, so
the structural assumptions the importer relies on can be checked against the
actual file instead of asserted by eye. Read-only; writes nothing.
"""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape"
NS = {"svg": SVG_NS, "inkscape": INKSCAPE_NS}


def local_tag(el):
    return el.tag.split("}")[-1]


def get_translate(el):
    t = el.get("transform", "")
    if t.startswith("translate("):
        parts = t[len("translate("):-1].split(",")
        return float(parts[0]), float(parts[1])
    return 0.0, 0.0


def is_gray(path_el):
    style = path_el.get("style", "")
    return "fill:#c8c8c8" in style


def main(svg_path: str):
    tree = ET.parse(svg_path)
    root = tree.getroot()

    frame_groups = []
    for g in root.findall("svg:g", NS):
        label = g.get(f"{{{INKSCAPE_NS}}}label")
        if label is not None and label.isdigit():
            frame_groups.append((int(label), g))
    frame_groups.sort(key=lambda pair: pair[0])

    print(f"Found {len(frame_groups)} frame groups: {[n for n, _ in frame_groups]}")

    per_frame_paths = []
    for n, g in frame_groups:
        tx, ty = get_translate(g)
        paths = g.findall("svg:path", NS)
        gray = [is_gray(p) for p in paths]
        print(f"\nFrame {n}: translate=({tx:.4f},{ty:.4f}) paths={len(paths)}")
        for idx, (p, gy) in enumerate(zip(paths, gray)):
            d_head = p.get("d", "")[:40]
            print(f"  [{idx}] id={p.get('id')} gray={gy} d[:40]={d_head!r}")
        per_frame_paths.append((n, tx, ty, paths, gray))

    print("\n--- Reveal analysis (slot index -> frame it turns black) ---")
    n_slots = len(per_frame_paths[0][3])
    for slot in range(n_slots):
        reveal_frame = None
        for n, tx, ty, paths, gray in per_frame_paths:
            if not gray[slot]:
                reveal_frame = n
                break
        print(f"slot {slot} (id in frame1={per_frame_paths[0][3][slot].get('id')}): reveal_frame={reveal_frame}")

    print("\n--- Start markers ---")
    for g in root.findall("svg:g", NS):
        label = g.get(f"{{{INKSCAPE_NS}}}label")
        if label == "Start markers":
            for c in g.findall("svg:circle", NS):
                print(f"  circle id={c.get('id')} cx={c.get('cx')} cy={c.get('cy')}")

    print("\n--- Arrow groups ---")
    for g in root.findall("svg:g", NS):
        label = g.get(f"{{{INKSCAPE_NS}}}label")
        if label == "Arrows":
            parent_tx, parent_ty = get_translate(g)
            print(f"Arrows group translate=({parent_tx:.4f},{parent_ty:.4f})")
            for child in g.findall("svg:g", NS):
                ctx, cty = get_translate(child)
                gx, gy = parent_tx + ctx, parent_ty + cty
                # bbox of all path 'd' points roughly via first path's raw text (cheap heuristic)
                print(f"  arrow group id={child.get('id')} local_translate=({ctx:.4f},{cty:.4f}) net_offset=({gx:.4f},{gy:.4f})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "development/source-data/wikimedia-devanagari/devanagari_a_stroke_order.svg")
