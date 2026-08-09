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
