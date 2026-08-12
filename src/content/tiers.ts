import { CharacterContent, RawCharacterContent, Tier } from './types';

/**
 * Single source of truth for which characters are free vs paid. Content JSON files intentionally
 * carry no tier field of their own (see `RawCharacterContent` in ./types) — moving a character
 * between free and paid means editing this one list, not hunting through five per-script content
 * files. An id not listed here defaults to paid (fail closed: a newly-authored character never
 * accidentally ships free).
 */
const FREE_CHARACTER_IDS: ReadonlySet<string> = new Set([
  // Hindi vowels — full set free (decided with the user, 2026-08-11).
  'hi-vowel-a',
  'hi-vowel-aa',
  'hi-vowel-i',
  'hi-vowel-ii',
  'hi-vowel-u',
  'hi-vowel-uu',
  'hi-vowel-ri',
  'hi-vowel-e',
  'hi-vowel-ai',
  'hi-vowel-o',
  'hi-vowel-au',
  'hi-vowel-am',
  'hi-vowel-ah',

  // English — a curated mix spread across the alphabet, not just the first few letters
  // (decided with the user, 2026-08-12).
  'en-a-upper',
  'en-i-upper',
  'en-l-upper',
  'en-o-upper',
  'en-t-upper',

  // Numbers 1-5 (decided with the user, 2026-08-12).
  'num-1',
  'num-2',
  'num-3',
  'num-4',
  'num-5',
]);

function tierForId(id: string): Tier {
  return FREE_CHARACTER_IDS.has(id) ? 'free' : 'paid';
}

export function applyTiers(characters: RawCharacterContent[]): CharacterContent[] {
  return characters.map((character) => ({
    ...character,
    tier: tierForId(character.id),
  }));
}
