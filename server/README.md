# Gorbagana Game Server

## TL;DR
Node.js server for real-time 1v1 maze matches, player matchmaking, and blockchain wager facilitation. Powers the Gorbagana Trash Finder multiplayer experience.

---

Multiplayer game server for Gorbagana Trash Finder.

## Tech Stack
- Node.js + Express
- Socket.io for real-time multiplayer
- Redis for session management
- TypeScript

## Structure
```
src/
├── game/       # Game logic and state management
├── socket/     # Socket.io event handlers
├── blockchain/ # Gorbagana testnet integration
└── utils/      # Utility functions
```

## Development
```bash
npm install
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
```

## Features
- Real-time 1v1 multiplayer rooms
- Game state synchronization
- Player matching system
- Gorbagana token wager and reward logic
- Blockchain transaction relay (P2P, no server custody)