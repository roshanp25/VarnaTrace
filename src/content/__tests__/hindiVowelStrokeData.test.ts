import { allCharacters } from '../index';

/**
 * Guards against a bad conversion-pipeline run silently producing unusable stencil data (see
 * tools/devanagari/import_stroke_order.py). These checks apply to every character, not just
 * imported Devanagari ones, since a placeholder or hand-authored character could regress the same
 * way.
 */
describe('stroke geometry validity', () => {
  for (const character of allCharacters) {
    describe(character.id, () => {
      it('has at least one stroke', () => {
        expect(character.strokes.length).toBeGreaterThan(0);
      });

      it('has only finite, non-NaN coordinates', () => {
        for (const stroke of character.strokes) {
          for (const point of stroke) {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
          }
        }
      });

      it('keeps every coordinate within the 0-300 stencil canvas', () => {
        for (const stroke of character.strokes) {
          for (const point of stroke) {
            expect(point.x).toBeGreaterThanOrEqual(0);
            expect(point.x).toBeLessThanOrEqual(300);
            expect(point.y).toBeGreaterThanOrEqual(0);
            expect(point.y).toBeLessThanOrEqual(300);
          }
        }
      });

      it('has no zero-length (immediately-duplicate) consecutive points, except a genuine 2-point dot stroke', () => {
        for (const stroke of character.strokes) {
          // A whole stroke of exactly 2 identical points is a real single-tap "dot" mark
          // (anusvara, visarga, a nuqta, etc.) preserved intentionally by
          // normalizeHandTracedStroke — not the duplicate-point pipeline defect this check
          // guards against. A duplicate anywhere else (within a longer stroke, or a run of 3+
          // identical points) still isn't valid.
          const isDotStroke =
            stroke.length === 2 && stroke[0].x === stroke[1].x && stroke[0].y === stroke[1].y;
          if (isDotStroke) {
            continue;
          }
          for (let i = 1; i < stroke.length; i++) {
            const dx = stroke[i].x - stroke[i - 1].x;
            const dy = stroke[i].y - stroke[i - 1].y;
            expect(Math.hypot(dx, dy)).toBeGreaterThan(0);
          }
        }
      });

      it('has no degenerate (single-point) strokes', () => {
        for (const stroke of character.strokes) {
          expect(stroke.length).toBeGreaterThanOrEqual(2);
        }
      });
    });
  }
});

describe('hi-vowel-a (अ) stroke data', () => {
  const character = allCharacters.find((c) => c.id === 'hi-vowel-a');

  it('exists and is no longer the placeholder single-stroke checkmark', () => {
    expect(character).toBeDefined();
    // The old placeholder was exactly one stroke; the real character needs more than one.
    expect(character!.strokes.length).toBeGreaterThan(1);
  });

  // अ is currently sourced from the hand-tracing tool (assets/data/devanagari-vowels-strokes.json)
  // via applyHandTracedStrokes, approved as 3 strokes: hook, connector+vertical (traced as one
  // continuous motion), flag. See src/content/handTracedStrokes.ts.
  it('has the 3 hand-traced strokes', () => {
    expect(character!.strokes.length).toBe(3);
  });

  it('notes its hand-traced provenance', () => {
    expect(character!.note).toMatch(/hand-traced/i);
  });

  // Locks in the exact geometry so a future change to the hand-traced source data or the
  // normalization pipeline (src/content/handTracedStrokes.ts) shows up as an intentional,
  // reviewable diff here instead of silently drifting.
  it('matches the last-reviewed geometry snapshot', () => {
    expect(character!.strokes).toMatchSnapshot();
  });
});
