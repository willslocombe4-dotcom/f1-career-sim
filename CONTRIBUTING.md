# Contributing to F1 Career Simulation

First off, thanks for taking the time to contribute! 

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When reporting a bug, include:**
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Browser and OS information

### Suggesting Features

Feature suggestions are welcome! Please:
- Check if the feature has already been suggested
- Provide a clear description of the feature
- Explain why it would be useful
- Consider how it fits with the game's arcade-style focus

### Pull Requests

1. Fork the repo and create your branch from `master`
2. Make your changes
3. Ensure tests pass (`npm test`)
4. Ensure the build works (`npm run build`)
5. Write clear commit messages
6. Open a PR with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/f1-career-sim.git
cd f1-career-sim

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Code Style

- **TypeScript** - All code must be TypeScript
- **No `any`** - Avoid `any` types, use proper typing
- **Tests** - Add tests for new features
- **Comments** - Document complex logic

### File Structure

```
src/
├── core/       # Engine (don't modify unless necessary)
├── rendering/  # PixiJS rendering
├── physics/    # Car physics, AI
├── tracks/     # Track system
├── input/      # Input handling
└── main.ts     # Entry point
```

### Plugin Pattern

New features should be implemented as plugins:

```typescript
const MyFeaturePlugin: Plugin = {
  id: 'my-feature',
  name: 'My Feature',
  
  onStart(ctx) {
    // Initialize
  },
  
  onUpdate(dt, ctx) {
    // Per-frame logic
  },
};
```

## Testing

- Run `npm test` before submitting PRs
- Add tests for new functionality
- Don't delete existing tests

## Questions?

Feel free to open an issue with the "question" label.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
