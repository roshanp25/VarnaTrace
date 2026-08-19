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
 * soft tint). Every `*Ink` value below is verified at 4.5:1+ against `Soft`, `paper`, and `panel`.
 *
 * `brand` is the one accent that isn't tied to a script — used for primary CTAs so a subscribe
 * button doesn't compete with any category color. `panel` is the shared card background (cards
 * carry their color via ring/glyph accents now, not a per-category tinted fill).
 */
export const Colors = {
  ink: '#241B45',
  paper: '#FFFDF8',
  /**
   * Screen background — a warm tan, deliberately deeper than `paper`/`panel` so cards read as
   * lighter surfaces sitting on top of it, instead of a near-white screen where cards barely
   * registered as distinct from the page (the flat, "empty" look flagged in testing).
   */
  background: '#F1E9DD',
  panel: '#FBF1DD',
  brand: '#6C4DFF',

  english: '#2FB8E6',
  englishSoft: '#DCF3FC',
  englishInk: '#0E6E8C',

  hindi: '#FF9B2F',
  hindiSoft: '#FFEBD1',
  hindiInk: '#95500A',

  numbers: '#4CD07D',
  numbersSoft: '#DFF9E7',
  numbersInk: '#1D7A3E',

  gold: '#FFD23F',
  goldSoft: '#FFF3C9',

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
