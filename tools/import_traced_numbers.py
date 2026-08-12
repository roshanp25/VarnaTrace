"""
Imports hand-traced digits 1-9 from assets/data/english-numbers-strokes.json (traced via the
stroke-tracer tool, same raw 1200x1200-canvas format as the English letters and Hindi data) into
src/content/numbers/numbers.json -- covering all of 1-50:

  - Digits 1-9: the traced strokes, scaled 1200 -> 300 directly (no repositioning), same as the
    letter import -- the tracer's guide already centers/sizes each character consistently, so a
    plain scale keeps that consistency.
  - Two-digit numbers 10-50: each traced digit is fit (uniform scale, centered -- never
    stretched non-uniformly, which would distort the shape) into a left or right half-box on the
    same 0-300 canvas, tens digit then ones digit.
  - Digit 0 (needed as the ones-digit of 10/20/30/40/50, not part of what was traced): falls
    back to the existing procedural ellipse from generate_english_number_strokes.py, fit through
    the same transform as the traced digits so it sits at a consistent size/baseline next to them.

Usage:
    python tools/import_traced_numbers.py [path/to/exported-traces.json]
    (defaults to assets/data/english-numbers-strokes.json, i.e. re-running with no argument just
    re-applies whatever was last imported -- useful after editing normalize_sizes.py)
"""
import importlib.util
import json
import math
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NUMBERS_PATH = REPO_ROOT / "src" / "content" / "numbers" / "numbers.json"
DEFAULT_SOURCE = REPO_ROOT / "assets" / "data" / "english-numbers-strokes.json"
RAW_DATA_PATH = REPO_ROOT / "assets" / "data" / "english-numbers-strokes.json"

SOURCE_CANVAS_SIZE = 1200
VIEW_BOX_SIZE = 300
DIRECT_SCALE = VIEW_BOX_SIZE / SOURCE_CANVAS_SIZE

# The box a single full-size traced digit lands in after a direct 1200->300 scale, assuming the
# tracer's guide centers glyphs the same way the letter tracer's did (matches the existing
# hand-authored num-1/num-7 samples' proportions). Used only for composing two-digit numbers.
STANDARD_DIGIT_BOX = (70, 230, 60, 240)  # x0, x1, y0, y1

# Same left/right split used by the procedural generator's two_digit_strokes, kept identical so
# spacing doesn't regress after being tuned across several rounds.
LEFT_BOX = (43, 152, 60, 240)
RIGHT_BOX = (148, 257, 60, 240)

HAND_TRACED_NOTE = (
    "Hand-traced via the stroke-tracer tool; source data in assets/data/english-numbers-strokes.json "
    "(digits 1-9), composed into two-digit numbers with 0 falling back to a procedural ellipse "
    "(digit 0 wasn't traced)."
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


def dedupe(points):
    return [p for i, p in enumerate(points) if i == 0 or p != points[i - 1]]


def direct_scale_stroke(points):
    return [{"x": round(x * DIRECT_SCALE, 1), "y": round(y * DIRECT_SCALE, 1)} for x, y in dedupe(points)]


def fit_points(points_xy, src_box, dst_box):
    """Uniformly scale (never stretched non-uniformly) and center points from src_box into
    dst_box."""
    sx0, sx1, sy0, sy1 = src_box
    dx0, dx1, dy0, dy1 = dst_box
    scale = min((dx1 - dx0) / (sx1 - sx0), (dy1 - dy0) / (sy1 - sy0))
    scaled_w, scaled_h = (sx1 - sx0) * scale, (sy1 - sy0) * scale
    offset_x = dx0 + ((dx1 - dx0) - scaled_w) / 2 - sx0 * scale
    offset_y = dy0 + ((dy1 - dy0) - scaled_h) / 2 - sy0 * scale
    return [{"x": round(x * scale + offset_x, 1), "y": round(y * scale + offset_y, 1)} for x, y in points_xy]


def fit_stroke_into_box(scaled_strokes, dst_box):
    """scaled_strokes: strokes already in 0-300 space (STANDARD_DIGIT_BOX convention)."""
    xy = [(p["x"], p["y"]) for stroke in scaled_strokes for p in stroke]
    result = []
    for stroke in scaled_strokes:
        pts = [(p["x"], p["y"]) for p in stroke]
        result.append(fit_points(pts, STANDARD_DIGIT_BOX, dst_box))
    return result


def load_digit0_strokes():
    """Reuse the existing procedural ellipse for '0' from generate_english_number_strokes.py,
    in its own (90,210,60,240) box, re-fit into the STANDARD_DIGIT_BOX convention so it composes
    consistently with the traced digits."""
    spec = importlib.util.spec_from_file_location(
        "generate_english_number_strokes", REPO_ROOT / "tools" / "generate_english_number_strokes.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    raw = module.digit_strokes(0, 90, 210, 60, 240)
    return fit_stroke_into_box(raw, STANDARD_DIGIT_BOX)


def main():
    source_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    traces = json.loads(source_path.read_text(encoding="utf-8"))

    flagged = False
    for digit, strokes in traces.items():
        for si, stroke in enumerate(strokes):
            if len(stroke) < 2:
                print(f"  FLAGGED {digit}: stroke {si + 1} has only {len(stroke)} point(s)")
                flagged = True
                continue
            for jump_i, jump_d, threshold in find_jumps(stroke):
                print(
                    f"  FLAGGED {digit}: stroke {si + 1} has a jump of {jump_d} at point {jump_i} "
                    f"(>{threshold}) landing near an earlier point -- looks like a missed "
                    f"'Finish stroke' tap"
                )
                flagged = True
    if flagged:
        print("\nFix the flagged strokes and re-export before importing.")
        sys.exit(1)

    RAW_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_DATA_PATH.write_text(json.dumps(traces, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    digit_scaled = {d: [direct_scale_stroke(s) for s in strokes] for d, strokes in traces.items()}
    digit_scaled["0"] = load_digit0_strokes()

    numbers_data = json.loads(NUMBERS_PATH.read_text(encoding="utf-8"))
    updated = []
    for char in numbers_data["characters"]:
        n = int(char["displayLabel"])
        if n < 10:
            if str(n) not in digit_scaled:
                continue
            char["strokes"] = digit_scaled[str(n)]
        else:
            tens, ones = str(n)[0], str(n)[1]
            char["strokes"] = fit_stroke_into_box(digit_scaled[tens], LEFT_BOX) + fit_stroke_into_box(
                digit_scaled[ones], RIGHT_BOX
            )
        char["note"] = HAND_TRACED_NOTE
        updated.append(char["displayLabel"])

    NUMBERS_PATH.write_text(json.dumps(numbers_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {len(updated)} number(s).")
    print(f"Raw digit traces saved to {RAW_DATA_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
