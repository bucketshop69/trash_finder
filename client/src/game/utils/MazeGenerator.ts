import type { RoomState, Door, Key, Position, RoomCoordinates, MazeConfig } from '../../types/GameTypes';

export class MazeGenerator {
  private config: MazeConfig;

  constructor() {
    // Grid-based Room1 configuration  
    this.config = {
      gridSize: { rows: 9, cols: 9 },        // 9x9 grid per room
      roomSize: { width: 198, height: 144 }, // 9*22 = 198, 9*16 = 144
      doorWidth: 22,                         // Grid cell width
      canvasSize: { width: 800, height: 600 },
      gridCellSize: { width: 22, height: 16 } // New: grid cell dimensions
    };
  }

  public generateMaze(): { rooms: RoomState[], doors: Door[], keys: Key[] } {
    const rooms = this.createRooms();
    const doors = this.createDoors();
    const keys = this.createKeys();

    return { rooms, doors, keys };
  }

  private createRooms(): RoomState[] {
    const rooms: RoomState[] = [];

    // Only Room1 for testing grid system
    const room1Position = this.calculateRoom1Position();
    
    const room1: RoomState = {
      id: 'room1',
      position: room1Position,
      isLit: true,
      hasKey: true,
      keyId: 'key_room1',
      playerOccupancy: [],
      doors: [] // Will be populated when doors are created
    };

    rooms.push(room1);
    return rooms;
  }

  private calculateRoom1Position(): RoomCoordinates {
    // Position Room1 in center-ish of screen for testing
    const x = 250; // Centered horizontally
    const y = 200; // Centered vertically
    
    return {
      x,
      y,
      width: this.config.roomSize.width,   // 198px (9 * 22)
      height: this.config.roomSize.height  // 144px (9 * 16)
    };
  }

  private createDoors(): Door[] {
    const doors: Door[] = [];

    // Only entrance door to Room1 for testing
    const room1Position = this.calculateRoom1Position();
    
    // Entrance door OUTSIDE Room1's left wall - invisible door
    const entranceDoor: Door = {
      id: 'door_entrance_room1', 
      type: 'open',
      position: { 
        x: room1Position.x - 30,  // OUTSIDE the left wall of Room1
        y: room1Position.y + (2 * this.config.gridCellSize.height)  // Middle of left wall
      },
      orientation: 'vertical',
      isOpen: true,
      connectsRooms: ['spawn', 'room1']
    };

    doors.push(entranceDoor);
    return doors;
  }

  private createKeys(): Key[] {
    const keys: Key[] = [];

    // Only one key in Room1 for testing
    const room1Position = this.calculateRoom1Position();
    
    // Place key at grid position (4,4) - center of room1
    const key: Key = {
      id: 'key_room1',
      position: { 
        x: room1Position.x + (4 * this.config.gridCellSize.width) + 11,  // Grid col 4 + center offset
        y: room1Position.y + (4 * this.config.gridCellSize.height) + 8   // Grid row 4 + center offset
      },
      collected: false,
      roomId: 'room1',
      unlocksDoorsIds: [] // No doors to unlock for now
    };

    keys.push(key);
    return keys;
  }

  private calculateRoomPosition(gridX: number, gridY: number): RoomCoordinates {
    const x = 100 + (gridX * this.config.roomSize.width);
    const y = 50 + (gridY * this.config.roomSize.height);

    return {
      x,
      y,
      width: this.config.roomSize.width,
      height: this.config.roomSize.height
    };
  }

  public getSpawnPosition(playerIndex: number): Position {
    // Spawn at grid (1,1) outside Room1's left side
    const room1Position = this.calculateRoom1Position();
    
    // Grid (1,1) = 1 cell from room1's left edge, 1 cell down from room1's top
    const spawnX = room1Position.x - (2 * this.config.gridCellSize.width);  // 2 cells left of room1
    const spawnY = room1Position.y + (1 * this.config.gridCellSize.height); // 1 cell down from room1 top
    
    return { x: spawnX, y: spawnY };
  }

  public getConfig(): MazeConfig {
    return this.config;
  }
}