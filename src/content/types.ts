import { StencilPath } from '../engine';

export type Script = 'english' | 'hindi' | 'number';
export type Category = 'letter' | 'letter-lower' | 'vowel' | 'consonant' | 'conjunct' | 'number';
export type Tier = 'free' | 'paid';

export interface RawCharacterContent {
  /** Stable identifier, e.g. "en-l-upper", "hi-vowel-a", "num-7". Never reused or repurposed. */
  id: string;
  script: Script;
  category: Category;
  /** The glyph shown to the child, e.g. "A", "अ", "7". */
  displayLabel: string;
  /** Optional flag for content that isn't production-ready yet, e.g. an unverified placeholder shape. */
  note?: string;
  /**
   * One or more strokes the child traces in order, each in a 0-300 square coordinate space.
   * Most real letters need more than one stroke (e.g. "A", "T", most Hindi consonants with a
   * separate shirorekha headline) — the current tracing UI only drives a single stroke per
   * character, so every character shipped so far is deliberately single-stroke. Multi-stroke
   * playback in TracingCanvas is a known, not-yet-built follow-up; the array shape is here now so
   * adding it later doesn't require changing this schema or the JSON files again.
   */
  strokes: StencilPath[];
}

/**
 * The content-JSON files don't carry `tier` themselves — see `src/content/tiers.ts` for why (it's
 * the single place that decides free vs paid, so that decision can move around without touching
 * per-script content files). `applyTiers` adds `tier` at load time to produce this final shape.
 */
export interface CharacterContent extends RawCharacterContent {
  tier: Tier;
}

export interface CharacterContentFile {
  version: number;
  characters: RawCharacterContent[];
}
