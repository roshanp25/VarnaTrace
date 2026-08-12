import { applyTiers } from '../tiers';
import { RawCharacterContent } from '../types';

function raw(id: string): RawCharacterContent {
  return {
    id,
    script: 'english',
    category: 'letter',
    displayLabel: id,
    strokes: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    ],
  };
}

describe('applyTiers', () => {
  it('marks a known free id as free', () => {
    const [result] = applyTiers([raw('en-a-upper')]);
    expect(result.tier).toBe('free');
  });

  it('defaults an unlisted id to paid', () => {
    const [result] = applyTiers([raw('en-z-upper')]);
    expect(result.tier).toBe('paid');
  });

  it('preserves every other field unchanged', () => {
    const character = raw('num-1');
    const [result] = applyTiers([character]);
    expect(result).toEqual({ ...character, tier: 'free' });
  });
});
