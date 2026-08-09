import { distance, nearestSample, resamplePathByArcLength } from './geometry';
import { Point, StencilPath } from './types';

export interface ScoringOptions {
  /** Distance (in stencil coordinate units) within which a traced point counts as "on" the path. */
  tolerancePx?: number;
  /** Distance beyond which a traced point contributes zero to the accuracy score. */
  maxDistancePx?: number;
  /** How many stencil samples of backward movement are tolerated as natural wobble, not a direction violation. */
  directionEpsilonSamples?: number;
}

export interface TraceScoreResult {
  /** 0-100 overall score, combining accuracy, coverage, and direction. */
  score: number;
  /** Mean distance of traced points from the stencil path. */
  averageDistance: number;
  /** 0-100 percentage of the stencil path that was traced within tolerance. */
  coveragePercent: number;
  /** Whether the trace met PASS_THRESHOLD. */
  passed: boolean;
}

/**
 * Number of points the stencil is resampled to for coverage/direction bookkeeping. Needs to stay
 * well above the typical number of traced points so each traced point's step maps to several
 * samples of movement — otherwise nearest-sample quantization noise can mask backward tracing.
 */
const SAMPLE_COUNT = 300;

const DEFAULT_TOLERANCE_PX = 8;
const DEFAULT_MAX_DISTANCE_PX = 20;
const DEFAULT_DIRECTION_EPSILON_SAMPLES = 2;

/** Minimum score for a trace to count as a pass, shared with the UI so both agree on "good enough". */
export const PASS_THRESHOLD = 70;

const EMPTY_TRACE_RESULT: TraceScoreResult = {
  score: 0,
  averageDistance: Infinity,
  coveragePercent: 0,
  passed: false,
};

export function scoreTrace(
  stencil: StencilPath,
  traced: Point[],
  options: ScoringOptions = {},
): TraceScoreResult {
  const tolerancePx = options.tolerancePx ?? DEFAULT_TOLERANCE_PX;
  const maxDistancePx = options.maxDistancePx ?? DEFAULT_MAX_DISTANCE_PX;
  const directionEpsilonSamples =
    options.directionEpsilonSamples ?? DEFAULT_DIRECTION_EPSILON_SAMPLES;

  const samples = resamplePathByArcLength(stencil, SAMPLE_COUNT);

  if (traced.length === 0) {
    return EMPTY_TRACE_RESULT;
  }

  const matches = traced.map((point) => nearestSample(point, samples));

  const averageDistance = matches.reduce((sum, m) => sum + m.distance, 0) / matches.length;
  const accuracyScore = clamp(100 - (averageDistance / maxDistancePx) * 100, 0, 100);

  const coveredSampleIndices = new Set<number>();
  for (const sampleIndex of coveredIndices(samples, traced, tolerancePx)) {
    coveredSampleIndices.add(sampleIndex);
  }
  const coveragePercent = (coveredSampleIndices.size / samples.length) * 100;

  const directionFactor = computeDirectionFactor(matches, directionEpsilonSamples);

  const score = clamp(
    coveragePercent * (accuracyScore / 100) * directionFactor,
    0,
    100,
  );

  return {
    score: Math.round(score),
    averageDistance: Math.round(averageDistance * 100) / 100,
    coveragePercent: Math.round(coveragePercent),
    passed: score >= PASS_THRESHOLD,
  };
}

/** Indices of stencil samples that have at least one traced point within `tolerancePx`. */
function coveredIndices(samples: Point[], traced: Point[], tolerancePx: number): number[] {
  const covered: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    const isCovered = traced.some((point) => distance(point, samples[i]) <= tolerancePx);
    if (isCovered) {
      covered.push(i);
    }
  }
  return covered;
}

/**
 * Fraction of consecutive traced-point steps that move forward (or hold roughly still) along the
 * stencil, vs. backward. 1.0 means the trace consistently progressed in the stencil's intended
 * direction; near 0 means it was traced backwards.
 */
function computeDirectionFactor(
  matches: { index: number }[],
  epsilonSamples: number,
): number {
  if (matches.length < 2) {
    return 1;
  }

  let forwardSteps = 0;
  for (let i = 1; i < matches.length; i++) {
    if (matches[i].index >= matches[i - 1].index - epsilonSamples) {
      forwardSteps++;
    }
  }

  return forwardSteps / (matches.length - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
