import { Server } from 'socket.io';
import { GameState } from './GameState';

export interface Player {
  id: string;
  walletAddress: string;
  position: { x: number; y: number };
  keysCollected: number;
  isReady: boolean;
  joinedAt: Date;
}

export class GameRoom {
  public id: string;
  private io: Server;
  private players: Map<string, Player> = new Map();
  private gameState: GameState;
  private maxPlayers: number = 2;
  private gameStarted: boolean = false;

  constructor(roomId: string, io: Server) {
    this.id = roomId;
    this.io = io;
    this.gameState = new GameState();
  }

  public addPlayer(playerId: string, walletAddress: string): boolean {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    const player: Player = {
      id: playerId,
      walletAddress,
      position: this.getSpawnPosition(this.players.size),
      keysCollected: 0,
      isReady: false,
      joinedAt: new Date()
    };

    this.players.set(playerId, player);
    console.log(`✅ Player ${playerId} added to room ${this.id}`);

    // Notify room about new player
    this.io.to(this.id).emit('player_joined', {
      playerId,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers
    });

    return true;
  }

  public removePlayer(playerId: string): boolean {
    const removed = this.players.delete(playerId);
    
    if (removed) {
      console.log(`❌ Player ${playerId} removed from room ${this.id}`);
      
      // Notify room about player leaving
      this.io.to(this.id).emit('player_left', {
        playerId,
        playerCount: this.players.size
      });

      // End game if it was started and a player left
      if (this.gameStarted) {
        this.endGame('Player disconnected');
      }
    }

    return removed;
  }

  public hasPlayer(playerId: string): boolean {
    return this.players.has(playerId);
  }

  public isFull(): boolean {
    return this.players.size >= this.maxPlayers;
  }

  public isEmpty(): boolean {
    return this.players.size === 0;
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public startGame(): void {
    if (this.gameStarted || !this.isFull()) {
      return;
    }

    this.gameStarted = true;
    this.gameState.startGame();

    console.log(`🎮 Starting game in room ${this.id}`);

    // Send game start event to all players
    this.io.to(this.id).emit('game_started', {
      roomId: this.id,
      players: Array.from(this.players.values()),
      gameState: this.gameState.getPublicState(),
      timestamp: new Date().toISOString()
    });

    // Start game loop
    this.startGameLoop();
  }

  public endGame(reason: string): void {
    if (!this.gameStarted) {
      return;
    }

    this.gameStarted = false;
    console.log(`🏁 Game ended in room ${this.id}: ${reason}`);

    this.io.to(this.id).emit('game_ended', {
      reason,
      finalState: this.gameState.getPublicState(),
      timestamp: new Date().toISOString()
    });
  }

  public handlePlayerMove(playerId: string, moveData: any): void {
    const player = this.players.get(playerId);
    if (!player || !this.gameStarted) {
      return;
    }

    // Update player position
    player.position = moveData.position;

    // Broadcast move to other players
    this.io.to(this.id).emit('player_moved', {
      playerId,
      position: player.position,
      timestamp: Date.now()
    });
  }

  public handleKeyCollection(playerId: string, keyData: any): void {
    const player = this.players.get(playerId);
    if (!player || !this.gameStarted) {
      return;
    }

    // Validate key collection
    if (this.gameState.canCollectKey(keyData.keyId, player.position)) {
      player.keysCollected++;
      this.gameState.collectKey(keyData.keyId);

      // Broadcast key collection
      this.io.to(this.id).emit('key_collected', {
        playerId,
        keyId: keyData.keyId,
        keysCollected: player.keysCollected,
        timestamp: Date.now()
      });

      // Check win condition
      if (player.keysCollected >= this.gameState.getRequiredKeys()) {
        this.handlePlayerWin(playerId);
      }
    }
  }

  private handlePlayerWin(playerId: string): void {
    const winner = this.players.get(playerId);
    if (!winner) return;

    console.log(`🏆 Player ${playerId} won in room ${this.id}`);

    this.io.to(this.id).emit('game_won', {
      winnerId: playerId,
      winnerWallet: winner.walletAddress,
      gameTime: this.gameState.getGameTime(),
      timestamp: new Date().toISOString()
    });

    this.endGame('Player won');
  }

  private getSpawnPosition(playerIndex: number): { x: number; y: number } {
    // Return spawn positions for player 1 and player 2
    const spawnPositions = [
      { x: 100, y: 300 }, // Player 1 - left side
      { x: 1100, y: 300 } // Player 2 - right side
    ];
    
    return spawnPositions[playerIndex] || { x: 600, y: 400 };
  }

  private startGameLoop(): void {
    const gameLoop = setInterval(() => {
      if (!this.gameStarted) {
        clearInterval(gameLoop);
        return;
      }

      // Update game state
      this.gameState.update();

      // Broadcast game state to all players
      this.io.to(this.id).emit('game_state_update', {
        gameState: this.gameState.getPublicState(),
        players: Array.from(this.players.values()),
        timestamp: Date.now()
      });

    }, 1000 / 60); // 60 FPS game loop
  }
}