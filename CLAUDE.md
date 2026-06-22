# CIGVis.js - Project Conventions

## Overview
CIGVis.js is a JavaScript/TypeScript port of the Python cigvis library for geophysical data visualization.

## Code Style

### Naming Convention
- **Functions**: camelCase (`createSlices`, `applyColormap`)
- **Types/Interfaces**: PascalCase (`ColormapImpl`, `SliceNode`)
- **Constants**: UPPER_SNAKE_CASE (`BUILTIN_COLORMAPS`)
- **Files**: kebab-case (`surface-utils.ts`, `colormap.ts`)

### Module Structure
Each module follows this pattern:
```
src/module/
├── index.ts      # Public API exports
├── types.ts      # Type definitions
└── *.ts          # Implementation files
```

### Agent Interface
Every module should export a `create*Agent()` function:
```typescript
export function createModuleAgent() {
  return {
    functionName,
    anotherFunction,
    // ... all public functions
  };
}
```

## Build & Test

```bash
npm run build    # Build CJS + ESM + DTS
npm test         # Run tests
npm run dev      # Watch mode
```

## Dependencies

### Core (required)
- `three` - 3D rendering

### Optional
- `plotly.js-dist-min` - Plotly integration

## Architecture Decisions

See `docs/decisions/` for ADRs:
- ADR-001: Three.js for 3D rendering
- ADR-002: Canvas API for 2D/1D plotting
- ADR-003: Web Components for GUI
- ADR-004: camelCase naming convention
- ADR-005: Agent interface pattern

## Porting from Python

When porting Python functions:
1. Use camelCase for function names
2. Use Float32Array instead of numpy arrays
3. Use TypeScript types for all parameters
4. Add JSDoc comments with @example
5. Add the function to the module's agent interface
