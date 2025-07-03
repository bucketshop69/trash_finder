# Contract Integration Plan - Gorbagana Game

## Overview
This document outlines the step-by-step micro-tasks to integrate the deployed smart contract with the multiplayer game client and server.

**Goal**: Connect the working multiplayer maze game to the deployed Gorbagana smart contract so players can stake GOR tokens and receive rewards.

---

## Phase 1: Server-Side Blockchain Integration

### 1.1 Server Authority Setup
- [ ] **Task 1.1.1**: Generate server authority keypair for contract operations
- [ ] **Task 1.1.2**: Store server keypair securely (environment variables)
- [ ] **Task 1.1.3**: Add Gorbagana RPC connection to server
- [ ] **Task 1.1.4**: Create Anchor program instance in server code

### 1.2 Room ID & PDA Management
- [ ] **Task 1.2.1**: Ensure room IDs are blockchain-compatible (no special chars)
- [ ] **Task 1.2.2**: Create PDA derivation utility function
- [ ] **Task 1.2.3**: Pass room_id to clients when room is created
- [ ] **Task 1.2.4**: Store room_id to PDA mapping in server memory

### 1.3 Contract Instruction Calls
- [ ] **Task 1.3.1**: Implement `initializeWager` call when host creates wager
- [ ] **Task 1.3.2**: Implement `joinWager` call when second player joins
- [ ] **Task 1.3.3**: Implement `claimWager` call when game ends (auto-transfer)
- [ ] **Task 1.3.4**: Implement `cancelWager` call for disconnections/timeouts
- [ ] **Task 1.3.5**: Add error handling for all blockchain operations

### 1.4 Game Flow Integration
- [ ] **Task 1.4.1**: Add wager amount to room creation options
- [ ] **Task 1.4.2**: Prevent game start until both players have staked
- [ ] **Task 1.4.3**: Call `claimWager` automatically when winner is determined
- [ ] **Task 1.4.4**: Handle mid-game disconnections with `cancelWager`

---

## Phase 2: Client-Side Blockchain Integration (Simplified Backpack)

### 2.1 Backpack Wallet Integration (Simple Approach)
- [ ] **Task 2.1.1**: Install basic Solana web3 dependencies (@solana/web3.js, @coral-xyz/anchor)
- [ ] **Task 2.1.2**: Replace mock wallet with Backpack wallet detection (window.backpack)
- [ ] **Task 2.1.3**: Add Gorbagana RPC configuration to client (https://rpc.gorbagana.wtf/)
- [ ] **Task 2.1.4**: Implement simple wallet connection with window.backpack.connect()

### 2.2 Transaction Building & Balance Checking
- [ ] **Task 2.2.1**: Create GOR balance checking utility using Gorbagana RPC
- [ ] **Task 2.2.2**: Build `initializeWager` transaction for hosts
- [ ] **Task 2.2.3**: Build `joinWager` transaction for joiners
- [ ] **Task 2.2.4**: Build `claimWager` transaction for winners
- [ ] **Task 2.2.5**: Add transaction signing and confirmation logic

### 2.3 Game Flow UI/UX Updates
- [ ] **Task 2.3.1**: Update "Create Game" flow: Wallet Check → GOR Check → Wager Amount
- [ ] **Task 2.3.2**: Add wager amount input with preset options (0.1, 0.5, 1.0 GOR)
- [ ] **Task 2.3.3**: Update "Join Room" flow: Paste Room ID → Wallet Check → GOR Check → Join Wager
- [ ] **Task 2.3.4**: Show room sharing UI with Room ID for host to share
- [ ] **Task 2.3.5**: Add "Insufficient GOR - Get from Faucet" warning with link
- [ ] **Task 2.3.6**: Show staking status and "Waiting for opponent..." states
- [ ] **Task 2.3.7**: Implement winner claim screen with "Claim Your Wager" button
- [ ] **Task 2.3.8**: Show unclaimed wager indicator in lobby ("You have unclaimed winnings!")

### 2.4 PDA Derivation (Client-Side)
- [ ] **Task 2.4.1**: Create PDA derivation utility (same as server)
- [ ] **Task 2.4.2**: Derive GameWager PDA using room_id from server

---

## 🎮 **Complete User Flows:**

### **Host Player Flow:**
1. Click "Create Game" → Check if `window.backpack` exists
2. If no Backpack → Show "Install Backpack Wallet" message
3. If not connected → Show "Connect Backpack" button → Call `window.backpack.connect()`
4. If connected → Check GOR balance using Gorbagana RPC
5. If insufficient GOR → Show "Get GOR from Faucet" warning + faucet link
6. If sufficient GOR → Show wager amount selector (0.1, 0.5, 1.0 GOR)
7. Click "Create Wager Game" → Build & sign `initializeWager` transaction
8. Transaction confirmed → Room created, show "Share Room ID: room-123-abc"
9. Wait for joiner → "Waiting for opponent to stake..." screen

### **Joiner Player Flow:**
1. Click "Join Game" → Show "Paste Room ID" input field
2. Enter Room ID → Click "Join Room" → Check wallet connected
3. If not connected → Show "Connect Backpack" button
4. If connected → Check GOR balance for wager amount
5. If insufficient → Show "Need X GOR to join this game - Get from Faucet"
6. If sufficient → Show "Join Wager: X GOR" confirmation button
7. Click "Join Wager" → Build & sign `joinWager` transaction
8. Transaction confirmed → Both players ready → Game starts automatically!

### **Winner Flow:**
1. Game ends → Show "🏆 You Won!" screen
2. Display "Claim Your Wager: X GOR" button
3. Click "Claim Wager" → Build & sign `claimWager` transaction
4. Transaction confirmed → Show "Wager claimed successfully!" + transaction link

---

## Phase 3: Error Handling & Edge Cases

### 3.1 Transaction Failures
- [ ] **Task 3.1.1**: Handle insufficient balance errors
- [ ] **Task 3.1.2**: Handle network timeout errors
- [ ] **Task 3.1.3**: Handle transaction rejected by user
- [ ] **Task 3.1.4**: Implement retry logic for failed transactions

### 3.2 Game State Synchronization
- [ ] **Task 3.2.1**: Sync on-chain wager state with game state
- [ ] **Task 3.2.2**: Handle discrepancies between blockchain and server state
- [ ] **Task 3.2.3**: Implement blockchain state polling/listening
- [ ] **Task 3.2.4**: Add fallback to non-wager mode if blockchain fails

### 3.3 User Experience
- [ ] **Task 3.3.1**: Show transaction progress indicators
- [ ] **Task 3.3.2**: Add "what's happening" explanations for users
- [ ] **Task 3.3.3**: Implement graceful degradation for blockchain failures
- [ ] **Task 3.3.4**: Add help/FAQ for wallet setup

---

## Phase 4: Security & Validation

### 4.1 Server Security
- [ ] **Task 4.1.1**: Validate that wager amounts match expected values
- [ ] **Task 4.1.2**: Verify PDA ownership before claiming rewards
- [ ] **Task 4.1.3**: Rate limit blockchain operations to prevent spam
- [ ] **Task 4.1.4**: Log all blockchain operations for audit

### 4.2 Client Validation
- [ ] **Task 4.2.1**: Validate wallet is connected before starting wager games
- [ ] **Task 4.2.2**: Check sufficient balance before allowing wager creation
- [ ] **Task 4.2.3**: Verify transaction confirmations before proceeding
- [ ] **Task 4.2.4**: Prevent double-spending attempts

---

## Phase 5: Testing & Deployment

### 5.1 Integration Testing
- [ ] **Task 5.1.1**: Test complete wager flow (create → join → play → claim)
- [ ] **Task 5.1.2**: Test cancellation scenarios (disconnect, timeout)
- [ ] **Task 5.1.3**: Test error cases (insufficient funds, network issues)
- [ ] **Task 5.1.4**: Test with multiple concurrent games

### 5.2 User Acceptance Testing
- [ ] **Task 5.2.1**: Test with real Backpack wallets and Gorbagana tokens
- [ ] **Task 5.2.2**: Test on mobile devices (responsive design)
- [ ] **Task 5.2.3**: Performance testing with blockchain operations
- [ ] **Task 5.2.4**: Usability testing with non-crypto users

### 5.3 Production Deployment
- [ ] **Task 5.3.1**: Deploy frontend with Gorbagana RPC configuration
- [ ] **Task 5.3.2**: Deploy server with production blockchain settings
- [ ] **Task 5.3.3**: Set up monitoring for blockchain operations
- [ ] **Task 5.3.4**: Create deployment checklist and rollback plan

---

## Configuration Details

### Gorbagana Testnet v2 Settings
- **RPC URL**: `https://rpc.gorbagana.wtf/`
- **Program ID**: `ASRy3mvEcwWzPFNZVJubdnm6XhMTdjSYPPZ48rexm3hB`
- **Network**: Gorbagana Testnet v2 (Devnet compatible)

### Dependencies Needed
- **Server**: `@coral-xyz/anchor`, `@solana/web3.js`
- **Client**: `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/wallet-adapter-*`

### Key Files to Modify
- **Server**: Socket handlers, game logic, room management
- **Client**: Wallet components, game UI, transaction handling

---

## Success Criteria

✅ **Players can stake GOR tokens when creating/joining games**
✅ **Winners automatically receive the combined pot**
✅ **Losers are refunded if games are cancelled**
✅ **All transactions are visible on Gorbagana explorer**
✅ **Game works seamlessly with Backpack wallet**
✅ **Error handling provides clear user feedback**

---

## Estimated Timeline
- **Phase 1**: 2-3 days (Server integration)
- **Phase 2**: 2-3 days (Client integration)  
- **Phase 3**: 1-2 days (Error handling)
- **Phase 4**: 1 day (Security)
- **Phase 5**: 1-2 days (Testing & deployment)

**Total**: ~7-11 days for complete integration

---

*This plan assumes the smart contract is already deployed and tested (✅ Complete)*