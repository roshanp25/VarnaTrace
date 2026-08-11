"""Heuristic repair for hand-traced stroke data where "Finish stroke" wasn't
tapped between pen-lifts in tools/stroke-tracer.html, so multiple strokes (and
sometimes a retraced fragment) ended up concatenated into one array.

This does NOT decide what's correct — it proposes a split, based purely on
jump-distance geometry, and writes a debug visualization + report so a human
approves before anything reaches the app. It never touches
assets/data/devanagari-strokes.json (the file the app actually reads).

Heuristic, in plain terms:
  1. Within each original stroke array, find consecutive points whose gap is
     much larger than that stroke's own typical point spacing — that's where
     a pen-lift almost certainly happened (whether "the next real stroke
     starts here" or "this jumps back to redo part of the shape" look
     identical in the data: an anomalously large jump).
  2. Split into fragments at those jumps.
  3. A fragment is flagged as a probable duplicate/retrace (not a real
     stroke) only if it's short (<=4 points) AND every point in it lands
     within a small radius of a fragment already kept — i.e. it doesn't add
     new geometry, it just revisits old geometry. Those are dropped from the
     proposed output but kept in the report so nothing disappears silently.

Usage:
    python tools/devanagari/repair_hand_traces.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_FILE = REPO_ROOT / "assets" / "data" / "devanagari-stroke-traces.json"
OUT_DIR = REPO_ROOT / "development" / "hand-trace-repair"
DEBUG_DIR = REPO_ROOT / "development" / "debug"

SOURCE_CANVAS = 1200
SPLIT_MULTIPLIER = 4.0
SPLIT_FLOOR = 60.0
DUPLICATE_FRAGMENT_MAX_POINTS = 4
DUPLICATE_PROXIMITY = 40.0

Point = tuple


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def median(values):
    s = sorted(values)
    n = len(s)
    if n == 0:
        return 0.0
    mid = n // 2
    return s[mid] if n % 2 == 1 else (s[mid - 1] + s[mid]) / 2


def split_stroke(points):
    if len(points) < 2:
        return [points], [], 0.0

    seg_dists = [dist(points[i - 1], points[i]) for i in range(1, len(points))]
    typical = median(seg_dists) or 1.0
    threshold = max(SPLIT_MULTIPLIER * typical, SPLIT_FLOOR)

    fragments = [[points[0]]]
    split_info = []
    for i in range(1, len(points)):
        d = seg_dists[i - 1]
        if d > threshold:
            fragments.append([])
            split_info.append({"atPointIndex": i, "jumpDistance": round(d, 1)})
        fragments[-1].append(points[i])

    return fragments, split_info, threshold


def is_probable_duplicate(fragment, kept_fragments):
    if len(fragment) > DUPLICATE_FRAGMENT_MAX_POINTS:
        return False
    for p in fragment:
        near_any_kept = any(
            any(dist(p, q) <= DUPLICATE_PROXIMITY for q in kept) for kept in kept_fragments
        )
        if not near_any_kept:
            return False
    return True


def repair_character(strokes_raw):
    all_fragments = []
    per_stroke_report = []
    for orig_idx, stroke in enumerate(strokes_raw):
        fragments, split_info, threshold = split_stroke(stroke)
        per_stroke_report.append({
            "originalStrokeIndex": orig_idx,
            "originalPointCount": len(stroke),
            "splitThreshold": round(threshold, 1),
            "splitsFound": split_info,
            "fragmentSizes": [len(f) for f in fragments],
        })
        all_fragments.extend(fragments)

    kept, dropped = [], []
    for frag in all_fragments:
        if len(frag) < 2:
            dropped.append({"points": frag, "reason": "fewer than 2 points"})
            continue
        if is_probable_duplicate(frag, kept):
            dropped.append({
                "points": frag,
                "reason": "short and every point overlaps an already-kept fragment (looks like a retrace)",
            })
            continue
        kept.append(frag)

    return kept, dropped, per_stroke_report


def write_debug_svg(char, kept, dropped, out_path):
    xs = [p[0] for frag in kept for p in frag] + [p[0] for d in dropped for p in d["points"]]
    ys = [p[1] for frag in kept for p in frag] + [p[1] for d in dropped for p in d["points"]]
    if not xs:
        return
    pad = 40
    min_x, max_x = min(xs) - pad, max(xs) + pad
    min_y, max_y = min(ys) - pad, max(ys) + pad

    colors = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#9a6324"]
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{min_x:.0f} {min_y:.0f} '
        f'{max_x-min_x:.0f} {max_y-min_y:.0f}" width="600">',
        f'<rect x="{min_x:.0f}" y="{min_y:.0f}" width="{max_x-min_x:.0f}" height="{max_y-min_y:.0f}" fill="white"/>',
        f'<text x="{min_x+10:.0f}" y="{min_y+40:.0f}" font-size="36" fill="#333" '
        f'font-family="sans-serif">{char} — {len(kept)} proposed stroke(s), {len(dropped)} dropped fragment(s)</text>',
    ]

    for i, frag in enumerate(kept):
        color = colors[i % len(colors)]
        d = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in frag)
        parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')
        sx, sy = frag[0]
        parts.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="14" fill="{color}"/>')
        parts.append(
            f'<text x="{sx:.1f}" y="{sy+6:.1f}" font-size="16" fill="white" text-anchor="middle" '
            f'font-family="sans-serif" font-weight="bold">{i+1}</text>'
        )
        ex, ey = frag[-1]
        parts.append(f'<circle cx="{ex:.1f}" cy="{ey:.1f}" r="8" fill="none" stroke="{color}" stroke-width="3"/>')

    for d in dropped:
        pts = d["points"]
        if len(pts) >= 2:
            path = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
            parts.append(f'<path d="{path}" fill="none" stroke="#999" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round"/>')
        for x, y in pts:
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="none" stroke="#999" stroke-width="2.5"/>')

    parts.append("</svg>")
    out_path.write_text("\n".join(parts), encoding="utf-8")


def main():
    raw = json.loads(RAW_FILE.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    proposed = {}
    full_report = {}

    for char, strokes_raw in raw.items():
        kept, dropped, per_stroke_report = repair_character(strokes_raw)
        proposed[char] = kept
        full_report[char] = {
            "keptStrokeCount": len(kept),
            "droppedFragmentCount": len(dropped),
            "perOriginalStroke": per_stroke_report,
            "dropped": dropped,
        }
        debug_path = DEBUG_DIR / f"hand-trace-repair-U+{ord(char):04X}.svg"
        write_debug_svg(char, kept, dropped, debug_path)

    (OUT_DIR / "devanagari-strokes.proposed.json").write_text(
        json.dumps(proposed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT_DIR / "repair-report.json").write_text(
        json.dumps(full_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"Wrote {(OUT_DIR / 'devanagari-strokes.proposed.json').relative_to(REPO_ROOT)}")
    print(f"Wrote {(OUT_DIR / 'repair-report.json').relative_to(REPO_ROOT)}")
    print()
    for char in raw:
        r = full_report[char]
        debug_name = f"hand-trace-repair-U+{ord(char):04X}.svg"
        print(f"{char}: {r['keptStrokeCount']} stroke(s) proposed, {r['droppedFragmentCount']} fragment(s) dropped -> development/debug/{debug_name}")


if __name__ == "__main__":
    main()
