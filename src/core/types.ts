/**
 * Core type definitions for the F1 Career Simulation engine.
 * These types define the contracts between all game systems.
 */

// ============================================
// Event System Types
// ============================================

/** All possible game events - extend this as features are added */
export type GameEventType =
  // Lifecycle events
  | 'game:init'
  | 'game:start'
  | 'game:pause'
  | 'game:resume'
  | 'game:stop'
  // Frame events
  | 'frame:update'
  | 'frame:render'
  // Racing events
  | 'race:start'
  | 'race:finish'
  | 'race:lap'
  | 'race:overtake'
  | 'race:crash'
  | 'race:dnf'
  // Damage events
  | 'damage:minor'
  | 'damage:major'
  | 'damage:critical'
  | 'damage:failure'
  // Career events
  | 'career:contract_offer'
  | 'career:contract_signed'
  | 'career:reputation_change'
  | 'career:season_end'
  | 'career:championship_won'
  // Save events
  | 'save:started'
  | 'save:completed'
  | 'save:failed'
  | 'load:started'
  | 'load:completed'
  | 'load:failed'
  // Input events
  | 'input:keydown'
  | 'input:keyup';

/** Base interface for all event payloads */
export interface GameEventPayload {
  timestamp: number;
}

/** Frame update event payload */
export interface FrameUpdatePayload extends GameEventPayload {
  deltaTime: number;      // Time since last frame in seconds
  totalTime: number;      // Total elapsed time in seconds
  frameCount: number;     // Total frames rendered
}

/** Event handler function signature */
export type EventHandler<T extends GameEventPayload = GameEventPayload> = (
  payload: T
) => void;

/** Event subscription handle for unsubscribing */
export interface EventSubscription {
  unsubscribe: () => void;
}

// ============================================
// Plugin System Types
// ============================================

/** Plugin lifecycle hooks */
export interface Plugin {
  /** Unique identifier for this plugin */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Plugin dependencies (other plugin IDs that must load first) */
  readonly dependencies?: string[];
  
  /** Called when plugin is registered */
  onRegister?(game: GameContext): void;
  
  /** Called when game starts */
  onStart?(game: GameContext): void;
  
  /** Called every frame */
  onUpdate?(deltaTime: number, game: GameContext): void;
  
  /** Called when game pauses */
  onPause?(game: GameContext): void;
  
  /** Called when game resumes */
  onResume?(game: GameContext): void;
  
  /** Called when plugin is unregistered */
  onDestroy?(game: GameContext): void;
}

/** Context passed to plugins - limited game API */
export interface GameContext {
  /** Subscribe to game events */
  on<T extends GameEventPayload>(
    event: GameEventType,
    handler: EventHandler<T>
  ): EventSubscription;
  
  /** Emit a game event */
  emit<T extends GameEventPayload>(event: GameEventType, payload: T): void;
  
  /** Get current game state */
  getState<T>(key: string): T | undefined;
  
  /** Update game state */
  setState<T>(key: string, value: T): void;
  
  /** Get another plugin by ID */
  getPlugin<T extends Plugin>(id: string): T | undefined;
}

// ============================================
// State Management Types
// ============================================

/** State change listener */
export type StateListener<T> = (newValue: T, oldValue: T | undefined) => void;

/** State subscription handle */
export interface StateSubscription {
  unsubscribe: () => void;
}

// ============================================
// Game Configuration
// ============================================

export interface GameConfig {
  /** Target frames per second */
  targetFPS: number;
  
  /** Canvas width in pixels */
  width: number;
  
  /** Canvas height in pixels */
  height: number;
  
  /** Enable debug mode */
  debug: boolean;
  
  /** Container element ID */
  containerId: string;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  targetFPS: 60,
  width: 1280,
  height: 720,
  debug: false,
  containerId: 'game-container',
};
