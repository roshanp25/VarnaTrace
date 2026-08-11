"""Minimal, dependency-free SVG path ``d``-attribute parser and flattener.

Supports exactly the command set used by the Wikimedia Devanagari stroke-order
SVGs: M/m, L/l, H/h, V/v, Q/q, C/c, Z/z. Anything else raises, so an
unsupported command in a future source file is a loud failure instead of a
silently wrong shape.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

_TOKEN_RE = re.compile(r"[MmLlHhVvQqCcZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?")


@dataclass
class Point:
    x: float
    y: float

    def as_tuple(self):
        return (self.x, self.y)


def _tokenize(d: str):
    return _TOKEN_RE.findall(d)


def _quad_point(p0, p1, p2, t):
    mt = 1 - t
    x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
    y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
    return (x, y)


def _cubic_point(p0, p1, p2, p3, t):
    mt = 1 - t
    x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
    y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
    return (x, y)


def flatten_path(d: str, curve_samples: int = 24):
    """Flattens an SVG path ``d`` string into one or more closed/open point loops.

    Returns a list of subpaths, each a list of (x, y) tuples in path order. A
    subpath closed with Z has its first point repeated as the last point.
    """
    tokens = _tokenize(d)
    i = 0
    subpaths: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []
    cur = (0.0, 0.0)
    start = (0.0, 0.0)
    cmd = None

    def read_num():
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    while i < len(tokens):
        tok = tokens[i]
        if tok.isalpha():
            cmd = tok
            i += 1
        # else: reuse previous cmd (implicit repeat), per SVG spec

        if cmd in ("M", "m"):
            x, y = read_num(), read_num()
            if cmd == "m" and current:
                x, y = cur[0] + x, cur[1] + y
            elif cmd == "m":
                x, y = cur[0] + x, cur[1] + y
            cur = (x, y)
            if current:
                subpaths.append(current)
            current = [cur]
            start = cur
            # subsequent bare coordinate pairs after M/m are implicit lineto
            cmd = "L" if cmd == "M" else "l"
        elif cmd in ("L", "l"):
            x, y = read_num(), read_num()
            if cmd == "l":
                x, y = cur[0] + x, cur[1] + y
            cur = (x, y)
            current.append(cur)
        elif cmd in ("H", "h"):
            x = read_num()
            if cmd == "h":
                x = cur[0] + x
            cur = (x, cur[1])
            current.append(cur)
        elif cmd in ("V", "v"):
            y = read_num()
            if cmd == "v":
                y = cur[1] + y
            cur = (cur[0], y)
            current.append(cur)
        elif cmd in ("Q", "q"):
            x1, y1, x, y = read_num(), read_num(), read_num(), read_num()
            if cmd == "q":
                x1, y1 = cur[0] + x1, cur[1] + y1
                x, y = cur[0] + x, cur[1] + y
            p1 = (x1, y1)
            p2 = (x, y)
            for s in range(1, curve_samples + 1):
                t = s / curve_samples
                current.append(_quad_point(cur, p1, p2, t))
            cur = (x, y)
        elif cmd in ("C", "c"):
            x1, y1, x2, y2, x, y = (
                read_num(), read_num(), read_num(), read_num(), read_num(), read_num(),
            )
            if cmd == "c":
                x1, y1 = cur[0] + x1, cur[1] + y1
                x2, y2 = cur[0] + x2, cur[1] + y2
                x, y = cur[0] + x, cur[1] + y
            p1, p2, p3 = (x1, y1), (x2, y2), (x, y)
            for s in range(1, curve_samples + 1):
                t = s / curve_samples
                current.append(_cubic_point(cur, p1, p2, p3, t))
            cur = (x, y)
        elif cmd in ("Z", "z"):
            if current and current[-1] != start:
                current.append(start)
            cur = start
            if current:
                subpaths.append(current)
            current = []
        else:
            raise ValueError(f"Unsupported SVG path command {cmd!r} in d={d!r}")

    if current:
        subpaths.append(current)

    return subpaths


def path_bbox(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return (min(xs), min(ys), max(xs), max(ys))
