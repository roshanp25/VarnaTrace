"""Pure-Python geometry helpers for turning a filled calligraphic-stroke
outline into a single centerline trajectory.

No numpy/scipy — the shapes involved are small (tens to low hundreds of
points after curve flattening) so brute-force is fast enough and keeps the
pipeline dependency-free.
"""
from __future__ import annotations

import math


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def path_length(points):
    return sum(dist(points[i], points[i + 1]) for i in range(len(points) - 1))


def resample_by_arc_length(points, count):
    """Resamples a polyline to `count` points evenly spaced by arc length."""
    if len(points) < 2:
        raise ValueError("need at least two points to resample")
    if count < 2:
        raise ValueError("count must be >= 2")

    seg_lens = [dist(points[i], points[i + 1]) for i in range(len(points) - 1)]
    total = sum(seg_lens)
    if total == 0:
        return [points[0]] * count

    out = []
    for i in range(count):
        target = (i / (count - 1)) * total
        covered = 0.0
        seg_i = 0
        while seg_i < len(seg_lens) - 1 and covered + seg_lens[seg_i] < target:
            covered += seg_lens[seg_i]
            seg_i += 1
        seg_len = seg_lens[seg_i]
        t = 0.0 if seg_len == 0 else (target - covered) / seg_len
        p0, p1 = points[seg_i], points[seg_i + 1]
        out.append((p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t))
    return out


def farthest_pair(points):
    """Returns (i, j) indices of the two points with maximum Euclidean separation."""
    best = (-1, -1, -1.0)
    n = len(points)
    for i in range(n):
        for j in range(i + 1, n):
            d = dist(points[i], points[j])
            if d > best[2]:
                best = (i, j, d)
    return best[0], best[1]


def split_loop_into_two_chains(loop_points, i, j):
    """Splits a closed polygon's point loop (first==last) into the two chains
    between index i and index j, going each way around the loop."""
    pts = loop_points[:-1] if loop_points[0] == loop_points[-1] else loop_points
    n = len(pts)
    lo, hi = min(i, j), max(i, j)

    chain_a = pts[lo:hi + 1]
    chain_b = pts[hi:] + pts[:lo + 1]
    return chain_a, chain_b


def _nearest_point(p, candidates):
    best_idx, best_d = 0, math.inf
    for idx, c in enumerate(candidates):
        d = dist(p, c)
        if d < best_d:
            best_idx, best_d = idx, d
    return best_idx


def extract_centerline(loop_points, sample_count=40):
    """Given a closed filled-stroke outline (list of (x,y), first==last),
    finds its two "tip" endpoints (max pairwise distance) and splits the
    outline into the two side-chains between them, then derives a centerline
    by walking one chain and pairing each point with its *nearest* point on
    the other chain (not the same arc-length fraction) — plain arc-length
    fraction matching visibly zigzags on shapes whose two sides have
    unequal curvature (e.g. a tight hook, where the inner edge is much
    shorter than the outer edge), because a fixed fraction of each side's
    length doesn't land on directly-opposite points once the two sides bend
    at different rates. Nearest-point pairing tracks the actual local width
    of the ribbon instead, which stays correct through the bend.

    Returns a list of (x, y) points from tip A to tip B (orientation is
    arbitrary here — the caller reorients using stroke-order metadata).
    """
    pts = loop_points[:-1] if loop_points[0] == loop_points[-1] else loop_points
    i, j = farthest_pair(pts)
    chain_a, chain_b = split_loop_into_two_chains(loop_points, i, j)

    if len(chain_a) < 2 or len(chain_b) < 2:
        # Degenerate split (tips adjacent in the loop) — fall back to the tips only.
        return [pts[i], pts[j]]

    # Densify first so nearest-point matching has enough resolution on both
    # sides regardless of how the source curve was originally flattened.
    dense_a = resample_by_arc_length(chain_a, sample_count * 2)
    dense_b = resample_by_arc_length(chain_b, sample_count * 2)

    # Nearest-point pairing is directionally biased toward whichever chain
    # drives the walk (it can hug the driver's side through a bend instead
    # of running down the middle). Pairing from both directions and
    # averaging the two results cancels most of that bias out.
    a_to_b = []
    for pa in dense_a:
        pb = dense_b[_nearest_point(pa, dense_b)]
        a_to_b.append(((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2))

    b_to_a = []
    for pb in dense_b:
        pa = dense_a[_nearest_point(pb, dense_a)]
        b_to_a.append(((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2))
    b_to_a.reverse()  # dense_b runs the opposite way around the loop from dense_a

    ra = resample_by_arc_length(a_to_b, sample_count)
    rb = resample_by_arc_length(b_to_a, sample_count)
    centerline = [((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) for p, q in zip(ra, rb)]
    return centerline


def smooth_moving_average(points, window=3):
    if window < 2 or len(points) <= window:
        return points[:]
    half = window // 2
    out = []
    for i in range(len(points)):
        lo = max(0, i - half)
        hi = min(len(points), i + half + 1)
        chunk = points[lo:hi]
        out.append((sum(p[0] for p in chunk) / len(chunk), sum(p[1] for p in chunk) / len(chunk)))
    # Preserve exact endpoints so smoothing doesn't shrink the stroke's true tips.
    out[0] = points[0]
    out[-1] = points[-1]
    return out


def dedupe_near_points(points, min_gap=1e-6):
    out = [points[0]]
    for p in points[1:]:
        if dist(out[-1], p) > min_gap:
            out.append(p)
    return out
