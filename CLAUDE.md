# Gorbagana Trash Finder - Multiplayer Maze Game

## Project Overview
A real-time 2D multiplayer maze game built for the Gorbagana testnet hackathon. Players compete in 1v1 matches, navigating through puzzle rooms to collect keys and race to the center to claim the "Gorbagana trash" treasure.

## Team Roles & Collaboration
- **Human (Frontend Developer)**: Provides instructions, tests game output in browser, gives feedback on gameplay and UI/UX
- **Claude (Experienced Game Developer)**: Implements game logic, handles backend development, creates multiplayer systems, integrates blockchain functionality

## Collaboration Workflow
1. Claude develops features based on human's instructions
2. Human tests implementation in browser
3. Human provides feedback and suggestions
4. Claude iterates based on feedback
5. Process repeats until feature is complete

## Game Concept
- **Genre**: Real-time competitive puzzle maze
- **Players**: 1v1 multiplayer
- **Objective**: Navigate maze rooms, collect keys, reach center first
- **Theme**: "Trash to treasure" - finding valuable Gorbagana tokens

## Tech Stack

### Frontend (Game Client)
- **Phaser.js** - 2D game engine (MIT license, free)
- **React** - UI components and wallet integration
- **TypeScript** - Type safety for game logic
- **Tailwind CSS** - Styling

### Backend (Multiplayer Server)
- **Node.js + Express** - Game server
- **Socket.io** - Real-time bidirectional communication
- **Redis** - Session management and game state caching

### Blockchain Integration
- **@solana/web3.js** - Gorbagana testnet connection
- **@project-serum/anchor** - Smart contract interactions
- **@solana/wallet-adapter** - Backpack wallet support

### Deployment
- **Frontend**: Vercel/Netlify
- **Backend**: Railway/Render
- **Smart Contracts**: Gorbagana testnet

## Architecture
```
Client (Phaser.js) ↔ Socket.io ↔ Game Server ↔ Gorbagana Testnet
                                      ↓
                                   Redis Cache
```

## Project Structure
```
/client                 # React + Phaser frontend
  /src
    /components        # React UI components
    /game             # Phaser game logic
    /wallet           # Wallet integration
/server                # Node.js backend
  /src
    /game             # Game logic and state
    /socket           # Socket.io handlers
    /blockchain       # Gorbagana integration
/contracts            # Anchor/Rust smart contracts
/shared               # Shared TypeScript types
```

## Development Commands
- `npm run dev:client` - Start frontend development server
- `npm run dev:server` - Start backend development server
- `npm run build` - Build production version
- `npm run test` - Run tests

## Design References
- **Maze Layout System**: See `/docs/maze-design.md` for detailed maze structure, room layouts, mirror perspective system, and technical specifications

## Game Mechanics
- Players spawn at opposite ends of the maze
- Navigate through puzzle rooms to find keys
- Rooms can go dark (difficulty increase)
- Collect required keys to unlock center room
- First player to reach center claims Gorbagana treasure
- Winner receives tokens/points

## Hackathon Requirements Met
- ✅ Real-time multiplayer gameplay
- ✅ Gorbagana testnet integration
- ✅ Native token usage for rewards
- ✅ Backpack wallet support
- ✅ Engaging and replayable mechanics