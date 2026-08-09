import { Point } from './types';

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Resamples a polyline to `count` points evenly spaced by arc length, so downstream index-based
 * comparisons (coverage, progress) are independent of how densely the source path was defined.
 */
export function resamplePathByArcLength(path: Point[], count: number): Point[] {
  if (path.length < 2) {
    throw new Error('resamplePathByArcLength requires at least two points');
  }
  if (count < 2) {
    throw new Error('resamplePathByArcLength requires a sample count of at least two');
  }

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < path.length; i++) {
    const length = distance(path[i - 1], path[i]);
    segmentLengths.push(length);
    totalLength += length;
  }

  if (totalLength === 0) {
    return Array.from({ length: count }, () => ({ ...path[0] }));
  }

  const samples: Point[] = [];
  for (let i = 0; i < count; i++) {
    const targetLength = (i / (count - 1)) * totalLength;

    let coveredLength = 0;
    let segmentIndex = 0;
    while (
      segmentIndex < segmentLengths.length - 1 &&
      coveredLength + segmentLengths[segmentIndex] < targetLength
    ) {
      coveredLength += segmentLengths[segmentIndex];
      segmentIndex++;
    }

    const segmentLength = segmentLengths[segmentIndex];
    const segmentT = segmentLength === 0 ? 0 : (targetLength - coveredLength) / segmentLength;

    const start = path[segmentIndex];
    const end = path[segmentIndex + 1];
    samples.push({
      x: start.x + (end.x - start.x) * segmentT,
      y: start.y + (end.y - start.y) * segmentT,
    });
  }

  return samples;
}

/** Returns the index of the sample nearest to `point`, and the distance to it. */
export function nearestSample(
  point: Point,
  samples: Point[],
): { index: number; distance: number } {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < samples.length; i++) {
    const d = distance(point, samples[i]);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }

  return { index: bestIndex, distance: bestDistance };
}
