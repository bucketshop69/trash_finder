import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';

// Gorbagana Testnet Configuration
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

// Backpack wallet detection and connection
export interface BackpackWallet {
  isConnected: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
}

declare global {
  interface Window {
    backpack?: BackpackWallet;
  }
}

export function isBackpackInstalled(): boolean {
  return typeof window !== 'undefined' && 'backpack' in window;
}

export async function connectBackpack(): Promise<string | null> {
  if (!isBackpackInstalled()) {
    throw new Error('Backpack wallet not installed');
  }

  try {
    const response = await window.backpack!.connect();
    return response.publicKey.toString();
  } catch (error) {
    console.error('Failed to connect to Backpack:', error);
    return null;
  }
}

export async function disconnectBackpack(): Promise<void> {
  if (isBackpackInstalled() && window.backpack!.isConnected) {
    await window.backpack!.disconnect();
  }
}

export function getConnectedWallet(): string | null {
  if (isBackpackInstalled() && window.backpack!.isConnected && window.backpack!.publicKey) {
    return window.backpack!.publicKey.toString();
  }
  return null;
}

// GOR balance checking
export async function getGORBalance(walletAddress: string): Promise<number> {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    
    // Convert lamports to GOR (same as SOL conversion)
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Failed to get GOR balance:', error);
    return 0;
  }
}

// PDA derivation utility (client-side)
export function deriveGameWagerPDA(roomId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('wager'), Buffer.from(roomId)],
    GORBAGANA_PROGRAM_ID
  );
}

// Validation utilities
export function isValidGORAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000; // Max 1000 GOR
}

export function formatGORAmount(amount: number): string {
  return `${amount.toFixed(1)} GOR`;
}

// Faucet link for Gorbagana testnet
export const GORBAGANA_FAUCET_URL = 'https://faucet.gorbagana.wtf/'; // Update with actual faucet URL