import { AsyncStorageService } from '../AsyncStorageService';

describe('AsyncStorageService', () => {
  const storage = new AsyncStorageService();

  it('returns null for a key that was never set', async () => {
    expect(await storage.getItem('missing-key')).toBeNull();
  });

  it('round-trips a stored value', async () => {
    const value = { unlocked: true, count: 3 };
    await storage.setItem('progress', value);
    expect(await storage.getItem('progress')).toEqual(value);
  });

  it('returns null after a value is removed', async () => {
    await storage.setItem('temp', 'value');
    await storage.removeItem('temp');
    expect(await storage.getItem('temp')).toBeNull();
  });
});
