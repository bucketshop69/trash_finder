import { Server } from 'socket.io';
import { GameState } from './GameState';
import { generateRoomId, deriveGameWagerPDA } from '../blockchain/config';

export interface Player {
  id: string;
  walletAddress: string;
  position: { x: number; y: number };
  trashCollected: number;
  isReady: boolean;
  joinedAt: Date;
  hasStaked: boolean;
}

export interface RoomWager {
  amount: number;
  playerOne: string;
  playerTwo: string | null;
  gameWagerPDA: string;
  isActive: boolean;
  createdAt: Date;
}

export class GameRoom {
  public id: string;
  private io: Server;
  private players: Map<string, Player> = new Map();
  private gameState: GameState;
  private maxPlayers: number = 2;
  private gameStarted: boolean = false;
  private wager: RoomWager | null = null;
  private unclaimed: Map<string, number> = new Map();

  constructor(roomId: string, io: Server, wagerAmount?: number) {
    this.id = roomId;
    this.io = io;
    this.gameState = new GameState();
    
    // Initialize wager if amount provided
    if (wagerAmount && wagerAmount > 0) {
      const [gameWagerPDA] = deriveGameWagerPDA(roomId);
      this.wager = {
        amount: wagerAmount,
        playerOne: '',
        playerTwo: null,
        gameWagerPDA: gameWagerPDA.toString(),
        isActive: true,
        createdAt: new Date()
      };
    }
  }

  public addPlayer(playerId: string, walletAddress: string): boolean {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    // TEMP: Allow same wallet for testing
    console.log(`🧪 TEST MODE: Allowing duplicate wallet ${walletAddress}`);

    const player: Player = {
      id: playerId,
      walletAddress,
      position: this.getSpawnPosition(this.players.size),
      trashCollected: 0,
      isReady: false,
      joinedAt: new Date(),
      hasStaked: false
    };

    // Set first player as player one for wager
    if (this.wager && this.players.size === 0) {
      this.wager.playerOne = walletAddress;
    }

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
      },
      wager: this.wager ? {
        amount: this.wager.amount,
        gameWagerPDA: this.wager.gameWagerPDA,
        roomId: this.id
      } : null
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

    // Check if wager game requires both players to stake
    if (this.wager && !this.allPlayersStaked()) {
      console.log(`❌ Cannot start game in room ${this.id}: Not all players have staked`);
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

  public handleTrashCollection(playerId: string, trashData: any): void {
    const player = this.players.get(playerId);
    if (!player) {
      console.log(`❌ Player ${playerId} not found for trash collection`);
      return;
    }

    console.log(`🗑️ Validating trash collection: ${trashData.trashId} by ${playerId}`);
    console.log(`Player position: (${player.position.x}, ${player.position.y})`);

    // Validate trash collection (works both in started and lobby mode for testing)
    if (this.gameState.canCollectTrash(trashData.trashId, player.position)) {
      // Server authoritative: collect the trash
      const collected = this.gameState.collectTrash(trashData.trashId);
      
      if (collected) {
        player.trashCollected++;
        
        console.log(`✅ Trash ${trashData.trashId} collected by ${playerId} (total: ${player.trashCollected})`);

        // Broadcast trash collection to ALL players in room
        this.io.to(this.id).emit('trash_collected', {
          playerId,
          trashId: trashData.trashId,
          trashCollected: player.trashCollected,
          playerPosition: player.position,
          timestamp: Date.now()
        });

        // Check if player has enough trash to potentially win
        console.log(`🗑️ Player ${playerId} now has ${player.trashCollected}/${this.gameState.getRequiredTrash()} trash`);
        if (player.trashCollected >= this.gameState.getRequiredTrash()) {
          console.log(`🏆 Player ${playerId} has enough trash! Go to center trash bin and press space to win!`);
          // Don't win immediately - player must go to center and press space
        }
      } else {
        // Trash collection failed - send error to specific player
        console.log(`❌ Trash ${trashData.trashId} could not be collected (already taken?)`);
        this.io.to(playerId).emit('trash_collection_failed', {
          trashId: trashData.trashId,
          reason: 'Trash already collected by another player',
          timestamp: Date.now()
        });
      }
    } else {
      console.log(`❌ Trash ${trashData.trashId} collection invalid: player too far or trash not available`);
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
    console.log(`Player trash: ${player.trashCollected}, required: ${this.gameState.getRequiredTrash()}`);

    // Validate treasure claim
    if (this.gameState.canClaimTreasure(playerId, player.position, player.trashCollected)) {
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
      console.log(`❌ Treasure claim invalid: insufficient trash or player too far`);
      this.io.to(playerId).emit('treasure_claim_failed', {
        reason: `Insufficient trash (${player.trashCollected}/${this.gameState.getRequiredTrash()}) or too far from treasure`,
        timestamp: Date.now()
      });
    }
  }

  private handlePlayerWin(playerId: string): void {
    const winner = this.players.get(playerId);
    if (!winner) return;

    console.log(`🏆 Player ${playerId} won in room ${this.id}`);

    // Track unclaimed wager for winner
    if (this.wager && this.wager.isActive) {
      this.unclaimed.set(winner.walletAddress, this.wager.amount * 2);
      console.log(`💰 Unclaimed wager: ${this.wager.amount * 2} GOR for ${winner.walletAddress}`);
    }

    this.io.to(this.id).emit('game_won', {
      winnerId: playerId,
      winnerWallet: winner.walletAddress,
      gameTime: this.gameState.getGameTime(),
      timestamp: new Date().toISOString(),
      wager: this.wager ? {
        amount: this.wager.amount * 2,
        gameWagerPDA: this.wager.gameWagerPDA,
        roomId: this.id
      } : null
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

  // Wager-related methods
  public getWager(): RoomWager | null {
    return this.wager;
  }

  public markPlayerStaked(walletAddress: string): void {
    // TEMP: For testing with same wallet, mark the first unstaked player
    const player = Array.from(this.players.values()).find(p => p.walletAddress === walletAddress && !p.hasStaked);
    if (player) {
      player.hasStaked = true;
      console.log(`✅ Player ${walletAddress} has staked in room ${this.id}`);
      
      // Set player two for wager
      if (this.wager && this.wager.playerTwo === null && walletAddress !== this.wager.playerOne) {
        this.wager.playerTwo = walletAddress;
      }
    } else {
      console.log(`❌ No unstaked player found with wallet ${walletAddress}`);
    }
  }

  public allPlayersStaked(): boolean {
    if (!this.wager) return true;
    
    return Array.from(this.players.values()).every(player => player.hasStaked);
  }


  public clearUnclaimedWager(walletAddress: string): void {
    this.unclaimed.delete(walletAddress);
  }

  public getRoomInfo() {
    return {
      id: this.id,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      gameStarted: this.gameStarted,
      wager: this.wager ? {
        amount: this.wager.amount,
        gameWagerPDA: this.wager.gameWagerPDA,
        playersStaked: Array.from(this.players.values()).filter(p => p.hasStaked).length
      } : null
    };
  }

  public getUnclaimedWager(walletAddress: string): any | null {
    const amount = this.unclaimed.get(walletAddress);
    if (amount) {
      return {
        roomId: this.id,
        amount: amount,
        gameWagerPDA: this.wager?.gameWagerPDA || null
      };
    }
    return null;
  }

  public claimWager(walletAddress: string): boolean {
    if (this.unclaimed.has(walletAddress)) {
      this.unclaimed.delete(walletAddress);
      console.log(`✅ Wager claimed for ${walletAddress} in room ${this.id}`);
      return true;
    }
    return false;
  }
}