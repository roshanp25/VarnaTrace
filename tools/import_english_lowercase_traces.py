"""
Imports hand-traced English lowercase letter strokes from tools/stroke-tracer-english.html's
export into src/content/english/letters.json, adding a new "en-<letter>-lower" character for
each lowercase letter present in the export (creating it if it doesn't exist yet, overwriting its
strokes if it does -- so re-running after a re-trace is safe).

Sibling to import_english_traces.py (which does the same for uppercase, matching by displayLabel
against pre-existing procedurally-generated placeholders). Lowercase never had placeholders, so
this script creates the character entries outright instead of only overwriting matches.

Usage:
    python tools/import_english_lowercase_traces.py [path/to/export.json]
    (defaults to assets/data/english-letters-strokes-lowercase.json)
"""
import json
import math
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LETTERS_PATH = REPO_ROOT / "src" / "content" / "english" / "letters.json"
RAW_DATA_PATH = REPO_ROOT / "assets" / "data" / "english-letters-strokes-lowercase.json"

SOURCE_CANVAS_SIZE = 1200
VIEW_BOX_SIZE = 300
SCALE = VIEW_BOX_SIZE / SOURCE_CANVAS_SIZE

HAND_TRACED_NOTE = (
    "Hand-traced via tools/stroke-tracer-english.html; source data in "
    "assets/data/english-letters-strokes-lowercase.json."
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
    """Same heuristic as validate_hand_traces.py / import_english_traces.py: flags a big
    point-to-point jump whose landing point is also close to some earlier non-adjacent point --
    the signature of a missed 'Finish stroke' tap merging two strokes together."""
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

    letters_data = json.loads(LETTERS_PATH.read_text(encoding="utf-8"))
    by_id = {char["id"]: char for char in letters_data["characters"]}

    updated = []
    for letter in sorted(new_traces.keys()):
        char_id = f"en-{letter}-lower"
        strokes = [normalize_stroke(s) for s in new_traces[letter]]
        if char_id in by_id:
            by_id[char_id]["strokes"] = strokes
            by_id[char_id]["note"] = HAND_TRACED_NOTE
        else:
            new_char = {
                "id": char_id,
                "script": "english",
                "category": "letter-lower",
                "displayLabel": letter,
                "note": HAND_TRACED_NOTE,
                "strokes": strokes,
            }
            letters_data["characters"].append(new_char)
            by_id[char_id] = new_char
        updated.append(letter)

    LETTERS_PATH.write_text(json.dumps(letters_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Updated {len(updated)} lowercase letter(s): {', '.join(updated)}")


if __name__ == "__main__":
    main()
