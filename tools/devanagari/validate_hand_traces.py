"""Read-only validator for the hand-traced stroke files (assets/data/devanagari-*-strokes.json).

Does not modify anything. For every character, flags:
  - a "jump" within a single stroke (same detector as repair_hand_traces.py) — the signature of
    a pen-lift that wasn't followed by "Finish stroke", so a later stroke (or a retrace) got
    concatenated onto the previous one.
  - degenerate strokes (fewer than 2 points, or a stroke that's a single repeated point).
  - non-finite or out-of-canvas coordinates (outside roughly [0, 1200]).

A flagged "zero-length duplicate point" is NOT automatically a mistake: if it's the *entire*
stroke (every point identical), that's almost certainly a genuine single-tap "dot" mark —
anusvara (ं), visarga (ः, which is two such strokes), a nuqta, etc. — not an accidental
double-tap. `src/content/handTracedStrokes.ts`'s `normalizeHandTracedStroke` already treats a
whole-stroke duplicate as an intentional dot and preserves it (as a 2-point zero-length segment,
which the app renders as an actual dot and scores as a tap target) rather than deleting it. Only
an isolated zero-length point *within* an otherwise-normal longer stroke is the original
accidental-double-tap case this check was written for — that one really is noise to re-trace or
manually clean up.

Usage:
    python tools/devanagari/validate_hand_traces.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "assets" / "data"
SOURCE_CANVAS = 1200
SPLIT_MULTIPLIER = 4.0
SPLIT_FLOOR = 60.0


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def median(values):
    s = sorted(values)
    n = len(s)
    if n == 0:
        return 0.0
    mid = n // 2
    return s[mid] if n % 2 == 1 else (s[mid - 1] + s[mid]) / 2


BACKTRACK_PROXIMITY = 50.0


def find_jumps(points):
    """Flags a jump only when it's also a *backtrack*: the point after a large gap lands close to
    some non-adjacent earlier point in the same stroke. A large gap on its own isn't suspicious —
    "Tap points" mode legitimately places just two taps across a long straight segment, which
    produces a big forward jump with no backtracking involved. Backtracking (revisiting a point
    that's not simply "next along the path") is the actual signature of a missed "Finish stroke".
    """
    if len(points) < 4:
        return []
    seg_dists = [dist(points[i - 1], points[i]) for i in range(1, len(points))]
    typical = median(seg_dists) or 1.0
    threshold = max(SPLIT_MULTIPLIER * typical, SPLIT_FLOOR)

    jumps = []
    for i in range(1, len(points)):
        d = seg_dists[i - 1]
        if d <= threshold:
            continue
        earlier = points[: max(0, i - 1)]  # exclude the immediate predecessor itself
        nearest_earlier = min((dist(points[i], q) for q in earlier), default=math.inf)
        if nearest_earlier <= BACKTRACK_PROXIMITY:
            jumps.append({
                "atPointIndex": i,
                "jumpDistance": round(d, 1),
                "threshold": round(threshold, 1),
                "backtrackDistance": round(nearest_earlier, 1),
            })
    return jumps


def validate_character(char, strokes):
    issues = []
    for si, stroke in enumerate(strokes):
        if len(stroke) < 2:
            issues.append(f"stroke {si+1}: only {len(stroke)} point(s)")
            continue
        for p in stroke:
            if len(p) != 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in p):
                issues.append(f"stroke {si+1}: non-finite/malformed point {p}")
            elif not (-5 <= p[0] <= SOURCE_CANVAS + 5 and -5 <= p[1] <= SOURCE_CANVAS + 5):
                issues.append(f"stroke {si+1}: point {p} outside the 0-{SOURCE_CANVAS} canvas")
        zero_len = sum(
            1 for i in range(1, len(stroke)) if dist(stroke[i - 1], stroke[i]) == 0
        )
        if zero_len:
            issues.append(f"stroke {si+1}: {zero_len} zero-length duplicate point(s)")
        jumps = find_jumps(stroke)
        for j in jumps:
            issues.append(
                f"stroke {si+1}: jump of {j['jumpDistance']} at point {j['atPointIndex']} "
                f"(>{j['threshold']} threshold), landing {j['backtrackDistance']} units from an "
                f"earlier point -- looks like an unfinished-stroke merge/retrace"
            )
    return issues


def main():
    files = {
        "vowels": DATA_DIR / "devanagari-vowels-strokes.json",
        "consonants": DATA_DIR / "devanagari-consonants-strokes.json",
        "conjuncts": DATA_DIR / "devanagari-conjuncts-strokes.json",
    }

    total = 0
    clean = 0
    flagged = {}

    for group, path in files.items():
        if not path.exists():
            print(f"[missing] {path.relative_to(REPO_ROOT)}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"\n=== {group} ({len(data)} characters) ===")
        for char, strokes in data.items():
            total += 1
            issues = validate_character(char, strokes)
            stroke_count = len(strokes)
            if issues:
                flagged[char] = issues
                print(f"  FLAGGED  {char}  ({stroke_count} strokes)")
                for issue in issues:
                    print(f"             - {issue}")
            else:
                clean += 1
                print(f"  ok       {char}  ({stroke_count} strokes)")

    print(f"\n{clean}/{total} clean, {len(flagged)} flagged")


if __name__ == "__main__":
    main()
