import { allCharacters, getCharacterById, getCharactersByScript, getFreeCharacters } from '../index';

describe('content data', () => {
  it('loads at least one character', () => {
    expect(allCharacters.length).toBeGreaterThan(0);
  });

  it('has a unique, non-empty id for every character', () => {
    const ids = allCharacters.map((c) => c.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every character at least one stroke with at least two points', () => {
    for (const character of allCharacters) {
      expect(character.strokes.length).toBeGreaterThan(0);
      for (const stroke of character.strokes) {
        expect(stroke.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('includes at least one free and one paid character, so gating has both to work with', () => {
    expect(allCharacters.some((c) => c.tier === 'free')).toBe(true);
    expect(allCharacters.some((c) => c.tier === 'paid')).toBe(true);
  });

  it('includes both english and hindi scripts', () => {
    expect(getCharactersByScript('english').length).toBeGreaterThan(0);
    expect(getCharactersByScript('hindi').length).toBeGreaterThan(0);
  });

  it('finds a character by id, and returns undefined for an unknown one', () => {
    const first = allCharacters[0];
    expect(getCharacterById(first.id)).toEqual(first);
    expect(getCharacterById('not-a-real-id')).toBeUndefined();
  });

  it('getFreeCharacters returns only free-tier characters', () => {
    const free = getFreeCharacters();
    expect(free.length).toBeGreaterThan(0);
    expect(free.every((c) => c.tier === 'free')).toBe(true);
  });
});
