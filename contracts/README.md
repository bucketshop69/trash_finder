# Gorbagana Game Contracts

## TL;DR
Anchor-based Solana smart contracts for the Gorbagana Trash Finder game. Handles winner-takes-all wagers, on-chain rewards, and player authentication for 1v1 maze matches.

---

Smart contracts for Gorbagana Trash Finder game on Solana.

## Tech Stack
- Anchor framework
- Rust for smart contracts
- Solana/Gorbagana testnet

## Structure
```
programs/   # Rust smart contract programs
tests/      # TypeScript contract tests
```

## Development
```bash
npm install
anchor build    # Build contracts
anchor test     # Run tests
anchor deploy   # Deploy to testnet
```

## Contracts
- Game entry fee management (stake GOR tokens)
- Winner reward distribution (claim pot)
- Token mechanics
- Player authentication and on-chain game state