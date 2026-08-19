import { StorageService } from '../../../services/storage';
import {
  computeStreak,
  getCompletedCharacterIds,
  getCompletionDates,
  getLastTracedCharacterId,
  markCharacterCompleted,
} from '../progressService';

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

  it('has no last-traced character before anything is completed', async () => {
    const storage = createFakeStorage();
    expect(await getLastTracedCharacterId(storage)).toBeNull();
  });

  it('points the last-traced character at the most recent completion, even a repeat', async () => {
    const storage = createFakeStorage();
    await markCharacterCompleted('hi-vowel-a', storage);
    await markCharacterCompleted('en-l-upper', storage);
    expect(await getLastTracedCharacterId(storage)).toBe('en-l-upper');
    await markCharacterCompleted('hi-vowel-a', storage);
    expect(await getLastTracedCharacterId(storage)).toBe('hi-vowel-a');
  });

  it('logs today once per day, not once per completion', async () => {
    const storage = createFakeStorage();
    await markCharacterCompleted('hi-vowel-a', storage);
    await markCharacterCompleted('en-l-upper', storage);
    expect(await getCompletionDates(storage)).toHaveLength(1);
  });
});

describe('computeStreak', () => {
  it('is 0 with no completion history', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('is 1 when only today has a completion', () => {
    const today = new Date(2026, 7, 19);
    expect(computeStreak(['2026-08-19'], today)).toBe(1);
  });

  it('counts back consecutive days ending today', () => {
    const today = new Date(2026, 7, 19);
    expect(computeStreak(['2026-08-17', '2026-08-18', '2026-08-19'], today)).toBe(3);
  });

  it('stays alive through today if the last trace was yesterday', () => {
    const today = new Date(2026, 7, 19);
    expect(computeStreak(['2026-08-17', '2026-08-18'], today)).toBe(2);
  });

  it('breaks once a full day is skipped', () => {
    const today = new Date(2026, 7, 19);
    expect(computeStreak(['2026-08-15', '2026-08-16'], today)).toBe(0);
  });

  it('ignores dates unconnected to the current run', () => {
    const today = new Date(2026, 7, 19);
    expect(computeStreak(['2026-08-01', '2026-08-18', '2026-08-19'], today)).toBe(2);
  });
});
