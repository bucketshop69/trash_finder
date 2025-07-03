export interface Key {
  id: string;
  position: { x: number; y: number };
  collected: boolean;
  roomId: string;
  unlocksDoorsIds: string[];
}

export interface Room {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isLit: boolean;
  hasKey: boolean;
  keyId?: string;
  playerOccupancy: string[];
}

export interface Treasure {
  id: string;
  position: { x: number; y: number };
  roomId: string;
  keysRequired: number;
  claimed: boolean;
  claimedBy?: string;
}

export class GameState {
  private startTime: Date | null = null;
  private keys: Map<string, Key> = new Map();
  private rooms: Map<string, Room> = new Map();
  private treasure!: Treasure; // Will be initialized in initializeLevel
  private requiredKeys: number = 3;
  private gameStarted: boolean = false;

  constructor() {
    this.initializeLevel();
  }

  public startGame(): void {
    this.gameStarted = true;
    this.startTime = new Date();
    console.log('🎮 Game state initialized and started');
  }

  public update(): void {
    if (!this.gameStarted) return;

    // Update room lighting (simulate lights going out randomly)
    this.updateRoomLighting();
  }

  public canCollectKey(keyId: string, playerPosition: { x: number; y: number }): boolean {
    const key = this.keys.get(keyId);
    if (!key || key.collected) {
      return false;
    }

    // Check if player is close enough to key (simple distance check)
    const distance = Math.sqrt(
      Math.pow(playerPosition.x - key.position.x, 2) +
      Math.pow(playerPosition.y - key.position.y, 2)
    );

    return distance < 50; // 50 pixel radius for key collection
  }

  public collectKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key || key.collected) {
      console.log(`⚠️ Key ${keyId} already collected or doesn't exist`);
      return false;
    }

    // Atomic operation - mark as collected immediately to prevent race conditions
    key.collected = true;
    
    // Turn off lights in the room where key was collected (optional lighting effect)
    const room = this.rooms.get(key.roomId);
    if (room) {
      room.isLit = false;
    }

    console.log(`🔒 Key ${keyId} successfully marked as collected (server authority)`);
    return true;
  }

  public getRequiredKeys(): number {
    return this.requiredKeys;
  }

  public getGameTime(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  public canClaimTreasure(playerId: string, playerPosition: { x: number; y: number }, playerKeys: number): boolean {
    if (!this.treasure || this.treasure.claimed) {
      return false;
    }

    // Check if player has enough keys
    if (playerKeys < this.treasure.keysRequired) {
      return false;
    }

    // Check if player is close enough to treasure
    const distance = Math.sqrt(
      Math.pow(playerPosition.x - this.treasure.position.x, 2) +
      Math.pow(playerPosition.y - this.treasure.position.y, 2)
    );

    return distance < 50; // 50 pixel radius for treasure interaction
  }

  public claimTreasure(playerId: string): boolean {
    if (!this.treasure || this.treasure.claimed) {
      console.log(`⚠️ Treasure already claimed or doesn't exist`);
      return false;
    }

    // Atomic operation - mark as claimed immediately to prevent race conditions
    this.treasure.claimed = true;
    this.treasure.claimedBy = playerId;
    
    console.log(`🏆 Treasure successfully claimed by ${playerId} (server authority)`);
    return true;
  }

  public getTreasure(): Treasure | undefined {
    return this.treasure;
  }

  public getPublicState(): any {
    return {
      keys: Array.from(this.keys.values()),
      rooms: Array.from(this.rooms.values()),
      treasure: this.treasure,
      requiredKeys: this.requiredKeys,
      gameTime: this.getGameTime(),
      gameStarted: this.gameStarted
    };
  }

  private initializeLevel(): void {
    // Create 3x3 grid layout (matching client MazeGenerator)
    const rows = 3;
    const cols = 3;
    const roomWidth = 200;
    const roomHeight = 150;
    const offsetX = 100; // Starting position
    const offsetY = 100;

    // Create all 9 rooms in 3x3 grid
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const roomId = `room_${row}_${col}`;
        const x = col * roomWidth + offsetX;
        const y = row * roomHeight + offsetY;

        const room: Room = {
          id: roomId,
          position: { x, y },
          size: { width: roomWidth, height: roomHeight },
          isLit: true,
          hasKey: true, // Every room has a key for now (matches client)
          playerOccupancy: []
        };

        // Create key for each room (matching client pattern)
        const keyId = `key_${roomId}`;
        const key: Key = {
          id: keyId,
          position: {
            x: x + roomWidth / 2,   // Center of room
            y: y + roomHeight / 2
          },
          collected: false,
          roomId: roomId,
          unlocksDoorsIds: []
        };

        this.keys.set(keyId, key);
        room.keyId = keyId;
        this.rooms.set(roomId, room);
      }
    }

    // Create treasure in center room (room_1_1)
    const centerRoom = this.rooms.get('room_1_1');
    if (centerRoom) {
      this.treasure = {
        id: 'center_treasure',
        position: {
          x: centerRoom.position.x + centerRoom.size.width / 2,
          y: centerRoom.position.y + centerRoom.size.height / 2
        },
        roomId: 'room_1_1',
        keysRequired: this.requiredKeys,
        claimed: false
      };
    }

    console.log(`🗝️ Initialized ${this.keys.size} keys in ${this.rooms.size} rooms (3x3 grid)`);
    console.log(`💎 Treasure placed in center room: ${this.treasure?.roomId}`);
  }

  private updateRoomLighting(): void {
    // Randomly turn lights on/off in rooms (difficulty feature)
    this.rooms.forEach(room => {
      if (room.id !== 'center' && Math.random() < 0.001) { // 0.1% chance per frame
        room.isLit = !room.isLit;
      }
    });
  }
}