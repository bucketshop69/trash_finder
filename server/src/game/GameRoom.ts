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
      maxPlayers: this.maxPlayers,
      newPlayer: {
        id: playerId,
        position: player.position
      }
    });

    // Send existing players to new player
    this.sendExistingPlayersToNewPlayer(playerId);

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
        this.endGame(`Player ${playerId.substring(0, 8)}... disconnected`);
        
        // Broadcast to remaining players
        this.io.to(this.id).emit('player_disconnected', {
          playerId,
          remainingPlayers: this.players.size,
          timestamp: Date.now()
        });
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
    if (!player) {
      return;
    }

    // Update player position
    player.position = moveData.position;

    console.log(`🏃 Player ${playerId} moved to (${player.position.x}, ${player.position.y})`);

    // Broadcast move to ALL other players in room (even before game starts)
    this.io.to(this.id).emit('player_moved', {
      playerId,
      position: player.position,
      direction: moveData.direction,
      timestamp: Date.now()
    });
  }

  public handleKeyCollection(playerId: string, keyData: any): void {
    const player = this.players.get(playerId);
    if (!player) {
      console.log(`❌ Player ${playerId} not found for key collection`);
      return;
    }

    console.log(`🗝️ Validating key collection: ${keyData.keyId} by ${playerId}`);
    console.log(`Player position: (${player.position.x}, ${player.position.y})`);

    // Validate key collection (works both in started and lobby mode for testing)
    if (this.gameState.canCollectKey(keyData.keyId, player.position)) {
      // Server authoritative: collect the key
      const collected = this.gameState.collectKey(keyData.keyId);
      
      if (collected) {
        player.keysCollected++;
        
        console.log(`✅ Key ${keyData.keyId} collected by ${playerId} (total: ${player.keysCollected})`);

        // Broadcast key collection to ALL players in room
        this.io.to(this.id).emit('key_collected', {
          playerId,
          keyId: keyData.keyId,
          keysCollected: player.keysCollected,
          playerPosition: player.position,
          timestamp: Date.now()
        });

        // Keys collected but victory requires treasure interaction
        console.log(`🗝️ Player ${playerId} now has ${player.keysCollected}/${this.gameState.getRequiredKeys()} keys`);
        if (player.keysCollected >= this.gameState.getRequiredKeys()) {
          console.log(`✨ Player ${playerId} has enough keys to claim treasure!`);
        }
      } else {
        // Key collection failed - send error to specific player
        console.log(`❌ Key ${keyData.keyId} could not be collected (already taken?)`);
        this.io.to(playerId).emit('key_collection_failed', {
          keyId: keyData.keyId,
          reason: 'Key already collected by another player',
          timestamp: Date.now()
        });
      }
    } else {
      console.log(`❌ Key ${keyData.keyId} collection invalid: player too far or key not available`);
    }
  }

  public handleTreasureClaim(playerId: string, treasureData: any): void {
    const player = this.players.get(playerId);
    if (!player) {
      console.log(`❌ Player ${playerId} not found for treasure claim`);
      return;
    }

    console.log(`💎 Validating treasure claim by ${playerId}`);
    console.log(`Player position: (${player.position.x}, ${player.position.y})`);
    console.log(`Player keys: ${player.keysCollected}, required: ${this.gameState.getRequiredKeys()}`);

    // Validate treasure claim
    if (this.gameState.canClaimTreasure(playerId, player.position, player.keysCollected)) {
      // Server authoritative: claim the treasure
      const claimed = this.gameState.claimTreasure(playerId);
      
      if (claimed) {
        console.log(`🏆 Treasure claimed by ${playerId}!`);
        this.handlePlayerWin(playerId);
      } else {
        // Treasure claim failed - send error to specific player
        console.log(`❌ Treasure could not be claimed (already taken?)`);
        this.io.to(playerId).emit('treasure_claim_failed', {
          reason: 'Treasure already claimed by another player',
          timestamp: Date.now()
        });
      }
    } else {
      // Invalid treasure claim - send error to specific player
      console.log(`❌ Treasure claim invalid: insufficient keys or player too far`);
      this.io.to(playerId).emit('treasure_claim_failed', {
        reason: `Insufficient keys (${player.keysCollected}/${this.gameState.getRequiredKeys()}) or too far from treasure`,
        timestamp: Date.now()
      });
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
    // Match client spawn positions exactly (MazeGenerator.getSpawnPosition)
    const roomWidth = 200;
    const roomHeight = 150;
    const offsetX = 100; // Same as GameState offset
    const offsetY = 100;

    if (playerIndex === 0) {
      // Player 1: Spawn outside room_0_0 (top-left)
      const room00Position = {
        x: 0 * roomWidth + offsetX,   // 100
        y: 0 * roomHeight + offsetY  // 100
      };
      return {
        x: room00Position.x - 50, // Left of room_0_0 = 50
        y: room00Position.y + roomHeight / 2 // Middle of room = 175
      };
    } else {
      // Player 2: Spawn outside room_2_2 (bottom-right)  
      const room22Position = {
        x: 2 * roomWidth + offsetX,   // 500
        y: 2 * roomHeight + offsetY  // 400
      };
      return {
        x: room22Position.x + roomWidth + 40, // Right of room_2_2 = 740
        y: room22Position.y + roomHeight / 2  // Middle of room = 475
      };
    }
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

  private sendExistingPlayersToNewPlayer(newPlayerId: string): void {
    // Send all existing players' positions to the new player
    this.players.forEach((player, playerId) => {
      if (playerId !== newPlayerId) {
        this.io.to(newPlayerId).emit('player_moved', {
          playerId,
          position: player.position,
          timestamp: Date.now(),
          isInitial: true
        });
      }
    });
  }
}