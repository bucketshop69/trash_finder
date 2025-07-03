# Gorbagana Trash Finder

A real-time multiplayer maze game built for the Gorbagana testnet hackathon. Players compete in 1v1 matches, collecting trash scattered throughout maze rooms and racing to fill the central trash can. Stake GOR tokens and winner takes all.

## How It Works

Connect your Backpack wallet, create or join a room, and race through interconnected maze rooms. First player to collect enough trash and fill the trash can at the center wins the match and all staked tokens.

**Live Transaction Proof**: [View on Gorbagana Explorer](https://explorer.gorbagana.wtf/tx/3auYcU3x9KBbNXEfpRu6PoSdAFrHzh4vyttV8pBSHuUxkiSge1SHzKVTXAnZBKJ6he5gdViDPxL1MwFVM1Ub48RY)

**Program ID**: `ASRy3mvEcwWzPFNZVJubdnm6XhMTdjSYPPZ48rexm3hB`

## Quick Start

1. **Install Backpack wallet** and connect to Gorbagana testnet
2. **Get test tokens** from the faucet
3. **Clone and run the game**:
   ```bash
   git clone [repository-url]
   cd gorbagana_trash_finder
   
   # Start server
   cd server && npm install && npm run dev
   
   # Start client (new terminal)
   cd client && npm install && npm run dev
   ```

## Game Rules

- **Movement**: Use WASD keys to navigate between rooms
- **Objective**: Collect trash items scattered throughout the maze
- **Victory**: First to fill the trash can at the center wins
- **Stakes**: Choose free play or wager 0.1, 0.5, or 1.0 GOR tokens
- **Rewards**: Winner takes all staked tokens

### Room Types
- **Free Play**: Practice without stakes
- **Wager Rooms**: Both players stake equal amounts, winner takes all

## Tech Stack

**Frontend**: React + TypeScript, Phaser.js for game engine, Tailwind CSS
**Backend**: Node.js + Express, Socket.io for real-time communication
**Blockchain**: Gorbagana testnet integration with Backpack wallet

## Environment Setup

```bash
# Client .env
VITE_SERVER_URL=http://localhost:3001
VITE_GORBAGANA_RPC_URL=https://rpc.gorbagana.wtf/

# Server .env
PORT=3001
GORBAGANA_RPC_URL=https://rpc.gorbagana.wtf/
```

## Features

- Real-time multiplayer gameplay
- Native Backpack wallet integration
- Dynamic room creation and joining
- Secure escrow system for wagers
- Responsive design for desktop and mobile

## Project Architecture

### Frontend (`/client`)
- **React + TypeScript**: Main UI framework
- **Phaser.js**: 2D game engine handling maze rendering and player movement
- **Socket.io Client**: Real-time communication with game server
- **Tailwind CSS**: Styling and responsive design
- **Backpack Wallet SDK**: Direct integration with Gorbagana testnet

### Backend (`/server`)
- **Node.js + Express**: API server and static file serving
- **Socket.io**: WebSocket connections for real-time multiplayer
- **Game State Management**: Authoritative server validates all moves
- **Room System**: Dynamic room creation, joining, and lifecycle management
- **Wager Tracking**: Server-side escrow and winnings management

### Blockchain Integration
- **Anchor Framework**: Solana smart contracts for escrow system
- **Direct P2P Transactions**: Player-to-escrow-to-winner token transfers
- **Gorbagana RPC**: Native testnet connectivity
- **Transaction Verification**: On-chain proof of wager settlements

### Architecture Decisions
- **Client Prediction**: Phaser handles immediate movement feedback
- **Server Authority**: Backend validates all actions and maintains game state
- **Hybrid Sync**: Smooth gameplay with server reconciliation
- **Modular Design**: Separate game logic, networking, and blockchain components

## Hackathon Submission

Built specifically for the Gorbagana testnet hackathon, demonstrating:
- Multiplayer mini-game mechanics
- Native GOR token integration
- Seamless Backpack wallet connectivity
- Engaging, replayable gameplay

The game is production-ready and deployed with full blockchain integration on the Gorbagana testnet.