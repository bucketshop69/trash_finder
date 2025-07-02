import type { RoomState, Door, Key, Position, RoomCoordinates, MazeConfig, MazeData, MazeGeneratorConfig, RoomObject, RoomComplexity, GridPosition } from '../../types/GameTypes';
import { ObjectType, LightingState } from '../../types/GameTypes';

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
    const objects = this.createObjectsFromConfig(config, rooms);

    return { rooms, doors, keys, objects };
  }

  // Keep old method for backward compatibility during refactor
  public generateMaze(): MazeData {
    const rooms = this.createRooms();
    const doors = this.createDoors();
    const keys = this.createKeys();
    const objects = this.createObjectsForRoom1();

    return { rooms, doors, keys, objects };
  }

  private createRooms(): RoomState[] {
    const rooms: RoomState[] = [];

    // Only Room1 for testing grid system
    const room1Position = this.calculateRoom1Position();

    const room1: RoomState = {
      id: 'room1',
      position: room1Position,
      isLit: true,
      lightingState: LightingState.BRIGHT, // Start with bright lighting
      hasKey: true,
      keyId: 'key_room1',
      playerOccupancy: [],
      doors: [], // Will be populated when doors are created
      objects: [] // Will be populated when objects are created
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
          lightingState: this.getRandomLightingState(), // Random lighting for variety
          hasKey: true, // Always have a key for simplicity
          keyId: `key_${roomId}`,
          playerOccupancy: [],
          doors: [],
          objects: []
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

  // Object generation methods
  private createObjectsForRoom1(): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Create furniture and wall objects for Room1
    objects.push(...this.generateBasicFurniture('room1'));
    objects.push(...this.generateWallObjects('room1'));
    
    // Add internal walls for complexity (30% chance)
    if (Math.random() < 0.3) {
      objects.push(...this.generateInternalWalls('room1'));
    }
    
    return objects;
  }

  private createObjectsFromConfig(config: MazeConfig, rooms: RoomState[]): RoomObject[] {
    const objects: RoomObject[] = [];
    
    rooms.forEach(room => {
      // Add furniture and wall objects to each room
      objects.push(...this.generateBasicFurniture(room.id));
      objects.push(...this.generateWallObjects(room.id));
      
      // Add internal walls based on room complexity (30% chance)
      if (Math.random() < 0.3) {
        objects.push(...this.generateInternalWalls(room.id));
      }
    });
    
    return objects;
  }

  private generateBasicFurniture(roomId: string): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Use grid-based placement system
    const grid = this.createEmptyGrid();
    
    // Place objects using grid zones
    const deskZone = this.getGridZone('corner_nw', grid);
    const deskPos = this.selectRandomGridPosition(deskZone);
    if (deskPos) {
      objects.push(this.createObject(roomId, 'desk_1', ObjectType.DESK, deskPos, {width: 2, height: 1}, true, false));
      this.markGridOccupied(grid, deskPos, {width: 2, height: 1});
    }

    // Chair near desk
    const chairZone = this.getGridZone('near_desk', grid, deskPos);
    const chairPos = this.selectRandomGridPosition(chairZone);
    if (chairPos) {
      objects.push(this.createObject(roomId, 'chair_1', ObjectType.CHAIR, chairPos, {width: 1, height: 1}, true, false));
      this.markGridOccupied(grid, chairPos, {width: 1, height: 1});
    }

    // Trash bin in different area
    const trashZone = this.getGridZone('corner_se', grid);
    const trashPos = this.selectRandomGridPosition(trashZone);
    if (trashPos) {
      objects.push(this.createObject(roomId, 'trash_1', ObjectType.TRASH_BIN, trashPos, {width: 1, height: 1}, true, false));
      this.markGridOccupied(grid, trashPos, {width: 1, height: 1});
    }

    // Computer on desk or nearby
    const computerZone = this.getGridZone('center', grid);
    const computerPos = this.selectRandomGridPosition(computerZone);
    if (computerPos) {
      objects.push(this.createObject(roomId, 'computer_1', ObjectType.COMPUTER, computerPos, {width: 1, height: 1}, false, true));
      this.markGridOccupied(grid, computerPos, {width: 1, height: 1});
    }

    return objects;
  }

  // Grid-based placement system
  private createEmptyGrid(): boolean[][] {
    // Create 9x9 grid, true = occupied, false = free
    return Array(9).fill(null).map(() => Array(9).fill(false));
  }

  private getGridZone(zoneName: string, grid: boolean[][], referencePos?: GridPosition): GridPosition[] {
    const zones: GridPosition[] = [];
    
    switch (zoneName) {
      case 'corner_nw': // North-west corner
        for (let row = 1; row <= 3; row++) {
          for (let col = 1; col <= 3; col++) {
            if (!grid[row][col]) zones.push({row, col});
          }
        }
        break;
        
      case 'corner_ne': // North-east corner
        for (let row = 1; row <= 3; row++) {
          for (let col = 5; col <= 7; col++) {
            if (!grid[row][col]) zones.push({row, col});
          }
        }
        break;
        
      case 'corner_sw': // South-west corner
        for (let row = 5; row <= 7; row++) {
          for (let col = 1; col <= 3; col++) {
            if (!grid[row][col]) zones.push({row, col});
          }
        }
        break;
        
      case 'corner_se': // South-east corner
        for (let row = 5; row <= 7; row++) {
          for (let col = 5; col <= 7; col++) {
            if (!grid[row][col]) zones.push({row, col});
          }
        }
        break;
        
      case 'center': // Center area
        for (let row = 3; row <= 5; row++) {
          for (let col = 3; col <= 5; col++) {
            if (!grid[row][col]) zones.push({row, col});
          }
        }
        break;
        
      case 'near_desk': // Near desk (adjacent to reference position)
        if (referencePos) {
          for (let row = Math.max(1, referencePos.row - 1); row <= Math.min(7, referencePos.row + 1); row++) {
            for (let col = Math.max(1, referencePos.col + 2); col <= Math.min(7, referencePos.col + 3); col++) {
              if (!grid[row][col]) zones.push({row, col});
            }
          }
        }
        break;
        
      case 'walls': // Wall positions (perimeter)
        // North wall
        for (let col = 1; col <= 7; col++) {
          if (!grid[0][col]) zones.push({row: 0, col});
        }
        // South wall
        for (let col = 1; col <= 7; col++) {
          if (!grid[8][col]) zones.push({row: 8, col});
        }
        // East/West walls
        for (let row = 1; row <= 7; row++) {
          if (!grid[row][0]) zones.push({row, col: 0});
          if (!grid[row][8]) zones.push({row, col: 8});
        }
        break;
    }
    
    return zones;
  }

  private selectRandomGridPosition(availablePositions: GridPosition[]): GridPosition | null {
    if (availablePositions.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    return availablePositions[randomIndex];
  }

  private markGridOccupied(grid: boolean[][], position: GridPosition, size: {width: number, height: number}) {
    for (let row = position.row; row < position.row + size.height && row < 9; row++) {
      for (let col = position.col; col < position.col + size.width && col < 9; col++) {
        grid[row][col] = true;
      }
    }
  }

  private createObject(roomId: string, name: string, type: ObjectType, gridPos: GridPosition, size: {width: number, height: number}, collision: boolean, interactive: boolean): RoomObject {
    return {
      id: `${roomId}_${name}`,
      type: type,
      gridPosition: gridPos,
      size: size,
      collision: collision,
      interactive: interactive,
      roomId: roomId
    };
  }

  private generateWallObjects(roomId: string): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Use grid-based placement for wall objects
    const grid = this.createEmptyGrid();
    const wallZone = this.getGridZone('walls', grid);
    
    // Place picture on wall
    const picturePos = this.selectRandomGridPosition(wallZone);
    if (picturePos) {
      objects.push(this.createObject(roomId, 'picture_1', ObjectType.PICTURE, picturePos, {width: 1, height: 1}, false, false));
      this.markGridOccupied(grid, picturePos, {width: 1, height: 1});
    }

    // Place light switch on different wall
    const remainingWallZone = this.getGridZone('walls', grid);
    const switchPos = this.selectRandomGridPosition(remainingWallZone);
    if (switchPos) {
      objects.push(this.createObject(roomId, 'switch_1', ObjectType.LIGHT_SWITCH, switchPos, {width: 1, height: 1}, false, true));
      this.markGridOccupied(grid, switchPos, {width: 1, height: 1});
    }

    // Place whiteboard on another wall (larger, 2x1 size)
    const whiteboardWallZone = this.getGridZone('walls', grid);
    const whiteboardPos = this.selectRandomGridPosition(whiteboardWallZone.filter(pos => {
      // Ensure there's space for 2x1 whiteboard
      return pos.col <= 7 || pos.row <= 7; // Leave room for 2x1 object
    }));
    if (whiteboardPos) {
      objects.push(this.createObject(roomId, 'whiteboard_1', ObjectType.WHITEBOARD, whiteboardPos, {width: 2, height: 1}, false, false));
      this.markGridOccupied(grid, whiteboardPos, {width: 2, height: 1});
    }

    // Add graffiti on remaining wall space
    const graffitiWallZone = this.getGridZone('walls', grid);
    const graffitiPos = this.selectRandomGridPosition(graffitiWallZone);
    if (graffitiPos) {
      objects.push(this.createObject(roomId, 'graffiti_1', ObjectType.GRAFFITI, graffitiPos, {width: 1, height: 1}, false, false));
    }

    return objects;
  }

  private generateComplexLayout(roomId: string): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Start with basic furniture
    objects.push(...this.generateBasicFurniture(roomId));
    objects.push(...this.generateWallObjects(roomId));
    
    // Add internal wall segments for complexity
    // Horizontal wall segment (creates sub-areas)
    objects.push({
      id: `${roomId}_wall_h1`,
      type: ObjectType.WALL_SEGMENT,
      gridPosition: { row: 3, col: 2 },
      size: { width: 4, height: 1 }, // 4x1 horizontal wall
      collision: true,
      interactive: false,
      roomId: roomId
    });

    // Internal door in the wall
    objects.push({
      id: `${roomId}_internal_door_1`,
      type: ObjectType.INTERNAL_DOOR,
      gridPosition: { row: 3, col: 4 },
      size: { width: 1, height: 1 },
      collision: false, // Door is open
      interactive: true, // Can open/close door
      roomId: roomId
    });

    return objects;
  }

  private generateInternalWalls(roomId: string): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Create a grid to track occupied spaces
    const grid = this.createEmptyGrid();
    
    // Mark existing furniture areas as occupied (simplified)
    this.markFurnitureAreas(grid);
    
    // Generate different internal wall patterns
    const patterns = ['L_shape', 'cross', 'T_shape', 'corridor'];
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    switch (selectedPattern) {
      case 'L_shape':
        objects.push(...this.createLShapeWalls(roomId, grid));
        break;
      case 'cross':
        objects.push(...this.createCrossWalls(roomId, grid));
        break;
      case 'T_shape':
        objects.push(...this.createTShapeWalls(roomId, grid));
        break;
      case 'corridor':
        objects.push(...this.createCorridorWalls(roomId, grid));
        break;
    }
    
    return objects;
  }

  private markFurnitureAreas(grid: boolean[][]) {
    // Mark common furniture areas as occupied
    // Corner areas (where desks/chairs typically go)
    for (let row = 1; row <= 2; row++) {
      for (let col = 1; col <= 3; col++) {
        grid[row][col] = true;
      }
    }
    // Center area (leave some space)
    grid[4][4] = true;
  }

  private createLShapeWalls(roomId: string, grid: boolean[][]): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Create L-shaped internal wall
    // Horizontal segment
    objects.push(this.createObject(roomId, 'wall_h1', ObjectType.WALL_SEGMENT, 
      {row: 3, col: 3}, {width: 3, height: 1}, true, false));
    
    // Vertical segment
    objects.push(this.createObject(roomId, 'wall_v1', ObjectType.WALL_SEGMENT, 
      {row: 3, col: 5}, {width: 1, height: 3}, true, false));
    
    // Internal door in horizontal wall
    objects.push(this.createObject(roomId, 'internal_door_1', ObjectType.INTERNAL_DOOR, 
      {row: 3, col: 4}, {width: 1, height: 1}, false, true));
    
    return objects;
  }

  private createCrossWalls(roomId: string, grid: boolean[][]): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Create cross-shaped internal walls
    // Horizontal wall
    objects.push(this.createObject(roomId, 'wall_h1', ObjectType.WALL_SEGMENT, 
      {row: 4, col: 2}, {width: 5, height: 1}, true, false));
    
    // Vertical wall
    objects.push(this.createObject(roomId, 'wall_v1', ObjectType.WALL_SEGMENT, 
      {row: 2, col: 4}, {width: 1, height: 5}, true, false));
    
    // Four internal doors at cross intersections
    objects.push(this.createObject(roomId, 'internal_door_1', ObjectType.INTERNAL_DOOR, 
      {row: 4, col: 3}, {width: 1, height: 1}, false, true));
    objects.push(this.createObject(roomId, 'internal_door_2', ObjectType.INTERNAL_DOOR, 
      {row: 4, col: 5}, {width: 1, height: 1}, false, true));
    
    return objects;
  }

  private createTShapeWalls(roomId: string, grid: boolean[][]): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Create T-shaped internal wall
    // Horizontal base
    objects.push(this.createObject(roomId, 'wall_h1', ObjectType.WALL_SEGMENT, 
      {row: 5, col: 2}, {width: 4, height: 1}, true, false));
    
    // Vertical stem
    objects.push(this.createObject(roomId, 'wall_v1', ObjectType.WALL_SEGMENT, 
      {row: 2, col: 4}, {width: 1, height: 3}, true, false));
    
    // Door in vertical wall
    objects.push(this.createObject(roomId, 'internal_door_1', ObjectType.INTERNAL_DOOR, 
      {row: 3, col: 4}, {width: 1, height: 1}, false, true));
    
    return objects;
  }

  private createCorridorWalls(roomId: string, grid: boolean[][]): RoomObject[] {
    const objects: RoomObject[] = [];
    
    // Create corridor-style walls (parallel walls with gaps)
    // Left wall
    objects.push(this.createObject(roomId, 'wall_v1', ObjectType.WALL_SEGMENT, 
      {row: 2, col: 3}, {width: 1, height: 4}, true, false));
    
    // Right wall
    objects.push(this.createObject(roomId, 'wall_v2', ObjectType.WALL_SEGMENT, 
      {row: 2, col: 5}, {width: 1, height: 4}, true, false));
    
    // Doors for entry/exit
    objects.push(this.createObject(roomId, 'internal_door_1', ObjectType.INTERNAL_DOOR, 
      {row: 3, col: 3}, {width: 1, height: 1}, false, true));
    objects.push(this.createObject(roomId, 'internal_door_2', ObjectType.INTERNAL_DOOR, 
      {row: 5, col: 5}, {width: 1, height: 1}, false, true));
    
    return objects;
  }

  private getRandomLightingState(): LightingState {
    const states = [LightingState.BRIGHT, LightingState.DIM, LightingState.DARK];
    const weights = [0.5, 0.3, 0.2]; // 50% bright, 30% dim, 20% dark
    
    const random = Math.random();
    if (random < weights[0]) return LightingState.BRIGHT;
    if (random < weights[0] + weights[1]) return LightingState.DIM;
    return LightingState.DARK;
  }
}