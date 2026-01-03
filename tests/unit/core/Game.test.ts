import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Game } from '@core/Game';
import type { Plugin, FrameUpdatePayload } from '@core/types';

// Mock requestAnimationFrame and cancelAnimationFrame for tests
let rafCallbacks: ((time: number) => void)[] = [];
let rafId = 0;

function mockRaf(callback: (time: number) => void): number {
  rafCallbacks.push(callback);
  return ++rafId;
}

function mockCancelRaf(_id: number): void {
  // In a real scenario, we'd remove the callback by id
}

function flushRaf(time: number = 16): void {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach(cb => cb(time));
}

describe('Game', () => {
  let originalRaf: typeof requestAnimationFrame;
  let originalCancelRaf: typeof cancelAnimationFrame;

  beforeEach(() => {
    // Mock requestAnimationFrame
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = mockRaf as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = mockCancelRaf;
    rafCallbacks = [];
    rafId = 0;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  });

  describe('constructor', () => {
    it('should create game with default config', () => {
      const game = new Game();

      expect(game.config.targetFPS).toBe(60);
      expect(game.config.width).toBe(1280);
      expect(game.config.height).toBe(720);
      expect(game.config.debug).toBe(false);
    });

    it('should merge custom config with defaults', () => {
      const game = new Game({
        width: 800,
        height: 600,
        debug: true,
      });

      expect(game.config.width).toBe(800);
      expect(game.config.height).toBe(600);
      expect(game.config.debug).toBe(true);
      expect(game.config.targetFPS).toBe(60); // Still default
    });

    it('should initialize core systems', () => {
      const game = new Game();

      expect(game.eventBus).toBeDefined();
      expect(game.stateManager).toBeDefined();
      expect(game.pluginManager).toBeDefined();
    });
  });

  describe('use()', () => {
    it('should register plugins', () => {
      const game = new Game();
      const plugin: Plugin = {
        id: 'test',
        name: 'Test Plugin',
      };

      const result = game.use(plugin);

      expect(result).toBe(game); // Chainable
      expect(game.pluginManager.has('test')).toBe(true);
    });

    it('should be chainable', () => {
      const game = new Game();

      game
        .use({ id: 'a', name: 'A' })
        .use({ id: 'b', name: 'B' })
        .use({ id: 'c', name: 'C' });

      expect(game.pluginManager.has('a')).toBe(true);
      expect(game.pluginManager.has('b')).toBe(true);
      expect(game.pluginManager.has('c')).toBe(true);
    });
  });

  describe('start()', () => {
    it('should emit game:init and game:start events', async () => {
      const game = new Game();
      const initHandler = vi.fn();
      const startHandler = vi.fn();

      game.eventBus.on('game:init', initHandler);
      game.eventBus.on('game:start', startHandler);

      await game.start();

      expect(initHandler).toHaveBeenCalledTimes(1);
      expect(startHandler).toHaveBeenCalledTimes(1);
    });

    it('should set running state', async () => {
      const game = new Game();

      expect(game.isRunning()).toBe(false);

      await game.start();

      expect(game.isRunning()).toBe(true);
    });

    it('should start all plugins', async () => {
      const game = new Game();
      const onStart = vi.fn();

      game.use({
        id: 'test',
        name: 'Test',
        onStart,
      });

      await game.start();

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should not start twice', async () => {
      const game = new Game();
      const initHandler = vi.fn();

      game.eventBus.on('game:init', initHandler);

      await game.start();
      await game.start();

      expect(initHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('game loop', () => {
    it('should emit frame:update events', async () => {
      const game = new Game();
      const updateHandler = vi.fn();

      game.eventBus.on('frame:update', updateHandler);

      await game.start();

      // Simulate frame
      flushRaf(100);

      expect(updateHandler).toHaveBeenCalled();
    });

    it('should pass deltaTime in frame:update payload', async () => {
      const game = new Game();
      let payload: FrameUpdatePayload | null = null;

      game.eventBus.on<FrameUpdatePayload>('frame:update', (p) => {
        payload = p;
      });

      await game.start();
      flushRaf(16);

      expect(payload).not.toBeNull();
      expect(payload!.deltaTime).toBeGreaterThan(0);
      expect(payload!.totalTime).toBeGreaterThan(0);
      expect(payload!.frameCount).toBeGreaterThanOrEqual(1);
    });

    it('should call plugin onUpdate', async () => {
      const game = new Game();
      const onUpdate = vi.fn();

      game.use({
        id: 'test',
        name: 'Test',
        onUpdate,
      });

      await game.start();
      flushRaf(16);

      expect(onUpdate).toHaveBeenCalled();
    });

    it('should cap deltaTime to prevent spiral of death', async () => {
      const game = new Game();
      let payload: FrameUpdatePayload | null = null;

      game.eventBus.on<FrameUpdatePayload>('frame:update', (p) => {
        payload = p;
      });

      await game.start();
      
      // Simulate a very long frame (1 second)
      flushRaf(1000);

      expect(payload).not.toBeNull();
      // Should be capped to ~33ms (1/30)
      expect(payload!.deltaTime).toBeLessThanOrEqual(1 / 30 + 0.001);
    });
  });

  describe('pause() and resume()', () => {
    it('should pause and emit event', async () => {
      const game = new Game();
      const pauseHandler = vi.fn();

      game.eventBus.on('game:pause', pauseHandler);

      await game.start();
      game.pause();

      expect(game.isPaused()).toBe(true);
      expect(pauseHandler).toHaveBeenCalledTimes(1);
    });

    it('should resume and emit event', async () => {
      const game = new Game();
      const resumeHandler = vi.fn();

      game.eventBus.on('game:resume', resumeHandler);

      await game.start();
      game.pause();
      game.resume();

      expect(game.isPaused()).toBe(false);
      expect(resumeHandler).toHaveBeenCalledTimes(1);
    });

    it('should not update plugins when paused', async () => {
      const game = new Game();
      const onUpdate = vi.fn();

      game.use({
        id: 'test',
        name: 'Test',
        onUpdate,
      });

      await game.start();
      flushRaf(16);
      const callCountBeforePause = onUpdate.mock.calls.length;

      game.pause();
      flushRaf(16);
      expect(onUpdate).toHaveBeenCalledTimes(callCountBeforePause); // Same count after pause
    });

    it('should call plugin onPause and onResume', async () => {
      const game = new Game();
      const onPause = vi.fn();
      const onResume = vi.fn();

      game.use({
        id: 'test',
        name: 'Test',
        onPause,
        onResume,
      });

      await game.start();
      game.pause();
      expect(onPause).toHaveBeenCalledTimes(1);

      game.resume();
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('should not pause if not running', () => {
      const game = new Game();
      const pauseHandler = vi.fn();

      game.eventBus.on('game:pause', pauseHandler);
      game.pause();

      expect(game.isPaused()).toBe(false);
      expect(pauseHandler).not.toHaveBeenCalled();
    });

    it('should not resume if not paused', async () => {
      const game = new Game();
      const resumeHandler = vi.fn();

      game.eventBus.on('game:resume', resumeHandler);

      await game.start();
      game.resume(); // Not paused

      expect(resumeHandler).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should stop and emit event', async () => {
      const game = new Game();
      const stopHandler = vi.fn();

      game.eventBus.on('game:stop', stopHandler);

      await game.start();
      game.stop();

      expect(game.isRunning()).toBe(false);
      expect(stopHandler).toHaveBeenCalledTimes(1);
    });

    it('should destroy all plugins', async () => {
      const game = new Game();
      const onDestroy = vi.fn();

      game.use({
        id: 'test',
        name: 'Test',
        onDestroy,
      });

      await game.start();
      game.stop();

      expect(onDestroy).toHaveBeenCalledTimes(1);
      expect(game.pluginManager.has('test')).toBe(false);
    });

    it('should clear all event handlers', async () => {
      const game = new Game();
      const handler = vi.fn();

      game.eventBus.on('game:init', handler);

      await game.start();
      game.stop();

      expect(game.eventBus.getHandlerCount('game:init')).toBe(0);
    });

    it('should not stop if not running', () => {
      const game = new Game();
      const stopHandler = vi.fn();

      game.eventBus.on('game:stop', stopHandler);
      game.stop();

      expect(stopHandler).not.toHaveBeenCalled();
    });
  });
});
