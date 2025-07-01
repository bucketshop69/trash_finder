# Gorbagana Game Shared

Shared types and constants used across client, server, and contracts.

## Tech Stack
- TypeScript
- Type definitions for cross-module sharing

## Structure
```
types/      # TypeScript type definitions
constants/  # Game constants and configuration
```

## Development
```bash
npm install
npm run build   # Build type definitions
npm run dev     # Watch mode for development
```

## Usage
Import shared types in other modules:
```typescript
import { GameState, PlayerAction } from '@shared/types';
```

## Contents
- Game state interfaces
- Player action types
- Socket event definitions
- Blockchain transaction types