# F1 Career Simulation

<div align="center">

[![CI](https://github.com/willslocombe4-dotcom/f1-career-sim/actions/workflows/ci.yml/badge.svg)](https://github.com/willslocombe4-dotcom/f1-career-sim/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![PixiJS](https://img.shields.io/badge/PixiJS-FF3366?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

**Browser-based F1 racing game with arcade-style physics**

[Play](#getting-started) • [Features](#features) • [Contribute](#want-to-contribute) • [Track Editor](#track-editor)

</div>

---

## About

Race against AI opponents on custom circuits in this arcade-style F1 game. Pick a track, race 5 laps, and try to finish first!

### Features

- **Arcade Racing** - Fun, accessible physics with car collisions
- **5 AI Opponents** - Each with different skill levels and realistic mistakes (understeer, oversteer, lock-ups, wheelspin)
- **4 Tracks** - Porto Azzurro (Monaco-style), Velocita (Monza-style), Bergheim (Spa-style), and Interlagos
- **Track Editor** - Create your own circuits with reference image tracing
- **Race System** - 5-lap races with lap counter and finish standings

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/willslocombe4-dotcom/f1-career-sim.git
cd f1-career-sim

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake |
| `A` / `←` | Steer Left |
| `D` / `→` | Steer Right |
| `P` | Pause/Resume |
| `+` / `-` | Zoom In/Out |
| `ESC` | Return to Menu |

---

## Track Editor

Create custom circuits using the built-in track editor:

1. Open `track-editor.html` in your browser
2. Click to place control points
3. Drag points to adjust the layout
4. Right-click to delete points
5. Load a reference image to trace real circuits
6. Export your track as JSON

**Tip:** Use Shift+drag to reposition the reference image.

---

## Architecture

The game uses a modular **plugin architecture**:

```
src/
├── core/           # Engine (EventBus, StateManager, PluginManager)
├── rendering/      # PixiJS renderer, Camera, SpriteManager
├── physics/        # Car physics, AI drivers, collisions
├── tracks/         # Track builder, renderer, loader
├── input/          # Keyboard input handling
└── main.ts         # Game entry point
```

### Plugin System

```typescript
const MyPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  
  onStart(ctx) {
    // Initialize when game starts
  },
  
  onUpdate(dt, ctx) {
    // Called every frame
  },
};

game.use(MyPlugin);
```

### Event-Driven Communication

```typescript
// Subscribe to events
ctx.on('race:finish', (payload) => {
  console.log(`Race finished! Winner: ${payload.winner}`);
});

// Emit events
ctx.emit('race:finish', { winner: 'Player' });
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Language |
| PixiJS 8 | 2D Rendering |
| Vite | Build Tool |
| Vitest | Testing |

---

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

**224 tests** covering core engine, rendering, physics, and tracks.

---

## Roadmap

**Done:**
- [x] Core engine (EventBus, StateManager, Plugins)
- [x] PixiJS rendering with camera system
- [x] Track system with Catmull-Rom splines
- [x] Track editor with reference images
- [x] Player input and car physics
- [x] AI drivers with mistakes
- [x] Car-to-car collisions
- [x] Race system (5 laps, standings)
- [x] Track selection menu
- [x] 4 playable tracks

**To Do:**
- [ ] Career mode (contracts, reputation, seasons)
- [ ] Damage system
- [ ] Sound effects
- [ ] Save/Load system
- [ ] More tracks
- [ ] UI polish

---

## Want to Contribute?

**New to open source? Start here!**

### 1. Find Something to Work On
Check the [**Issues**](https://github.com/willslocombe4-dotcom/f1-career-sim/issues) tab or the [Roadmap](#roadmap) above for ideas!

### 2. Set Up the Project
```bash
# Fork this repo (click "Fork" button above)
# Then clone YOUR fork:
git clone https://github.com/YOUR_USERNAME/f1-career-sim.git
cd f1-career-sim
npm install
npm run dev
```

### 3. Make Your Changes
- Create a new branch: `git checkout -b my-feature`
- Make your changes
- Test them: `npm test`
- Commit: `git commit -m "Add my feature"`
- Push: `git push origin my-feature`

### 4. Open a Pull Request
Go to your fork on GitHub and click "New Pull Request". That's it!

> **Questions?** Open an [issue](https://github.com/willslocombe4-dotcom/f1-career-sim/issues) and ask!

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with TypeScript and PixiJS

</div>
