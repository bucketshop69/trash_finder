import type { RoomState, Door, Key, Position, RoomCoordinates, MazeConfig, MazeData, MazeGeneratorConfig } from '../../types/GameTypes';

export class MazeGenerator {
  private internalConfig: MazeGeneratorConfig;

  constructor() {
    // Grid-based Room1 configuration  
    this.internalConfig = {
      gridSize: { rows: 9, cols: 9 },        // 9x9 grid per room
      roomSize: { width: 198, height: 144 }, // 9*22 = 198, 9*16 = 144
      doorWidth: 22,                         // Grid cell width
      canvasSize: { width: 800, height: 600 },
      gridCellSize: { width: 22, height: 16 } // New: grid cell dimensions
    };
  }

  public generate(config: MazeConfig): MazeData {
    // Use config to generate dynamic maze data
    const rooms = this.createRoomsFromConfig(config);
    const doors = this.createDoorsFromConfig(config, rooms);
    const keys = this.createKeysFromConfig(config, rooms);

    return { rooms, doors, keys };
  }

  // Keep old method for backward compatibility during refactor
  public generateMaze(): MazeData {
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
      width: this.internalConfig.roomSize.width,   // 198px (9 * 22)
      height: this.internalConfig.roomSize.height  // 144px (9 * 16)
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
        y: room1Position.y + (2 * this.internalConfig.gridCellSize.height)  // Middle of left wall
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
        x: room1Position.x + (4 * this.internalConfig.gridCellSize.width) + 11,  // Grid col 4 + center offset
        y: room1Position.y + (4 * this.internalConfig.gridCellSize.height) + 8   // Grid row 4 + center offset
      },
      collected: false,
      roomId: 'room1',
      unlocksDoorsIds: [] // No doors to unlock for now
    };

    keys.push(key);
    return keys;
  }

  private calculateRoomPosition(gridX: number, gridY: number): RoomCoordinates {
    const x = 100 + (gridX * this.internalConfig.roomSize.width);
    const y = 50 + (gridY * this.internalConfig.roomSize.height);

    return {
      x,
      y,
      width: this.internalConfig.roomSize.width,
      height: this.internalConfig.roomSize.height
    };
  }

  public getSpawnPosition(playerIndex: number): Position {
    // Spawn at grid (1,1) outside Room1's left side
    const room1Position = this.calculateRoom1Position();
    
    // Grid (1,1) = 1 cell from room1's left edge, 1 cell down from room1's top
    const spawnX = room1Position.x - (2 * this.internalConfig.gridCellSize.width);  // 2 cells left of room1
    const spawnY = room1Position.y + (1 * this.internalConfig.gridCellSize.height); // 1 cell down from room1 top
    
    return { x: spawnX, y: spawnY };
  }

  public getConfig(): MazeGeneratorConfig {
    return this.internalConfig;
  }

  // New dynamic generation methods
  private createRoomsFromConfig(config: MazeConfig): RoomState[] {
    const rooms: RoomState[] = [];
    
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const roomId = `room_${row}_${col}`;
        const position = {
          x: col * config.roomWidth + 100, // Center rooms on screen
          y: row * config.roomHeight + 100,
          width: config.roomWidth,
          height: config.roomHeight
        };
        
        const room: RoomState = {
          id: roomId,
          position,
          isLit: true,
          hasKey: true, // Always have a key for simplicity
          keyId: `key_${roomId}`,
          playerOccupancy: [],
          doors: []
        };
        
        rooms.push(room);
      }
    }
    
    return rooms;
  }

  private createDoorsFromConfig(config: MazeConfig, rooms: RoomState[]): Door[] {
    const doors: Door[] = [];
    
    // For single room (1x1), create entrance door from spawn area
    if (config.rows === 1 && config.cols === 1) {
      const room = rooms[0];
      const entranceDoor: Door = {
        id: 'door_entrance_room1',
        type: 'open',
        position: {
          x: room.position.x - 25, // Outside the left wall
          y: room.position.y + room.position.height / 2 - 20
        },
        orientation: 'vertical',
        isOpen: true,
        connectsRooms: ['spawn', 'room_0_0']
      };
      doors.push(entranceDoor);
      return doors;
    }
    
    // For multi-room configurations, create connecting doors
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        // Create horizontal doors (connecting rooms horizontally)
        if (col < config.cols - 1) {
          const doorId = `door_${row}_${col}_h`;
          const door: Door = {
            id: doorId,
            type: 'open',
            position: {
              x: (col + 1) * config.roomWidth - 10,
              y: row * config.roomHeight + config.roomHeight / 2 - 10
            },
            orientation: 'vertical',
            isOpen: true,
            connectsRooms: [`room_${row}_${col}`, `room_${row}_${col + 1}`]
          };
          doors.push(door);
        }
        
        // Create vertical doors (connecting rooms vertically)
        if (row < config.rows - 1) {
          const doorId = `door_${row}_${col}_v`;
          const door: Door = {
            id: doorId,
            type: 'open',
            position: {
              x: col * config.roomWidth + config.roomWidth / 2 - 10,
              y: (row + 1) * config.roomHeight - 10
            },
            orientation: 'horizontal',
            isOpen: true,
            connectsRooms: [`room_${row}_${col}`, `room_${row + 1}_${col}`]
          };
          doors.push(door);
        }
      }
    }
    
    return doors;
  }

  private createKeysFromConfig(config: MazeConfig, rooms: RoomState[]): Key[] {
    const keys: Key[] = [];
    
    rooms.forEach(room => {
      if (room.hasKey && room.keyId) {
        const key: Key = {
          id: room.keyId,
          position: {
            x: room.position.x + room.position.width / 2,
            y: room.position.y + room.position.height / 2
          },
          collected: false,
          roomId: room.id,
          unlocksDoorsIds: []
        };
        keys.push(key);
      }
    });
    
    return keys;
  }
}