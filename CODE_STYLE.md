# F1 Career Simulation - Code Style Guide

## Naming Conventions

### Files and Directories

| Type | Convention | Example |
|------|------------|---------|
| Source files | PascalCase | `TrackBuilder.ts`, `EventBus.ts` |
| Test files | PascalCase + `.test.ts` | `TrackBuilder.test.ts` |
| Type definition files | `types.ts` in each module | `src/core/types.ts` |
| Barrel exports | `index.ts` in each module | `src/core/index.ts` |
| Data files | kebab-case | `porto-azzurro.json` |
| Directories | kebab-case | `src/core/`, `data/tracks/` |

### Code Identifiers

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `TrackBuilder`, `EventBus` |
| Interfaces | PascalCase | `TrackData`, `GameContext` |
| Type aliases | PascalCase | `GameEventType`, `LayerName` |
| Functions | camelCase | `computePath()`, `getTrack()` |
| Variables | camelCase | `trackWidth`, `deltaTime` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_GAME_CONFIG`, `LAYER_Z_INDEX` |
| Private members | camelCase (no prefix) | `private running = false` |
| Plugin IDs | kebab-case string | `'renderer'`, `'demo-racing'` |

## File Organization

### Module Structure

Each module follows this pattern:

```
src/module-name/
├── index.ts          # Barrel export (re-exports all public APIs)
├── types.ts          # Type definitions for this module
├── MainClass.ts      # Primary class
├── HelperClass.ts    # Supporting classes
└── utils.ts          # Utility functions (if needed)
```

### Barrel Export Pattern

```typescript
// src/core/index.ts
export { EventBus } from './EventBus';
export { StateManager } from './StateManager';
export { PluginManager } from './PluginManager';
export { Game } from './Game';
export * from './types';
```

### Type File Organization

Group types by category with section comments:

```typescript
// src/core/types.ts

// ============================================
// Event System Types
// ============================================

export type GameEventType = 'game:init' | 'game:start' | ...;

export interface GameEventPayload {
  timestamp: number;
}

// ============================================
// Plugin System Types
// ============================================

export interface Plugin {
  readonly id: string;
  readonly name: string;
  // ...
}
```

## Import Style

### Import Order

1. External packages (npm modules)
2. Internal modules using path aliases
3. Relative imports (types from same module)

```typescript
// 1. External packages
import { Container, Graphics } from 'pixi.js';

// 2. Internal modules (path aliases)
import { Game } from '@core/Game';
import type { Plugin, GameContext } from '@core/types';
import { Camera } from '@rendering/Camera';

// 3. Relative imports
import type { TrackData, ComputedTrack } from './types';
```

### Type-Only Imports

Use `import type` for type-only imports:

```typescript
import type { Plugin, GameContext, FrameUpdatePayload } from '@core/types';
import type { Container } from 'pixi.js';
```

## Code Patterns

### Class Structure

```typescript
/**
 * Brief description of what this class does.
 * Additional context if needed.
 */
export class ClassName {
  // 1. Public readonly properties
  readonly id: string;
  readonly name: string;

  // 2. Private properties
  private running = false;
  private handlers: Map<string, Set<Function>> = new Map();

  // 3. Constructor
  constructor(config: Partial<Config> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 4. Public methods
  /**
   * Method description.
   * @param param - Parameter description
   * @returns Return value description
   */
  publicMethod(param: string): boolean {
    return this.privateHelper(param);
  }

  // 5. Private methods
  private privateHelper(param: string): boolean {
    // Implementation
  }
}
```

### Plugin Pattern

```typescript
const MyPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  dependencies: ['renderer'],

  onStart(ctx: GameContext): void {
    // Subscribe to events
    ctx.on<FrameUpdatePayload>('frame:update', (payload) => {
      // Handle frame update
    });

    // Initialize state
    ctx.setState('myPlugin.initialized', true);
  },

  onUpdate(deltaTime: number, ctx: GameContext): void {
    // Per-frame logic
  },

  onDestroy(ctx: GameContext): void {
    // Cleanup
  },
};
```

### Event Handler Pattern

```typescript
// Subscribe with typed payload
ctx.on<FrameUpdatePayload>('frame:update', (payload) => {
  const { deltaTime, totalTime, frameCount } = payload;
  // Handle event
});

// Emit with typed payload
ctx.emit<GameEventPayload>('game:start', {
  timestamp: Date.now(),
});
```

### Error Handling

```typescript
// Throw descriptive errors
if (!container) {
  throw new Error('Game container not found');
}

if (n < 3) {
  throw new Error('Track must have at least 3 control points');
}

// Try-catch in event handlers
try {
  handler(payload);
} catch (error) {
  console.error(`Error in event handler for ${event}:`, error);
}
```

### Default Config Pattern

```typescript
// Define interface
export interface GameConfig {
  targetFPS: number;
  width: number;
  height: number;
  debug: boolean;
}

// Export default values
export const DEFAULT_GAME_CONFIG: GameConfig = {
  targetFPS: 60,
  width: 1280,
  height: 720,
  debug: false,
};

// Merge in constructor
constructor(config: Partial<GameConfig> = {}) {
  this.config = { ...DEFAULT_GAME_CONFIG, ...config };
}
```

## JSDoc Comments

### Class Documentation

```typescript
/**
 * Central event bus for game-wide pub/sub communication.
 * All game systems communicate through events for loose coupling.
 */
export class EventBus {
```

### Method Documentation

```typescript
/**
 * Subscribe to an event type.
 * @param event - The event type to listen for
 * @param handler - Function to call when event is emitted
 * @returns Subscription object with unsubscribe method
 */
on<T extends GameEventPayload>(
  event: GameEventType,
  handler: EventHandler<T>
): EventSubscription {
```

### Inline Comments

Use sparingly for non-obvious logic:

```typescript
// Cap delta time to prevent spiral of death
const cappedDelta = Math.min(deltaTime, 1 / 30);

// Create a copy to avoid issues if handlers modify the set
for (const handler of [...handlers]) {
```

## Testing Patterns

### Test File Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClassName } from '@module/ClassName';
import type { SomeType } from '@module/types';

describe('ClassName', () => {
  let instance: ClassName;

  beforeEach(() => {
    instance = new ClassName();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName()', () => {
    it('should do expected behavior', () => {
      const result = instance.methodName();
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      expect(() => instance.methodName(invalid)).toThrow('error message');
    });
  });
});
```

### Mocking Pattern

```typescript
// Mock functions
const mockHandler = vi.fn();

// Mock browser APIs
beforeEach(() => {
  globalThis.requestAnimationFrame = vi.fn((cb) => {
    callbacks.push(cb);
    return ++rafId;
  });
});

afterEach(() => {
  globalThis.requestAnimationFrame = originalRaf;
});
```

## TypeScript Configuration

Key settings from `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Do's and Don'ts

### Do

- Use TypeScript strict mode
- Use path aliases (`@core/`, `@rendering/`, etc.)
- Use `import type` for type-only imports
- Document public APIs with JSDoc
- Use descriptive error messages
- Export types from `types.ts` files
- Use barrel exports (`index.ts`)
- Write tests for new functionality
- Use `readonly` for immutable properties
- Use `Partial<T>` for optional config objects

### Don't

- Don't use `any` type (use `unknown` if needed)
- Don't use `var` (use `const` or `let`)
- Don't use default exports (use named exports)
- Don't mutate function parameters
- Don't use magic numbers (define constants)
- Don't skip error handling in async code
- Don't use `!` non-null assertion without good reason
- Don't create circular dependencies between modules
- Don't put business logic in rendering code

## Graphics/Rendering Conventions

### PixiJS Patterns

```typescript
// Create graphics
const graphics = new Graphics();
graphics.rect(x, y, width, height);
graphics.fill(color);

// Create containers
const container = new Container();
container.label = 'descriptive-name';
container.addChild(childGraphics);

// Stroke style (PixiJS 8.x)
graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
```

### Color Values

Use hex numbers for colors:

```typescript
const asphaltColor = 0x2a2a2a;
const grassColor = 0x2d5a27;
const teamRed = 0xe10600;
```

### Coordinate System

- Origin (0, 0) is top-left
- X increases to the right
- Y increases downward
- Angles in radians, 0 = right, positive = clockwise

## Track Data Conventions

### Control Point Naming

```json
{ "x": 240, "y": 30, "name": "Sainte Devote" }  // Corner names
{ "x": 280, "y": 180, "name": "Beau Rivage" }   // Section names
```

### Sector Assignment

- Sector 1: Start/finish to ~1/3 of track
- Sector 2: Middle third
- Sector 3: Final third back to start/finish

### Runoff Types

- `"grass"` - Default, green grass
- `"gravel"` - Beige gravel trap
- `"tarmac"` - Gray tarmac runoff
- `"barrier"` - Concrete/armco barriers
