import { applyHandTracedStrokes, normalizeHandTracedStroke } from '../handTracedStrokes';
import { CharacterContent } from '../types';

describe('normalizeHandTracedStroke', () => {
  it('uniformly scales points from the tracer tool canvas into the target viewBox', () => {
    const points: [number, number][] = [
      [0, 0],
      [1200, 1200],
      [600, 300],
    ];

    expect(normalizeHandTracedStroke(points, 300)).toEqual([
      { x: 0, y: 0 },
      { x: 300, y: 300 },
      { x: 150, y: 75 },
    ]);
  });

  it('respects a custom source canvas size', () => {
    expect(normalizeHandTracedStroke([[100, 100]], 300, 1000)).toEqual([
      { x: 30, y: 30 },
      { x: 30, y: 30 },
    ]);
  });

  it('drops an exact-duplicate consecutive point (e.g. an accidental double-tap)', () => {
    const points: [number, number][] = [
      [0, 0],
      [600, 600],
      [600, 600],
      [1200, 0],
    ];

    expect(normalizeHandTracedStroke(points, 300)).toEqual([
      { x: 0, y: 0 },
      { x: 150, y: 150 },
      { x: 300, y: 0 },
    ]);
  });

  it('preserves a genuine single-tap "dot" stroke (e.g. anusvara/visarga/nuqta) as a zero-length 2-point segment, instead of collapsing it to an unrenderable single point', () => {
    const points: [number, number][] = [
      [799, 168],
      [799, 168],
    ];

    expect(normalizeHandTracedStroke(points, 300)).toEqual([
      { x: 199.75, y: 42 },
      { x: 199.75, y: 42 },
    ]);
  });
});

describe('applyHandTracedStrokes', () => {
  const placeholder: CharacterContent = {
    id: 'hi-vowel-a',
    script: 'hindi',
    category: 'vowel',
    displayLabel: 'अ',
    tier: 'free',
    strokes: [
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    ],
  };
  const englishLetter: CharacterContent = {
    id: 'en-l-upper',
    script: 'english',
    category: 'letter',
    displayLabel: 'L',
    tier: 'free',
    strokes: [
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    ],
  };

  it('leaves a character unchanged when no hand-traced entry exists for it', () => {
    const result = applyHandTracedStrokes([placeholder], 300, {});
    expect(result[0]).toEqual(placeholder);
  });

  it('leaves a character unchanged when its entry is an empty stroke list', () => {
    const result = applyHandTracedStrokes([placeholder], 300, { अ: [] });
    expect(result[0]).toEqual(placeholder);
  });

  it('overrides strokes (normalized) when a hand-traced entry exists, and updates the note', () => {
    const raw = {
      अ: [
        [
          [0, 0],
          [1200, 1200],
        ] as [number, number][],
      ],
    };

    const result = applyHandTracedStrokes([placeholder], 300, raw);

    expect(result[0].strokes).toEqual([
      [
        { x: 0, y: 0 },
        { x: 300, y: 300 },
      ],
    ]);
    expect(result[0].note).toMatch(/hand-traced/i);
    // everything else about the character is preserved
    expect(result[0].id).toBe(placeholder.id);
    expect(result[0].tier).toBe(placeholder.tier);
  });

  it('never applies overrides to non-Hindi characters, even by coincidental key match', () => {
    const result = applyHandTracedStrokes([englishLetter], 300, { L: [[[0, 0], [10, 10]] as [number, number][]] });
    expect(result[0]).toEqual(englishLetter);
  });
});
