import { CharacterContent } from '../../content';

/** A free character is always accessible; a paid one only while the subscription is active. */
export function isCharacterAccessible(character: CharacterContent, isSubscribed: boolean): boolean {
  return character.tier === 'free' || isSubscribed;
}
