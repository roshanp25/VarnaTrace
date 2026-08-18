import { resamplePathByArcLength } from '../geometry';

describe('resamplePathByArcLength', () => {
  it('throws for a path with fewer than two points', () => {
    expect(() => resamplePathByArcLength([{ x: 0, y: 0 }], 10)).toThrow(
      'resamplePathByArcLength requires at least two points',
    );
  });

  it('returns N copies of the single point for a zero-length path (e.g. a normalized dot stroke)', () => {
    const dot = { x: 5, y: 5 };
    const samples = resamplePathByArcLength([dot, dot], 4);

    expect(samples).toEqual([dot, dot, dot, dot]);
  });

  it('evenly resamples a straight line by arc length', () => {
    const samples = resamplePathByArcLength(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      3,
    );

    expect(samples).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ]);
  });
});
