import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '@core/EventBus';
import type { GameEventPayload, FrameUpdatePayload } from '@core/types';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on() and emit()', () => {
    it('should call handler when event is emitted', () => {
      const handler = vi.fn();
      eventBus.on('game:start', handler);

      const payload: GameEventPayload = { timestamp: Date.now() };
      eventBus.emit('game:start', payload);

      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should call multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('game:start', handler1);
      eventBus.on('game:start', handler2);

      const payload: GameEventPayload = { timestamp: Date.now() };
      eventBus.emit('game:start', payload);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers for different events', () => {
      const handler = vi.fn();
      eventBus.on('game:start', handler);

      eventBus.emit('game:stop', { timestamp: Date.now() });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass typed payload correctly', () => {
      const handler = vi.fn();
      eventBus.on<FrameUpdatePayload>('frame:update', handler);

      const payload: FrameUpdatePayload = {
        timestamp: Date.now(),
        deltaTime: 0.016,
        totalTime: 1.5,
        frameCount: 90,
      };
      eventBus.emit('frame:update', payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });
  });

  describe('unsubscribe()', () => {
    it('should stop receiving events after unsubscribe', () => {
      const handler = vi.fn();
      const subscription = eventBus.on('game:start', handler);

      eventBus.emit('game:start', { timestamp: Date.now() });
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();

      eventBus.emit('game:start', { timestamp: Date.now() });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should allow multiple unsubscribes without error', () => {
      const handler = vi.fn();
      const subscription = eventBus.on('game:start', handler);

      subscription.unsubscribe();
      subscription.unsubscribe(); // Should not throw

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once()', () => {
    it('should only call handler once', () => {
      const handler = vi.fn();
      eventBus.once('game:start', handler);

      eventBus.emit('game:start', { timestamp: Date.now() });
      eventBus.emit('game:start', { timestamp: Date.now() });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear()', () => {
    it('should remove all handlers for an event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('game:start', handler1);
      eventBus.on('game:start', handler2);

      eventBus.clear('game:start');

      eventBus.emit('game:start', { timestamp: Date.now() });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should not affect handlers for other events', () => {
      const startHandler = vi.fn();
      const stopHandler = vi.fn();
      eventBus.on('game:start', startHandler);
      eventBus.on('game:stop', stopHandler);

      eventBus.clear('game:start');

      eventBus.emit('game:stop', { timestamp: Date.now() });
      expect(stopHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearAll()', () => {
    it('should remove all handlers for all events', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('game:start', handler1);
      eventBus.on('game:stop', handler2);

      eventBus.clearAll();

      eventBus.emit('game:start', { timestamp: Date.now() });
      eventBus.emit('game:stop', { timestamp: Date.now() });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should continue calling other handlers if one throws', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalHandler = vi.fn();

      eventBus.on('game:start', errorHandler);
      eventBus.on('game:start', normalHandler);

      // Should not throw and should call second handler
      eventBus.emit('game:start', { timestamp: Date.now() });

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(normalHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHandlerCount()', () => {
    it('should return correct handler count', () => {
      expect(eventBus.getHandlerCount('game:start')).toBe(0);

      eventBus.on('game:start', vi.fn());
      expect(eventBus.getHandlerCount('game:start')).toBe(1);

      eventBus.on('game:start', vi.fn());
      expect(eventBus.getHandlerCount('game:start')).toBe(2);
    });
  });
});
