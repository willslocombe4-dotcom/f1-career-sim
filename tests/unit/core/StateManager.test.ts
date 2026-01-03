import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '@core/StateManager';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('get() and set()', () => {
    it('should store and retrieve values', () => {
      stateManager.set('player.name', 'Max Verstappen');
      expect(stateManager.get('player.name')).toBe('Max Verstappen');
    });

    it('should return undefined for non-existent keys', () => {
      expect(stateManager.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      stateManager.set('score', 100);
      stateManager.set('score', 200);
      expect(stateManager.get('score')).toBe(200);
    });

    it('should handle complex objects', () => {
      const player = {
        name: 'Lewis Hamilton',
        team: 'Mercedes',
        stats: { wins: 103, poles: 104 },
      };
      stateManager.set('player', player);
      expect(stateManager.get('player')).toEqual(player);
    });

    it('should handle arrays', () => {
      const standings = ['VER', 'HAM', 'LEC'];
      stateManager.set('standings', standings);
      expect(stateManager.get('standings')).toEqual(standings);
    });

    it('should handle null values', () => {
      stateManager.set('nullable', null);
      expect(stateManager.get('nullable')).toBeNull();
      expect(stateManager.has('nullable')).toBe(true);
    });

    it('should handle undefined values', () => {
      stateManager.set('undef', undefined);
      expect(stateManager.get('undef')).toBeUndefined();
      expect(stateManager.has('undef')).toBe(true);
    });
  });

  describe('has()', () => {
    it('should return true for existing keys', () => {
      stateManager.set('exists', true);
      expect(stateManager.has('exists')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(stateManager.has('nonexistent')).toBe(false);
    });
  });

  describe('delete()', () => {
    it('should remove a key', () => {
      stateManager.set('toDelete', 'value');
      stateManager.delete('toDelete');
      expect(stateManager.has('toDelete')).toBe(false);
    });

    it('should not throw for non-existent keys', () => {
      expect(() => stateManager.delete('nonexistent')).not.toThrow();
    });
  });

  describe('subscribe()', () => {
    it('should notify listener when value changes', () => {
      const listener = vi.fn();
      stateManager.subscribe('score', listener);

      stateManager.set('score', 100);

      expect(listener).toHaveBeenCalledWith(100, undefined);
    });

    it('should pass old and new values to listener', () => {
      const listener = vi.fn();
      stateManager.set('score', 50);
      stateManager.subscribe('score', listener);

      stateManager.set('score', 100);

      expect(listener).toHaveBeenCalledWith(100, 50);
    });

    it('should not notify after unsubscribe', () => {
      const listener = vi.fn();
      const subscription = stateManager.subscribe('score', listener);

      stateManager.set('score', 100);
      expect(listener).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      stateManager.set('score', 200);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners for same key', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      stateManager.subscribe('score', listener1);
      stateManager.subscribe('score', listener2);

      stateManager.set('score', 100);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should continue calling other listeners if one throws', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = vi.fn();

      stateManager.subscribe('score', errorListener);
      stateManager.subscribe('score', normalListener);

      // Should not throw and should call second listener
      stateManager.set('score', 100);

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear()', () => {
    it('should remove all state', () => {
      stateManager.set('a', 1);
      stateManager.set('b', 2);
      stateManager.clear();

      expect(stateManager.has('a')).toBe(false);
      expect(stateManager.has('b')).toBe(false);
    });
  });

  describe('getSnapshot()', () => {
    it('should return a copy of all state', () => {
      stateManager.set('a', 1);
      stateManager.set('b', 2);

      const snapshot = stateManager.getSnapshot();

      expect(snapshot).toEqual({ a: 1, b: 2 });
    });

    it('should return an independent copy', () => {
      stateManager.set('value', { nested: true });
      const snapshot = stateManager.getSnapshot() as { value: { nested: boolean } };

      snapshot.value.nested = false;

      expect(stateManager.get<{ nested: boolean }>('value')?.nested).toBe(true);
    });

    it('should handle empty state', () => {
      const snapshot = stateManager.getSnapshot();
      expect(snapshot).toEqual({});
    });
  });

  describe('loadSnapshot()', () => {
    it('should load state from a snapshot', () => {
      const snapshot = { x: 10, y: 20, name: 'Test' };
      stateManager.loadSnapshot(snapshot);

      expect(stateManager.get('x')).toBe(10);
      expect(stateManager.get('y')).toBe(20);
      expect(stateManager.get('name')).toBe('Test');
    });

    it('should clear existing state before loading', () => {
      stateManager.set('existing', 'value');
      stateManager.loadSnapshot({ new: 'data' });

      expect(stateManager.has('existing')).toBe(false);
      expect(stateManager.get('new')).toBe('data');
    });

    it('should create independent copy of snapshot data', () => {
      const original = { data: { nested: 1 } };
      stateManager.loadSnapshot(original);

      original.data.nested = 2;

      expect(stateManager.get<{ nested: number }>('data')?.nested).toBe(1);
    });
  });
});
