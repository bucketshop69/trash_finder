# Gorbagana Trash Finder

A real-time 2D multiplayer maze game built for the Gorbagana testnet hackathon. Players compete in 1v1 matches, navigating through puzzle rooms to collect keys and race to the center to claim the "Gorbagana trash" treasure.

## Game Overview

Players start from opposite ends of a maze-like environment with multiple puzzle rooms arranged around a central treasure room. The objective is to navigate through the maze, collect keys from puzzle rooms, and be the first to reach the center to claim the Gorbagana treasure.

**Features:**
- Real-time multiplayer 1v1 competition
- Dynamic lighting system (rooms can go dark)
- Puzzle-based navigation challenges
- Integration with Gorbagana testnet and native tokens
- Backpack wallet support

## Tech Stack

- **Frontend**: React + TypeScript + Phaser.js + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io + Redis
- **Blockchain**: Solana/Gorbagana + Anchor framework
- **Deployment**: Vercel/Netlify (frontend), Railway/Render (backend)

## Project Structure

```
├── client/          # React + Phaser frontend
├── server/          # Node.js multiplayer server
├── contracts/       # Solana smart contracts
├── shared/          # Shared types and constants
└── .claude/         # Development sprint management
```

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Rust (for smart contracts)
- Anchor CLI

### Installation

1. **Install dependencies for all modules:**
```bash
# Client
cd client && npm install

# Server
cd ../server && npm install

# Contracts
cd ../contracts && npm install

# Shared
cd ../shared && npm install
```

2. **Start development servers:**
```bash
# Client (React + Phaser)
cd client && npm run dev

# Server (Node.js + Socket.io)
cd server && npm run dev
```

## Hackathon Requirements

✅ **Multiplayer mini-game** - Real-time 1v1 maze competition  
✅ **Gorbagana testnet integration** - Uses native test tokens  
✅ **Backpack wallet support** - Wallet connection for token transactions  
✅ **Engaging gameplay** - Competitive puzzle-solving with dynamic difficulty  
✅ **Replayable** - Quick matches with randomized elements  

## Game Mechanics

1. **Setup**: Players connect wallets and join 1v1 matches
2. **Navigation**: Move through interconnected puzzle rooms
3. **Collection**: Find and collect keys to unlock center room
4. **Challenge**: Rooms randomly go dark, increasing difficulty
5. **Victory**: First player to reach center claims the treasure
6. **Rewards**: Winner receives Gorbagana tokens/points

## Contributing

This project follows a sprint-based development approach. Check `.claude/current_sprint.md` for active tasks and `.claude/all_sprints.md` for the complete development roadmap.

## License

MIT