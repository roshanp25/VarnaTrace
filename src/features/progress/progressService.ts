import { storageService as defaultStorageService, StorageService } from '../../services/storage';

const COMPLETED_CHARACTER_IDS_KEY = 'varnatrace.progress.completedCharacterIds';

/** Character IDs the child has passed at least once. */
export async function getCompletedCharacterIds(
  storage: StorageService = defaultStorageService,
): Promise<string[]> {
  return (await storage.getItem<string[]>(COMPLETED_CHARACTER_IDS_KEY)) ?? [];
}

/** Records a character as passed. No-ops if it's already recorded. */
export async function markCharacterCompleted(
  id: string,
  storage: StorageService = defaultStorageService,
): Promise<void> {
  const completed = await getCompletedCharacterIds(storage);
  if (completed.includes(id)) {
    return;
  }
  await storage.setItem(COMPLETED_CHARACTER_IDS_KEY, [...completed, id]);
}
