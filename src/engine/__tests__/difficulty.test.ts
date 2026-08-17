import { DIFFICULTY_CONFIGS } from '../difficulty';

describe('DIFFICULTY_CONFIGS', () => {
  it('makes easy strictly more lenient than difficult on every scoring knob', () => {
    const { easy, difficult } = DIFFICULTY_CONFIGS;

    expect(easy.scoring.tolerance).toBeGreaterThan(difficult.scoring.tolerance);
    expect(easy.scoring.maxDistance).toBeGreaterThan(difficult.scoring.maxDistance);
    expect(easy.scoring.directionEpsilonSamples).toBeGreaterThan(difficult.scoring.directionEpsilonSamples);
    expect(easy.scoring.passThreshold).toBeLessThan(difficult.scoring.passThreshold);
    expect(easy.threeStarThreshold).toBeLessThan(difficult.threeStarThreshold);
  });

  it('gives easy an average-based multi-stroke pass rule, a retry mechanic, and the guided demo', () => {
    expect(DIFFICULTY_CONFIGS.easy.scoring.requireEveryStrokeToPass).toBe(false);
    expect(DIFFICULTY_CONFIGS.easy.retryThreshold).not.toBeNull();
    expect(DIFFICULTY_CONFIGS.easy.maxStrokeAttempts).toBeGreaterThan(1);
    expect(DIFFICULTY_CONFIGS.easy.guidedDemo).toBe(true);
  });

  it('gives difficult an every-stroke-must-pass rule, no retry mechanic, and no guided demo', () => {
    expect(DIFFICULTY_CONFIGS.difficult.scoring.requireEveryStrokeToPass).toBe(true);
    expect(DIFFICULTY_CONFIGS.difficult.retryThreshold).toBeNull();
    expect(DIFFICULTY_CONFIGS.difficult.maxStrokeAttempts).toBe(1);
    expect(DIFFICULTY_CONFIGS.difficult.guidedDemo).toBe(false);
  });

  it('keeps retryThreshold safely below passThreshold so redos only fire on genuinely weak strokes', () => {
    const { easy } = DIFFICULTY_CONFIGS;
    expect(easy.retryThreshold).not.toBeNull();
    expect(easy.retryThreshold as number).toBeLessThan(easy.scoring.passThreshold);
  });
});
