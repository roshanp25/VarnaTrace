import { PASS_THRESHOLD, scoreTrace } from '../scoreTrace';
import { scoreMultiStrokeTrace } from '../scoreMultiStrokeTrace';
import { StencilPath } from '../types';
import { tracePoints } from './testHelpers';

/** An "L" shape: down the left side, then across the bottom — two strokes, as a real "L" is written. */
const lShapeStrokes: StencilPath[] = [
  [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
  ],
  [
    { x: 0, y: 100 },
    { x: 100, y: 100 },
  ],
];

describe('scoreMultiStrokeTrace', () => {
  it('scores a character where every stroke is traced well as a pass', () => {
    const traced = [tracePoints(0, 0, 0, 100, 20), tracePoints(0, 100, 100, 100, 20)];

    const result = scoreMultiStrokeTrace(lShapeStrokes, traced);

    expect(result.strokeResults).toHaveLength(2);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.passed).toBe(true);
  });

  it('fails overall if any single stroke is off-path, even if the other is perfect', () => {
    const traced = [
      tracePoints(0, 0, 0, 100, 20), // good
      tracePoints(0, 300, 100, 300, 20), // way off the second stroke's path
    ];

    const result = scoreMultiStrokeTrace(lShapeStrokes, traced);

    expect(result.strokeResults[0].passed).toBe(true);
    expect(result.strokeResults[1].passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('matches a single scoreTrace call when the character has exactly one stroke', () => {
    const singleStroke: StencilPath[] = [lShapeStrokes[0]];
    const traced = [tracePoints(0, 0, 0, 100, 20)];

    const multi = scoreMultiStrokeTrace(singleStroke, traced);
    const single = scoreTrace(singleStroke[0], traced[0]);

    expect(multi.score).toBe(single.score);
    expect(multi.passed).toBe(single.passed);
    expect(multi.strokeResults).toEqual([single]);
  });

  it('throws when the number of traced strokes does not match the number of stencil strokes', () => {
    expect(() => scoreMultiStrokeTrace(lShapeStrokes, [tracePoints(0, 0, 0, 100, 20)])).toThrow();
  });

  it('throws for a character with no strokes', () => {
    expect(() => scoreMultiStrokeTrace([], [])).toThrow();
  });

  it('exposes the same PASS_THRESHOLD the single-stroke engine uses', () => {
    expect(PASS_THRESHOLD).toBeGreaterThan(0);
  });
});
