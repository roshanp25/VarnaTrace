import { Script } from '../content';

/**
 * System/platform default fonts don't reliably include good Devanagari glyphs (rendering can come
 * out malformed depending on the OS/browser's font-fallback choice), so Hindi text explicitly uses
 * a bundled font instead of leaving it to fallback. English/numbers use the platform default.
 *
 * A custom font family ignores React Native's `fontWeight` style — there's no synthesized bold,
 * only whatever weight's ttf is actually loaded — so call sites that render bold English/number
 * text next to Hindi text must pass `bold: true` to get the loaded 700 weight, or Hindi renders
 * visibly thinner than its neighbors despite matching `fontWeight` styles.
 */
export function fontFamilyForScript(script: Script, bold = false): string | undefined {
  if (script !== 'hindi') {
    return undefined;
  }
  return bold ? 'NotoSansDevanagari_700Bold' : 'NotoSansDevanagari_400Regular';
}
