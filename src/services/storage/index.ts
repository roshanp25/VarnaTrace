import { AsyncStorageService } from './AsyncStorageService';
import { StorageService } from './StorageService';

export type { StorageService };

export const storageService: StorageService = new AsyncStorageService();
