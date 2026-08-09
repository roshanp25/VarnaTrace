import englishLetters from './english/letters.json';
import hindiVowels from './hindi/vowels.json';
import numbers from './numbers/numbers.json';
import { CharacterContent, CharacterContentFile } from './types';

const files = [englishLetters, hindiVowels, numbers] as CharacterContentFile[];

export const allCharacters: CharacterContent[] = files.flatMap((file) => file.characters);

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
