"""Converts a Wikimedia Commons Devanagari stroke-order SVG into the app's
CharacterContent.strokes format (ordered centerline point arrays).

Source SVG structure (as authored by Wikimedia Commons user Saurmandal, the
convention used across the "Devanagari <letter> stroke order.svg" series):

  - N sibling <g inkscape:label="1">..<g inkscape:label="N"> groups, laid out
    left-to-right, each a full rendering of the character at build-stage k:
    the first k strokes solid (black), the remaining strokes light gray
    (style contains "fill:#c8c8c8"). Frame N (the last) is fully solid.
  - Every frame group has the same number of <path> children, in the same
    order, with IDENTICAL `d` data across frames (only the fill/opacity
    styling differs) — the glyph doesn't move, only the highlighting does.
  - A "Start markers" group with one <circle> per stroke, positioned (in
    top-level SVG coordinates) over that stroke's starting point.
  - An "Arrows" group with small hand-drawn direction-indicator glyphs,
    used here only for debug-visualization cross-checking, not as the
    primary direction source (start markers + reveal order are enough to
    fix orientation deterministically).

This script recovers, per stroke: which path shape(s) belong to it (via the
gray->black reveal transition between consecutive frames), their true
drawing order (frame index), and their direction (via proximity to the
stroke's start marker) — then converts each shape from a *filled outline* to
a *centerline* by pairing its two boundary chains and averaging them.

Usage:
    python tools/devanagari/import_stroke_order.py <character-key>
"""
from __future__ import annotations

import json
import math
import sys
import xml.etree.ElementTree as ET
from datetime import date, timezone
from pathlib import Path

from geometry import (
    dedupe_near_points,
    dist,
    extract_centerline,
    path_length,
    smooth_moving_average,
)
from svg_path import flatten_path

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO_ROOT / "development" / "source-data" / "wikimedia-devanagari"
DEBUG_DIR = REPO_ROOT / "development" / "debug"
CONTENT_FILE = REPO_ROOT / "src" / "content" / "hindi" / "vowels.json"
ATTRIBUTION_FILE = REPO_ROOT / "src" / "content" / "hindi" / "source-attribution.json"

SVG_NS = "http://www.w3.org/2000/svg"
INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape"
NS = {"svg": SVG_NS, "inkscape": INKSCAPE_NS}

VIEW_BOX_SIZE = 300
MARGIN_FRACTION = 0.15  # fraction of the 300 box left empty on each side at minimum


CHARACTERS = {
    "a": {
        "id": "hi-vowel-a",
        "display_label": "अ",
        "svg_file": "devanagari_a_stroke_order.svg",
        "wikimedia_url": "https://commons.wikimedia.org/wiki/File:Devanagari_%E0%A4%85_stroke_order.svg",
        "author": "Saurmandal",
        "license": "CC BY-SA 3.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/3.0/",
    },
}


def get_translate(el):
    t = el.get("transform", "")
    if t.startswith("translate("):
        parts = t[len("translate("):-1].split(",")
        return float(parts[0]), float(parts[1])
    return 0.0, 0.0


def is_gray(path_el):
    return "fill:#c8c8c8" in path_el.get("style", "")


def parse_frames(root):
    frames = []
    for g in root.findall("svg:g", NS):
        label = g.get(f"{{{INKSCAPE_NS}}}label")
        if label is not None and label.isdigit():
            tx, ty = get_translate(g)
            paths = g.findall("svg:path", NS)
            frames.append({
                "n": int(label),
                "tx": tx,
                "ty": ty,
                "path_ids": [p.get("id") for p in paths],
                "d": [p.get("d") for p in paths],
                "gray": [is_gray(p) for p in paths],
            })
    frames.sort(key=lambda f: f["n"])
    return frames


def parse_start_markers(root):
    markers = []
    for g in root.findall("svg:g", NS):
        if g.get(f"{{{INKSCAPE_NS}}}label") == "Start markers":
            for c in g.findall("svg:circle", NS):
                markers.append((float(c.get("cx")), float(c.get("cy"))))
    return markers


def compute_stroke_groups(frames):
    """Returns list of stroke groups (1 per frame, in frame order), each a
    list of shape-slot indices that newly turned black in that frame."""
    n_slots = len(frames[0]["d"])
    for f in frames:
        if len(f["d"]) != n_slots:
            raise ValueError(
                f"Frame {f['n']} has {len(f['d'])} shapes, expected {n_slots} "
                "— frame groups must have matching shape counts. NEEDS_REVIEW."
            )

    previously_black = set()
    groups = []
    for f in frames:
        black_now = {i for i in range(n_slots) if not f["gray"][i]}
        newly_black = sorted(black_now - previously_black)
        if not newly_black:
            raise ValueError(
                f"Frame {f['n']} reveals no new shapes versus the previous frame "
                "— reveal order is ambiguous. NEEDS_REVIEW."
            )
        groups.append(newly_black)
        previously_black = black_now

    if previously_black != set(range(n_slots)):
        missing = set(range(n_slots)) - previously_black
        raise ValueError(f"Shapes {missing} never turn black in any frame. NEEDS_REVIEW.")

    return groups


def shape_outline_points(d_string):
    subpaths = flatten_path(d_string)
    if len(subpaths) != 1:
        raise ValueError(
            f"Expected exactly one closed subpath per stroke shape, got {len(subpaths)}. "
            "NEEDS_REVIEW."
        )
    return subpaths[0]


def assign_marker_to_frame(marker_global, frames, stroke_groups):
    """Finds which frame's newly-revealed shapes this marker sits closest to,
    in that frame's local (untranslated) coordinate space."""
    best = (None, math.inf)
    for f, group in zip(frames, stroke_groups):
        local = (marker_global[0] - f["tx"], marker_global[1] - f["ty"])
        # bbox (with padding) of just the newly-revealed shapes in this frame
        pts = []
        for slot in group:
            pts.extend(shape_outline_points(f["d"][slot]))
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        pad = 1.5
        lo_x, hi_x = min(xs) - pad, max(xs) + pad
        lo_y, hi_y = min(ys) - pad, max(ys) + pad
        if lo_x <= local[0] <= hi_x and lo_y <= local[1] <= hi_y:
            # inside this frame's revealed-shape bbox — distance 0 (exact match)
            return f["n"], local
        # otherwise track nearest bbox edge distance as a fallback
        dx = max(lo_x - local[0], 0, local[0] - hi_x)
        dy = max(lo_y - local[1], 0, local[1] - hi_y)
        d = math.hypot(dx, dy)
        if d < best[1]:
            best = (f["n"], d)
    if best[0] is None:
        raise ValueError("Could not assign start marker to any frame. NEEDS_REVIEW.")
    f = next(fr for fr in frames if fr["n"] == best[0])
    return best[0], (marker_global[0] - f["tx"], marker_global[1] - f["ty"])


def chain_shapes_for_stroke(shape_centerlines, start_local):
    """Greedily chains 1+ unoriented shape centerlines into a single ordered
    polyline, starting from whichever shape endpoint is nearest `start_local`."""
    remaining = list(shape_centerlines)

    # pick the starting shape + orientation
    best = (None, None, math.inf)  # (shape_idx, reversed?, distance)
    for idx, cl in enumerate(remaining):
        d_start = dist(cl[0], start_local)
        d_end = dist(cl[-1], start_local)
        if d_start < best[2]:
            best = (idx, False, d_start)
        if d_end < best[2]:
            best = (idx, True, d_end)

    idx, rev, _ = best
    first = remaining.pop(idx)
    if rev:
        first = list(reversed(first))
    chain = list(first)

    while remaining:
        tail = chain[-1]
        best = (None, None, math.inf)
        for idx, cl in enumerate(remaining):
            d_start = dist(cl[0], tail)
            d_end = dist(cl[-1], tail)
            if d_start < best[2]:
                best = (idx, False, d_start)
            if d_end < best[2]:
                best = (idx, True, d_end)
        idx, rev, _ = best
        nxt = remaining.pop(idx)
        if rev:
            nxt = list(reversed(nxt))
        chain.extend(nxt)

    return chain


def adaptive_sample_count(points):
    length = path_length(points)
    return max(8, min(80, round(length * 2)))


def make_normalize_transform(strokes, view_box_size=VIEW_BOX_SIZE, margin_fraction=MARGIN_FRACTION):
    all_points = [p for stroke in strokes for p in stroke]
    xs = [p[0] for p in all_points]
    ys = [p[1] for p in all_points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w, h = max_x - min_x, max_y - min_y

    inner = view_box_size * (1 - 2 * margin_fraction)
    scale = min(inner / w, inner / h)

    scaled_w, scaled_h = w * scale, h * scale
    offset_x = (view_box_size - scaled_w) / 2
    offset_y = (view_box_size - scaled_h) / 2

    def transform(p, round_digits=2):
        x = offset_x + (p[0] - min_x) * scale
        y = offset_y + (p[1] - min_y) * scale
        return (round(x, round_digits), round(y, round_digits))

    return transform


def normalize_strokes(strokes, view_box_size=VIEW_BOX_SIZE, margin_fraction=MARGIN_FRACTION):
    transform = make_normalize_transform(strokes, view_box_size, margin_fraction)
    return [[transform(p) for p in stroke] for stroke in strokes], transform


def build_strokes(svg_path: Path):
    tree = ET.parse(svg_path)
    root = tree.getroot()

    frames = parse_frames(root)
    if len(frames) < 1:
        raise ValueError("No numbered frame groups found. NEEDS_REVIEW.")

    stroke_groups = compute_stroke_groups(frames)
    markers = parse_start_markers(root)
    if len(markers) != len(stroke_groups):
        raise ValueError(
            f"Found {len(markers)} start markers but {len(stroke_groups)} strokes "
            "(one marker per stroke expected). NEEDS_REVIEW."
        )

    # Assign each marker to the frame/stroke whose revealed shapes it sits over.
    marker_by_stroke = {}
    for marker in markers:
        frame_n, local = assign_marker_to_frame(marker, frames, stroke_groups)
        stroke_idx = frame_n - 1  # frames are 1-based, stroke groups are 0-based in list order
        if stroke_idx in marker_by_stroke:
            raise ValueError(
                f"Stroke {stroke_idx + 1} received more than one start marker. NEEDS_REVIEW."
            )
        marker_by_stroke[stroke_idx] = local

    final_frame_d = frames[-1]["d"]  # geometry is frame-invariant; use the fully-solid frame's text

    strokes_local = []
    diagnostics = []
    for stroke_idx, group in enumerate(stroke_groups):
        if stroke_idx not in marker_by_stroke:
            raise ValueError(f"Stroke {stroke_idx + 1} has no assigned start marker. NEEDS_REVIEW.")
        start_local = marker_by_stroke[stroke_idx]

        shape_centerlines = []
        for slot in group:
            outline = shape_outline_points(final_frame_d[slot])
            centerline = extract_centerline(outline, sample_count=40)
            shape_centerlines.append(centerline)

        chained = chain_shapes_for_stroke(shape_centerlines, start_local)
        chained = smooth_moving_average(chained, window=5)
        n = adaptive_sample_count(chained)
        from geometry import resample_by_arc_length
        resampled = resample_by_arc_length(chained, n)
        resampled = dedupe_near_points(resampled, min_gap=0.05)

        strokes_local.append(resampled)
        diagnostics.append({
            "stroke": stroke_idx + 1,
            "shape_slots": group,
            "start_marker_local": start_local,
            "point_count": len(resampled),
            "start_point": resampled[0],
            "end_point": resampled[-1],
        })

    return strokes_local, diagnostics, frames, stroke_groups


def write_debug_svg(frames, strokes_local, diagnostics, transform, out_path: Path):
    colors = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6"]

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_BOX_SIZE} {VIEW_BOX_SIZE}" width="600" height="600">']
    parts.append(f'<rect x="0" y="0" width="{VIEW_BOX_SIZE}" height="{VIEW_BOX_SIZE}" fill="white"/>')

    # Faint copy of the original (final, fully-solid) frame's shapes as visual
    # reference, remapped through the same normalize transform as the strokes
    # so both are drawn in the same 0-300 coordinate space.
    final_frame = frames[-1]
    parts.append('<g fill="#ccc" stroke="none" opacity="0.8">')
    for d_string in final_frame["d"]:
        outline = shape_outline_points(d_string)
        norm = [transform(p) for p in outline]
        poly = " ".join(f"{x:.2f},{y:.2f}" for x, y in norm)
        parts.append(f'<polygon points="{poly}"/>')
    parts.append("</g>")

    # normalized (0-300) strokes for this visualization
    strokes = [[transform(p) for p in stroke] for stroke in strokes_local]

    for i, (stroke, diag) in enumerate(zip(strokes, diagnostics)):
        color = colors[i % len(colors)]
        d = "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in stroke)
        parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round"/>')
        sx, sy = stroke[0]
        ex, ey = stroke[-1]
        parts.append(f'<circle cx="{sx:.2f}" cy="{sy:.2f}" r="5" fill="#00b300"/>')
        parts.append(f'<circle cx="{ex:.2f}" cy="{ey:.2f}" r="5" fill="#cc0000"/>')
        mx, my = stroke[len(stroke) // 2]
        parts.append(
            f'<text x="{mx+5:.2f}" y="{my-5:.2f}" font-size="16" fill="{color}" '
            f'font-weight="bold">{diag["stroke"]}</text>'
        )
        # direction arrowhead near the end, from the last segment's direction
        (px, py), (qx, qy) = stroke[-2], stroke[-1]
        ang = math.atan2(qy - py, qx - px)
        for da in (2.6, -2.6):
            hx = qx - 9 * math.cos(ang + da * 0.35)
            hy = qy - 9 * math.sin(ang + da * 0.35)
            parts.append(f'<line x1="{qx:.2f}" y1="{qy:.2f}" x2="{hx:.2f}" y2="{hy:.2f}" stroke="{color}" stroke-width="2"/>')

    parts.append("</svg>")
    out_path.write_text("\n".join(parts), encoding="utf-8")


def update_content_json(char_key: str, strokes_normalized, source_meta):
    data = json.loads(CONTENT_FILE.read_text(encoding="utf-8"))
    cfg = CHARACTERS[char_key]
    found = False
    for character in data["characters"]:
        if character["id"] == cfg["id"]:
            character["strokes"] = [
                [{"x": x, "y": y} for x, y in stroke] for stroke in strokes_normalized
            ]
            character.pop("note", None)
            character["note"] = (
                "Derived from a CC BY-SA 3.0 Wikimedia Commons stroke-order reference; "
                "see src/content/hindi/source-attribution.json for provenance."
            )
            found = True
    if not found:
        raise ValueError(f"No character with id {cfg['id']!r} found in {CONTENT_FILE}")
    CONTENT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_attribution_json(char_key: str, num_strokes: int):
    cfg = CHARACTERS[char_key]
    if ATTRIBUTION_FILE.exists():
        data = json.loads(ATTRIBUTION_FILE.read_text(encoding="utf-8"))
    else:
        data = {"entries": []}

    entry = {
        "characterId": cfg["id"],
        "displayLabel": cfg["display_label"],
        "source": {
            "type": "wikimedia-commons",
            "url": cfg["wikimedia_url"],
            "author": cfg["author"],
            "license": cfg["license"],
            "licenseUrl": cfg["license_url"],
        },
        "dateImported": date.today().isoformat(),
        "derivation": (
            "Geometry was derived, not copied verbatim: the source SVG's filled "
            "calligraphic-stroke outlines were converted to single-line centerline "
            "trajectories (via boundary-chain pairing), stroke grouping/order was "
            "recovered from the source's gray-to-black stroke-reveal frames, and "
            "direction/start-point was recovered from the source's start-position "
            "markers. Coordinates were then rescaled into the app's 0-300 canvas."
        ),
        "strokeCount": num_strokes,
        "manualCorrections": [],
    }

    data["entries"] = [e for e in data["entries"] if e["characterId"] != cfg["id"]]
    data["entries"].append(entry)
    ATTRIBUTION_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in CHARACTERS:
        print(f"Usage: python import_stroke_order.py <{'|'.join(CHARACTERS)}>")
        sys.exit(1)

    char_key = sys.argv[1]
    cfg = CHARACTERS[char_key]
    svg_path = SOURCE_DIR / cfg["svg_file"]

    strokes_local, diagnostics, frames, stroke_groups = build_strokes(svg_path)

    print(f"Character: {cfg['display_label']} ({char_key})")
    print(f"Frames found: {[f['n'] for f in frames]}")
    print(f"Strokes recovered: {len(strokes_local)}")
    for d in diagnostics:
        print(
            f"  stroke {d['stroke']}: shapes={d['shape_slots']} points={d['point_count']} "
            f"start={d['start_point']} end={d['end_point']}"
        )

    strokes_normalized, transform = normalize_strokes(strokes_local)

    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    debug_path = DEBUG_DIR / f"{char_key}-stroke-order-debug.svg"
    write_debug_svg(frames, strokes_local, diagnostics, transform, debug_path)
    print(f"Debug visualization written to {debug_path.relative_to(REPO_ROOT)}")

    update_content_json(char_key, strokes_normalized, cfg)
    print(f"Updated {CONTENT_FILE.relative_to(REPO_ROOT)}")

    update_attribution_json(char_key, len(strokes_normalized))
    print(f"Updated {ATTRIBUTION_FILE.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
