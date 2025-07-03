# Gorbagana Trash Finder - Multiplayer Maze Game

## TL;DR
A real-time, 2D multiplayer maze game for the Gorbagana testnet hackathon. Compete 1v1, collect trash scattered around rooms, and race to the center to fill the trash can. Stake GOR tokens—winner takes all! Native Backpack wallet integration and streamlined claiming system.

---

## 🎮 Complete Game Experience

### Game Flow Overview
1. **Connect Wallet** → Use Backpack wallet to connect to Gorbagana testnet
2. **Join/Create Room** → Choose free play or create wager rooms with GOR stakes
3. **Maze Competition** → Real-time 1v1 puzzle-solving race through interconnected rooms
4. **Victory** → First to collect trash and fill the trash can at center wins
5. **Claim Winnings** → Winners return to lobby to claim their GOR rewards

### Detailed Game Mechanics

#### 🏁 Game Setup
- **Wallet Connection**: Players connect Backpack wallet to Gorbagana testnet
- **Room Creation**: Host creates either free rooms or wager rooms (0.1, 0.5, or 1.0 GOR)
- **Matchmaking**: Second player joins using Room ID or finds available rooms
- **Stakes**: Both players stake equal amounts for wager games (winner takes all)

#### 🎯 Core Gameplay
- **Spawn Points**: Players start at opposite corners of a 3x3 maze grid
- **Room Navigation**: Move between interconnected puzzle rooms using WASD keys
- **Trash Collection**: Find and collect trash scattered throughout the maze rooms
- **Dynamic Lighting**: Rooms randomly go dark, forcing players to navigate by memory
- **Real-time Competition**: See opponent movements and trash collection in real-time
- **Victory Condition**: First player to collect enough trash and fill the trash can at the center wins

#### 💰 Wager System
- **Staking**: Players stake GOR tokens when creating/joining wager rooms
- **Escrow**: Stakes are held securely until game completion
- **Winner Takes All**: Winning player receives 2x their stake (opponent's + their own)
- **Claim Process**: Winners see unclaimed winnings in lobby and can claim anytime
- **No Auto-Claim**: Manual claiming gives players control over when to process rewards

#### 🏆 Post-Game Experience
- **Victory Screen**: Shows win/loss status and potential winnings
- **Return to Lobby**: Players return to main lobby after matches
- **Unclaimed Winnings**: Lobby displays any pending rewards from won matches
- **Easy Claiming**: Simple "Claim" button to collect winnings
- **Match History**: Track performance across multiple games

## 🛠 Technical Architecture

### Frontend (Client)
- **React + TypeScript**: Modern UI framework with type safety
- **Phaser.js**: 2D game engine for real-time maze gameplay
- **Tailwind CSS**: Utility-first styling for responsive UI
- **Socket.io Client**: Real-time communication with game server
- **Backpack Wallet Integration**: Native Gorbagana testnet wallet support

### Backend (Server)
- **Node.js + Express**: Scalable server architecture
- **Socket.io**: Real-time bidirectional communication
- **Game State Management**: Authoritative server-side game logic
- **Room Management**: Dynamic room creation, joining, and lifecycle
- **Wager Tracking**: Server-side tracking of stakes and winnings

### Blockchain Integration
- **Gorbagana Testnet**: Native integration with testnet infrastructure
- **Anchor Framework**: Solana smart contract development
- **Backpack Wallet**: Seamless wallet connection and transaction signing
- **Pure P2P Transactions**: Direct player-to-escrow-to-winner transfers
- **Smart Contract Escrow**: Secure holding of wager funds during games

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Backpack wallet browser extension
- Some Gorbagana testnet tokens (get from faucet)

### Quick Start
1. **Clone Repository**
   ```bash
   git clone [repository-url]
   cd gorbagana_trash_finder
   ```

2. **Install Dependencies**
   ```bash
   # Install client dependencies
   cd client && npm install
   
   # Install server dependencies
   cd ../server && npm install
   ```

3. **Start Development Servers**
   ```bash
   # Terminal 1: Start game server
   cd server && npm run dev
   
   # Terminal 2: Start client
   cd client && npm run dev
   ```

4. **Setup Wallet**
   - Install Backpack wallet extension
   - Create/import wallet
   - Switch to Gorbagana testnet
   - Get test tokens from faucet

### Environment Configuration
```bash
# Client (.env)
VITE_SERVER_URL=http://localhost:3001
VITE_GORBAGANA_RPC_URL=https://rpc.gorbagana.wtf/

# Server (.env)
PORT=3001
GORBAGANA_RPC_URL=https://rpc.gorbagana.wtf/
```

## 🎯 How to Play

### For New Players
1. **Connect Wallet**: Click "Connect Wallet" and authorize Backpack
2. **Check Balance**: Ensure you have GOR tokens for wager games
3. **Start Simple**: Try a free game first to learn mechanics
4. **Learn Controls**: Use WASD to move, collect trash by walking over it
5. **Practice Navigation**: Get familiar with room layouts and transitions

### Wager Games
1. **Create Wager Room**: Select amount (0.1, 0.5, or 1.0 GOR) and create
2. **Share Room ID**: Give the generated Room ID to your opponent
3. **Wait for Join**: Opponent joins and stakes matching amount
4. **Compete**: Race to collect trash and fill the trash can at center first
5. **Claim Winnings**: Return to lobby to claim your victory rewards

### Pro Tips
- **Memory Challenge**: Remember room layouts when lights go out
- **Speed vs Safety**: Balance quick movement with careful navigation
- **Trash Collection Strategy**: Plan efficient routes to collect trash throughout the maze
- **Opponent Awareness**: Watch opponent movements to adjust strategy

## 🏆 Hackathon Features

### Core Requirements Met
✅ **Multiplayer Mini-Game**: Real-time 1v1 competitive gameplay  
✅ **Gorbagana Integration**: Native testnet tokens and RPC connectivity  
✅ **Backpack Wallet**: Seamless wallet connection and transaction flow  
✅ **Engaging Mechanics**: Puzzle-solving with dynamic difficulty  
✅ **Replayable**: Quick matches with varied layouts and challenges  

### Technical Innovations
- **Real-time Synchronization**: Smooth multiplayer experience with minimal latency
- **Dynamic Lighting System**: Adaptive difficulty through environmental changes
- **Streamlined Claiming**: User-friendly reward collection in lobby
- **Room-based Matchmaking**: Flexible game creation and joining system
- **Responsive Design**: Works on desktop and mobile devices

## 🔧 Development

### Architecture Decisions
- **Client-Side Game Logic**: Phaser.js handles rendering and input
- **Server Authority**: Backend validates moves and manages game state
- **Hybrid Approach**: Client prediction with server reconciliation
- **Modular Design**: Separate concerns for easy maintenance and scaling

### Key Components
- **MazeScene**: Core game rendering and interaction logic
- **GameRoom**: Server-side room and player management
- **SocketManager**: Client-server communication layer
- **WalletConnect**: Blockchain integration and transaction handling

### Testing Strategy
- **Local Development**: Run both client and server locally
- **Wallet Testing**: Use testnet tokens for safe transaction testing
- **Room Simulation**: Test various player join/leave scenarios
- **Performance**: Monitor for smooth 60fps gameplay

## 🚀 Deployment

### Production Ready
- **Frontend**: Deployed on Vercel/Netlify with optimized builds
- **Backend**: Scalable deployment on Railway/Render with persistent storage
- **Monitoring**: Health checks and performance monitoring
- **Security**: Input validation and rate limiting

## 📞 Support

### Common Issues
- **Wallet Connection**: Ensure Backpack is installed and on Gorbagana testnet
- **Transaction Failures**: Check sufficient balance for gas fees
- **Room Access**: Verify Room ID is correct and room is still available
- **Performance**: Try refreshing browser or clearing cache

### Development Help
- Check console logs for detailed error messages
- Verify environment variables are set correctly
- Ensure both client and server are running
- Test wallet connection with small transactions first

---

**Built for Gorbagana Hackathon** | **Team**: Claude AI + Human Collaboration | **License**: MIT