# F1 Career Simulation - Architecture

## Overview

Browser-based F1 driver career simulation game where players start as a rookie at a backmarker team and work their way to becoming world champion. Built with TypeScript, Vite, and PixiJS 8.x.

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| Rendering | PixiJS | 8.x |
| Testing | Vitest | 3.x |
| Storage | IndexedDB (idb) | 8.x |

## Directory Structure

```
f1-career-sim/
├── index.html              # Main game entry HTML
├── track-editor.html       # Standalone track creation tool
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config (strict mode)
├── vite.config.ts          # Vite build config with path aliases
├── vitest.config.ts        # Test config
├── src/
│   ├── main.ts             # Application entry point
│   ├── core/               # Core game engine
│   │   ├── Game.ts         # Main game orchestrator + game loop
│   │   ├── EventBus.ts     # Pub/sub event system
│   │   ├── StateManager.ts # Reactive global state
│   │   ├── PluginManager.ts# Plugin lifecycle management
│   │   ├── types.ts        # Core type definitions
│   │   └── index.ts        # Barrel export
│   ├── rendering/          # PixiJS rendering layer
│   │   ├── Renderer.ts     # PixiJS Application wrapper
│   │   ├── Camera.ts       # Viewport, zoom, follow
│   │   ├── SpriteManager.ts# Asset loading, sprite creation
│   │   ├── RenderPlugin.ts # Plugin integrating rendering with Game
│   │   ├── types.ts        # Rendering types (layers, config)
│   │   └── index.ts
│   └── tracks/             # Track system
│       ├── TrackBuilder.ts # Catmull-Rom spline track generation
│       ├── TrackRenderer.ts# PixiJS track drawing
│       ├── TrackLoader.ts  # JSON track loading
│       ├── types.ts        # Track data types
│       └── index.ts
├── data/
│   └── tracks/             # Track JSON definitions
│       ├── porto-azzurro.json  # Monaco-style street circuit
│       ├── velocita.json       # Monza-style high-speed
│       └── bergheim.json       # Spa/Suzuka-style (has issues)
├── tests/
│   └── unit/
│       ├── core/           # Core engine tests (81 tests)
│       ├── rendering/      # Rendering tests (42 tests)
│       └── tracks/         # Track system tests (31 tests)
└── assets/                 # Game assets (sprites, audio, fonts)
```

## Core Architecture

### Plugin System

All game features are implemented as plugins that hook into the core game loop:

```typescript
const MyPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  dependencies: ['renderer'],  // Load after these plugins
  
  onRegister(ctx) { },   // When registered with game.use()
  onStart(ctx) { },      // When game.start() is called
  onUpdate(dt, ctx) { }, // Every frame
  onPause(ctx) { },      // When game.pause() is called
  onResume(ctx) { },     // When game.resume() is called
  onDestroy(ctx) { },    // When game.stop() is called
};

game.use(MyPlugin);
```

**GameContext** provides plugins with:
- `on(event, handler)` - Subscribe to events
- `emit(event, payload)` - Emit events
- `getState(key)` / `setState(key, value)` - Access global state
- `getPlugin(id)` - Access other plugins

### Event System

Systems communicate via typed events through the EventBus:

```typescript
// Subscribe
ctx.on<FrameUpdatePayload>('frame:update', (payload) => {
  console.log(payload.deltaTime);
});

// Emit
ctx.emit('race:overtake', { driver: 'VER', position: 1 });
```

**Event Categories:**
- `game:*` - Lifecycle (init, start, pause, resume, stop)
- `frame:*` - Frame loop (update, render)
- `race:*` - Racing events (start, finish, lap, overtake, crash, dnf)
- `damage:*` - Damage events (minor, major, critical, failure)
- `career:*` - Career events (contract, reputation, season)
- `save:*` / `load:*` - Persistence events

### State Management

Global reactive state with subscriptions:

```typescript
// Set state
ctx.setState('player.position', 3);

// Get state
const pos = ctx.getState<number>('player.position');

// Subscribe to changes
stateManager.subscribe('player.position', (newVal, oldVal) => {
  console.log(`Position changed: ${oldVal} -> ${newVal}`);
});
```

## Data Flow

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                    Game Loop                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐ │
│  │ EventBus    │◄──►│PluginManager│◄──►│ Plugins │ │
│  └─────────────┘    └─────────────┘    └─────────┘ │
│         │                                    │      │
│         ▼                                    ▼      │
│  ┌─────────────┐                      ┌─────────┐  │
│  │StateManager │◄────────────────────►│Renderer │  │
│  └─────────────┘                      └─────────┘  │
└─────────────────────────────────────────────────────┘
    │
    ▼
Canvas Output
```

**Frame Update Flow:**
1. `requestAnimationFrame` triggers loop
2. Game calculates deltaTime (capped at 1/30s)
3. `frame:update` event emitted
4. PluginManager calls `onUpdate()` on all plugins
5. Camera updates position (lerp toward target)
6. `frame:render` event emitted
7. PixiJS renders to canvas

## Track System

### Track Data Format

Tracks are defined using Catmull-Rom spline control points:

```json
{
  "id": "track-id",
  "name": "Track Name",
  "country": "Country",
  "lengthMeters": 5000,
  "raceLaps": 50,
  "trackWidth": 60,
  "controlPoints": [
    { "x": 0, "y": 0, "kerbs": true, "runoff": "gravel", "name": "Turn 1" },
    { "x": 200, "y": 50, "width": 70, "drs": true, "sector": 2 }
  ],
  "startFinish": { "controlPointIndex": 0 }
}
```

**Control Point Properties:**
- `x, y` - Position (required)
- `width` - Override track width at this point
- `kerbs` - Show red/white kerbs
- `runoff` - "gravel", "tarmac", "barrier", or "grass"
- `drs` - DRS zone activation
- `sector` - 1, 2, or 3
- `name` - Corner name for display

### Track Processing Pipeline

```
TrackData (JSON)
    │
    ▼ TrackBuilder.build()
ComputedTrack
    ├── path: TrackPathPoint[]      (centerline with metadata)
    ├── outerBoundary: Point[]      (outer edge)
    ├── innerBoundary: Point[]      (inner edge)
    ├── kerbs: KerbData[]           (kerb polygons)
    └── racingLine: RacingLinePoint[] (optimal path)
    │
    ▼ TrackRenderer.render()
Container (PixiJS)
    ├── Grass background
    ├── Runoff areas
    ├── Asphalt track surface
    ├── Kerbs
    ├── Track markings
    └── Racing line
```

## Rendering Layers

| Layer | Z-Index | Contents |
|-------|---------|----------|
| background | 0 | Sky, distant scenery |
| track | 10 | Track surface, grass, barriers |
| cars | 20 | Player car, AI cars |
| effects | 30 | Particles, tire marks |
| ui | 100 | HUD, menus |

## Configuration

### Path Aliases (tsconfig.json / vite.config.ts)

```typescript
import { Game } from '@core/Game';
import { Camera } from '@rendering/Camera';
import { TrackBuilder } from '@tracks/TrackBuilder';
```

| Alias | Path |
|-------|------|
| `@/*` | `src/*` |
| `@core/*` | `src/core/*` |
| `@rendering/*` | `src/rendering/*` |
| `@tracks/*` | `src/tracks/*` |
| `@ui/*` | `src/ui/*` |
| `@data/*` | `src/data/*` |
| `@utils/*` | `src/utils/*` |

### Build Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
```

## Current Game Controls

| Key | Action |
|-----|--------|
| 1 | Load Porto Azzurro track |
| 2 | Load Velocita track |
| 3 | Load Bergheim track |
| P | Pause/Resume |
| +/- | Zoom in/out |
| ESC | Stop game |

## External Integrations

- **PixiJS 8.x** - WebGL/WebGPU rendering
- **idb** - IndexedDB wrapper for save/load (not yet implemented)

## Development Status

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | Complete | Project setup |
| 1 | Complete | Core engine (EventBus, StateManager, PluginManager, Game) |
| 2 | Complete | Rendering (PixiJS, Camera, SpriteManager) |
| Track System | Complete | Catmull-Rom spline tracks + editor |
| 3 | Not Started | Racing mechanics (controls, physics, collisions) |
| 4 | Not Started | AI system |
| 5 | Not Started | Damage system |
| 6 | Not Started | Career system |
| 7 | Not Started | Additional tracks |
| 8 | Not Started | Save system |
| 9 | Not Started | UI & Polish |
| 10 | Not Started | Integration & Testing |

## Key Design Decisions

1. **Plugin Architecture** - All features as plugins for modularity
2. **Event-Driven** - Loose coupling via pub/sub events
3. **Arcade Style** - Fun and accessible, not hardcore simulation
4. **Data-Driven** - Tracks, teams, drivers in JSON config files
5. **No Ovals** - User specifically requested proper F1-style circuits
6. **User-Created Tracks** - Track editor for custom circuits
