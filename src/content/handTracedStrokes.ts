import handTracedConjuncts from '../../assets/data/devanagari-conjuncts-strokes.json';
import handTracedConsonants from '../../assets/data/devanagari-consonants-strokes.json';
import handTracedVowels from '../../assets/data/devanagari-vowels-strokes.json';
import { StencilPath } from '../engine';

import { RawCharacterContent } from './types';

/**
 * Canvas size the hand-tracing tool (tools/stroke-tracer.html) authors points in — its `INTERNAL`
 * constant. Every character is traced over the same centered, uniformly-sized guide glyph on that
 * fixed canvas, so there's no per-character bounding box to fit; a plain uniform scale (no
 * re-centering) reproduces the tracer's proportions exactly.
 */
const SOURCE_CANVAS_SIZE = 1200;

export type HandTracedStrokeData = Record<string, [number, number][][]>;

// The tracer tool exports one file per character group (vowels, consonants, ...); merged here so
// callers don't need to know about that split. Character keys don't overlap across the source
// files, so a plain merge is safe.
// JSON module imports infer plain `number[]` for each coordinate pair, not the `[number,
// number]` tuple `HandTracedStrokeData` expects, so a direct cast is rejected as "insufficient
// overlap" — going through `unknown` opts out of that check for what's actually just an
// untyped-JSON-shape mismatch, not a real type error.
const handTracedStrokesRaw: HandTracedStrokeData = {
  ...(handTracedVowels as unknown as HandTracedStrokeData),
  ...(handTracedConsonants as unknown as HandTracedStrokeData),
  ...(handTracedConjuncts as unknown as HandTracedStrokeData),
};

/**
 * Scales one hand-traced stroke from the tracer tool's 1200x1200 canvas into `viewBoxSize`,
 * dropping exact-duplicate consecutive points (an accidental double-tap mid-stroke in the tracer
 * produces a zero-length segment that's just noise once real movement exists elsewhere in the
 * stroke).
 *
 * If deduping would leave fewer than 2 points, the stroke wasn't an accidental double-tap — it was
 * a genuine single-tap "dot" mark (anusvara ं, visarga ः, a nuqta, etc., authored as one tap with
 * no drag). Those are normalized to an explicit zero-length 2-point segment instead of being
 * collapsed further, because the rest of the app requires >=2 points per stroke: react-native-svg
 * renders a zero-length path with `strokeLinecap="round"` as a round dot (so it's actually visible,
 * unlike a bare 1-point path, which draws nothing), and `resamplePathByArcLength` already has a
 * dedicated zero-length branch that returns N copies of the single point (so scoring/the guided
 * demo arrow both work — a 1-point path would throw there instead).
 */
export function normalizeHandTracedStroke(
  points: [number, number][],
  viewBoxSize: number,
  sourceCanvasSize: number = SOURCE_CANVAS_SIZE,
): StencilPath {
  const scale = viewBoxSize / sourceCanvasSize;
  const deduped = points.filter(
    (p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1],
  );
  const normalized = deduped.length >= 2 ? deduped : [points[0], points[0]];
  return normalized.map(([x, y]) => ({ x: x * scale, y: y * scale }));
}

/**
 * Overrides each Hindi character's strokes with its hand-traced version from
 * assets/data/devanagari-{vowels,consonants}-strokes.json (keyed by displayLabel), when a
 * non-empty entry exists. Characters without an entry are returned unchanged, so these files can
 * be filled in incrementally.
 */
export function applyHandTracedStrokes<T extends RawCharacterContent>(
  characters: T[],
  viewBoxSize: number,
  raw: HandTracedStrokeData = handTracedStrokesRaw as HandTracedStrokeData,
): T[] {
  return characters.map((character) => {
    if (character.script !== 'hindi') {
      return character;
    }
    const handTraced = raw[character.displayLabel];
    if (!handTraced || handTraced.length === 0) {
      return character;
    }
    return {
      ...character,
      strokes: handTraced.map((stroke) => normalizeHandTracedStroke(stroke, viewBoxSize)),
      note: 'Hand-traced via tools/stroke-tracer.html; source data in assets/data/devanagari-vowels-strokes.json, devanagari-consonants-strokes.json, and devanagari-conjuncts-strokes.json.',
    };
  });
}
