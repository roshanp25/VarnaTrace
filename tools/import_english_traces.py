"""
Imports hand-traced English letter strokes from tools/stroke-tracer-english.html's export
into src/content/english/letters.json, replacing the procedurally-generated placeholder for
each letter that was actually retraced.

Usage:
    python tools/import_english_traces.py [path/to/english-letter-stroke-traces.json]
    (defaults to assets/data/english-letters-strokes.json, i.e. re-running with no argument just
    re-applies whatever was last imported -- useful after editing normalize_sizes.py)

What it does for each letter in the export file:
  1. Saves the raw 1200x1200 trace data into assets/data/english-letters-strokes.json (kept
     around for provenance/re-import, same convention as the Devanagari hand-trace files).
  2. Scales points from the tracer's 1200x1200 canvas down to the app's 0-300 stencil space,
     dropping any accidental zero-length duplicate point (same normalization
     handTracedStrokes.ts applies to the Hindi hand-traces).
  3. Overwrites that letter's `strokes` in letters.json and clears the "pending visual
     spot-check" note, since this is now real hand-traced geometry, not a placeholder.
  4. Runs the same jump/backtrack validity check as validate_hand_traces.py so a forgotten
     "Finish stroke" tap gets caught before it ships.

Only touches letters actually present in the export -- if you only traced 3 of the 9, only
those 3 change; the rest keep their current (procedurally generated) strokes untouched.
"""
import json
import math
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LETTERS_PATH = REPO_ROOT / "src" / "content" / "english" / "letters.json"
RAW_DATA_PATH = REPO_ROOT / "assets" / "data" / "english-letters-strokes.json"

SOURCE_CANVAS_SIZE = 1200
VIEW_BOX_SIZE = 300
SCALE = VIEW_BOX_SIZE / SOURCE_CANVAS_SIZE

HAND_TRACED_NOTE = (
    "Hand-traced via tools/stroke-tracer-english.html; source data in "
    "assets/data/english-letters-strokes.json."
)


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def median(values):
    s = sorted(values)
    n = len(s)
    if n == 0:
        return 0.0
    mid = n // 2
    return s[mid] if n % 2 == 1 else (s[mid - 1] + s[mid]) / 2


def find_jumps(points, split_multiplier=4.0, split_floor=60.0, backtrack_proximity=50.0):
    """Same heuristic as validate_hand_traces.py: flags a big point-to-point jump whose landing
    point is also close to some earlier non-adjacent point -- the signature of a missed 'Finish
    stroke' tap merging two strokes together."""
    if len(points) < 4:
        return []
    seg_dists = [dist(points[i - 1], points[i]) for i in range(1, len(points))]
    typical = median(seg_dists) or 1.0
    threshold = max(split_multiplier * typical, split_floor)
    jumps = []
    for i in range(1, len(points)):
        d = seg_dists[i - 1]
        if d <= threshold:
            continue
        earlier = points[: max(0, i - 1)]
        nearest_earlier = min((dist(points[i], q) for q in earlier), default=math.inf)
        if nearest_earlier <= backtrack_proximity:
            jumps.append((i, round(d, 1), round(threshold, 1)))
    return jumps


def normalize_stroke(points):
    deduped = [p for i, p in enumerate(points) if i == 0 or p != points[i - 1]]
    return [{"x": round(x * SCALE, 1), "y": round(y * SCALE, 1)} for x, y in deduped]


def main():
    export_path = Path(sys.argv[1]) if len(sys.argv) > 1 else RAW_DATA_PATH
    new_traces = json.loads(export_path.read_text(encoding="utf-8"))

    # Validate the raw traces first -- same check as validate_hand_traces.py.
    flagged = False
    for letter, strokes in new_traces.items():
        for si, stroke in enumerate(strokes):
            if len(stroke) < 2:
                print(f"  FLAGGED {letter}: stroke {si + 1} has only {len(stroke)} point(s)")
                flagged = True
                continue
            for jump_i, jump_d, threshold in find_jumps(stroke):
                print(
                    f"  FLAGGED {letter}: stroke {si + 1} has a jump of {jump_d} at point "
                    f"{jump_i} (>{threshold}) that lands near an earlier point -- looks like a "
                    f"missed 'Finish stroke' tap"
                )
                flagged = True
    if flagged:
        print("\nFix the flagged strokes in the tracer and re-export before importing.")
        sys.exit(1)

    # 1. Merge raw traces into the provenance file (union with anything already saved there).
    raw_data = {}
    if RAW_DATA_PATH.exists():
        raw_data = json.loads(RAW_DATA_PATH.read_text(encoding="utf-8"))
    raw_data.update(new_traces)
    RAW_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_DATA_PATH.write_text(json.dumps(raw_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 2 & 3. Scale into letters.json, replacing the matching displayLabel's strokes/note.
    letters_data = json.loads(LETTERS_PATH.read_text(encoding="utf-8"))
    updated = []
    for char in letters_data["characters"]:
        if char["displayLabel"] in new_traces:
            char["strokes"] = [normalize_stroke(s) for s in new_traces[char["displayLabel"]]]
            char["note"] = HAND_TRACED_NOTE
            updated.append(char["displayLabel"])
    LETTERS_PATH.write_text(json.dumps(letters_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Updated {len(updated)} letter(s): {', '.join(updated)}")
    print(f"Raw traces saved to {RAW_DATA_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
