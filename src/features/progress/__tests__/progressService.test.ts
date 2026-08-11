import { StorageService } from '../../../services/storage';
import { getCompletedCharacterIds, markCharacterCompleted } from '../progressService';

function createFakeStorage(): StorageService {
  const store = new Map<string, unknown>();
  return {
    async getItem<T>(key: string) {
      return (store.has(key) ? (store.get(key) as T) : null);
    },
    async setItem<T>(key: string, value: T) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe('progressService', () => {
  it('returns an empty list when nothing has been completed yet', async () => {
    const storage = createFakeStorage();
    expect(await getCompletedCharacterIds(storage)).toEqual([]);
  });

  it('records a completed character', async () => {
    const storage = createFakeStorage();
    await markCharacterCompleted('hi-vowel-a', storage);
    expect(await getCompletedCharacterIds(storage)).toEqual(['hi-vowel-a']);
  });

  it('accumulates multiple distinct characters', async () => {
    const storage = createFakeStorage();
    await markCharacterCompleted('hi-vowel-a', storage);
    await markCharacterCompleted('en-l-upper', storage);
    expect(await getCompletedCharacterIds(storage)).toEqual(['hi-vowel-a', 'en-l-upper']);
  });

  it('does not duplicate a character marked completed twice', async () => {
    const storage = createFakeStorage();
    await markCharacterCompleted('hi-vowel-a', storage);
    await markCharacterCompleted('hi-vowel-a', storage);
    expect(await getCompletedCharacterIds(storage)).toEqual(['hi-vowel-a']);
  });
});
