import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { 
  getConnection, 
  GORBAGANA_PROGRAM_ID, 
  deriveGameWagerPDA,
  isBackpackInstalled 
} from './blockchain';

// We'll need the IDL for the program - for now, let's create a minimal structure
// In a real implementation, you'd import the generated IDL from your Anchor build
const GORBAGANA_GAME_IDL = {
  version: "0.1.0",
  name: "gorbagana_game",
  instructions: [
    {
      name: "initializeWager",
      accounts: [
        { name: "gameWager", isMut: true, isSigner: false },
        { name: "playerOne", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "roomId", type: "string" },
        { name: "wagerAmount", type: "u64" }
      ]
    },
    {
      name: "joinWager",
      accounts: [
        { name: "gameWager", isMut: true, isSigner: false },
        { name: "playerTwo", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "roomId", type: "string" }
      ]
    },
    {
      name: "claimWager",
      accounts: [
        { name: "gameWager", isMut: true, isSigner: false },
        { name: "winner", isMut: true, isSigner: true }
      ],
      args: [
        { name: "roomId", type: "string" }
      ]
    }
  ]
};

export interface TransactionResult {
  transaction: Transaction;
  gameWagerPDA: PublicKey;
}

export interface TransactionError {
  message: string;
  code?: string;
}

// Create a mock wallet for Anchor Provider (Backpack will sign)
class BackpackWallet {
  constructor(public publicKey: PublicKey) {}
  
  async signTransaction(tx: Transaction): Promise<Transaction> {
    if (!isBackpackInstalled()) {
      throw new Error('Backpack wallet not installed');
    }
    return await window.backpack!.signTransaction(tx);
  }
  
  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    if (!isBackpackInstalled()) {
      throw new Error('Backpack wallet not installed');
    }
    return await window.backpack!.signAllTransactions(txs);
  }
}

function getProvider(walletAddress: string): AnchorProvider {
  const connection = getConnection();
  const publicKey = new PublicKey(walletAddress);
  const wallet = new BackpackWallet(publicKey);
  
  return new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );
}

function getProgram(walletAddress: string): Program {
  const provider = getProvider(walletAddress);
  return new Program(GORBAGANA_GAME_IDL as any, GORBAGANA_PROGRAM_ID, provider);
}

// Task 2.2.2: Build initializeWager transaction for hosts
export async function buildInitializeWagerTransaction(
  walletAddress: string,
  roomId: string,
  wagerAmountGOR: number
): Promise<TransactionResult> {
  try {
    const connection = getConnection();
    const playerOne = new PublicKey(walletAddress);
    const wagerAmountLamports = Math.floor(wagerAmountGOR * LAMPORTS_PER_SOL);
    
    // Derive the PDA for this room
    const [gameWagerPDA, bump] = deriveGameWagerPDA(roomId);
    
    // For hackathon simplicity, we'll just transfer to the PDA address
    // The PDA will be created implicitly when we transfer to it
    const transaction = new Transaction();
    
    // Simple transfer to PDA address (this creates the account)
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: playerOne,
      toPubkey: gameWagerPDA,
      lamports: wagerAmountLamports
    });
    
    transaction.add(transferInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = playerOne;
    
    return {
      transaction,
      gameWagerPDA
    };
    
  } catch (error) {
    console.error('Failed to build initializeWager transaction:', error);
    throw new Error(`Failed to create wager: ${(error as Error).message}`);
  }
}

// Task 2.2.3: Build joinWager transaction for joiners
export async function buildJoinWagerTransaction(
  walletAddress: string,
  roomId: string,
  wagerAmountGOR: number
): Promise<TransactionResult> {
  try {
    const connection = getConnection();
    const playerTwo = new PublicKey(walletAddress);
    const wagerAmountLamports = Math.floor(wagerAmountGOR * LAMPORTS_PER_SOL);
    
    // Derive the same PDA that the host created
    const [gameWagerPDA] = deriveGameWagerPDA(roomId);
    
    // Build transfer instruction to add funds to the wager
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: playerTwo,
      toPubkey: gameWagerPDA,
      lamports: wagerAmountLamports
    });
    
    const transaction = new Transaction();
    transaction.add(transferInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = playerTwo;
    
    return {
      transaction,
      gameWagerPDA
    };
    
  } catch (error) {
    console.error('Failed to build joinWager transaction:', error);
    throw new Error(`Failed to join wager: ${(error as Error).message}`);
  }
}

// Task 2.2.4: Build claimWager transaction for winners
export async function buildClaimWagerTransaction(
  walletAddress: string,
  roomId: string
): Promise<TransactionResult> {
  try {
    const connection = getConnection();
    const winner = new PublicKey(walletAddress);
    
    // Derive the PDA
    const [gameWagerPDA] = deriveGameWagerPDA(roomId);
    
    // Get the wager account balance
    const wagerBalance = await connection.getBalance(gameWagerPDA);
    
    if (wagerBalance === 0) {
      throw new Error('No wager funds to claim');
    }
    
    // Build transfer instruction to claim all funds
    const claimInstruction = SystemProgram.transfer({
      fromPubkey: gameWagerPDA,
      toPubkey: winner,
      lamports: wagerBalance
    });
    
    const transaction = new Transaction();
    transaction.add(claimInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = winner;
    
    return {
      transaction,
      gameWagerPDA
    };
    
  } catch (error) {
    console.error('Failed to build claimWager transaction:', error);
    throw new Error(`Failed to claim wager: ${(error as Error).message}`);
  }
}

// Task 2.2.5: Transaction signing and confirmation logic
export async function signAndSendTransaction(
  transaction: Transaction,
  walletAddress: string
): Promise<string> {
  try {
    if (!isBackpackInstalled()) {
      throw new Error('Backpack wallet not installed');
    }
    
    const connection = getConnection();
    
    // Sign transaction with Backpack
    const signedTransaction = await window.backpack!.signTransaction(transaction);
    
    // Send and confirm transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }
    
    return signature;
    
  } catch (error) {
    console.error('Failed to sign and send transaction:', error);
    throw new Error(`Transaction failed: ${(error as Error).message}`);
  }
}

// Utility to check if user has enough GOR for wager
export async function checkSufficientBalance(
  walletAddress: string,
  wagerAmountGOR: number
): Promise<{ sufficient: boolean; currentBalance: number; needed: number }> {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    const currentBalanceGOR = balance / LAMPORTS_PER_SOL;
    
    // Need wager amount + small buffer for transaction fees
    const neededGOR = wagerAmountGOR + 0.01; // 0.01 GOR buffer for fees
    
    return {
      sufficient: currentBalanceGOR >= neededGOR,
      currentBalance: currentBalanceGOR,
      needed: neededGOR
    };
    
  } catch (error) {
    console.error('Failed to check balance:', error);
    return {
      sufficient: false,
      currentBalance: 0,
      needed: wagerAmountGOR + 0.01
    };
  }
}

// Task 2.2.6: Build cancelWager transaction for hosts (if no joiner)
export async function buildCancelWagerTransaction(
  walletAddress: string,
  roomId: string
): Promise<TransactionResult> {
  try {
    const connection = getConnection();
    const host = new PublicKey(walletAddress);
    
    // Derive the PDA
    const [gameWagerPDA] = deriveGameWagerPDA(roomId);
    
    // Get the wager account balance
    const wagerBalance = await connection.getBalance(gameWagerPDA);
    
    if (wagerBalance === 0) {
      throw new Error('No wager to cancel');
    }
    
    // Build transfer instruction to refund host
    const refundInstruction = SystemProgram.transfer({
      fromPubkey: gameWagerPDA,
      toPubkey: host,
      lamports: wagerBalance
    });
    
    const transaction = new Transaction();
    transaction.add(refundInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = host;
    
    return {
      transaction,
      gameWagerPDA
    };
    
  } catch (error) {
    console.error('Failed to build cancelWager transaction:', error);
    throw new Error(`Failed to cancel wager: ${(error as Error).message}`);
  }
}

// Get wager status from blockchain
export async function getWagerStatus(roomId: string): Promise<{
  exists: boolean;
  balance: number;
  playerCount: number;
  createdAt?: Date;
  canCancel?: boolean;
}> {
  try {
    const connection = getConnection();
    const [gameWagerPDA] = deriveGameWagerPDA(roomId);
    
    const accountInfo = await connection.getAccountInfo(gameWagerPDA);
    
    if (!accountInfo) {
      return { exists: false, balance: 0, playerCount: 0 };
    }
    
    const balance = accountInfo.lamports / LAMPORTS_PER_SOL;
    
    // Simple heuristic: if balance > 0, at least one player has staked
    // In a full implementation, you'd deserialize the account data to get exact state
    const playerCount = balance > 0 ? (balance > 1 ? 2 : 1) : 0;
    
    // For hackathon: Allow cancellation after 2 minutes if only 1 player
    const createdAt = new Date(); // In production, get from account data
    const canCancel = playerCount === 1 && Date.now() - createdAt.getTime() > 2 * 60 * 1000;
    
    return {
      exists: true,
      balance,
      playerCount,
      createdAt,
      canCancel
    };
    
  } catch (error) {
    console.error('Failed to get wager status:', error);
    return { exists: false, balance: 0, playerCount: 0 };
  }
}