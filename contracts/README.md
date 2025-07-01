# Gorbagana Game Contracts

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
- Game entry fee management
- Winner reward distribution
- Token mechanics
- Player authentication