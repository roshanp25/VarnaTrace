import { distance, nearestSample, resamplePathByArcLength } from './geometry';
import { Point, StencilPath } from './types';

export interface ScoringOptions {
  /** Distance (in stencil coordinate units, whatever scale the caller's stencil data uses) within which a traced point counts as "on" the path. */
  tolerance?: number;
  /** Distance (in stencil coordinate units) beyond which a traced point contributes zero to the accuracy score. */
  maxDistance?: number;
  /** How many stencil samples of backward movement are tolerated as natural wobble, not a direction violation. */
  directionEpsilonSamples?: number;
  /** Minimum score for a trace to count as a pass. Defaults to PASS_THRESHOLD. */
  passThreshold?: number;
}

export interface TraceScoreResult {
  /** 0-100 overall score, combining accuracy, coverage, and direction. */
  score: number;
  /** Mean distance of traced points from the stencil path, or null if there were no traced points. */
  averageDistance: number | null;
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

const DEFAULT_TOLERANCE = 14;
const DEFAULT_MAX_DISTANCE = 32;
const DEFAULT_DIRECTION_EPSILON_SAMPLES = 6;

/** Minimum score for a trace to count as a pass, shared with the UI so both agree on "good enough". */
export const PASS_THRESHOLD = 55;

/**
 * Below this, a stroke is considered bad enough that the tracing UI offers a silent redo rather
 * than accepting it outright. Deliberately well under PASS_THRESHOLD so redos trigger only on
 * genuinely off strokes, not near-misses.
 */
export const RETRY_THRESHOLD = 40;

/**
 * Below this, a stroke isn't just weak — it reads as a genuine miss (traced far from the stencil
 * with little to no coverage). Deliberately well under RETRY_THRESHOLD, so only a real "drew
 * somewhere else" attempt gets the stronger single-stroke demo replay instead of the lightweight
 * "Try again!" pill every other retry gets.
 */
export const MISS_THRESHOLD = 15;

export function scoreTrace(
  stencil: StencilPath,
  traced: Point[],
  options: ScoringOptions = {},
): TraceScoreResult {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const maxDistance = options.maxDistance ?? DEFAULT_MAX_DISTANCE;
  const directionEpsilonSamples =
    options.directionEpsilonSamples ?? DEFAULT_DIRECTION_EPSILON_SAMPLES;
  const passThreshold = options.passThreshold ?? PASS_THRESHOLD;

  const samples = resamplePathByArcLength(stencil, SAMPLE_COUNT);

  if (traced.length === 0) {
    return { score: 0, averageDistance: null, coveragePercent: 0, passed: false };
  }

  const matches = traced.map((point) => nearestSample(point, samples));

  const averageDistance = matches.reduce((sum, m) => sum + m.distance, 0) / matches.length;
  const accuracyScore = clamp(100 - (averageDistance / maxDistance) * 100, 0, 100);

  const coveredSampleIndices = new Set<number>();
  for (const sampleIndex of coveredIndices(samples, traced, tolerance)) {
    coveredSampleIndices.add(sampleIndex);
  }
  const coveragePercent = (coveredSampleIndices.size / samples.length) * 100;

  const directionFactor = computeDirectionFactor(matches, directionEpsilonSamples);

  const rawScore = clamp(coveragePercent * (accuracyScore / 100) * directionFactor, 0, 100);
  const score = Math.round(rawScore);

  return {
    score,
    averageDistance: Math.round(averageDistance * 100) / 100,
    coveragePercent: Math.round(coveragePercent),
    passed: score >= passThreshold,
  };
}

/** Indices of stencil samples that have at least one traced point within `tolerance`. */
function coveredIndices(samples: Point[], traced: Point[], tolerance: number): number[] {
  const covered: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    const isCovered = traced.some((point) => distance(point, samples[i]) <= tolerance);
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
  matches: ReturnType<typeof nearestSample>[],
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
