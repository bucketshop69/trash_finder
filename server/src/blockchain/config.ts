import { Connection, PublicKey } from '@solana/web3.js';

// Gorbagana Testnet Configuration - Hardcoded for deployment
export const GORBAGANA_RPC_URL = 'https://rpc.gorbagana.wtf/';
export const GORBAGANA_PROGRAM_ID = new PublicKey('ASRy3mvEcwWzPFNZVJubdnm6XhMTdjSYPPZ48rexm3hB');

// Connection singleton
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(GORBAGANA_RPC_URL, 'confirmed');
  }
  return connection;
}

// PDA derivation utility
export function deriveGameWagerPDA(roomId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('wager'), Buffer.from(roomId)],
    GORBAGANA_PROGRAM_ID
  );
}

// Room ID validation - ensure blockchain compatibility
export function validateRoomId(roomId: string): boolean {
  // Must be alphanumeric and dashes only, max 32 bytes
  const regex = /^[a-zA-Z0-9-_]{1,32}$/;
  return regex.test(roomId);
}

// Generate blockchain-compatible room ID
export function generateRoomId(): string {
  return `room-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// NOTE: Server authority and smart contract integration removed
// Wager claiming is now handled as simple in-memory tracking

// NOTE: Wager claiming is now handled manually from the lobby
// Auto-claiming has been removed for better user control