import { Category, Script } from '../content';

/** Plain script display names — shared across the root nav titles, Home, and the category grid. */
export const SCRIPT_LABELS: Record<Script, string> = {
  english: 'English',
  hindi: 'Hindi',
  number: 'Numbers',
};

/** Short subhead shown under a script's title on the category grid. */
export const SCRIPT_TAGLINES: Record<Script, string> = {
  english: 'A to Z',
  hindi: 'वर्णमाला',
  number: '1 to 50',
};

/** Section header copy for a category grid group. Only shown when a script has >1 category. */
export const CATEGORY_LABELS: Record<Category, string> = {
  letter: 'Uppercase',
  'letter-lower': 'Lowercase',
  vowel: 'Vowels · स्वर',
  consonant: 'Consonants · व्यंजन',
  conjunct: 'Conjuncts · संयुक्ताक्षर',
  number: 'Numbers',
};

/** Fixed group order for the category grid; unlisted categories are appended at the end. */
export const CATEGORY_ORDER: Category[] = ['letter', 'letter-lower', 'vowel', 'consonant', 'conjunct', 'number'];
