import englishLetters from './english/letters.json';
import { applyHandTracedStrokes } from './handTracedStrokes';
import hindiConjuncts from './hindi/conjuncts.json';
import hindiConsonants from './hindi/consonants.json';
import hindiVowels from './hindi/vowels.json';
import numbers from './numbers/numbers.json';
import { applyTiers } from './tiers';
import { CharacterContent, CharacterContentFile } from './types';

const files = [
  englishLetters,
  hindiVowels,
  hindiConsonants,
  hindiConjuncts,
  numbers,
] as CharacterContentFile[];

/** Must match TracingCanvas's own DEFAULT_VIEW_BOX_SIZE — content is authored in this space. */
const VIEW_BOX_SIZE = 300;

export const allCharacters: CharacterContent[] = applyTiers(
  applyHandTracedStrokes(
    files.flatMap((file) => file.characters),
    VIEW_BOX_SIZE,
  ),
);

export function getCharacterById(id: string): CharacterContent | undefined {
  return allCharacters.find((character) => character.id === id);
}

export function getCharactersByScript(script: CharacterContent['script']): CharacterContent[] {
  return allCharacters.filter((character) => character.script === script);
}

export function getFreeCharacters(): CharacterContent[] {
  return allCharacters.filter((character) => character.tier === 'free');
}

export type { CharacterContent, CharacterContentFile, Category, Script, Tier } from './types';
