import { CharacterContent } from '../../content';

/** A free character is always accessible; a paid one only once paid content has been unlocked. */
export function isCharacterAccessible(
  character: CharacterContent,
  hasUnlockedPaidContent: boolean,
): boolean {
  return character.tier === 'free' || hasUnlockedPaidContent;
}
