import { Script } from '../content';

/**
 * System/platform default fonts don't reliably include good Devanagari glyphs (rendering can come
 * out malformed depending on the OS/browser's font-fallback choice), so Hindi text explicitly uses
 * a bundled font instead of leaving it to fallback. English/numbers use the platform default.
 */
export function fontFamilyForScript(script: Script): string | undefined {
  return script === 'hindi' ? 'NotoSansDevanagari_400Regular' : undefined;
}
