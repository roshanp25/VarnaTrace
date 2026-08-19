import { storageService as defaultStorageService, StorageService } from '../../services/storage';

const COMPLETED_CHARACTER_IDS_KEY = 'varnatrace.progress.completedCharacterIds';
const LAST_TRACED_CHARACTER_ID_KEY = 'varnatrace.progress.lastTracedCharacterId';
const COMPLETION_DATES_KEY = 'varnatrace.progress.completionDates';

/** Character IDs the child has passed at least once. */
export async function getCompletedCharacterIds(
  storage: StorageService = defaultStorageService,
): Promise<string[]> {
  return (await storage.getItem<string[]>(COMPLETED_CHARACTER_IDS_KEY)) ?? [];
}

/** Most recently passed character, for a home-screen "continue" shortcut. Null before any pass. */
export async function getLastTracedCharacterId(
  storage: StorageService = defaultStorageService,
): Promise<string | null> {
  return (await storage.getItem<string>(LAST_TRACED_CHARACTER_ID_KEY)) ?? null;
}

/** Device-local YYYY-MM-DD for each day with at least one pass, oldest first. Feeds computeStreak. */
export async function getCompletionDates(
  storage: StorageService = defaultStorageService,
): Promise<string[]> {
  return (await storage.getItem<string[]>(COMPLETION_DATES_KEY)) ?? [];
}

/**
 * Records a character as passed: adds it to the completed set (no-op if already there), points
 * the "continue" shortcut at it regardless, and logs today against the streak history.
 */
export async function markCharacterCompleted(
  id: string,
  storage: StorageService = defaultStorageService,
): Promise<void> {
  const completed = await getCompletedCharacterIds(storage);
  if (!completed.includes(id)) {
    await storage.setItem(COMPLETED_CHARACTER_IDS_KEY, [...completed, id]);
  }

  await storage.setItem(LAST_TRACED_CHARACTER_ID_KEY, id);

  const today = toDateKey(new Date());
  const dates = await getCompletionDates(storage);
  if (!dates.includes(today)) {
    await storage.setItem(COMPLETION_DATES_KEY, [...dates, today]);
  }
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Current consecutive-day streak, counting back from today. A day with nothing traced yet still
 * keeps yesterday's streak "alive" (so it doesn't zero out first thing in the morning) — it only
 * breaks once a full day passes with no trace at all.
 */
export function computeStreak(dates: string[], today: Date = new Date()): number {
  const traced = new Set(dates);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!traced.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!traced.has(toDateKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (traced.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
