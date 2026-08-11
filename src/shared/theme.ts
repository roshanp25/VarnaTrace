import { Script } from '../content';

/**
 * Fixed light-mode design tokens (app.json pins userInterfaceStyle: "light" app-wide, so unlike a
 * themeable web page, there's exactly one palette to support).
 *
 * Each category color has three roles, not one:
 * - the base tone for borders/badges/decorative fills,
 * - a `Soft` tint for card/tile backgrounds,
 * - an `Ink` tone for anything rendering as text/glyphs on top of `Soft`.
 * `Ink` exists because a single mid-tone color reused as both a soft background and its own text
 * color measures well under WCAG AA contrast (verified: hindi accent alone was ~2.6:1 on its own
 * soft tint). Every `*Ink` value below is verified at 4.5:1+ against both its matching `Soft`
 * background and `paper`.
 */
export const Colors = {
  ink: '#241B45',
  paper: '#FFFDF8',

  english: '#226B87',
  englishSoft: '#D6E9EE',
  englishInk: '#226B87',

  hindi: '#E0921E',
  hindiSoft: '#FBEACB',
  hindiInk: '#7A4200',

  numbers: '#457A44',
  numbersSoft: '#DEEBDC',
  numbersInk: '#355C34',

  gold: '#E3A022',
  goldSoft: '#FBEBC6',

  neutralBg: '#F1EEF8',
  neutralText: '#6B6485',
  neutralMuted: '#8A83A0',
} as const;

export interface CategoryColors {
  fill: string;
  soft: string;
  ink: string;
}

const categoryColorsByScript: Record<Script, CategoryColors> = {
  english: { fill: Colors.english, soft: Colors.englishSoft, ink: Colors.englishInk },
  hindi: { fill: Colors.hindi, soft: Colors.hindiSoft, ink: Colors.hindiInk },
  number: { fill: Colors.numbers, soft: Colors.numbersSoft, ink: Colors.numbersInk },
};

export function getCategoryColors(script: Script): CategoryColors {
  return categoryColorsByScript[script];
}
