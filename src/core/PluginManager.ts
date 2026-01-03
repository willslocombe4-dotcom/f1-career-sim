import type {
  Plugin,
  GameContext,
  GameEventType,
  GameEventPayload,
  EventHandler,
  EventSubscription,
} from './types';
import type { EventBus } from './EventBus';
import type { StateManager } from './StateManager';

/**
 * Manages plugin lifecycle and provides GameContext to plugins.
 * Handles dependency resolution and ordered initialization.
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private started = false;

  constructor(
    private eventBus: EventBus,
    private stateManager: StateManager
  ) {}

  /**
   * Register a plugin.
   * @param plugin - The plugin to register
   * @throws If a plugin with the same ID is already registered
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID "${plugin.id}" is already registered`);
    }

    this.plugins.set(plugin.id, plugin);

    if (plugin.onRegister) {
      plugin.onRegister(this.createContext());
    }
  }

  /**
   * Unregister a plugin.
   * @param id - The plugin ID to unregister
   */
  unregister(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    if (plugin.onDestroy) {
      plugin.onDestroy(this.createContext());
    }

    this.plugins.delete(id);
  }

  /**
   * Get a plugin by ID.
   * @param id - The plugin ID
   */
  get<T extends Plugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  /**
   * Check if a plugin is registered.
   * @param id - The plugin ID
   */
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Start all plugins in dependency order.
   * @throws If there are circular or missing dependencies
   */
  startAll(): void {
    const sorted = this.topologicalSort();
    const context = this.createContext();

    for (const plugin of sorted) {
      if (plugin.onStart) {
        plugin.onStart(context);
      }
    }

    this.started = true;
  }

  /**
   * Update all plugins.
   * @param deltaTime - Time since last frame in seconds
   */
  updateAll(deltaTime: number): void {
    if (!this.started) return;

    const context = this.createContext();
    for (const plugin of this.plugins.values()) {
      if (plugin.onUpdate) {
        plugin.onUpdate(deltaTime, context);
      }
    }
  }

  /**
   * Pause all plugins.
   */
  pauseAll(): void {
    const context = this.createContext();
    for (const plugin of this.plugins.values()) {
      if (plugin.onPause) {
        plugin.onPause(context);
      }
    }
  }

  /**
   * Resume all plugins.
   */
  resumeAll(): void {
    const context = this.createContext();
    for (const plugin of this.plugins.values()) {
      if (plugin.onResume) {
        plugin.onResume(context);
      }
    }
  }

  /**
   * Destroy all plugins.
   */
  destroyAll(): void {
    const context = this.createContext();
    for (const plugin of this.plugins.values()) {
      if (plugin.onDestroy) {
        plugin.onDestroy(context);
      }
    }
    this.plugins.clear();
    this.started = false;
  }

  /**
   * Create a GameContext for plugins.
   */
  private createContext(): GameContext {
    return {
      on: <T extends GameEventPayload>(
        event: GameEventType,
        handler: EventHandler<T>
      ): EventSubscription => {
        return this.eventBus.on(event, handler);
      },

      emit: <T extends GameEventPayload>(event: GameEventType, payload: T): void => {
        this.eventBus.emit(event, payload);
      },

      getState: <T>(key: string): T | undefined => {
        return this.stateManager.get<T>(key);
      },

      setState: <T>(key: string, value: T): void => {
        this.stateManager.set(key, value);
      },

      getPlugin: <T extends Plugin>(id: string): T | undefined => {
        return this.get<T>(id);
      },
    };
  }

  /**
   * Sort plugins by dependencies using topological sort.
   * @throws If there are circular or missing dependencies
   */
  private topologicalSort(): Plugin[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: Plugin[] = [];

    const visit = (id: string): void => {
      if (visited.has(id)) return;

      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving plugin "${id}"`);
      }

      const plugin = this.plugins.get(id);
      if (!plugin) {
        throw new Error(`Missing dependency: plugin "${id}" not found`);
      }

      visiting.add(id);

      for (const depId of plugin.dependencies ?? []) {
        visit(depId);
      }

      visiting.delete(id);
      visited.add(id);
      sorted.push(plugin);
    };

    for (const id of this.plugins.keys()) {
      visit(id);
    }

    return sorted;
  }
}
