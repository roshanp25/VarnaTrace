import { CharacterContent } from '../../../content';
import { isCharacterAccessible } from '../access';

function character(tier: CharacterContent['tier']): CharacterContent {
  return {
    id: 'en-a-upper',
    script: 'english',
    category: 'letter',
    displayLabel: 'A',
    tier,
    strokes: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    ],
  };
}

describe('isCharacterAccessible', () => {
  it('is always accessible when free, regardless of unlock state', () => {
    expect(isCharacterAccessible(character('free'), false)).toBe(true);
    expect(isCharacterAccessible(character('free'), true)).toBe(true);
  });

  it('is only accessible when paid and content has been unlocked', () => {
    expect(isCharacterAccessible(character('paid'), false)).toBe(false);
    expect(isCharacterAccessible(character('paid'), true)).toBe(true);
  });
});
