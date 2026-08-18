import { isDotStroke, pointsToSvgPath } from '../svgPath';

describe('pointsToSvgPath', () => {
  it('renders a polyline for 2+ points', () => {
    expect(pointsToSvgPath([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe('M 0 0 L 1 1');
  });

  it('renders a bare moveto with no visible line for a single point', () => {
    expect(pointsToSvgPath([{ x: 5, y: 5 }])).toBe('M 5 5');
  });
});

describe('isDotStroke', () => {
  it('is false for an empty stroke', () => {
    expect(isDotStroke([])).toBe(false);
  });

  it('is false for a stroke with distinct points', () => {
    expect(isDotStroke([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
  });

  it('is true for a single-point stroke', () => {
    expect(isDotStroke([{ x: 5, y: 5 }])).toBe(true);
  });

  it('is true for a zero-length multi-point stroke (e.g. a normalized dot mark)', () => {
    expect(isDotStroke([{ x: 5, y: 5 }, { x: 5, y: 5 }])).toBe(true);
  });
});
