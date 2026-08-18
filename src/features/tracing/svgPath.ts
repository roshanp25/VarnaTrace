import { Point } from '../../engine';

/** Serializes an ordered list of points into an SVG path `d` attribute (a polyline). */
export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }

  const [first, ...rest] = points;
  const moveTo = `M ${first.x} ${first.y}`;
  const lineTos = rest.map((p) => `L ${p.x} ${p.y}`).join(' ');

  return rest.length > 0 ? `${moveTo} ${lineTos}` : moveTo;
}

/**
 * True when every point in the stroke is the same coordinate — a genuine single-tap "dot" mark
 * (anusvara, visarga, a nuqta, etc.) rather than a drawn line. `pointsToSvgPath` renders these as
 * an invisible zero-length path, so callers should render an explicit dot marker instead.
 */
export function isDotStroke(points: Point[]): boolean {
  return points.length > 0 && points.every((p) => p.x === points[0].x && p.y === points[0].y);
}
