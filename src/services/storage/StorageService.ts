/**
 * Abstraction over local persistence. Features must depend on this interface, never on
 * AsyncStorage (or any other storage primitive) directly — that's what lets us swap in a real
 * backend later without touching feature code.
 */
export interface StorageService {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}
