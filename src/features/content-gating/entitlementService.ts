import { storageService as defaultStorageService, StorageService } from '../../services/storage';

const HAS_UNLOCKED_PAID_CONTENT_KEY = 'varnatrace.gating.hasUnlockedPaidContent';

/** Whether the child/parent has unlocked paid content (via IAP, once that's built). Defaults false. */
export async function hasUnlockedPaidContent(
  storage: StorageService = defaultStorageService,
): Promise<boolean> {
  return (await storage.getItem<boolean>(HAS_UNLOCKED_PAID_CONTENT_KEY)) ?? false;
}

/**
 * Records paid content as unlocked. Not called anywhere yet — this is the seam the future IAP
 * purchase flow will call into once it exists, so gating enforcement doesn't need to be rewired
 * when that lands.
 */
export async function unlockPaidContent(
  storage: StorageService = defaultStorageService,
): Promise<void> {
  await storage.setItem(HAS_UNLOCKED_PAID_CONTENT_KEY, true);
}
