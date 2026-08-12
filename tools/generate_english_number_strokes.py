"""
Procedurally generates CharacterContent stroke data for the missing English capital
letters and numbers 1-50, following standard block-print letter/digit formation
(the same convention taught in most Indian UKG handwriting worksheets).

Each glyph is built from simple primitives (lines, elliptical arcs) sampled into
point arrays on the project's fixed 0-300 stencil canvas, matching the existing
hand-authored samples (en-i-upper, en-l-upper, en-c-upper, en-t-upper, num-1, num-7).

Run: python tools/generate_english_number_strokes.py
Writes updated src/content/english/letters.json and src/content/numbers/numbers.json,
and a self-review contact sheet at development/english-number-review.html.

All generated entries carry a `note` flagging them as procedurally generated and
pending visual spot-check, per the project's placeholder-content convention.
"""
import json
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LETTERS_PATH = REPO_ROOT / "src" / "content" / "english" / "letters.json"
NUMBERS_PATH = REPO_ROOT / "src" / "content" / "numbers" / "numbers.json"
REVIEW_PATH = REPO_ROOT / "development" / "english-number-review.html"

NOTE = "Procedurally generated block-print stroke path (tools/generate_english_number_strokes.py) — pending visual spot-check."

Point = tuple


def pt(x, y):
    return {"x": round(x, 1), "y": round(y, 1)}


def line(p0, p1, n=2):
    """n evenly spaced points from p0 to p1 inclusive."""
    x0, y0 = p0
    x1, y1 = p1
    return [pt(x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1)) for i in range(n)]


def polyline(points, n_per_seg=2):
    """Concatenate line() across a list of waypoints, without duplicating shared endpoints."""
    out = []
    for i in range(len(points) - 1):
        seg = line(points[i], points[i + 1], n_per_seg)
        if i > 0:
            seg = seg[1:]
        out.extend(seg)
    return out


def arc(cx, cy, rx, ry, start_deg, end_deg, n=10):
    """n evenly spaced points along an elliptical arc, start_deg -> end_deg (degrees, 0=+x axis, clockwise since y grows downward)."""
    out = []
    for i in range(n):
        t = start_deg + (end_deg - start_deg) * i / (n - 1)
        rad = math.radians(t)
        out.append(pt(cx + rx * math.cos(rad), cy + ry * math.sin(rad)))
    return out


def concat(*strokes_or_points):
    """Concatenate point lists into one stroke, dropping consecutive duplicate points."""
    out = []
    for chunk in strokes_or_points:
        for p in chunk:
            if out and abs(out[-1]["x"] - p["x"]) < 1e-6 and abs(out[-1]["y"] - p["y"]) < 1e-6:
                continue
            out.append(p)
    return out


def spiral(cx, cy, r_start, r_end, start_deg, descend_deg, loop_deg=360, n_descend=14, n_loop=14):
    """One continuous curve: radius shrinks linearly from r_start to r_end while sweeping
    descend_deg degrees, then holds at r_end for another loop_deg degrees. Used for digit 6 --
    guarantees the descending hook and the closed loop are the same unbroken curve, so there's
    no separate-pieces join to misalign."""
    out = []
    for i in range(n_descend):
        t = i / (n_descend - 1)
        rad = math.radians(start_deg + descend_deg * t)
        r = r_start + (r_end - r_start) * t
        out.append(pt(cx + r * math.cos(rad), cy + r * math.sin(rad)))
    end_deg = start_deg + descend_deg
    for i in range(1, n_loop):
        t = i / (n_loop - 1)
        rad = math.radians(end_deg + loop_deg * t)
        out.append(pt(cx + r_end * math.cos(rad), cy + r_end * math.sin(rad)))
    return out


def arc_through(p1, p2, p3, n=14):
    """A circular arc from p1 to p3, passing through guide point p2 -- used where a hand-placed
    straight polyline produced a visibly angular corner instead of a smooth curve (digit 6's
    hook). Fits the unique circle through all three points, then sweeps in whichever direction
    from p1 to p3 actually passes through p2."""
    ax, ay = p1
    bx, by = p2
    cx3, cy3 = p3
    d = 2 * (ax * (by - cy3) + bx * (cy3 - ay) + cx3 * (ay - by))
    ux = ((ax**2 + ay**2) * (by - cy3) + (bx**2 + by**2) * (cy3 - ay) + (cx3**2 + cy3**2) * (ay - by)) / d
    uy = ((ax**2 + ay**2) * (cx3 - bx) + (bx**2 + by**2) * (ax - cx3) + (cx3**2 + cy3**2) * (bx - ax)) / d
    r = math.hypot(ax - ux, ay - uy)

    def ang(p):
        return math.degrees(math.atan2(p[1] - uy, p[0] - ux))

    a1, a2, a3 = ang(p1), ang(p2), ang(p3)
    rel2, rel3 = (a2 - a1) % 360, (a3 - a1) % 360
    end = a1 + rel3 if rel2 <= rel3 else a1 - (360 - rel3)
    return arc(ux, uy, r, r, a1, end, n)


def recenter_x(strokes, target_cx=150.0):
    """Shift every point horizontally so the glyph's own ink bounding box is centered exactly
    on target_cx. Hand-tuning each curve's radius to eyeball centering proved unreliable across
    several review rounds -- this makes horizontal centering an exact, checkable invariant
    instead of a guess."""
    xs = [p["x"] for stroke in strokes for p in stroke]
    dx = target_cx - (min(xs) + max(xs)) / 2
    if abs(dx) < 0.05:
        return strokes
    return [[pt(p["x"] + dx, p["y"]) for p in stroke] for stroke in strokes]


# ---------------------------------------------------------------------------
# Letter glyphs. Default box is x:[70,230] y:[60,240], mid x=150, mid y=150,
# but several letters override x0/x1 locally -- a single shared box made
# letters whose ink doesn't reach the box edges (e.g. B's bumps) look
# shoved to one side, so each letter's actual horizontal extent is chosen
# to keep its visual center near x=150.
# ---------------------------------------------------------------------------

def letter_strokes(letter):
    x0, x1, xm = 70, 230, 150
    y0, y1, ym = 60, 240, 150

    if letter == "A":
        return [
            line((xm, y0), (x0, y1), 4),
            line((xm, y0), (x1, y1), 4),
            line((100, 170), (200, 170), 2),
        ]
    if letter == "B":
        # Radii and vertical split measured from Verdana's actual B outline (via fontTools --
        # see tools/font_measurements.py), not guessed: the top bump is narrower/shorter than
        # the bottom one in every real font, which is why they were never going to look right
        # sharing one radius.
        x0 = 82
        return [
            line((x0, y0), (x0, y1), 2),
            arc(x0, 106.4, 96.2, 26.0, -90, 90, 8),
            arc(x0, 186.1, 135.8, 33.5, -90, 90, 8),
        ]
    if letter == "D":
        x0 = 74
        return [
            line((x0, y0), (x0, y1), 2),
            arc(x0, ym, 152.1, 69.5, -90, 90, 12),
        ]
    if letter == "E":
        return [
            line((x0, y0), (x0, y1), 2),
            line((x0, y0), (210, y0), 2),
            line((x0, ym), (185, ym), 2),
            line((x0, y1), (210, y1), 2),
        ]
    if letter == "F":
        x0 = 80
        return [
            line((x0, y0), (x0, y1), 2),
            line((x0, y0), (215, y0), 2),
            line((x0, ym), (190, ym), 2),
        ]
    if letter == "G":
        # Verdana's actual G is narrower relative to its height (width/height ~0.86, not the
        # ~0.94 used here before) and its gap is much larger than a small notch -- it spans
        # most of the lower-right quadrant, not just a sliver at mid-height.
        cx, cy, rx, ry = 150, ym, 77, 90
        curve = arc(cx, cy, rx, ry, -10, -300, 14)
        bar_start = (curve[-1]["x"], curve[-1]["y"])
        bar = polyline([bar_start, (152, bar_start[1]), (152, bar_start[1] + 20)], 2)
        return [curve, bar]
    if letter == "H":
        x0, x1, xm = 90, 210, 150
        return [
            line((x0, y0), (x0, y1), 2),
            line((x1, y0), (x1, y1), 2),
            line((x0, ym), (x1, ym), 2),
        ]
    if letter == "J":
        return [
            line((170, y0), (170, 185), 3),
            arc(120, 185, 50, 45, 0, 130, 7),
        ]
    if letter == "K":
        # Stem position, waist (meeting) height, and diagonal endpoints measured directly from
        # Verdana's actual K outline (a simple 12-vertex polygon -- easy to read exactly),
        # rather than guessed proportions.
        x0 = 92
        waist_y = 166
        return [
            line((x0, y0), (x0, y1), 2),
            line((206, y0), (x0, waist_y), 4),
            line((x0, waist_y), (208, y1), 4),
        ]
    if letter == "M":
        return [polyline([(x0, y1), (x0, y0), (xm, 180), (x1, y0), (x1, y1)], 3)]
    if letter == "N":
        x0, x1, xm = 82, 218, 150
        return [polyline([(x0, y1), (x0, y0), (x1, y1), (x1, y0)], 4)]
    if letter == "O":
        return [arc(xm, ym, 80, 90, -90, 270, 16)]
    if letter == "P":
        # Measured from Verdana: P's bump is taller/rounder than the earlier guess and reaches
        # all the way to the letter's own right edge (real fonts don't leave a gap there).
        x0 = 91
        return [
            line((x0, y0), (x0, y1), 2),
            arc(x0, 116.5, 117.7, 36, -90, 90, 9),
        ]
    if letter == "Q":
        # Reverted to a plain straight diagonal per the reference image -- Q's tail is not
        # wavy, an earlier round's "fix" based on a misreading of feedback overcorrected this.
        return [
            arc(xm, ym, 80, 90, -90, 270, 16),
            line((206.6, 213.6), (232, 242), 2),
        ]
    if letter == "R":
        # Same measurement source as K/P: stem, bump, and leg positions read off Verdana's
        # actual R outline rather than guessed.
        x0 = 76
        bump_bottom_y = 148.5
        return [
            line((x0, y0), (x0, y1), 2),
            arc(x0, 114.5, 118.0, 34, -90, 90, 9),
            line((x0, bump_bottom_y), (224.9, y1), 3),
        ]
    if letter == "S":
        # Two arcs bulging in opposite directions (top bulges right, bottom bulges left),
        # meeting at the exact same point. Widened from r=55 to r=67 to match Verdana's actual
        # width/height ratio (~0.74; the previous version was a narrower ~0.61).
        cx, r = 150, 67
        top = arc(cx, 105, r, 45, -90, 90, 8)
        bottom_cy = 105 + 45 + 45
        bottom = arc(cx, bottom_cy, r, 45, 270, 90, 8)
        return [concat(top, bottom)]
    if letter == "U":
        x0, x1, xm = 95, 205, 150
        bowl_r = (x1 - x0) / 2
        return [concat(
            line((x0, y0), (x0, 175), 3),
            arc(xm, 175, bowl_r, 65, 180, 0, 8),
            line((x1, 175), (x1, y0), 3),
        )]
    if letter == "V":
        x0, x1, xm = 100, 200, 150
        return [polyline([(x0, y0), (xm, y1), (x1, y0)], 4)]
    if letter == "W":
        return [polyline([(x0, y0), (110, y1), (xm, 130), (190, y1), (x1, y0)], 3)]
    if letter == "X":
        return [
            line((x0, y0), (x1, y1), 4),
            line((x1, y0), (x0, y1), 4),
        ]
    if letter == "Y":
        return [
            line((x0, y0), (xm, ym), 3),
            polyline([(x1, y0), (xm, ym), (xm, y1)], 3),
        ]
    if letter == "Z":
        return [polyline([(x0, y0), (x1, y0), (x0, y1), (x1, y1)], 3)]
    raise ValueError(letter)


LETTER_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
EXISTING_LETTER_IDS = {"en-i-upper", "en-l-upper", "en-c-upper", "en-t-upper"}


def letter_id(letter):
    return f"en-{letter.lower()}-upper"


# ---------------------------------------------------------------------------
# Digit glyphs, parameterized by a bounding box so they can be composed
# side-by-side for two-digit numbers.
# ---------------------------------------------------------------------------

def digit_strokes(digit, x0, x1, y0, y1):
    xm = (x0 + x1) / 2
    ym = (y0 + y1) / 2
    w = x1 - x0
    h = y1 - y0

    if digit == 0:
        return [arc(xm, ym, w * 0.42, h * 0.5, -90, 270, 14)]
    if digit == 1:
        flag_x = x0 + w * 0.25
        return [polyline([(flag_x, y0 + h * 0.17), (xm, y0), (xm, y1)], 3)]
    if digit == 2:
        hump = arc(xm - w * 0.05, y0 + h * 0.22, w * 0.42, h * 0.22, 200, 380, 7)
        return [concat(
            hump,
            line((hump[-1]["x"], hump[-1]["y"]), (x0 + w * 0.1, y1), 3),
            line((x0 + w * 0.1, y1), (x1 - w * 0.02, y1), 2),
        )]
    if digit == 3:
        # Two right-bulging arcs (same shape as digit 0/8's circles, just half-height), meeting
        # at the exact vertical center so there's no gap for the renderer to bridge with a
        # stray straight line. Bulge widened (0.4w -> 0.5w) and centered exactly on xm -- the
        # narrower, left-shifted version read as too thin/incomplete.
        top = arc(xm, y0 + h * 0.25, w * 0.5, h * 0.25, -90, 90, 8)
        bottom = arc(xm, y0 + h * 0.75, w * 0.5, h * 0.25, -90, 90, 8)
        return [concat(top, bottom)]
    if digit == 4:
        peak_x = x0 + w * 0.62
        return [
            polyline([(peak_x, y0), (x0, y0 + h * 0.62), (x1, y0 + h * 0.62)], 3),
            line((peak_x, y0 + h * 0.17), (peak_x, y1), 3),
        ]
    if digit == 5:
        stem_x = x0 + w * 0.1
        bar_end_x = x1 - w * 0.08
        bowl_cy = y0 + h * 0.71
        # A rounder bowl (rx close to ry) reaching most of the way to the bar's right edge --
        # matching the bar's width exactly (an earlier attempt) produced a flat, elongated oval
        # instead of a natural bowl, which looked worse, not better.
        bowl_ry = h * 0.29
        bowl_rx = min(bar_end_x - stem_x, bowl_ry * 1.25)
        return [
            line((stem_x, y0), (bar_end_x, y0), 2),
            # Bowl starts exactly where the stem ends (bowl_cy - bowl_ry == stem's bottom y),
            # bulging right and returning to the same x at the baseline.
            concat(
                line((stem_x, y0), (stem_x, bowl_cy - bowl_ry), 2),
                arc(stem_x, bowl_cy, bowl_rx, bowl_ry, -90, 90, 8),
            ),
        ]
    if digit == 6:
        # A single continuous spiral, radius shrinking while sweeping counter-clockwise (i.e.
        # a *negative* angle sweep in this function's clockwise-positive convention) from
        # upper-right down through the top and left side into a closed loop. Three earlier
        # attempts each failed differently: a gapped hook+circle, a spiral swept in the wrong
        # (clockwise) direction with too large a sweep (produced a tangled double-loop), and a
        # circumcircle fit through 3 points (produced a wildly oversized arc). Sweep angles
        # here are deliberately conservative and were checked against a rendered image.
        loop_cx, loop_cy = xm + w * 0.02, y0 + h * 0.72
        r_end = w * 0.32
        start_x, start_y = x1 - w * 0.08, y0 + h * 0.03
        dx, dy = start_x - loop_cx, start_y - loop_cy
        r_start = math.hypot(dx, dy)
        start_deg = math.degrees(math.atan2(dy, dx))
        return [spiral(loop_cx, loop_cy, r_start, r_end, start_deg, -195, -360, n_descend=14, n_loop=13)]
    if digit == 7:
        return [polyline([(x0 + w * 0.05, y0), (x1 - w * 0.05, y0), (xm - w * 0.05, y1)], 3)]
    if digit == 8:
        # Two separate full-circle strokes (like B/P/R's separate bumps) rather than one
        # concatenated stroke -- the earlier version's two circles didn't meet at the same
        # point, so concatenating them drew a long stray vertical line bridging the gap.
        top = arc(xm, y0 + h * 0.28, w * 0.3, h * 0.22, 90, 450, 12)
        bottom = arc(xm, y0 + h * 0.78, w * 0.36, h * 0.28, 90, 450, 12)
        return [top, bottom]
    if digit == 9:
        # Separate strokes for the same reason as 8: the loop and tail didn't meet exactly,
        # so forcing them into one continuous stroke drew a stray connecting line.
        loop_rx, loop_cy = w * 0.38, y0 + h * 0.28
        loop = arc(xm, loop_cy, loop_rx, h * 0.26, 90, 450, 12)
        tail_start = (xm + loop_rx, loop_cy)  # the loop's own rightmost point
        tail = polyline([tail_start, (xm + w * 0.14, ym + h * 0.05), (xm - w * 0.02, y1)], 3)
        return [loop, tail]
    raise ValueError(digit)


def single_digit_strokes(digit):
    return digit_strokes(digit, 90, 210, 60, 240)


def two_digit_strokes(tens, ones):
    # Still flagged as "too far apart" after the first tightening pass (45-150/165-255, an 8px
    # box gap). Each digit also carries its own internal side margin (roughly 0.05-0.15 of its
    # box width) that adds further whitespace on top of any box gap, so the boxes now overlap
    # slightly rather than just abutting, to cancel that out.
    left = digit_strokes(tens, 43, 152, 60, 240)
    right = digit_strokes(ones, 148, 257, 60, 240)
    return left + right


EXISTING_NUMBER_IDS = {"num-1", "num-7"}


# Letters whose ink still didn't bbox-center after hand-tuning radii across two review rounds --
# forced to exact horizontal center as a final, non-negotiable step rather than guessing again.
FORCE_RECENTER = {"B", "D", "F", "G", "K", "P", "R", "S"}


def build_letters():
    entries = []
    for letter in LETTER_ORDER:
        if letter_id(letter) in EXISTING_LETTER_IDS:
            continue
        strokes = letter_strokes(letter)
        if letter in FORCE_RECENTER:
            strokes = recenter_x(strokes)
        entries.append({
            "id": letter_id(letter),
            "script": "english",
            "category": "letter",
            "displayLabel": letter,
            "tier": "paid",
            "note": NOTE,
            "strokes": strokes,
        })
    return entries


def build_numbers():
    entries = []
    for n in range(1, 51):
        entry_id = f"num-{n}"
        if entry_id in EXISTING_NUMBER_IDS:
            continue
        if n < 10:
            strokes = single_digit_strokes(n)
        else:
            strokes = two_digit_strokes(n // 10, n % 10)
        entries.append({
            "id": entry_id,
            "script": "number",
            "category": "number",
            "displayLabel": str(n),
            "tier": "paid",
            "note": NOTE,
            "strokes": strokes,
        })
    return entries


def write_json(path, new_entries):
    data = json.loads(path.read_text(encoding="utf-8"))
    existing_ids = {c["id"] for c in data["characters"]}
    for entry in new_entries:
        if entry["id"] not in existing_ids:
            data["characters"].append(entry)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return data


def stroke_to_svg_polyline(stroke, color):
    points = " ".join(f'{p["x"]},{p["y"]}' for p in stroke)
    return f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />'


def render_card(char):
    colors = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#9333ea", "#0891b2"]
    polylines = "".join(
        stroke_to_svg_polyline(stroke, colors[i % len(colors)])
        for i, stroke in enumerate(char["strokes"])
    )
    return f'''
    <div class="card">
      <svg viewBox="0 0 300 300" width="140" height="140">
        <rect x="0" y="0" width="300" height="300" fill="#fafafa" stroke="#ddd"/>
        {polylines}
      </svg>
      <div class="label">{char["displayLabel"]} <span class="id">{char["id"]}</span></div>
    </div>'''


def write_review_sheet(letters_data, numbers_data):
    cards = "".join(render_card(c) for c in letters_data["characters"] + numbers_data["characters"])
    html = f'''<!doctype html>
<html><head><meta charset="utf-8"><title>Stroke review</title>
<style>
body {{ font-family: sans-serif; background: #fff; }}
.grid {{ display: flex; flex-wrap: wrap; gap: 12px; }}
.card {{ text-align: center; }}
.label {{ font-size: 14px; }}
.id {{ color: #999; font-size: 11px; display: block; }}
</style></head>
<body><div class="grid">{cards}</div></body></html>'''
    REVIEW_PATH.parent.mkdir(exist_ok=True)
    REVIEW_PATH.write_text(html, encoding="utf-8")


def main():
    new_letters = build_letters()
    new_numbers = build_numbers()
    letters_data = write_json(LETTERS_PATH, new_letters)
    numbers_data = write_json(NUMBERS_PATH, new_numbers)
    write_review_sheet(letters_data, numbers_data)
    print(f"Letters: +{len(new_letters)} (total {len(letters_data['characters'])})")
    print(f"Numbers: +{len(new_numbers)} (total {len(numbers_data['characters'])})")
    print(f"Review sheet: {REVIEW_PATH}")


if __name__ == "__main__":
    main()
