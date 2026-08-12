"""
Normalizes every English letter and number to a consistent size: each character's own ink
bounding box is uniformly scaled (never stretched -- so its shape/proportions are unchanged) so
its height is exactly TARGET_HEIGHT, then re-centered so the bounding box's own midpoint lands
exactly on the center of whatever block it occupies (canvas center for standalone characters;
each digit's own half-box center for a composed two-digit number).

Run after any hand-tracing import (import_english_traces.py / import_traced_numbers.py) whose
raw per-character sizes vary naturally with how big each was drawn -- that's what caused e.g.
"45" to show two differently-sized digits: each digit had been independently fit to whichever of
width/height was more constraining, instead of all being locked to the same height.

Usage: python tools/normalize_sizes.py
"""
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LETTERS_PATH = REPO_ROOT / "src" / "content" / "english" / "letters.json"
NUMBERS_PATH = REPO_ROOT / "src" / "content" / "numbers" / "numbers.json"

TARGET_HEIGHT = 180  # y:60-240 when centered at 150 -- the convention already used throughout.
CANVAS_CENTER = (150.0, 150.0)

# Two-digit numbers: a fixed gap between the two digits' actual ink, not between two fixed boxes
# -- centering each digit independently in its own half-box (the previous approach) put huge
# margins around narrow digits like "1" (11/21/31/41 looked "far apart") and let wide digits
# collide (22/32/34 looked "too close"), because the visual gap depended on each digit's own
# width instead of being a controlled constant.
DIGIT_GAP = 14
MAX_PAIR_WIDTH = 260  # leaves >=20px margin on a 300-wide canvas even for the widest real pair

# A fixed gap alone wasn't enough: 11-19 (tens digit "1", width ~60 vs the ~100-126 typical
# range) measured an identical 14px gap to every other pair but still read as visibly more
# cramped, because a thin, sparse tens digit gives the pair very little visual anchor on the
# left before the gap starts. Widening the gap when the TENS digit specifically is narrow
# targets exactly that case -- 21/31/41 (where "1" is the *ones* digit instead) weren't flagged
# as too close, so this only looks at the tens side to avoid re-breaking those.
GAP_WIDTH_REFERENCE = 100
GAP_WIDTH_SLOPE = 0.15


def bbox(strokes):
    xs = [p["x"] for s in strokes for p in s]
    ys = [p["y"] for s in strokes for p in s]
    return min(xs), max(xs), min(ys), max(ys)


def normalize(strokes, target_height, center):
    x0, x1, y0, y1 = bbox(strokes)
    h = y1 - y0
    if h == 0:
        return strokes
    scale = target_height / h
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    tx, ty = center
    return [
        [{"x": round((p["x"] - cx) * scale + tx, 1), "y": round((p["y"] - cy) * scale + ty, 1)} for p in stroke]
        for stroke in strokes
    ]


def scale_to_height_centered_at_origin(strokes, target_height):
    """Uniformly scales to target_height and centers the bbox at (x=0, y=150) -- x=0 so the
    caller can shift by an exact target center afterward, once every digit's resulting width is
    known and the pair can be laid out with a fixed gap."""
    x0, x1, y0, y1 = bbox(strokes)
    h = y1 - y0
    scale = target_height / h
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    scaled = [
        [{"x": round((p["x"] - cx) * scale, 1), "y": round((p["y"] - cy) * scale + 150, 1)} for p in stroke]
        for stroke in strokes
    ]
    return scaled, (x1 - x0) * scale


def shift_x(strokes, dx):
    return [[{"x": round(p["x"] + dx, 1), "y": p["y"]} for p in stroke] for stroke in strokes]


def squeeze_x(strokes, factor):
    """Scales width only, around the strokes' own horizontal center -- used for digit 2, whose
    traced width (118.6 at height=180) reads as visibly bolder than its siblings (3/5/6/8/9 sit
    in the 103-109 range) even though height-locking already makes every digit the same height.
    A pure height-based normalization can't fix this since it's a width-only mismatch."""
    xs = [p["x"] for s in strokes for p in s]
    cx = (min(xs) + max(xs)) / 2
    return [[{"x": round((p["x"] - cx) * factor + cx, 1), "y": p["y"]} for p in s] for s in strokes]


def raise_base(strokes, factor):
    """Scales vertically anchored at the TOP edge (which stays exactly fixed), pulling the
    bottom up. Digit 2's top/bottom coordinates are mathematically identical to its neighbors'
    (verified directly against digit 1 at pixel precision), but its flat, wide base reads as
    more "grounded" than a thin shape like 1's point-like bottom -- a well-known optical effect.
    A uniform vertical shift was tried first and rejected: it fixed the base but then made the
    top poke above its partner's top, trading one mismatch for another. Anchoring at the top
    (never flagged as wrong) and only pulling the bottom up leaves the top untouched."""
    y0 = min(p["y"] for s in strokes for p in s)
    return [[{"x": p["x"], "y": round(y0 + (p["y"] - y0) * factor, 1)} for p in s] for s in strokes]


# Per-digit optical corrections, applied on top of the height/gap normalization every digit
# already gets.
DIGIT_CORRECTIONS = {"2": {"squeeze_x": 0.92, "height_factor": 0.975}}


def apply_squeeze(strokes, label):
    corr = DIGIT_CORRECTIONS.get(label, {})
    return squeeze_x(strokes, corr["squeeze_x"]) if "squeeze_x" in corr else strokes


def apply_base_correction(strokes, label):
    corr = DIGIT_CORRECTIONS.get(label, {})
    return raise_base(strokes, corr["height_factor"]) if "height_factor" in corr else strokes


def normalize_letters():
    data = json.loads(LETTERS_PATH.read_text(encoding="utf-8"))
    for char in data["characters"]:
        char["strokes"] = normalize(char["strokes"], TARGET_HEIGHT, CANVAS_CENTER)
    LETTERS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Normalized {len(data['characters'])} letters to height={TARGET_HEIGHT}, centered at {CANVAS_CENTER}.")


def split_digit_strokes(strokes, n_left):
    """Composed two-digit numbers were built as tens-digit strokes followed by ones-digit
    strokes, in that order -- n_left is how many stroke arrays belong to the tens digit."""
    return strokes[:n_left], strokes[n_left:]


def normalize_numbers():
    data = json.loads(NUMBERS_PATH.read_text(encoding="utf-8"))

    # First pass: normalize every standalone single-digit number (1-9) the same way as letters.
    # Deliberately NOT applying the base correction here yet -- digit_source (captured right
    # after this loop) needs to stay in its plain, symmetrically-centered form. The composed-
    # number path re-centers each digit fresh via scale_to_height_centered_at_origin, which
    # would partially undo an asymmetric top-anchored correction baked in this early (it isn't
    # a pure rescale, so the two don't compose cleanly). Applying the correction fresh at each
    # final output point instead (below, and again after composed positioning) avoids that.
    for char in data["characters"]:
        n = int(char["displayLabel"])
        if n < 10:
            strokes = apply_squeeze(char["strokes"], char["displayLabel"])
            char["strokes"] = normalize(strokes, TARGET_HEIGHT, CANVAS_CENTER)

    single_digit_by_label = {c["displayLabel"]: c["strokes"] for c in data["characters"] if int(c["displayLabel"]) < 10}

    for char in data["characters"]:
        if int(char["displayLabel"]) < 10:
            char["strokes"] = apply_base_correction(char["strokes"], char["displayLabel"])

    def digit0_strokes():
        # digit 0 isn't in 1-9; the ones digit of 10/20/30/40/50 already carries its strokes as
        # part of that number's second half -- pull it from num-10, whose ones digit is "0".
        ten = next(c for c in data["characters"] if c["displayLabel"] == "10")
        _, right = split_digit_strokes(ten["strokes"], len(single_digit_by_label["1"]))
        return right

    digit_source = dict(single_digit_by_label)
    digit_source["0"] = digit0_strokes()
    aspect = {label: (lambda b: (b[1] - b[0]) / (b[3] - b[2]))(bbox(strokes)) for label, strokes in digit_source.items()}

    # Height that keeps even the widest *actually-occurring* pair (10-50) within MAX_PAIR_WIDTH,
    # capped at TARGET_HEIGHT -- using real pairs (not a symmetric worst case) allows a taller,
    # more legible size than assuming both digits could simultaneously be the widest one.
    max_pair_aspect_sum = max(aspect[str(n)[0]] + aspect[str(n)[1]] for n in range(10, 51))
    composed_height = min(TARGET_HEIGHT, (MAX_PAIR_WIDTH - DIGIT_GAP) / max_pair_aspect_sum)
    composed_height = round(composed_height, 1)
    print(f"Composed two-digit height: {composed_height} (widest real pair's aspect sum: {max_pair_aspect_sum:.3f})")

    for char in data["characters"]:
        n = int(char["displayLabel"])
        if n < 10:
            continue
        tens, ones = str(n)[0], str(n)[1]
        tens_strokes, tens_w = scale_to_height_centered_at_origin(digit_source[tens], composed_height)
        ones_strokes, ones_w = scale_to_height_centered_at_origin(digit_source[ones], composed_height)
        tens_strokes = apply_base_correction(tens_strokes, tens)
        ones_strokes = apply_base_correction(ones_strokes, ones)
        gap = DIGIT_GAP + max(0.0, (GAP_WIDTH_REFERENCE - tens_w) * GAP_WIDTH_SLOPE)
        pair_left = 150 - (tens_w + gap + ones_w) / 2
        char["strokes"] = shift_x(tens_strokes, pair_left + tens_w / 2) + shift_x(
            ones_strokes, pair_left + tens_w + gap + ones_w / 2
        )

    NUMBERS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Normalized {len(data['characters'])} numbers.")


if __name__ == "__main__":
    normalize_letters()
    normalize_numbers()
