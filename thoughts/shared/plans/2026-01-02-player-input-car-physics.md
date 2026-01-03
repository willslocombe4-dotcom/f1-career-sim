# Player Input and Car Physics Implementation Plan

**Goal:** Add keyboard-controlled player car with arcade-style physics, replacing the auto-follow racing line behavior.

**Architecture:** Create two new plugins (InputPlugin, PhysicsPlugin) that work together. InputPlugin captures keyboard state and stores it in game state. PhysicsPlugin reads input state and updates car position/velocity each frame using simple arcade physics. The existing DemoRacingPlugin will be modified to use physics-based movement for the player car while AI cars continue auto-following.

**Design:** Based on requirements for arcade-style, responsive controls with simple drift mechanics and track boundary collision.

---

## Overview

### New Files to Create
- `src/input/types.ts` - Input state types
- `src/input/InputPlugin.ts` - Keyboard input handling plugin
- `src/input/index.ts` - Barrel export
- `src/physics/types.ts` - Car physics state types
- `src/physics/CarPhysics.ts` - Physics calculations (pure functions)
- `src/physics/PhysicsPlugin.ts` - Physics update plugin
- `src/physics/index.ts` - Barrel export
- `tests/unit/input/InputPlugin.test.ts` - Input plugin tests
- `tests/unit/physics/CarPhysics.test.ts` - Physics calculation tests
- `tests/unit/physics/PhysicsPlugin.test.ts` - Physics plugin tests

### Files to Modify
- `src/core/types.ts` - Add new event types for input
- `src/main.ts` - Replace DemoRacingPlugin with physics-based movement
- `vite.config.ts` - Add path aliases for new modules
- `vitest.config.ts` - Add path aliases for new modules

---

## Task 1: Add Input Event Types to Core

**Files:**
- Modify: `src/core/types.ts:10-45`

**Step 1: Write the failing test**

Create file `tests/unit/input/InputPlugin.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { GameEventType } from '@core/types';

describe('Input Event Types', () => {
  it('should have input event types defined', () => {
    // This test verifies the types exist at compile time
    const inputEvents: GameEventType[] = [
      'input:keydown',
      'input:keyup',
    ];
    expect(inputEvents).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/input/InputPlugin.test.ts`
Expected: FAIL with TypeScript error - 'input:keydown' is not assignable to type 'GameEventType'

**Step 3: Add input event types**

Edit `src/core/types.ts`, add to the `GameEventType` union (after line 45, before the semicolon):

```typescript
  // Input events
  | 'input:keydown'
  | 'input:keyup';
```

The full GameEventType should now include:
```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/input/InputPlugin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/types.ts tests/unit/input/InputPlugin.test.ts
git commit -m "feat(core): add input event types to GameEventType"
```

---

## Task 2: Create Input Types

**Files:**
- Create: `src/input/types.ts`

**Step 1: Write the failing test**

Add to `tests/unit/input/InputPlugin.test.ts`:

```typescript
import type { InputState, InputAction } from '@input/types';

describe('Input Types', () => {
  it('should define InputAction enum values', () => {
    const actions: InputAction[] = ['accelerate', 'brake', 'steerLeft', 'steerRight'];
    expect(actions).toHaveLength(4);
  });

  it('should define InputState with all actions as booleans', () => {
    const state: InputState = {
      accelerate: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
    };
    expect(state.accelerate).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/input/InputPlugin.test.ts`
Expected: FAIL - Cannot find module '@input/types'

**Step 3: Create input types file**

Create file `src/input/types.ts`:

```typescript
/**
 * Input system type definitions.
 * Defines the shape of input state and available actions.
 */

// ============================================
// Input Action Types
// ============================================

/** Available input actions for car control */
export type InputAction = 'accelerate' | 'brake' | 'steerLeft' | 'steerRight';

/** Current state of all input actions */
export interface InputState {
  accelerate: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
}

/** Default input state (all keys released) */
export const DEFAULT_INPUT_STATE: InputState = {
  accelerate: false,
  brake: false,
  steerLeft: false,
  steerRight: false,
};

// ============================================
// Key Mapping Types
// ============================================

/** Maps keyboard keys to input actions */
export interface KeyMapping {
  accelerate: string[];
  brake: string[];
  steerLeft: string[];
  steerRight: string[];
}

/** Default key mappings (Arrow keys + WASD) */
export const DEFAULT_KEY_MAPPING: KeyMapping = {
  accelerate: ['ArrowUp', 'KeyW'],
  brake: ['ArrowDown', 'KeyS'],
  steerLeft: ['ArrowLeft', 'KeyA'],
  steerRight: ['ArrowRight', 'KeyD'],
};

// ============================================
// Event Payload Types
// ============================================

/** Payload for input key events */
export interface InputKeyPayload {
  timestamp: number;
  key: string;
  action: InputAction | null;
}
```

**Step 4: Add path alias to configs**

Edit `vite.config.ts`, add to the `alias` object:

```typescript
'@input': resolve(__dirname, 'src/input'),
```

Edit `vitest.config.ts`, add to the `alias` object:

```typescript
'@input': resolve(__dirname, 'src/input'),
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/input/InputPlugin.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/input/types.ts vite.config.ts vitest.config.ts tests/unit/input/InputPlugin.test.ts
git commit -m "feat(input): add input state and key mapping types"
```

---

## Task 3: Create Input Plugin

**Files:**
- Create: `src/input/InputPlugin.ts`
- Create: `src/input/index.ts`

**Step 1: Write the failing test**

Add to `tests/unit/input/InputPlugin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputPlugin } from '@input/InputPlugin';
import { EventBus } from '@core/EventBus';
import { StateManager } from '@core/StateManager';
import { PluginManager } from '@core/PluginManager';
import type { InputState } from '@input/types';

describe('InputPlugin', () => {
  let inputPlugin: InputPlugin;
  let pluginManager: PluginManager;
  let stateManager: StateManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager();
    pluginManager = new PluginManager(eventBus, stateManager);
    inputPlugin = new InputPlugin();
    pluginManager.register(inputPlugin);
  });

  afterEach(() => {
    pluginManager.destroyAll();
  });

  describe('plugin metadata', () => {
    it('should have correct id and name', () => {
      expect(inputPlugin.id).toBe('input');
      expect(inputPlugin.name).toBe('Input Plugin');
    });
  });

  describe('input state', () => {
    it('should initialize input state on register', () => {
      const state = stateManager.get<InputState>('input');
      expect(state).toEqual({
        accelerate: false,
        brake: false,
        steerLeft: false,
        steerRight: false,
      });
    });

    it('should update state when key is pressed', () => {
      pluginManager.startAll();
      
      // Simulate keydown event
      const event = new KeyboardEvent('keydown', { code: 'ArrowUp' });
      document.dispatchEvent(event);

      const state = stateManager.get<InputState>('input');
      expect(state?.accelerate).toBe(true);
    });

    it('should update state when key is released', () => {
      pluginManager.startAll();
      
      // Press and release
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }));

      const state = stateManager.get<InputState>('input');
      expect(state?.accelerate).toBe(false);
    });

    it('should handle WASD keys', () => {
      pluginManager.startAll();
      
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(stateManager.get<InputState>('input')?.accelerate).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(stateManager.get<InputState>('input')?.steerLeft).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      expect(stateManager.get<InputState>('input')?.brake).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      expect(stateManager.get<InputState>('input')?.steerRight).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on destroy', () => {
      pluginManager.startAll();
      pluginManager.destroyAll();

      // After destroy, key events should not update state
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      
      // State should still exist but not be updated (or be undefined)
      const state = stateManager.get<InputState>('input');
      expect(state?.accelerate ?? false).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/input/InputPlugin.test.ts`
Expected: FAIL - Cannot find module '@input/InputPlugin'

**Step 3: Create InputPlugin**

Create file `src/input/InputPlugin.ts`:

```typescript
import type { Plugin, GameContext } from '@core/types';
import type { InputState, InputAction, KeyMapping } from './types';
import { DEFAULT_INPUT_STATE, DEFAULT_KEY_MAPPING } from './types';

/**
 * Plugin that handles keyboard input for car control.
 * Captures key events and updates input state that other systems can read.
 */
export class InputPlugin implements Plugin {
  readonly id = 'input';
  readonly name = 'Input Plugin';

  private keyMapping: KeyMapping;
  private gameContext: GameContext | null = null;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;

  constructor(keyMapping: KeyMapping = DEFAULT_KEY_MAPPING) {
    this.keyMapping = keyMapping;
  }

  onRegister(ctx: GameContext): void {
    this.gameContext = ctx;
    // Initialize input state
    ctx.setState<InputState>('input', { ...DEFAULT_INPUT_STATE });
  }

  onStart(ctx: GameContext): void {
    // Bind event handlers
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);

    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
  }

  onDestroy(): void {
    // Remove event listeners
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = null;
    }
    if (this.boundKeyUp) {
      document.removeEventListener('keyup', this.boundKeyUp);
      this.boundKeyUp = null;
    }
    this.gameContext = null;
  }

  /**
   * Get the current input state.
   */
  getInputState(): InputState {
    return this.gameContext?.getState<InputState>('input') ?? { ...DEFAULT_INPUT_STATE };
  }

  /**
   * Handle keydown events.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.gameContext) return;

    const action = this.getActionForKey(event.code);
    if (action) {
      // Prevent default browser behavior for game keys
      event.preventDefault();
      this.updateInputState(action, true);
    }
  }

  /**
   * Handle keyup events.
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.gameContext) return;

    const action = this.getActionForKey(event.code);
    if (action) {
      event.preventDefault();
      this.updateInputState(action, false);
    }
  }

  /**
   * Map a key code to an input action.
   */
  private getActionForKey(code: string): InputAction | null {
    for (const [action, keys] of Object.entries(this.keyMapping)) {
      if (keys.includes(code)) {
        return action as InputAction;
      }
    }
    return null;
  }

  /**
   * Update the input state for an action.
   */
  private updateInputState(action: InputAction, pressed: boolean): void {
    if (!this.gameContext) return;

    const currentState = this.gameContext.getState<InputState>('input') ?? { ...DEFAULT_INPUT_STATE };
    const newState: InputState = {
      ...currentState,
      [action]: pressed,
    };
    this.gameContext.setState<InputState>('input', newState);
  }
}
```

Create file `src/input/index.ts`:

```typescript
export { InputPlugin } from './InputPlugin';
export * from './types';
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/input/InputPlugin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/input/InputPlugin.ts src/input/index.ts tests/unit/input/InputPlugin.test.ts
git commit -m "feat(input): add InputPlugin for keyboard controls"
```

---

## Task 4: Create Car Physics Types

**Files:**
- Create: `src/physics/types.ts`

**Step 1: Write the failing test**

Create file `tests/unit/physics/CarPhysics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { CarState, CarConfig } from '@physics/types';
import { DEFAULT_CAR_CONFIG } from '@physics/types';

describe('Car Physics Types', () => {
  it('should define CarState with position, velocity, and rotation', () => {
    const state: CarState = {
      x: 0,
      y: 0,
      rotation: 0,
      velocityX: 0,
      velocityY: 0,
      angularVelocity: 0,
      speed: 0,
      drifting: false,
    };
    expect(state.x).toBe(0);
  });

  it('should have default car config', () => {
    expect(DEFAULT_CAR_CONFIG.maxSpeed).toBeGreaterThan(0);
    expect(DEFAULT_CAR_CONFIG.acceleration).toBeGreaterThan(0);
    expect(DEFAULT_CAR_CONFIG.braking).toBeGreaterThan(0);
    expect(DEFAULT_CAR_CONFIG.turnSpeed).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/physics/CarPhysics.test.ts`
Expected: FAIL - Cannot find module '@physics/types'

**Step 3: Create physics types**

Create file `src/physics/types.ts`:

```typescript
/**
 * Car physics type definitions.
 * Defines car state, configuration, and physics constants.
 */

// ============================================
// Car State Types
// ============================================

/** Complete state of a car for physics simulation */
export interface CarState {
  /** X position in world coordinates */
  x: number;
  /** Y position in world coordinates */
  y: number;
  /** Rotation in radians (0 = facing right) */
  rotation: number;
  /** X component of velocity */
  velocityX: number;
  /** Y component of velocity */
  velocityY: number;
  /** Angular velocity (radians per second) */
  angularVelocity: number;
  /** Current speed (magnitude of velocity) */
  speed: number;
  /** Whether the car is currently drifting */
  drifting: boolean;
}

/** Create a new car state at a position */
export function createCarState(x: number, y: number, rotation: number = 0): CarState {
  return {
    x,
    y,
    rotation,
    velocityX: 0,
    velocityY: 0,
    angularVelocity: 0,
    speed: 0,
    drifting: false,
  };
}

// ============================================
// Car Configuration Types
// ============================================

/** Configuration for car physics behavior */
export interface CarConfig {
  /** Maximum speed in units per second */
  maxSpeed: number;
  /** Acceleration rate in units per second squared */
  acceleration: number;
  /** Braking rate in units per second squared */
  braking: number;
  /** Natural deceleration (drag) when not accelerating */
  drag: number;
  /** Turn speed in radians per second at low speed */
  turnSpeed: number;
  /** How much turn speed decreases at high speed (0-1) */
  turnSpeedFalloff: number;
  /** Minimum speed to allow turning */
  minTurnSpeed: number;
  /** Grip level (0-1, affects drift threshold) */
  grip: number;
  /** Speed threshold for drift to start (as fraction of max speed) */
  driftThreshold: number;
  /** How quickly the car slides when drifting */
  driftFactor: number;
}

/** Default arcade-style car configuration */
export const DEFAULT_CAR_CONFIG: CarConfig = {
  maxSpeed: 500,           // Fast but not crazy
  acceleration: 400,       // Quick acceleration for arcade feel
  braking: 600,            // Strong brakes
  drag: 100,               // Gentle slowdown when coasting
  turnSpeed: 3.5,          // Responsive turning
  turnSpeedFalloff: 0.4,   // Turning gets harder at high speed
  minTurnSpeed: 20,        // Need some speed to turn
  grip: 0.85,              // Good grip, but can drift
  driftThreshold: 0.7,     // Start drifting at 70% max speed in corners
  driftFactor: 0.15,       // Gentle drift
};

// ============================================
// Track Collision Types
// ============================================

/** Result of a track boundary check */
export interface BoundaryCheckResult {
  /** Whether the car is on the track */
  onTrack: boolean;
  /** If off track, the nearest point on the track boundary */
  nearestBoundaryPoint?: { x: number; y: number };
  /** Distance to nearest boundary (negative if outside) */
  distanceToBoundary: number;
}
```

**Step 4: Add path alias to configs**

Edit `vite.config.ts`, add to the `alias` object:

```typescript
'@physics': resolve(__dirname, 'src/physics'),
```

Edit `vitest.config.ts`, add to the `alias` object:

```typescript
'@physics': resolve(__dirname, 'src/physics'),
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/physics/CarPhysics.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/physics/types.ts vite.config.ts vitest.config.ts tests/unit/physics/CarPhysics.test.ts
git commit -m "feat(physics): add car state and config types"
```

---

## Task 5: Create Car Physics Calculations

**Files:**
- Create: `src/physics/CarPhysics.ts`

**Step 1: Write the failing test**

Add to `tests/unit/physics/CarPhysics.test.ts`:

```typescript
import {
  updateCarPhysics,
  applyAcceleration,
  applySteering,
  applyDrag,
} from '@physics/CarPhysics';
import type { CarState, CarConfig } from '@physics/types';
import { DEFAULT_CAR_CONFIG, createCarState } from '@physics/types';
import type { InputState } from '@input/types';
import { DEFAULT_INPUT_STATE } from '@input/types';

describe('CarPhysics', () => {
  const dt = 1 / 60; // 60 FPS

  describe('applyAcceleration()', () => {
    it('should increase speed when accelerating', () => {
      const state = createCarState(0, 0, 0);
      const input: InputState = { ...DEFAULT_INPUT_STATE, accelerate: true };
      
      const newState = applyAcceleration(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeGreaterThan(0);
    });

    it('should decrease speed when braking', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 100, velocityX: 100 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, brake: true };
      
      const newState = applyAcceleration(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeLessThan(100);
    });

    it('should not exceed max speed', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: DEFAULT_CAR_CONFIG.maxSpeed };
      const input: InputState = { ...DEFAULT_INPUT_STATE, accelerate: true };
      
      const newState = applyAcceleration(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeLessThanOrEqual(DEFAULT_CAR_CONFIG.maxSpeed);
    });

    it('should not go below zero speed', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 10 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, brake: true };
      
      // Apply braking for a long time
      let newState = state;
      for (let i = 0; i < 100; i++) {
        newState = applyAcceleration(newState, input, DEFAULT_CAR_CONFIG, dt);
      }
      
      expect(newState.speed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applySteering()', () => {
    it('should rotate car when steering left', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 100 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, steerLeft: true };
      
      const newState = applySteering(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.rotation).toBeLessThan(0); // Left is negative rotation
    });

    it('should rotate car when steering right', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 100 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, steerRight: true };
      
      const newState = applySteering(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.rotation).toBeGreaterThan(0); // Right is positive rotation
    });

    it('should not steer when stationary', () => {
      const state = createCarState(0, 0, 0); // speed = 0
      const input: InputState = { ...DEFAULT_INPUT_STATE, steerLeft: true };
      
      const newState = applySteering(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.rotation).toBe(0);
    });

    it('should steer slower at high speed', () => {
      const slowState: CarState = { ...createCarState(0, 0, 0), speed: 100 };
      const fastState: CarState = { ...createCarState(0, 0, 0), speed: 400 };
      const input: InputState = { ...DEFAULT_INPUT_STATE, steerRight: true };
      
      const slowResult = applySteering(slowState, input, DEFAULT_CAR_CONFIG, dt);
      const fastResult = applySteering(fastState, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(Math.abs(slowResult.rotation)).toBeGreaterThan(Math.abs(fastResult.rotation));
    });
  });

  describe('applyDrag()', () => {
    it('should slow down car when not accelerating', () => {
      const state: CarState = { ...createCarState(0, 0, 0), speed: 100, velocityX: 100 };
      
      const newState = applyDrag(state, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.speed).toBeLessThan(100);
    });
  });

  describe('updateCarPhysics()', () => {
    it('should update position based on velocity', () => {
      const state: CarState = {
        ...createCarState(0, 0, 0),
        speed: 100,
        velocityX: 100,
        velocityY: 0,
      };
      const input: InputState = DEFAULT_INPUT_STATE;
      
      const newState = updateCarPhysics(state, input, DEFAULT_CAR_CONFIG, dt);
      
      expect(newState.x).toBeGreaterThan(0);
    });

    it('should update velocity direction when rotating', () => {
      const state: CarState = {
        ...createCarState(0, 0, Math.PI / 2), // Facing up
        speed: 100,
        velocityX: 0,
        velocityY: -100,
      };
      const input: InputState = { ...DEFAULT_INPUT_STATE, accelerate: true };
      
      const newState = updateCarPhysics(state, input, DEFAULT_CAR_CONFIG, dt);
      
      // Velocity should be mostly in the -Y direction (up)
      expect(newState.velocityY).toBeLessThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/physics/CarPhysics.test.ts`
Expected: FAIL - Cannot find module '@physics/CarPhysics'

**Step 3: Create CarPhysics module**

Create file `src/physics/CarPhysics.ts`:

```typescript
/**
 * Car physics calculations.
 * Pure functions for arcade-style car movement.
 */

import type { CarState, CarConfig } from './types';
import type { InputState } from '@input/types';

/**
 * Apply acceleration or braking based on input.
 */
export function applyAcceleration(
  state: CarState,
  input: InputState,
  config: CarConfig,
  dt: number
): CarState {
  let speed = state.speed;

  if (input.accelerate) {
    speed += config.acceleration * dt;
  }

  if (input.brake) {
    speed -= config.braking * dt;
  }

  // Clamp speed
  speed = Math.max(0, Math.min(config.maxSpeed, speed));

  return { ...state, speed };
}

/**
 * Apply steering based on input.
 * Steering is reduced at high speeds for stability.
 */
export function applySteering(
  state: CarState,
  input: InputState,
  config: CarConfig,
  dt: number
): CarState {
  // Need minimum speed to turn
  if (state.speed < config.minTurnSpeed) {
    return state;
  }

  let steerDirection = 0;
  if (input.steerLeft) steerDirection -= 1;
  if (input.steerRight) steerDirection += 1;

  if (steerDirection === 0) {
    return state;
  }

  // Calculate turn rate based on speed
  // At low speed: full turn rate
  // At high speed: reduced turn rate
  const speedRatio = state.speed / config.maxSpeed;
  const turnMultiplier = 1 - (speedRatio * config.turnSpeedFalloff);
  const turnRate = config.turnSpeed * turnMultiplier;

  const newRotation = state.rotation + (steerDirection * turnRate * dt);

  // Check for drift conditions
  const isDrifting = speedRatio > config.driftThreshold && Math.abs(steerDirection) > 0;

  return {
    ...state,
    rotation: newRotation,
    drifting: isDrifting,
  };
}

/**
 * Apply drag (natural deceleration).
 */
export function applyDrag(
  state: CarState,
  config: CarConfig,
  dt: number
): CarState {
  if (state.speed <= 0) {
    return { ...state, speed: 0 };
  }

  const newSpeed = Math.max(0, state.speed - config.drag * dt);
  return { ...state, speed: newSpeed };
}

/**
 * Update velocity based on current speed and rotation.
 * Handles drift by blending forward velocity with slide.
 */
export function updateVelocity(
  state: CarState,
  config: CarConfig
): CarState {
  // Forward direction based on rotation
  const forwardX = Math.cos(state.rotation);
  const forwardY = Math.sin(state.rotation);

  // Target velocity (where the car wants to go)
  const targetVelX = forwardX * state.speed;
  const targetVelY = forwardY * state.speed;

  // If drifting, blend current velocity with target
  let newVelX: number;
  let newVelY: number;

  if (state.drifting) {
    // Drift: car slides, velocity lags behind rotation
    const driftBlend = 1 - config.driftFactor;
    newVelX = state.velocityX * config.driftFactor + targetVelX * driftBlend;
    newVelY = state.velocityY * config.driftFactor + targetVelY * driftBlend;
  } else {
    // Normal: velocity follows rotation with high grip
    const gripBlend = config.grip;
    newVelX = state.velocityX * (1 - gripBlend) + targetVelX * gripBlend;
    newVelY = state.velocityY * (1 - gripBlend) + targetVelY * gripBlend;
  }

  return {
    ...state,
    velocityX: newVelX,
    velocityY: newVelY,
  };
}

/**
 * Update position based on velocity.
 */
export function updatePosition(
  state: CarState,
  dt: number
): CarState {
  return {
    ...state,
    x: state.x + state.velocityX * dt,
    y: state.y + state.velocityY * dt,
  };
}

/**
 * Full physics update for one frame.
 * Combines all physics steps in the correct order.
 */
export function updateCarPhysics(
  state: CarState,
  input: InputState,
  config: CarConfig,
  dt: number
): CarState {
  // 1. Apply acceleration/braking
  let newState = applyAcceleration(state, input, config, dt);

  // 2. Apply steering
  newState = applySteering(newState, input, config, dt);

  // 3. Apply drag if not accelerating
  if (!input.accelerate) {
    newState = applyDrag(newState, config, dt);
  }

  // 4. Update velocity based on speed and rotation
  newState = updateVelocity(newState, config);

  // 5. Update position
  newState = updatePosition(newState, dt);

  return newState;
}

/**
 * Normalize angle to -PI to PI range.
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/physics/CarPhysics.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/physics/CarPhysics.ts tests/unit/physics/CarPhysics.test.ts
git commit -m "feat(physics): add arcade car physics calculations"
```

---

## Task 6: Create Track Boundary Collision

**Files:**
- Modify: `src/physics/CarPhysics.ts`

**Step 1: Write the failing test**

Add to `tests/unit/physics/CarPhysics.test.ts`:

```typescript
import { isPointInPolygon, findNearestPointOnBoundary, constrainToTrack } from '@physics/CarPhysics';
import type { Point } from '@tracks/types';

describe('Track Boundary Collision', () => {
  // Simple square track boundary for testing
  const squareBoundary: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  describe('isPointInPolygon()', () => {
    it('should return true for point inside polygon', () => {
      expect(isPointInPolygon(50, 50, squareBoundary)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      expect(isPointInPolygon(150, 50, squareBoundary)).toBe(false);
    });

    it('should return true for point on edge', () => {
      expect(isPointInPolygon(50, 0, squareBoundary)).toBe(true);
    });
  });

  describe('findNearestPointOnBoundary()', () => {
    it('should find nearest point on boundary', () => {
      const nearest = findNearestPointOnBoundary(50, -10, squareBoundary);
      expect(nearest.x).toBeCloseTo(50);
      expect(nearest.y).toBeCloseTo(0);
    });
  });

  describe('constrainToTrack()', () => {
    it('should not modify car inside track', () => {
      const state = createCarState(50, 50, 0);
      const constrained = constrainToTrack(state, squareBoundary, squareBoundary);
      expect(constrained.x).toBe(50);
      expect(constrained.y).toBe(50);
    });

    it('should push car back inside when outside', () => {
      const state = createCarState(150, 50, 0);
      const constrained = constrainToTrack(state, squareBoundary, squareBoundary);
      expect(constrained.x).toBeLessThanOrEqual(100);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/physics/CarPhysics.test.ts`
Expected: FAIL - isPointInPolygon is not exported

**Step 3: Add boundary collision functions**

Add to `src/physics/CarPhysics.ts`:

```typescript
import type { Point } from '@tracks/types';

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 */
export function isPointInPolygon(x: number, y: number, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Find the nearest point on a polygon boundary to a given point.
 */
export function findNearestPointOnBoundary(
  x: number,
  y: number,
  polygon: Point[]
): Point {
  let nearestPoint: Point = polygon[0];
  let nearestDist = Infinity;

  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];

    // Find nearest point on line segment p1-p2
    const nearest = nearestPointOnSegment(x, y, p1, p2);
    const dist = Math.sqrt((x - nearest.x) ** 2 + (y - nearest.y) ** 2);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearestPoint = nearest;
    }
  }

  return nearestPoint;
}

/**
 * Find the nearest point on a line segment to a given point.
 */
function nearestPointOnSegment(
  px: number,
  py: number,
  p1: Point,
  p2: Point
): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return p1; // Segment is a point
  }

  // Project point onto line, clamped to segment
  let t = ((px - p1.x) * dx + (py - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };
}

/**
 * Constrain a car to stay within track boundaries.
 * If the car is outside, push it back to the nearest boundary point.
 */
export function constrainToTrack(
  state: CarState,
  outerBoundary: Point[],
  innerBoundary: Point[]
): CarState {
  // Check if inside outer boundary
  const insideOuter = isPointInPolygon(state.x, state.y, outerBoundary);
  
  if (!insideOuter) {
    // Outside outer boundary - push back in
    const nearest = findNearestPointOnBoundary(state.x, state.y, outerBoundary);
    return {
      ...state,
      x: nearest.x,
      y: nearest.y,
      // Reduce speed on collision
      speed: state.speed * 0.5,
      velocityX: state.velocityX * 0.5,
      velocityY: state.velocityY * 0.5,
    };
  }

  // Check if inside inner boundary (off track on the inside)
  const insideInner = isPointInPolygon(state.x, state.y, innerBoundary);
  
  if (insideInner) {
    // Inside inner boundary - push back out
    const nearest = findNearestPointOnBoundary(state.x, state.y, innerBoundary);
    return {
      ...state,
      x: nearest.x,
      y: nearest.y,
      // Reduce speed on collision
      speed: state.speed * 0.5,
      velocityX: state.velocityX * 0.5,
      velocityY: state.velocityY * 0.5,
    };
  }

  // Car is on track
  return state;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/physics/CarPhysics.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/physics/CarPhysics.ts tests/unit/physics/CarPhysics.test.ts
git commit -m "feat(physics): add track boundary collision detection"
```

---

## Task 7: Create Physics Plugin

**Files:**
- Create: `src/physics/PhysicsPlugin.ts`
- Create: `src/physics/index.ts`

**Step 1: Write the failing test**

Create file `tests/unit/physics/PhysicsPlugin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhysicsPlugin } from '@physics/PhysicsPlugin';
import { InputPlugin } from '@input/InputPlugin';
import { EventBus } from '@core/EventBus';
import { StateManager } from '@core/StateManager';
import { PluginManager } from '@core/PluginManager';
import type { CarState } from '@physics/types';

describe('PhysicsPlugin', () => {
  let physicsPlugin: PhysicsPlugin;
  let inputPlugin: InputPlugin;
  let pluginManager: PluginManager;
  let stateManager: StateManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager();
    pluginManager = new PluginManager(eventBus, stateManager);
    inputPlugin = new InputPlugin();
    physicsPlugin = new PhysicsPlugin();
    
    pluginManager.register(inputPlugin);
    pluginManager.register(physicsPlugin);
  });

  afterEach(() => {
    pluginManager.destroyAll();
  });

  describe('plugin metadata', () => {
    it('should have correct id and name', () => {
      expect(physicsPlugin.id).toBe('physics');
      expect(physicsPlugin.name).toBe('Physics Plugin');
    });

    it('should depend on input plugin', () => {
      expect(physicsPlugin.dependencies).toContain('input');
    });
  });

  describe('car state management', () => {
    it('should allow registering a car', () => {
      pluginManager.startAll();
      
      physicsPlugin.registerCar('player', 100, 100, 0);
      const state = physicsPlugin.getCarState('player');
      
      expect(state).toBeDefined();
      expect(state?.x).toBe(100);
      expect(state?.y).toBe(100);
    });

    it('should update car state on frame update', () => {
      pluginManager.startAll();
      physicsPlugin.registerCar('player', 100, 100, 0);
      
      // Simulate accelerating
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      
      // Simulate frame update
      physicsPlugin.onUpdate(1/60, pluginManager['context']);
      
      const state = physicsPlugin.getCarState('player');
      expect(state?.speed).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/physics/PhysicsPlugin.test.ts`
Expected: FAIL - Cannot find module '@physics/PhysicsPlugin'

**Step 3: Create PhysicsPlugin**

Create file `src/physics/PhysicsPlugin.ts`:

```typescript
import type { Plugin, GameContext } from '@core/types';
import type { CarState, CarConfig } from './types';
import type { Point } from '@tracks/types';
import { createCarState, DEFAULT_CAR_CONFIG } from './types';
import { updateCarPhysics, constrainToTrack } from './CarPhysics';
import type { InputState } from '@input/types';
import { DEFAULT_INPUT_STATE } from '@input/types';

/**
 * Plugin that handles car physics simulation.
 * Updates car positions based on input and physics calculations.
 */
export class PhysicsPlugin implements Plugin {
  readonly id = 'physics';
  readonly name = 'Physics Plugin';
  readonly dependencies = ['input'];

  private gameContext: GameContext | null = null;
  private cars: Map<string, CarState> = new Map();
  private carConfigs: Map<string, CarConfig> = new Map();
  private playerCarId: string | null = null;
  
  // Track boundaries for collision
  private outerBoundary: Point[] = [];
  private innerBoundary: Point[] = [];
  private boundariesSet = false;

  onRegister(ctx: GameContext): void {
    this.gameContext = ctx;
  }

  onStart(_ctx: GameContext): void {
    // Physics is ready
  }

  onUpdate(deltaTime: number, ctx: GameContext): void {
    // Get input state
    const input = ctx.getState<InputState>('input') ?? DEFAULT_INPUT_STATE;

    // Update each car
    for (const [carId, state] of this.cars) {
      const config = this.carConfigs.get(carId) ?? DEFAULT_CAR_CONFIG;
      
      // Only apply player input to player car
      const carInput = carId === this.playerCarId ? input : DEFAULT_INPUT_STATE;
      
      // Update physics
      let newState = updateCarPhysics(state, carInput, config, deltaTime);
      
      // Apply track boundaries if set
      if (this.boundariesSet) {
        newState = constrainToTrack(newState, this.outerBoundary, this.innerBoundary);
      }
      
      this.cars.set(carId, newState);
    }

    // Store player car state in game state for other systems
    if (this.playerCarId) {
      const playerState = this.cars.get(this.playerCarId);
      if (playerState) {
        ctx.setState('playerCar', playerState);
      }
    }
  }

  onDestroy(): void {
    this.cars.clear();
    this.carConfigs.clear();
    this.playerCarId = null;
    this.gameContext = null;
  }

  /**
   * Register a car for physics simulation.
   */
  registerCar(
    id: string,
    x: number,
    y: number,
    rotation: number,
    config: CarConfig = DEFAULT_CAR_CONFIG,
    isPlayer: boolean = false
  ): void {
    this.cars.set(id, createCarState(x, y, rotation));
    this.carConfigs.set(id, config);
    
    if (isPlayer) {
      this.playerCarId = id;
    }
  }

  /**
   * Unregister a car.
   */
  unregisterCar(id: string): void {
    this.cars.delete(id);
    this.carConfigs.delete(id);
    
    if (this.playerCarId === id) {
      this.playerCarId = null;
    }
  }

  /**
   * Get the current state of a car.
   */
  getCarState(id: string): CarState | undefined {
    return this.cars.get(id);
  }

  /**
   * Set the track boundaries for collision detection.
   */
  setTrackBoundaries(outer: Point[], inner: Point[]): void {
    this.outerBoundary = outer;
    this.innerBoundary = inner;
    this.boundariesSet = true;
  }

  /**
   * Manually set car state (for teleporting, respawning, etc.)
   */
  setCarState(id: string, state: Partial<CarState>): void {
    const current = this.cars.get(id);
    if (current) {
      this.cars.set(id, { ...current, ...state });
    }
  }

  /**
   * Get the player car ID.
   */
  getPlayerCarId(): string | null {
    return this.playerCarId;
  }
}
```

Create file `src/physics/index.ts`:

```typescript
export { PhysicsPlugin } from './PhysicsPlugin';
export * from './CarPhysics';
export * from './types';
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/physics/PhysicsPlugin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/physics/PhysicsPlugin.ts src/physics/index.ts tests/unit/physics/PhysicsPlugin.test.ts
git commit -m "feat(physics): add PhysicsPlugin for car simulation"
```

---

## Task 8: Update main.ts to Use Physics

**Files:**
- Modify: `src/main.ts`

**Step 1: Understand current implementation**

The current `DemoRacingPlugin` in `main.ts`:
- Creates player and AI cars as PixiJS graphics
- Updates car positions by following the racing line using `progress` (0-1)
- Camera follows the player car

**Step 2: Modify main.ts**

Replace the `DemoRacingPlugin` implementation to use the new physics system:

```typescript
import { Container } from 'pixi.js';
import { Game } from '@core/Game';
import type { Plugin, GameContext, FrameUpdatePayload } from '@core/types';
import { RenderPlugin } from '@rendering/index';
import { TrackBuilder, TrackRenderer, defaultTrackLoader } from '@tracks/index';
import type { ComputedTrack, RacingLinePoint } from '@tracks/types';
import { InputPlugin } from '@input/index';
import { PhysicsPlugin } from '@physics/index';
import type { CarState } from '@physics/types';

console.log('F1 Career Simulation initializing...');

/**
 * Stats plugin for FPS display
 */
const StatsPlugin: Plugin = {
  id: 'stats',
  name: 'Stats Plugin',
  dependencies: ['renderer'],

  onStart(ctx: GameContext): void {
    ctx.setState('stats.fps', 0);

    let lastTime = performance.now();
    let frameCount = 0;

    ctx.on<FrameUpdatePayload>('frame:update', () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        ctx.setState('stats.fps', fps);
        updateFpsDisplay(fps);
        frameCount = 0;
        lastTime = now;
      }
    });
  },
};

function updateFpsDisplay(fps: number): void {
  let fpsElement = document.getElementById('fps-display');
  if (!fpsElement) {
    fpsElement = document.createElement('div');
    fpsElement.id = 'fps-display';
    fpsElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      font-family: monospace;
      font-size: 14px;
      border-radius: 4px;
      z-index: 1000;
    `;
    document.body.appendChild(fpsElement);
  }
  fpsElement.textContent = `FPS: ${fps}`;
}

/**
 * Demo racing plugin - shows cars racing with physics-based player control
 */
const DemoRacingPlugin: Plugin = {
  id: 'demo-racing',
  name: 'Demo Racing Plugin',
  dependencies: ['renderer', 'physics'],

  onStart(ctx: GameContext): void {
    const renderPlugin = ctx.getPlugin<RenderPlugin>('renderer');
    const physicsPlugin = ctx.getPlugin<PhysicsPlugin>('physics');
    
    if (!renderPlugin || !physicsPlugin) {
      console.error('Required plugins not found');
      return;
    }

    const spriteManager = renderPlugin.getSpriteManager();
    const camera = renderPlugin.getCamera();

    // Get URL param for track selection, default to bergheim
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track') || 'bergheim';

    // Load track data
    let trackData;
    try {
      trackData = defaultTrackLoader.getTrack(trackId);
    } catch (e) {
      console.warn(`Track "${trackId}" not found, using bergheim`);
      trackData = defaultTrackLoader.getTrack('bergheim');
    }

    console.log(`[DemoRacing] Loading track: ${trackData.name}`);

    // Build and render the track
    const trackBuilder = new TrackBuilder(25);
    const computedTrack = trackBuilder.build(trackData);

    const trackRenderer = new TrackRenderer({
      showRacingLine: true,
      showKerbs: true,
    });
    const trackContainer = trackRenderer.render(computedTrack);

    // Center the track in view
    const bounds = getTrackBounds(computedTrack);
    const trackCenterX = (bounds.minX + bounds.maxX) / 2;
    const trackCenterY = (bounds.minY + bounds.maxY) / 2;
    trackContainer.x = -trackCenterX;
    trackContainer.y = -trackCenterY;

    renderPlugin.addToWorld(trackContainer);

    // Set up physics boundaries (offset by track center)
    const offsetBoundary = (boundary: { x: number; y: number }[]) =>
      boundary.map(p => ({ x: p.x - trackCenterX, y: p.y - trackCenterY }));
    
    physicsPlugin.setTrackBoundaries(
      offsetBoundary(computedTrack.outerBoundary),
      offsetBoundary(computedTrack.innerBoundary)
    );

    // Get starting position from racing line
    const startPoint = computedTrack.racingLine[0];
    const nextPoint = computedTrack.racingLine[1];
    const startAngle = Math.atan2(
      nextPoint.position.y - startPoint.position.y,
      nextPoint.position.x - startPoint.position.x
    );
    const startX = startPoint.position.x - trackCenterX;
    const startY = startPoint.position.y - trackCenterY;

    // Create player car (red - Ferrari style)
    const playerCar = spriteManager.createCarGraphic(0xe10600, 40, 20);
    playerCar.label = 'player-car';
    renderPlugin.addToWorld(playerCar);

    // Register player car with physics
    physicsPlugin.registerCar('player', startX, startY, startAngle, undefined, true);

    // Create AI cars with different team colors
    const aiColors = [
      0x00d2be, // Mercedes teal
      0x0600ef, // Red Bull blue
      0xff8700, // McLaren orange
      0x006f62, // Aston Martin green
      0x2b4562, // Alpine blue
    ];

    const aiCars: Container[] = [];
    const aiProgress: number[] = [];
    const aiSpeeds: number[] = [];
    const racingLine = computedTrack.racingLine;

    for (let i = 0; i < aiColors.length; i++) {
      const aiCar = spriteManager.createCarGraphic(aiColors[i], 40, 20);
      aiCar.label = `ai-car-${i}`;
      renderPlugin.addToWorld(aiCar);
      aiCars.push(aiCar);
      
      // AI cars start spread out behind player
      aiProgress.push(((i + 1) * 0.15) % 1);
      aiSpeeds.push(0.12 + Math.random() * 0.04);
    }

    // Camera follows player
    camera.setLerpFactor(0.08);
    camera.setPosition(startX, startY);

    // Update track info display
    updateTrackInfo(trackData.name, trackData.country, trackData.lengthMeters, trackData.characteristics || '');

    // Subscribe to frame updates
    ctx.on<FrameUpdatePayload>('frame:update', (payload) => {
      const dt = payload.deltaTime;

      // Get player car state from physics
      const playerState = physicsPlugin.getCarState('player');
      if (playerState) {
        // Update player car visual
        playerCar.x = playerState.x;
        playerCar.y = playerState.y;
        playerCar.rotation = playerState.rotation;

        // Camera follows player car
        camera.follow(playerState.x, playerState.y);

        // Update speed display
        updateSpeedDisplay(playerState.speed);
      }

      // Update AI cars (still using racing line following)
      for (let i = 0; i < aiCars.length; i++) {
        aiProgress[i] += aiSpeeds[i] * dt;
        if (aiProgress[i] > 1) aiProgress[i] -= 1;

        const aiPoint = getPointOnRacingLine(racingLine, aiProgress[i]);
        const aiX = aiPoint.position.x - trackCenterX;
        const aiY = aiPoint.position.y - trackCenterY;

        const aiNextProgress = (aiProgress[i] + 0.01) % 1;
        const aiNextPoint = getPointOnRacingLine(racingLine, aiNextProgress);
        const aiAngle = Math.atan2(
          aiNextPoint.position.y - aiPoint.position.y,
          aiNextPoint.position.x - aiPoint.position.x
        );

        aiCars[i].x = aiX;
        aiCars[i].y = aiY;
        aiCars[i].rotation = aiAngle;
      }
    });

    console.log(`[DemoRacing] Track "${trackData.name}" loaded with physics-based player control`);
  },
};

/**
 * Update speed display HUD element.
 */
function updateSpeedDisplay(speed: number): void {
  let speedElement = document.getElementById('speed-display');
  if (!speedElement) {
    speedElement = document.createElement('div');
    speedElement.id = 'speed-display';
    speedElement.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: monospace;
      font-size: 24px;
      border-radius: 4px;
      z-index: 1000;
      min-width: 120px;
      text-align: center;
    `;
    document.body.appendChild(speedElement);
  }
  // Convert to "km/h" style display (arbitrary scaling for arcade feel)
  const displaySpeed = Math.round(speed * 0.6);
  speedElement.textContent = `${displaySpeed} km/h`;
}

/**
 * Get a point on the racing line at a given progress (0-1).
 */
function getPointOnRacingLine(racingLine: RacingLinePoint[], progress: number): RacingLinePoint {
  const normalizedProgress = progress % 1;
  
  let closestIdx = 0;
  let closestDist = Infinity;
  
  for (let i = 0; i < racingLine.length; i++) {
    const dist = Math.abs(racingLine[i].progress - normalizedProgress);
    const wrapDist = Math.min(dist, 1 - dist);
    if (wrapDist < closestDist) {
      closestDist = wrapDist;
      closestIdx = i;
    }
  }

  const nextIdx = (closestIdx + 1) % racingLine.length;
  const curr = racingLine[closestIdx];
  const next = racingLine[nextIdx];

  let progressDiff = normalizedProgress - curr.progress;
  if (progressDiff < -0.5) progressDiff += 1;
  if (progressDiff > 0.5) progressDiff -= 1;

  let segmentLength = next.progress - curr.progress;
  if (segmentLength < -0.5) segmentLength += 1;
  if (segmentLength > 0.5) segmentLength -= 1;
  if (segmentLength === 0) segmentLength = 0.001;

  const t = Math.max(0, Math.min(1, progressDiff / segmentLength));

  return {
    position: {
      x: curr.position.x + (next.position.x - curr.position.x) * t,
      y: curr.position.y + (next.position.y - curr.position.y) * t,
    },
    speedFactor: curr.speedFactor + (next.speedFactor - curr.speedFactor) * t,
    progress: normalizedProgress,
  };
}

/**
 * Get bounding box of computed track.
 */
function getTrackBounds(track: ComputedTrack): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of track.outerBoundary) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Update the track info display.
 */
function updateTrackInfo(name: string, country: string, lengthMeters: number, characteristics: string): void {
  let trackInfoElement = document.getElementById('track-info');
  if (!trackInfoElement) {
    trackInfoElement = document.createElement('div');
    trackInfoElement.id = 'track-info';
    trackInfoElement.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: sans-serif;
      font-size: 14px;
      border-radius: 4px;
      z-index: 1000;
      max-width: 300px;
    `;
    document.body.appendChild(trackInfoElement);
  }
  
  trackInfoElement.innerHTML = `
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${name}</div>
    <div style="color: #aaa; margin-bottom: 8px;">${country} - ${(lengthMeters / 1000).toFixed(3)} km</div>
    <div style="font-size: 12px; color: #888; line-height: 1.4;">${characteristics}</div>
  `;
}

async function main(): Promise<void> {
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('Game container not found');
  }

  const gameWidth = 1280;
  const gameHeight = 720;

  // Create game instance
  const game = new Game({
    containerId: 'game-container',
    width: gameWidth,
    height: gameHeight,
    debug: true,
  });

  // Create and initialize the render plugin
  const renderPlugin = new RenderPlugin();
  await renderPlugin.initialize('game-container', gameWidth, gameHeight);

  // Create input and physics plugins
  const inputPlugin = new InputPlugin();
  const physicsPlugin = new PhysicsPlugin();

  // Register plugins (order matters for dependencies)
  game.use(renderPlugin);
  game.use(inputPlugin);
  game.use(physicsPlugin);
  game.use(StatsPlugin);
  game.use(DemoRacingPlugin);

  // Subscribe to lifecycle events
  game.eventBus.on('game:init', () => {
    console.log('[Main] Game initializing...');
  });

  game.eventBus.on('game:start', () => {
    console.log('[Main] Game loop started');
  });

  game.eventBus.on('game:stop', () => {
    console.log('[Main] Game stopped');
  });

  // Start the game
  console.log('Starting game...');
  await game.start();
  console.log('Game started!');

  // Expose to window for debugging
  if (game.config.debug) {
    (window as unknown as { game: Game; renderPlugin: RenderPlugin }).game = game;
    (window as unknown as { renderPlugin: RenderPlugin }).renderPlugin = renderPlugin;
    console.log('[Debug] Game exposed as window.game');
    console.log('[Debug] RenderPlugin exposed as window.renderPlugin');
  }

  // Keyboard controls (non-game controls)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'p') {
      if (game.isPaused()) {
        game.resume();
      } else {
        game.pause();
      }
    } else if (e.key === 'Escape') {
      game.stop();
    } else if (e.key === '+' || e.key === '=') {
      const camera = renderPlugin.getCamera();
      camera.setZoom(camera.getZoom() * 1.2);
    } else if (e.key === '-' || e.key === '_') {
      const camera = renderPlugin.getCamera();
      camera.setZoom(camera.getZoom() / 1.2);
    } else if (e.key === '1') {
      window.location.search = '?track=porto-azzurro';
    } else if (e.key === '2') {
      window.location.search = '?track=velocita';
    } else if (e.key === '3') {
      window.location.search = '?track=bergheim';
    }
  });

  // Info overlay
  const infoElement = document.createElement('div');
  infoElement.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-family: sans-serif;
    font-size: 14px;
    border-radius: 4px;
    z-index: 1000;
  `;
  infoElement.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">F1 Career Sim - Player Controls</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">W/Up</kbd> Accelerate</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">S/Down</kbd> Brake</div>
    <div><kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">A/Left</kbd> <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">D/Right</kbd> Steer</div>
    <div style="margin-top: 8px;">
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">1-3</kbd> Change track | 
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">P</kbd> Pause | 
      <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">+/-</kbd> Zoom
    </div>
  `;
  document.body.appendChild(infoElement);

  // Show available tracks
  console.log('[Main] Available tracks:', defaultTrackLoader.getAvailableTrackIds().join(', '));
}

main().catch((error) => {
  console.error('Failed to initialize game:', error);
});
```

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass (154 existing + new tests)

**Step 4: Run the game manually**

Run: `npm run dev`
Expected: Game loads, player car responds to WASD/Arrow keys, AI cars follow racing line

**Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat(demo): integrate physics-based player control"
```

---

## Task 9: Run Full Test Suite and Verify

**Step 1: Run all tests**

Run: `npm test -- --run`
Expected: All tests pass

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Run the game**

Run: `npm run dev`
Expected: 
- Game loads at http://localhost:3000
- Player car (red) responds to WASD or Arrow keys
- W/Up = accelerate, S/Down = brake, A/Left and D/Right = steer
- AI cars (colored) follow the racing line automatically
- Speed display shows current speed
- Car stays on track (bounces off boundaries)
- Camera follows player car smoothly

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: add player input and arcade car physics

- Add InputPlugin for keyboard controls (WASD + Arrow keys)
- Add PhysicsPlugin for arcade-style car physics
- Add track boundary collision detection
- Update DemoRacingPlugin to use physics for player car
- AI cars continue to follow racing line
- Add speed display HUD"
```

---

## Summary

### Files Created
| File | Purpose |
|------|---------|
| `src/input/types.ts` | Input state and key mapping types |
| `src/input/InputPlugin.ts` | Keyboard input handling |
| `src/input/index.ts` | Barrel export |
| `src/physics/types.ts` | Car state and config types |
| `src/physics/CarPhysics.ts` | Physics calculations |
| `src/physics/PhysicsPlugin.ts` | Physics simulation plugin |
| `src/physics/index.ts` | Barrel export |
| `tests/unit/input/InputPlugin.test.ts` | Input plugin tests |
| `tests/unit/physics/CarPhysics.test.ts` | Physics calculation tests |
| `tests/unit/physics/PhysicsPlugin.test.ts` | Physics plugin tests |

### Files Modified
| File | Changes |
|------|---------|
| `src/core/types.ts` | Added input event types |
| `src/main.ts` | Integrated physics-based player control |
| `vite.config.ts` | Added @input and @physics aliases |
| `vitest.config.ts` | Added @input and @physics aliases |

### Key Design Decisions
1. **Separation of concerns**: Input and Physics are separate plugins
2. **Pure functions**: Physics calculations are pure functions for easy testing
3. **State in StateManager**: Input state stored in game state for cross-plugin access
4. **Arcade physics**: Simple, responsive controls prioritized over realism
5. **Boundary collision**: Simple push-back with speed reduction
6. **AI unchanged**: AI cars continue using racing line following for now
