import { MultiStrokeScoringOptions } from './scoreMultiStrokeTrace';
import { MISS_THRESHOLD, PASS_THRESHOLD, RETRY_THRESHOLD } from './scoreTrace';

export type Difficulty = 'easy' | 'difficult';

export interface DifficultyConfig {
  /** Threaded straight into scoreTrace/scoreMultiStrokeTrace. */
  scoring: Required<MultiStrokeScoringOptions>;
  /** Score threshold for a 3-star rating (2-star is scoring.passThreshold). */
  threeStarThreshold: number;
  /**
   * Below this, a weak stroke gets a silent redo instead of being accepted outright. Null
   * disables the retry mechanic entirely — every attempt is final.
   */
  retryThreshold: number | null;
  /** Attempts allowed on one stroke (initial + redos) before it's accepted regardless of score. */
  maxStrokeAttempts: number;
  /** Whether the trace screen plays an animated arrow demo of the whole character before the child can draw. */
  guidedDemo: boolean;
  /**
   * Multiplies the stencil guide's and traced line's rendered width (TracingCanvas's
   * `guideStrokeWidth`/`traceStrokeWidth`). Purely visual — does not affect scoring tolerance —
   * so the drawing surface reads as more forgiving in Easy without changing what actually passes.
   */
  traceSurfaceWidthMultiplier: number;
  /**
   * Below this, a retried stroke gets a single-stroke guided-arrow replay instead of the plain
   * "Try again!" pill — reserved for a genuine miss, not just an imprecise attempt. Null when
   * `guidedDemo` is false (no demo to replay) or the mode has no retry mechanic at all.
   */
  missDemoThreshold: number | null;
}

export const DEFAULT_DIFFICULTY: Difficulty = 'easy';

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    scoring: {
      tolerance: 26,
      maxDistance: 90,
      directionEpsilonSamples: 10,
      passThreshold: PASS_THRESHOLD,
      requireEveryStrokeToPass: false,
    },
    threeStarThreshold: 80,
    retryThreshold: RETRY_THRESHOLD,
    maxStrokeAttempts: 3,
    guidedDemo: true,
    missDemoThreshold: MISS_THRESHOLD,
    traceSurfaceWidthMultiplier: 2.2,
  },
  difficult: {
    scoring: {
      tolerance: 8,
      maxDistance: 20,
      directionEpsilonSamples: 2,
      passThreshold: 70,
      requireEveryStrokeToPass: true,
    },
    threeStarThreshold: 90,
    retryThreshold: null,
    maxStrokeAttempts: 1,
    guidedDemo: false,
    missDemoThreshold: null,
    traceSurfaceWidthMultiplier: 1,
  },
};
