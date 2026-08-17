import { PASS_THRESHOLD, scoreTrace } from '../scoreTrace';
import { StencilPath } from '../types';
import { tracePoints } from './testHelpers';

/** A straight horizontal line from (0,0) to (100,0), used as the stencil for every test below. */
const straightLine: StencilPath = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
];

describe('scoreTrace', () => {
  it('scores a precise, complete, forward trace highly', () => {
    const traced = tracePoints(0, 0, 100, 0, 40);

    const result = scoreTrace(straightLine, traced);

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.coveragePercent).toBeGreaterThanOrEqual(90);
    expect(result.averageDistance).toBeLessThan(2);
    expect(result.passed).toBe(true);
  });

  it('tolerates natural wobble around the path and still scores highly', () => {
    const traced = tracePoints(0, 0, 100, 0, 40).map((p, i) => ({
      ...p,
      // small alternating jitter, well within tolerance
      y: p.y + (i % 2 === 0 ? 3 : -3),
    }));

    const result = scoreTrace(straightLine, traced);

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.passed).toBe(true);
  });

  it('scores an off-path trace low', () => {
    const traced = tracePoints(0, 200, 100, 200, 40);

    const result = scoreTrace(straightLine, traced);

    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.passed).toBe(false);
  });

  it('scores an incomplete trace lower than a complete one', () => {
    const complete = tracePoints(0, 0, 100, 0, 40);
    const incomplete = tracePoints(0, 0, 30, 0, 12);

    const completeResult = scoreTrace(straightLine, complete);
    const incompleteResult = scoreTrace(straightLine, incomplete);

    expect(incompleteResult.coveragePercent).toBeLessThanOrEqual(45);
    expect(incompleteResult.score).toBeLessThan(completeResult.score);
    expect(incompleteResult.passed).toBe(false);
  });

  it('scores a backwards trace low even though it retraces the exact path', () => {
    const forward = tracePoints(0, 0, 100, 0, 40);
    const backwards = [...forward].reverse();

    const forwardResult = scoreTrace(straightLine, forward);
    const backwardsResult = scoreTrace(straightLine, backwards);

    expect(backwardsResult.score).toBeLessThanOrEqual(30);
    expect(backwardsResult.score).toBeLessThan(forwardResult.score);
    expect(backwardsResult.passed).toBe(false);
  });

  it('scores an empty trace as zero without throwing', () => {
    const result = scoreTrace(straightLine, []);

    expect(result.score).toBe(0);
    expect(result.coveragePercent).toBe(0);
    expect(result.averageDistance).toBeNull();
    expect(result.passed).toBe(false);
  });

  it('throws for a stencil path with fewer than two points', () => {
    expect(() => scoreTrace([{ x: 0, y: 0 }], tracePoints(0, 0, 100, 0, 10))).toThrow();
  });

  it('exposes the pass threshold used to compute `passed`', () => {
    expect(PASS_THRESHOLD).toBeGreaterThan(0);
    expect(PASS_THRESHOLD).toBeLessThanOrEqual(100);
  });

  it('honors a custom passThreshold over the default PASS_THRESHOLD', () => {
    const traced = tracePoints(0, 0, 100, 0, 40).map((p, i) => ({
      ...p,
      y: p.y + (i % 2 === 0 ? 3 : -3),
    }));

    const lenient = scoreTrace(straightLine, traced, { passThreshold: 1 });
    const strict = scoreTrace(straightLine, traced, { passThreshold: 99 });

    expect(lenient.score).toBe(strict.score);
    expect(lenient.passed).toBe(true);
    expect(strict.passed).toBe(false);
  });

  it('always agrees between the rounded score and `passed`', () => {
    // Regression guard: `passed` must be derived from the same rounded score that's returned,
    // not the pre-rounding value — otherwise e.g. a displayed score of 70 could come back
    // `passed: false` because the unrounded score was 69.6.
    const traces = [
      tracePoints(0, 0, 100, 0, 40),
      tracePoints(0, 0, 30, 0, 12),
      tracePoints(0, 200, 100, 200, 40),
      [...tracePoints(0, 0, 100, 0, 40)].reverse(),
      [],
    ];

    for (const traced of traces) {
      const result = scoreTrace(straightLine, traced);
      expect(result.passed).toBe(result.score >= PASS_THRESHOLD);
    }
  });
});
