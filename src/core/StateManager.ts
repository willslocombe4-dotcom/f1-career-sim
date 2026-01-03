import type { StateListener, StateSubscription } from './types';

/**
 * Centralized state container for game data.
 * Supports subscriptions for reactive updates.
 */
export class StateManager {
  private state: Map<string, unknown> = new Map();
  private listeners: Map<string, Set<StateListener<unknown>>> = new Map();

  /**
   * Get a value from state.
   * @param key - The state key
   * @returns The value, or undefined if not set
   */
  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }

  /**
   * Set a value in state.
   * Notifies all subscribers of the change.
   * @param key - The state key
   * @param value - The value to store
   */
  set<T>(key: string, value: T): void {
    const oldValue = this.state.get(key) as T | undefined;
    this.state.set(key, value);
    this.notifyListeners(key, value, oldValue);
  }

  /**
   * Check if a key exists in state.
   * @param key - The state key
   */
  has(key: string): boolean {
    return this.state.has(key);
  }

  /**
   * Delete a key from state.
   * @param key - The state key
   */
  delete(key: string): void {
    this.state.delete(key);
  }

  /**
   * Subscribe to changes for a specific key.
   * @param key - The state key to watch
   * @param listener - Function called when value changes
   * @returns Subscription object with unsubscribe method
   */
  subscribe<T>(key: string, listener: StateListener<T>): StateSubscription {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    const listeners = this.listeners.get(key)!;
    listeners.add(listener as StateListener<unknown>);

    return {
      unsubscribe: () => {
        listeners.delete(listener as StateListener<unknown>);
      },
    };
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.state.clear();
  }

  /**
   * Get a deep copy of all state.
   * Useful for save/load operations.
   */
  getSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    for (const [key, value] of this.state) {
      snapshot[key] = structuredClone(value);
    }
    return snapshot;
  }

  /**
   * Load state from a snapshot.
   * @param snapshot - State object to load
   */
  loadSnapshot(snapshot: Record<string, unknown>): void {
    this.clear();
    for (const [key, value] of Object.entries(snapshot)) {
      this.state.set(key, structuredClone(value));
    }
  }

  private notifyListeners<T>(key: string, newValue: T, oldValue: T | undefined): void {
    const listeners = this.listeners.get(key);
    if (!listeners) return;

    for (const listener of [...listeners]) {
      try {
        listener(newValue, oldValue);
      } catch (error) {
        console.error(`Error in state listener for ${key}:`, error);
      }
    }
  }
}
