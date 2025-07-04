export enum TrashType {
  APPLE_CORE = "apple_core",
  BANANA_PEEL = "banana_peel", 
  CARDBOARD_BOX = "cardboard_box",
  FISH_BONES = "fish_bones",
  GLASS_BOTTLE = "glass_bottle",
  MILK_CARTON = "milk_carton",
  NEWSPAPER = "newspaper",
  PLASTIC_BOTTLE = "plastic_bottle",
  SODA_CAN = "soda_can"
}

export interface Trash {
  id: string;
  type: TrashType;
  position: { x: number; y: number };
  collected: boolean;
  roomId: string;
}

export interface Room {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isLit: boolean;
  hasTrash: boolean;
  trashId?: string;
  playerOccupancy: string[];
}

export interface Treasure {
  id: string;
  position: { x: number; y: number };
  roomId: string;
  trashRequired: number;
  claimed: boolean;
  claimedBy?: string;
}

export class GameState {
  private startTime: Date | null = null;
  private trash: Map<string, Trash> = new Map();
  private rooms: Map<string, Room> = new Map();
  private treasure!: Treasure; // Will be initialized in initializeLevel
  private requiredTrash: number = 3;
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

  public canCollectTrash(trashId: string, playerPosition: { x: number; y: number }): boolean {
    console.log(`🔍 Looking for trash: ${trashId}`);
    console.log(`🔍 Available trash: ${Array.from(this.trash.keys()).join(', ')}`);
    
    const trash = this.trash.get(trashId);
    if (!trash) {
      console.log(`⚠️ Trash ${trashId} NOT FOUND in map`);
      return false;
    }
    if (trash.collected) {
      console.log(`⚠️ Trash ${trashId} ALREADY COLLECTED`);
      return false;
    }

    // Check if player is close enough to trash (simple distance check)
    const distance = Math.sqrt(
      Math.pow(playerPosition.x - trash.position.x, 2) +
      Math.pow(playerPosition.y - trash.position.y, 2)
    );

    console.log(`🗑️ Distance check for ${trashId}:`);
    console.log(`   Player: (${playerPosition.x}, ${playerPosition.y})`);
    console.log(`   Trash: (${trash.position.x}, ${trash.position.y})`);
    console.log(`   Distance: ${distance.toFixed(1)} pixels (max: 120)`);

    return distance < 120; // 120 pixel radius for trash collection (increased for easier pickup)
  }

  public collectTrash(trashId: string): boolean {
    const trash = this.trash.get(trashId);
    if (!trash || trash.collected) {
      console.log(`⚠️ Trash ${trashId} already collected or doesn't exist`);
      return false;
    }

    // Atomic operation - mark as collected immediately to prevent race conditions
    trash.collected = true;
    
    // Turn off lights in the room where trash was collected (optional lighting effect)
    const room = this.rooms.get(trash.roomId);
    if (room) {
      room.isLit = false;
    }

    console.log(`🗑️ Trash ${trashId} successfully marked as collected (server authority)`);
    return true;
  }

  public getRequiredTrash(): number {
    return this.requiredTrash;
  }

  public getGameTime(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  public canClaimTreasure(playerId: string, playerPosition: { x: number; y: number }, playerTrash: number): boolean {
    if (!this.treasure || this.treasure.claimed) {
      return false;
    }

    // Check if player has enough trash
    if (playerTrash < this.treasure.trashRequired) {
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
      trash: Array.from(this.trash.values()),
      rooms: Array.from(this.rooms.values()),
      treasure: this.treasure,
      requiredTrash: this.requiredTrash,
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
          hasTrash: false, // Will be set for selected rooms
          playerOccupancy: []
        };

        this.rooms.set(roomId, room);
      }
    }

    // Generate 6 trash items in fixed rooms (for consistency with client)
    const availableTrashTypes = [
      TrashType.APPLE_CORE, TrashType.BANANA_PEEL, TrashType.CARDBOARD_BOX,
      TrashType.FISH_BONES, TrashType.GLASS_BOTTLE, TrashType.MILK_CARTON
    ];
    
    // Use same room selection as client: distribute across grid (excluding center room_1_1)
    const selectedRooms = ['room_0_0', 'room_0_1', 'room_0_2', 'room_1_0', 'room_1_2', 'room_2_0'];
    
    for (let i = 0; i < 6; i++) {
      const roomId = selectedRooms[i];
      const room = this.rooms.get(roomId)!;
      const trashType = availableTrashTypes[i];
      
      // Generate pseudo-random position within room (avoid walls/objects)
      const margin = 40; // Increased margin to avoid walls
      const x = room.position.x + margin + Math.random() * (room.size.width - 2 * margin);
      const y = room.position.y + margin + Math.random() * (room.size.height - 2 * margin);
      
      const trashId = `trash_${trashType}_${roomId}`;
      const trash: Trash = {
        id: trashId,
        type: trashType,
        position: { x, y },
        collected: false,
        roomId: roomId
      };

      this.trash.set(trashId, trash);
      room.hasTrash = true;
      room.trashId = trashId;
    }

    // Create treasure in center room (room_1_1) - still needed for win condition
    const centerRoom = this.rooms.get('room_1_1');
    if (centerRoom) {
      this.treasure = {
        id: 'center_treasure',
        position: {
          x: centerRoom.position.x + centerRoom.size.width / 2,
          y: centerRoom.position.y + centerRoom.size.height / 2
        },
        roomId: 'room_1_1',
        trashRequired: this.requiredTrash,
        claimed: false
      };
    }

    console.log(`🗑️ Initialized ${this.trash.size} trash items in ${this.rooms.size} rooms (3x3 grid)`);
    console.log(`🗑️ Server trash IDs:`, Array.from(this.trash.keys()));
    console.log(`💎 Treasure placed in center room: ${this.treasure?.roomId}`);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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