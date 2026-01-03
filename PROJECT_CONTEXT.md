# F1 Career Simulation - Project Context

> **IMPORTANT FOR AI:** You MUST update this document after completing any significant work. Update the "Last Updated" date, status, completed phases, session history, and any other relevant sections. This keeps future AI sessions informed.

**Last Updated:** 2026-01-02
**Status:** In Development (Phases 0-2 Complete, Track System Rebuilt)

---

## Quick Summary

Browser-based F1 driver career simulation game. Player starts as rookie at backmarker team, works way to championship glory. Arcade-style racing with deep career progression.

---

## What's Been Built

### Completed Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ Complete | Project setup (Vite, TypeScript, Vitest, PixiJS) |
| Phase 1 | ✅ Complete | Core engine (EventBus, StateManager, PluginManager, Game loop) |
| Phase 2 | ✅ Complete | Rendering foundation (PixiJS renderer, Camera, SpriteManager) |
| Track System | ✅ Rebuilt | Catmull-Rom spline-based tracks (replaced broken segment system) |
| Track Editor | ✅ Complete | Visual editor with reference image support |

### Remaining Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 3 | ❌ Not Started | Racing mechanics (player controls, car physics, collisions) |
| Phase 4 | ❌ Not Started | AI system (opponent drivers) |
| Phase 5 | ❌ Not Started | Damage system |
| Phase 6 | ❌ Not Started | Career system (contracts, reputation, seasons) |
| Phase 7 | ❌ Not Started | More tracks (user can create with editor) |
| Phase 8 | ❌ Not Started | Save system |
| Phase 9 | ❌ Not Started | UI & Polish |
| Phase 10 | ❌ Not Started | Integration & Testing |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.x |
| Build Tool | Vite 5.x |
| Rendering | PixiJS 8.x |
| Testing | Vitest |
| Storage | IndexedDB (idb library) |

---

## Project Structure

```
D:\game dev\ai browesr games\f1-career-sim\
├── index.html              # Main game entry
├── track-editor.html       # Track editor tool (standalone)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── src/
│   ├── main.ts             # Game entry point
│   ├── core/               # Core engine
│   │   ├── EventBus.ts     # Pub/sub messaging
│   │   ├── StateManager.ts # Reactive state
│   │   ├── PluginManager.ts# Plugin lifecycle
│   │   ├── Game.ts         # Main orchestrator
│   │   ├── types.ts        # Type definitions
│   │   └── index.ts        # Barrel export
│   ├── rendering/          # PixiJS rendering
│   │   ├── Renderer.ts     # PixiJS wrapper
│   │   ├── Camera.ts       # Viewport/zoom/follow
│   │   ├── SpriteManager.ts# Asset loading
│   │   ├── RenderPlugin.ts # Game plugin
│   │   ├── types.ts
│   │   └── index.ts
│   └── tracks/             # Track system
│       ├── TrackBuilder.ts # Catmull-Rom spline generation
│       ├── TrackRenderer.ts# Track drawing
│       ├── TrackLoader.ts  # JSON loading
│       ├── types.ts
│       └── index.ts
├── data/
│   └── tracks/             # Track JSON files
│       ├── porto-azzurro.json  # Monaco-style
│       ├── velocita.json       # Monza-style
│       └── bergheim.json       # Spa-style (has issues)
├── tests/
│   └── unit/
│       ├── core/           # 81 tests
│       ├── rendering/      # 42 tests
│       └── tracks/         # 31 tests
└── assets/
    ├── sprites/
    ├── audio/
    └── fonts/
```

---

## How to Run

```bash
cd "D:\game dev\ai browesr games\f1-career-sim"

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

**Game URL:** http://localhost:3000 (or next available port)
**Track Editor:** Open `track-editor.html` directly or via dev server

---

## Track System Details

### How Tracks Work

Tracks use **Catmull-Rom splines** - smooth curves through control points.

**Track JSON format:**
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
    { "x": 200, "y": 50 },
    ...
  ],
  "startFinish": { "controlPointIndex": 0 }
}
```

**Control point properties:**
- `x, y` - Position (required)
- `width` - Override track width at this point
- `kerbs` - Show red/white kerbs
- `runoff` - "gravel", "tarmac", or "barrier"
- `drs` - DRS zone
- `sector` - 1, 2, or 3
- `name` - Corner name

### Track Editor

Located at `track-editor.html` - standalone tool for creating tracks.

**Features:**
- Click to add control points
- Drag to move points
- Right-click to delete
- Load reference images (for tracing real tracks)
- Adjust image opacity/scale
- Shift+drag to move reference image
- Export to JSON

### Known Track Issues

**Bergheim track** has problems:
- Sometimes creates crossover/figure-8 shapes
- Grass can appear on track surface
- User prefers to create tracks manually with editor

**Porto Azzurro and Velocita** work correctly.

---

## Architecture Overview

### Plugin System

All game features are plugins that hook into the core:

```typescript
const MyPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  dependencies: ['renderer'], // Load after renderer
  
  onRegister(ctx) { },  // When registered
  onStart(ctx) { },     // When game starts
  onUpdate(dt, ctx) { }, // Every frame
  onPause(ctx) { },     // When paused
  onResume(ctx) { },    // When resumed
  onDestroy(ctx) { },   // When destroyed
};

game.use(MyPlugin);
```

### Event System

Systems communicate via events:

```typescript
// Subscribe
ctx.on('race:overtake', (payload) => { ... });

// Emit
ctx.emit('race:overtake', { driver: 'VER', position: 1 });
```

### State Management

Global reactive state:

```typescript
ctx.setState('player.position', 3);
const pos = ctx.getState('player.position');
```

---

## Game Controls (Current Demo)

| Key | Action |
|-----|--------|
| 1 | Load Porto Azzurro track |
| 2 | Load Velocita track |
| 3 | Load Bergheim track |
| P | Pause/Resume |
| +/- | Zoom in/out |
| ESC | Stop game |

---

## Design Documents

- **Design:** `thoughts/shared/designs/2024-12-31-f1-driver-career-sim-design.md`
- **Implementation Plan:** `thoughts/shared/plans/2026-01-02-f1-driver-career-sim-plan.md`

---

## Key Design Decisions

1. **Arcade-style racing** - Not a simulation, should be fun and accessible
2. **No ovals** - User specifically doesn't want NASCAR-style oval tracks
3. **Modular plugin architecture** - Easy to add features without breaking existing code
4. **Data-driven** - Tracks, teams, drivers defined in JSON config files
5. **Retro visuals** - Pixel art or low-poly style (not implemented yet)
6. **Career focus** - Long-term progression, rivalries, reputation matter

---

## What Needs Work Next

> **AI INSTRUCTION:** Update this section as tasks are completed. Move completed items to "What's Been Built" section above.

### Immediate Priority: Phase 3 (Racing Mechanics)

1. **Player input handling** - Keyboard controls for steering, acceleration, braking
2. **Car physics** - Arcade-style movement along track
3. **Collision detection** - Track boundaries, other cars
4. **Lap timing** - Sector times, lap times, race position

### Track Issues to Address

- Bergheim track needs redesign (or user creates with editor)
- Consider adding more pre-made tracks that work correctly

---

## Test Coverage

**154 tests passing** as of last session:
- Core engine: 81 tests
- Rendering: 42 tests  
- Tracks: 31 tests

Run `npm test` to verify.

---

## Important Notes for Next Session

1. **User wants to create tracks themselves** using the track editor rather than AI-generated tracks
2. **No oval tracks** - User specifically requested proper F1-style circuits
3. **Reference image feature** added to track editor for tracing real circuits
4. **Phase 3 is next** - Racing mechanics (controls, physics, collisions)
5. **All code is in TypeScript** with strict mode enabled
6. **Path aliases configured:** @core, @rendering, @tracks, etc.

---

## Session History Summary

> **AI INSTRUCTION:** Add a new entry here after each session with bullet points of what was accomplished.

### Session 1 (2024-12-31)
- Created initial design document
- Discussed game concept and features

### Session 2 (2026-01-02)
- Implemented Phases 0, 1, 2
- Built track system (initially segment-based, had issues)
- Rebuilt track system with Catmull-Rom splines
- Created 3 tracks (Porto Azzurro, Velocita, Bergheim)
- Fixed rendering issues (gravel on track, crossovers)
- Bergheim still has issues - user prefers to create tracks with editor
- Built track editor with reference image support
- User requested this context document for future sessions

### Session 3 (YYYY-MM-DD)
- [AI: Add your session notes here]
