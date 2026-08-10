import { Point } from '../types';

/** Evenly spaced points along a straight segment, walked from (x0,y0) to (x1,y1). */
export function tracePoints(x0: number, y0: number, x1: number, y1: number, count: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    points.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
  }
  return points;
}
