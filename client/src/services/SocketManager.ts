import { io, Socket } from 'socket.io-client';

export interface GameStateUpdate {
  gameState: any;
  players: any[];
  timestamp: number;
}

export interface PlayerMoveData {
  position: { x: number; y: number };
  direction?: { x: number; y: number };
}

export interface KeyCollectionData {
  keyId: string;
  position: { x: number; y: number };
}

export interface TreasureClaimData {
  position: { x: number; y: number };
  keysCollected: number;
}

export class SocketManager {
  private socket: Socket | null = null;
  private serverUrl: string = 'http://localhost:3001';
  private isConnected: boolean = false;
  private playerId: string | null = null;
  private roomId: string | null = null;

  // Event callbacks
  private onConnectionChange: ((connected: boolean) => void) | null = null;
  private onGameStateUpdate: ((data: GameStateUpdate) => void) | null = null;
  private onPlayerMoved: ((data: any) => void) | null = null;
  private onKeyCollected: ((data: any) => void) | null = null;
  private onGameWon: ((data: any) => void) | null = null;
  private onGameStarted: ((data: any) => void) | null = null;
  private onRoomJoined: ((data: any) => void) | null = null;

  constructor() {
    // Initialize but don't connect automatically
    console.log('🔌 SocketManager initialized');
  }

  // Connection Management
  public connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to game server');
          this.isConnected = true;
          this.playerId = this.socket!.id || null;
          this.onConnectionChange?.(true);
          resolve(true);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ Disconnected from server:', reason);
          this.isConnected = false;
          this.playerId = null;
          this.roomId = null;
          this.onConnectionChange?.(false);
        });

        this.socket.on('connect_error', (error) => {
          console.error('🚫 Connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        // Set up game event listeners
        this.setupGameEventListeners();

        // Timeout fallback
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);

      } catch (error) {
        console.error('❌ Failed to initialize socket:', error);
        reject(error);
      }
    });
  }

  public disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from server...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.playerId = null;
      this.roomId = null;
    }
  }

  // Game Actions
  public joinQueue(walletAddress?: string): void {
    if (!this.isConnected || !this.socket) {
      console.error('❌ Cannot join queue: not connected to server');
      return;
    }

    console.log('🎮 Joining matchmaking queue...');
    this.socket.emit('join_queue', {
      walletAddress: walletAddress || 'demo_wallet_' + Date.now(),
      timestamp: Date.now()
    });
  }

  public leaveQueue(): void {
    if (!this.isConnected || !this.socket) return;

    console.log('🚪 Leaving queue...');
    this.socket.emit('leave_queue');
  }

  public joinRoom(roomId: string, walletAddress?: string): void {
    if (!this.isConnected || !this.socket) {
      console.error('❌ Cannot join room: not connected to server');
      return;
    }

    console.log(`🚪 Joining room ${roomId}...`);
    this.socket.emit('join_room', {
      roomId,
      walletAddress: walletAddress || 'demo_wallet_' + Date.now(),
      timestamp: Date.now()
    });
  }

  public sendPlayerMove(moveData: PlayerMoveData): void {
    if (!this.isConnected || !this.socket) return;

    this.socket.emit('player_move', {
      position: moveData.position,
      direction: moveData.direction,
      timestamp: Date.now()
    });
  }

  public sendKeyCollection(keyData: KeyCollectionData): void {
    if (!this.isConnected || !this.socket) return;

    console.log('🗝️ Attempting to collect key:', keyData.keyId);
    this.socket.emit('collect_key', {
      keyId: keyData.keyId,
      position: keyData.position,
      timestamp: Date.now()
    });
  }

  public sendTreasureClaim(treasureData: TreasureClaimData): void {
    if (!this.isConnected || !this.socket) return;

    console.log('💎 Attempting to claim treasure...');
    this.socket.emit('claim_treasure', {
      position: treasureData.position,
      keysCollected: treasureData.keysCollected,
      timestamp: Date.now()
    });
  }

  // Event Listener Setup
  private setupGameEventListeners(): void {
    if (!this.socket) return;

    // Welcome message
    this.socket.on('welcome', (data) => {
      console.log('👋 Server welcome:', data.message);
      this.playerId = data.playerId;
    });

    // Room events
    this.socket.on('room_joined', (data) => {
      console.log('🏠 Joined room:', data.roomId);
      this.roomId = data.roomId;
      this.onRoomJoined?.(data);
    });

    this.socket.on('player_joined', (data) => {
      console.log('👤 Player joined room:', data);
    });

    this.socket.on('player_left', (data) => {
      console.log('👋 Player left room:', data);
    });

    // Game events
    this.socket.on('game_started', (data) => {
      console.log('🎮 Game started!', data);
      this.onGameStarted?.(data);
    });

    this.socket.on('game_state_update', (data) => {
      this.onGameStateUpdate?.(data);
    });

    this.socket.on('player_moved', (data) => {
      this.onPlayerMoved?.(data);
    });

    this.socket.on('key_collected', (data) => {
      console.log('🗝️ Key collected:', data);
      this.onKeyCollected?.(data);
    });

    this.socket.on('game_won', (data) => {
      console.log('🏆 Game won!', data);
      this.onGameWon?.(data);
    });

    this.socket.on('game_ended', (data) => {
      console.log('🏁 Game ended:', data.reason);
    });

    // Error events
    this.socket.on('queue_error', (data) => {
      console.error('❌ Queue error:', data.message);
    });

    this.socket.on('key_collection_failed', (data) => {
      console.warn('⚠️ Key collection failed:', data.reason);
    });

    this.socket.on('treasure_claim_failed', (data) => {
      console.warn('⚠️ Treasure claim failed:', data.reason);
    });
  }

  // Event Callback Setters
  public onConnect(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback;
  }

  public onGameState(callback: (data: GameStateUpdate) => void): void {
    this.onGameStateUpdate = callback;
  }

  public onPlayerMove(callback: (data: any) => void): void {
    this.onPlayerMoved = callback;
  }

  public onKeyCollection(callback: (data: any) => void): void {
    this.onKeyCollected = callback;
  }

  public onGameWin(callback: (data: any) => void): void {
    this.onGameWon = callback;
  }

  public onGameStart(callback: (data: any) => void): void {
    this.onGameStarted = callback;
  }

  public onRoomJoin(callback: (data: any) => void): void {
    this.onRoomJoined = callback;
  }

  // Getters
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getPlayerId(): string | null {
    return this.playerId;
  }

  public getRoomId(): string | null {
    return this.roomId;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance for global access
export const socketManager = new SocketManager();