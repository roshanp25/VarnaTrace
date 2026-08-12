import { StorageService } from '../../../services/storage';
import { hasUnlockedPaidContent, unlockPaidContent } from '../entitlementService';

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

describe('entitlementService', () => {
  it('defaults to not unlocked', async () => {
    const storage = createFakeStorage();
    expect(await hasUnlockedPaidContent(storage)).toBe(false);
  });

  it('reports unlocked after unlockPaidContent is called', async () => {
    const storage = createFakeStorage();
    await unlockPaidContent(storage);
    expect(await hasUnlockedPaidContent(storage)).toBe(true);
  });
});
