import { EventBus } from './EventBus';
import { StateManager } from './StateManager';
import { PluginManager } from './PluginManager';
import type {
  GameConfig,
  Plugin,
  GameEventPayload,
  FrameUpdatePayload,
} from './types';
import { DEFAULT_GAME_CONFIG } from './types';

/**
 * Main game class that orchestrates all systems.
 * Manages the game loop and coordinates plugins.
 */
export class Game {
  readonly eventBus: EventBus;
  readonly stateManager: StateManager;
  readonly pluginManager: PluginManager;
  readonly config: GameConfig;

  private running = false;
  private paused = false;
  private lastFrameTime = 0;
  private totalTime = 0;
  private frameCount = 0;
  private animationFrameId: number | null = null;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    this.eventBus = new EventBus();
    this.stateManager = new StateManager();
    this.pluginManager = new PluginManager(this.eventBus, this.stateManager);
  }

  /**
   * Register a plugin with the game.
   * @param plugin - The plugin to register
   */
  use(plugin: Plugin): this {
    this.pluginManager.register(plugin);
    return this;
  }

  /**
   * Start the game loop.
   */
  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.lastFrameTime = performance.now();

    // Emit init event
    this.eventBus.emit<GameEventPayload>('game:init', {
      timestamp: Date.now(),
    });

    // Start all plugins
    this.pluginManager.startAll();

    // Emit start event
    this.eventBus.emit<GameEventPayload>('game:start', {
      timestamp: Date.now(),
    });

    // Start the game loop
    this.loop();
  }

  /**
   * Pause the game.
   */
  pause(): void {
    if (!this.running || this.paused) return;

    this.paused = true;
    this.pluginManager.pauseAll();
    this.eventBus.emit<GameEventPayload>('game:pause', {
      timestamp: Date.now(),
    });
  }

  /**
   * Resume the game.
   */
  resume(): void {
    if (!this.running || !this.paused) return;

    this.paused = false;
    this.lastFrameTime = performance.now();
    this.pluginManager.resumeAll();
    this.eventBus.emit<GameEventPayload>('game:resume', {
      timestamp: Date.now(),
    });
    this.loop();
  }

  /**
   * Stop the game completely.
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.paused = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.eventBus.emit<GameEventPayload>('game:stop', {
      timestamp: Date.now(),
    });

    this.pluginManager.destroyAll();
    this.eventBus.clearAll();
  }

  /**
   * Check if the game is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if the game is paused.
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * The main game loop.
   */
  private loop = (): void => {
    if (!this.running || this.paused) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;
    this.totalTime += deltaTime;
    this.frameCount++;

    // Cap delta time to prevent spiral of death
    const cappedDelta = Math.min(deltaTime, 1 / 30);

    // Emit frame update event
    const payload: FrameUpdatePayload = {
      timestamp: Date.now(),
      deltaTime: cappedDelta,
      totalTime: this.totalTime,
      frameCount: this.frameCount,
    };

    this.eventBus.emit('frame:update', payload);

    // Update all plugins
    this.pluginManager.updateAll(cappedDelta);

    // Emit render event
    this.eventBus.emit('frame:render', payload);

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
