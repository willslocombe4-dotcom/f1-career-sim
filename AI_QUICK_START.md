# AI Quick Start - Read This First!

> **IMPORTANT FOR AI:** After completing any significant work (new features, bug fixes, phase completion), UPDATE both this file and `PROJECT_CONTEXT.md` with what was done. Keep these files current so future sessions have accurate context.

## What Is This Project?

**F1 Career Simulation** - Browser game where you're an F1 driver working from rookie to world champion.

## Current Status

✅ **Done:** Project setup, core engine, rendering, track system, track editor
❌ **Next:** Phase 3 - Racing mechanics (player controls, physics, collisions)

## How to Run

```bash
cd "D:\game dev\ai browesr games\f1-career-sim"
npm run dev
```

## Key Files to Know

| File | What It Does |
|------|--------------|
| `src/main.ts` | Game entry point |
| `src/core/Game.ts` | Main game loop |
| `src/tracks/TrackBuilder.ts` | Generates tracks from control points |
| `track-editor.html` | Visual track creation tool |
| `PROJECT_CONTEXT.md` | Full project details |

## User Preferences (IMPORTANT!)

1. **NO OVAL TRACKS** - User hates NASCAR-style ovals
2. **User creates tracks** - Don't auto-generate tracks, use the track editor
3. **Arcade style** - Fun and accessible, not hardcore simulation

## Tech Stack

- TypeScript + Vite + PixiJS + Vitest
- Plugin-based architecture
- Catmull-Rom splines for tracks

## What's Next?

**Phase 3: Racing Mechanics**
- Player keyboard controls (steering, gas, brake)
- Car physics (arcade-style)
- Track collision detection
- Lap timing

## Full Context

Read `PROJECT_CONTEXT.md` for complete details including:
- All file locations
- Architecture overview
- Design decisions
- Session history

---

## After You Finish Working

**UPDATE THESE FILES:**

1. Update `Last Updated` date in PROJECT_CONTEXT.md
2. Update status/completed phases if changed
3. Add session notes to Session History
4. Update "What Needs Work Next" section
5. Note any new issues or decisions made

This keeps future AI sessions informed!
