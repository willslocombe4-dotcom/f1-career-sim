import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginManager } from '@core/PluginManager';
import { EventBus } from '@core/EventBus';
import { StateManager } from '@core/StateManager';
import type { Plugin, GameContext } from '@core/types';

// Helper to create a mock plugin
function createMockPlugin(overrides: Partial<Plugin> = {}): Plugin {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    onRegister: vi.fn(),
    onStart: vi.fn(),
    onUpdate: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onDestroy: vi.fn(),
    ...overrides,
  };
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let eventBus: EventBus;
  let stateManager: StateManager;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager();
    pluginManager = new PluginManager(eventBus, stateManager);
  });

  describe('register()', () => {
    it('should register a plugin and call onRegister', () => {
      const plugin = createMockPlugin();
      pluginManager.register(plugin);

      expect(plugin.onRegister).toHaveBeenCalledTimes(1);
      expect(pluginManager.has('test-plugin')).toBe(true);
    });

    it('should throw if plugin with same ID is registered twice', () => {
      const plugin1 = createMockPlugin({ id: 'duplicate' });
      const plugin2 = createMockPlugin({ id: 'duplicate' });

      pluginManager.register(plugin1);
      expect(() => pluginManager.register(plugin2)).toThrow();
    });

    it('should pass GameContext to onRegister', () => {
      const plugin = createMockPlugin();
      pluginManager.register(plugin);

      const context = (plugin.onRegister as ReturnType<typeof vi.fn>).mock.calls[0][0] as GameContext;
      expect(context.on).toBeDefined();
      expect(context.emit).toBeDefined();
      expect(context.getState).toBeDefined();
      expect(context.setState).toBeDefined();
      expect(context.getPlugin).toBeDefined();
    });

    it('should work with plugins that have no lifecycle hooks', () => {
      const minimalPlugin: Plugin = {
        id: 'minimal',
        name: 'Minimal Plugin',
      };
      
      expect(() => pluginManager.register(minimalPlugin)).not.toThrow();
      expect(pluginManager.has('minimal')).toBe(true);
    });
  });

  describe('unregister()', () => {
    it('should unregister a plugin and call onDestroy', () => {
      const plugin = createMockPlugin();
      pluginManager.register(plugin);
      pluginManager.unregister('test-plugin');

      expect(plugin.onDestroy).toHaveBeenCalledTimes(1);
      expect(pluginManager.has('test-plugin')).toBe(false);
    });

    it('should not throw for non-existent plugin', () => {
      expect(() => pluginManager.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('get()', () => {
    it('should return registered plugin', () => {
      const plugin = createMockPlugin();
      pluginManager.register(plugin);

      expect(pluginManager.get('test-plugin')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(pluginManager.get('nonexistent')).toBeUndefined();
    });
  });

  describe('startAll()', () => {
    it('should call onStart for all plugins', () => {
      const plugin1 = createMockPlugin({ id: 'plugin1' });
      const plugin2 = createMockPlugin({ id: 'plugin2' });
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      pluginManager.startAll();

      expect(plugin1.onStart).toHaveBeenCalledTimes(1);
      expect(plugin2.onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateAll()', () => {
    it('should call onUpdate for all plugins with deltaTime', () => {
      const plugin = createMockPlugin();
      pluginManager.register(plugin);
      pluginManager.startAll();

      pluginManager.updateAll(0.016);

      expect(plugin.onUpdate).toHaveBeenCalledWith(0.016, expect.any(Object));
    });

    it('should not call onUpdate before startAll', () => {
      const plugin = createMockPlugin();
      pluginManager.register(plugin);

      pluginManager.updateAll(0.016);

      expect(plugin.onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('pauseAll() and resumeAll()', () => {
    it('should call onPause for all plugins', () => {
      const plugin = createMockPlugin();
      pluginManager.register(plugin);
      pluginManager.startAll();

      pluginManager.pauseAll();

      expect(plugin.onPause).toHaveBeenCalledTimes(1);
    });

    it('should call onResume for all plugins', () => {
      const plugin = createMockPlugin();
      pluginManager.register(plugin);
      pluginManager.startAll();
      pluginManager.pauseAll();

      pluginManager.resumeAll();

      expect(plugin.onResume).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroyAll()', () => {
    it('should call onDestroy for all plugins and clear them', () => {
      const plugin1 = createMockPlugin({ id: 'plugin1' });
      const plugin2 = createMockPlugin({ id: 'plugin2' });
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      pluginManager.destroyAll();

      expect(plugin1.onDestroy).toHaveBeenCalledTimes(1);
      expect(plugin2.onDestroy).toHaveBeenCalledTimes(1);
      expect(pluginManager.has('plugin1')).toBe(false);
      expect(pluginManager.has('plugin2')).toBe(false);
    });
  });

  describe('dependency resolution', () => {
    it('should start plugins in dependency order', () => {
      const callOrder: string[] = [];

      const pluginA = createMockPlugin({
        id: 'plugin-a',
        dependencies: ['plugin-b'],
        onStart: vi.fn(() => callOrder.push('a')),
      });

      const pluginB = createMockPlugin({
        id: 'plugin-b',
        onStart: vi.fn(() => callOrder.push('b')),
      });

      // Register in wrong order
      pluginManager.register(pluginA);
      pluginManager.register(pluginB);
      pluginManager.startAll();

      expect(callOrder).toEqual(['b', 'a']);
    });

    it('should handle deep dependency chains', () => {
      const callOrder: string[] = [];

      const pluginA = createMockPlugin({
        id: 'plugin-a',
        dependencies: ['plugin-b'],
        onStart: vi.fn(() => callOrder.push('a')),
      });

      const pluginB = createMockPlugin({
        id: 'plugin-b',
        dependencies: ['plugin-c'],
        onStart: vi.fn(() => callOrder.push('b')),
      });

      const pluginC = createMockPlugin({
        id: 'plugin-c',
        onStart: vi.fn(() => callOrder.push('c')),
      });

      pluginManager.register(pluginA);
      pluginManager.register(pluginB);
      pluginManager.register(pluginC);
      pluginManager.startAll();

      expect(callOrder).toEqual(['c', 'b', 'a']);
    });

    it('should throw on circular dependencies', () => {
      const pluginA = createMockPlugin({
        id: 'plugin-a',
        dependencies: ['plugin-b'],
      });

      const pluginB = createMockPlugin({
        id: 'plugin-b',
        dependencies: ['plugin-a'],
      });

      pluginManager.register(pluginA);
      pluginManager.register(pluginB);

      expect(() => pluginManager.startAll()).toThrow(/circular/i);
    });

    it('should throw on missing dependencies', () => {
      const plugin = createMockPlugin({
        id: 'plugin-a',
        dependencies: ['nonexistent'],
      });

      pluginManager.register(plugin);

      expect(() => pluginManager.startAll()).toThrow(/missing/i);
    });

    it('should handle multiple dependencies', () => {
      const callOrder: string[] = [];

      const pluginA = createMockPlugin({
        id: 'plugin-a',
        dependencies: ['plugin-b', 'plugin-c'],
        onStart: vi.fn(() => callOrder.push('a')),
      });

      const pluginB = createMockPlugin({
        id: 'plugin-b',
        onStart: vi.fn(() => callOrder.push('b')),
      });

      const pluginC = createMockPlugin({
        id: 'plugin-c',
        onStart: vi.fn(() => callOrder.push('c')),
      });

      pluginManager.register(pluginA);
      pluginManager.register(pluginB);
      pluginManager.register(pluginC);
      pluginManager.startAll();

      // Both b and c should be before a
      const aIndex = callOrder.indexOf('a');
      const bIndex = callOrder.indexOf('b');
      const cIndex = callOrder.indexOf('c');

      expect(bIndex).toBeLessThan(aIndex);
      expect(cIndex).toBeLessThan(aIndex);
    });
  });

  describe('GameContext integration', () => {
    it('should allow plugins to emit and receive events', () => {
      const handler = vi.fn();
      
      const emitterPlugin = createMockPlugin({
        id: 'emitter',
        onStart: vi.fn((ctx: GameContext) => {
          ctx.emit('game:init', { timestamp: Date.now() });
        }),
      });

      const receiverPlugin = createMockPlugin({
        id: 'receiver',
        onRegister: vi.fn((ctx: GameContext) => {
          ctx.on('game:init', handler);
        }),
      });

      pluginManager.register(receiverPlugin);
      pluginManager.register(emitterPlugin);
      pluginManager.startAll();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow plugins to get and set state', () => {
      const readerPlugin = createMockPlugin({
        id: 'reader',
        onStart: vi.fn((ctx: GameContext) => {
          expect(ctx.getState('shared')).toBe('hello');
        }),
      });

      const writerPlugin = createMockPlugin({
        id: 'writer',
        onRegister: vi.fn((ctx: GameContext) => {
          ctx.setState('shared', 'hello');
        }),
      });

      pluginManager.register(writerPlugin);
      pluginManager.register(readerPlugin);
      pluginManager.startAll();
    });

    it('should allow plugins to access other plugins', () => {
      interface ExtendedPlugin extends Plugin {
        getData(): string;
      }

      const dataPlugin: ExtendedPlugin = {
        id: 'data',
        name: 'Data Plugin',
        getData: () => 'secret data',
      };

      const consumerPlugin = createMockPlugin({
        id: 'consumer',
        onStart: vi.fn((ctx: GameContext) => {
          const data = ctx.getPlugin<ExtendedPlugin>('data');
          expect(data?.getData()).toBe('secret data');
        }),
      });

      pluginManager.register(dataPlugin);
      pluginManager.register(consumerPlugin);
      pluginManager.startAll();
    });
  });
});
