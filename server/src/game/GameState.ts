export interface Key {
  id: string;
  position: { x: number; y: number };
  collected: boolean;
  roomId: string;
}

export interface Room {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isLit: boolean;
  hasKey: boolean;
  keyId?: string;
}

export class GameState {
  private startTime: Date | null = null;
  private keys: Map<string, Key> = new Map();
  private rooms: Map<string, Room> = new Map();
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
      return false;
    }

    key.collected = true;
    
    // Turn off lights in the room where key was collected
    const room = this.rooms.get(key.roomId);
    if (room) {
      room.isLit = false;
    }

    return true;
  }

  public getRequiredKeys(): number {
    return this.requiredKeys;
  }

  public getGameTime(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  public getPublicState(): any {
    return {
      keys: Array.from(this.keys.values()),
      rooms: Array.from(this.rooms.values()),
      requiredKeys: this.requiredKeys,
      gameTime: this.getGameTime(),
      gameStarted: this.gameStarted
    };
  }

  private initializeLevel(): void {
    // Create rooms layout (matching our ASCII design)
    const roomConfigs = [
      { id: 'room1', x: 50, y: 150, width: 150, height: 100, hasKey: true },
      { id: 'room2', x: 250, y: 150, width: 150, height: 100, hasKey: false },
      { id: 'room3', x: 800, y: 150, width: 150, height: 100, hasKey: false },
      { id: 'room4', x: 1000, y: 150, width: 150, height: 100, hasKey: true },
      { id: 'room5', x: 50, y: 400, width: 150, height: 100, hasKey: false },
      { id: 'room6', x: 250, y: 400, width: 150, height: 100, hasKey: true },
      { id: 'room7', x: 800, y: 400, width: 150, height: 100, hasKey: true },
      { id: 'room8', x: 1000, y: 400, width: 150, height: 100, hasKey: false },
      { id: 'center', x: 525, y: 600, width: 150, height: 100, hasKey: false } // Treasure room
    ];

    // Create rooms
    roomConfigs.forEach(config => {
      const room: Room = {
        id: config.id,
        position: { x: config.x, y: config.y },
        size: { width: config.width, height: config.height },
        isLit: true,
        hasKey: config.hasKey
      };

      // Create key if room has one
      if (config.hasKey) {
        const keyId = `key_${config.id}`;
        const key: Key = {
          id: keyId,
          position: {
            x: config.x + config.width / 2,
            y: config.y + config.height / 2
          },
          collected: false,
          roomId: config.id
        };

        this.keys.set(keyId, key);
        room.keyId = keyId;
      }

      this.rooms.set(config.id, room);
    });

    console.log(`🗝️ Initialized ${this.keys.size} keys in ${this.rooms.size} rooms`);
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