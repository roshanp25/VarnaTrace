import { PASS_THRESHOLD, ScoringOptions, scoreTrace, TraceScoreResult } from './scoreTrace';
import { Point, StencilPath } from './types';

export interface MultiStrokeScoringOptions extends ScoringOptions {
  /**
   * When true, every individual stroke must pass — a single off-path stroke fails the whole
   * character even if the average looks fine. When false (default), only the average across
   * strokes needs to clear passThreshold.
   */
  requireEveryStrokeToPass?: boolean;
}

export interface MultiStrokeScoreResult {
  /** 0-100, the average of every stroke's score. */
  score: number;
  /** True if the character passed — see MultiStrokeScoringOptions.requireEveryStrokeToPass for which rule decided this. */
  passed: boolean;
  /** Mean distance across strokes that had traced points, or null if none did. */
  averageDistance: number | null;
  /** Per-stroke detail, in stroke order, for UI feedback or debugging. */
  strokeResults: TraceScoreResult[];
}

/**
 * Scores a multi-stroke character by scoring each stroke independently via `scoreTrace` and
 * combining the results: the overall score is the mean of the per-stroke scores. `passed` follows
 * options.requireEveryStrokeToPass — either every stroke must pass individually, or the mean just
 * needs to clear passThreshold (see MultiStrokeScoringOptions).
 */
export function scoreMultiStrokeTrace(
  strokes: StencilPath[],
  tracedStrokes: Point[][],
  options: MultiStrokeScoringOptions = {},
): MultiStrokeScoreResult {
  if (strokes.length === 0) {
    throw new Error('scoreMultiStrokeTrace requires at least one stroke');
  }
  if (strokes.length !== tracedStrokes.length) {
    throw new Error(
      `scoreMultiStrokeTrace requires one traced stroke per stencil stroke (got ${tracedStrokes.length} traced for ${strokes.length} stencil strokes)`,
    );
  }

  const strokeResults = strokes.map((stroke, i) => scoreTrace(stroke, tracedStrokes[i], options));

  const score = Math.round(mean(strokeResults.map((r) => r.score)));
  const passThreshold = options.passThreshold ?? PASS_THRESHOLD;
  const passed = options.requireEveryStrokeToPass
    ? strokeResults.every((r) => r.passed)
    : score >= passThreshold;

  const distances = strokeResults
    .map((r) => r.averageDistance)
    .filter((d): d is number => d !== null);
  const averageDistance = distances.length > 0 ? Math.round(mean(distances) * 100) / 100 : null;

  return { score, passed, averageDistance, strokeResults };
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
