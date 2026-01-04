# F1 Career Simulation

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PixiJS](https://img.shields.io/badge/PixiJS-FF3366?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PC9zdmc+&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-224%20Passing-success?style=for-the-badge)

**Browser-based F1 driver career simulation with arcade-style racing**

[Features](#features) • [Getting Started](#getting-started) • [Controls](#controls) • [Track Editor](#track-editor) • [Architecture](#architecture)

</div>

---

## About

Start as a rookie driver at a backmarker team and work your way to championship glory. Race on custom circuits, battle AI opponents, and build your reputation in this arcade-style F1 career game.

### Features

- **Arcade Racing** - Fun, accessible racing physics with realistic AI mistakes
- **Career Mode** - Progress from rookie to champion across multiple seasons
- **4 Unique Circuits** - Including Porto Azzurro (Monaco-style), Velocita (Monza-style), Bergheim (Spa-style), and Interlagos
- **Track Editor** - Create your own circuits with reference image tracing
- **AI Drivers** - 5 AI opponents with different driving styles and skill levels
- **Race System** - 5-lap races with lap counting, positions, and finish screens

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

- [x] Core engine (EventBus, StateManager, Plugins)
- [x] PixiJS rendering with camera system
- [x] Track system with Catmull-Rom splines
- [x] Track editor with reference images
- [x] Player input and car physics
- [x] AI drivers with mistakes and overtaking
- [x] Race system with lap counting
- [ ] Damage system
- [ ] Career mode (contracts, reputation, seasons)
- [ ] Save/Load system
- [ ] More tracks
- [ ] UI polish and menus

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with TypeScript and PixiJS

</div>
