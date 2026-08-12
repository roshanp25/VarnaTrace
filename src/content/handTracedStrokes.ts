import handTracedConjuncts from '../../assets/data/devanagari-conjuncts-strokes.json';
import handTracedConsonants from '../../assets/data/devanagari-consonants-strokes.json';
import handTracedVowels from '../../assets/data/devanagari-vowels-strokes.json';
import { StencilPath } from '../engine';

import { CharacterContent } from './types';

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
 * dropping any exact-duplicate consecutive point (an accidental double-tap in the tracer produces
 * a zero-length segment, which the app's content schema treats as invalid).
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
  return deduped.map(([x, y]) => ({ x: x * scale, y: y * scale }));
}

/**
 * Overrides each Hindi character's strokes with its hand-traced version from
 * assets/data/devanagari-{vowels,consonants}-strokes.json (keyed by displayLabel), when a
 * non-empty entry exists. Characters without an entry are returned unchanged, so these files can
 * be filled in incrementally.
 */
export function applyHandTracedStrokes(
  characters: CharacterContent[],
  viewBoxSize: number,
  raw: HandTracedStrokeData = handTracedStrokesRaw as HandTracedStrokeData,
): CharacterContent[] {
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
