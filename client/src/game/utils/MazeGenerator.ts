import type { RoomState, Door, Trash, Treasure, Position, RoomCoordinates, MazeConfig, MazeData, MazeGeneratorConfig, RoomObject, RoomComplexity, GridPosition } from '../../types/GameTypes';
import { ObjectType, LightingState, TrashType } from '../../types/GameTypes';
import { GAME_CONFIG } from '../config/GameConstants';

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

  public generate(config: MazeConfig, isNetworked: boolean = false): MazeData {
    // Use config to generate dynamic maze data
    const rooms = this.createRoomsFromConfig(config);
    const doors = this.createDoorsFromConfig(config, rooms);
    // In networked mode, don't generate trash - wait for server data
    const trash = isNetworked ? [] : this.createTrashFromConfig(config, rooms);
    const objects = this.createObjectsFromConfig(config, rooms);
    const treasure = this.createTreasureFromConfig(config, rooms);

    console.log(`🎮 Generated maze: networked=${isNetworked}, trash=${trash.length}`);
    return { rooms, doors, trash, objects, treasure };
  }

  // Keep old method for backward compatibility during refactor
  public generateMaze(): MazeData {
    const rooms = this.createRooms();
    const doors = this.createDoors();
    const trash = this.createTrashItems();
    const objects = this.createObjectsForRoom1();
    const treasure = this.createTreasureForRoom1();

    return { rooms, doors, trash, objects, treasure };
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
      hasTrash: true,
      trashId: 'trash_room1',
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

  private createTrashItems(): Trash[] {
    const trashItems: Trash[] = [];
    const availableTrashTypes = [
      TrashType.APPLE_CORE, TrashType.BANANA_PEEL, TrashType.CARDBOARD_BOX,
      TrashType.FISH_BONES, TrashType.GLASS_BOTTLE, TrashType.MILK_CARTON
    ];
    
    // Use same room selection as server: distribute across grid (excluding center room_1_1)
    const selectedRooms = ['room_0_0', 'room_0_1', 'room_0_2', 'room_1_0', 'room_1_2', 'room_2_0'];
    
    // Generate 6 trash items in selected rooms (matching server logic)
    for (let i = 0; i < 6; i++) {
      const roomId = selectedRooms[i];
      const trashType = availableTrashTypes[i];
      const trashId = `trash_${trashType}_${roomId}`;
      
      // Parse room coordinates from roomId
      const [, rowStr, colStr] = roomId.split('_');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      
      // Calculate room position
      const roomX = col * 200 + 100; // Room width = 200, offset = 100
      const roomY = row * 150 + 100; // Room height = 150, offset = 100
      
      // Generate random position within room bounds (avoid walls/objects)
      const margin = 40;
      const x = roomX + margin + Math.random() * (200 - 2 * margin);
      const y = roomY + margin + Math.random() * (150 - 2 * margin);
      
      const trash: Trash = {
        id: trashId,
        type: trashType,
        position: { x, y },
        collected: false,
        roomId: roomId
      };

      trashItems.push(trash);
      console.log(`🗑️ Generated trash: ${trashId} at (${x.toFixed(1)}, ${y.toFixed(1)}) [excluding center room]`);
    }
    
    return trashItems;
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

  public getSpawnPosition(playerIndex: number, config?: MazeConfig): Position {
    // For single room mode (backward compatibility)
    if (!config) {
      const room1Position = this.calculateRoom1Position();
      const spawnX = room1Position.x - (2 * this.internalConfig.gridCellSize.width);
      const spawnY = room1Position.y + (1 * this.internalConfig.gridCellSize.height);
      return { x: spawnX, y: spawnY };
    }

    // For multi-room mode with two players
    if (playerIndex === 0) {
      // Player 1: Spawn outside room_0_0 (top-left)
      const room00Position = {
        x: 0 * config.roomWidth + 100,
        y: 0 * config.roomHeight + 100
      };
      return {
        x: room00Position.x - 50, // Left of room_0_0
        y: room00Position.y + config.roomHeight / 2
      };
    } else {
      // Player 2: Spawn outside room_2_2 (bottom-right)
      const room22Position = {
        x: 2 * config.roomWidth + 100,
        y: 2 * config.roomHeight + 100
      };
      return {
        x: room22Position.x + config.roomWidth + 40, // Closer to door entrance
        y: room22Position.y + config.roomHeight / 2
      };
    }
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
          hasTrash: true, // Always have trash for simplicity
          trashId: `trash_${roomId}`,
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

    // Create entrance doors for both players
    // Player 1 entrance to ROOM_0_0 (top-left)
    const entranceRoom1 = rooms.find(r => r.id === 'room_0_0');
    if (entranceRoom1) {
      const entranceDoor1: Door = {
        id: 'door_entrance_player1',
        type: 'open',
        position: {
          x: entranceRoom1.position.x - 25, // Outside the left wall of ROOM_0_0
          y: entranceRoom1.position.y + entranceRoom1.position.height / 2
        },
        orientation: 'vertical',
        isOpen: true,
        connectsRooms: ['spawn_p1', 'room_0_0']
      };
      doors.push(entranceDoor1);
    }

    // Player 2 entrance to ROOM_2_2 (bottom-right)
    const entranceRoom2 = rooms.find(r => r.id === 'room_2_2');
    if (entranceRoom2) {
      const entranceDoor2: Door = {
        id: 'door_entrance_player2',
        type: 'open',
        position: {
          x: entranceRoom2.position.x + entranceRoom2.position.width + 15, // Closer to the right wall of ROOM_2_2
          y: entranceRoom2.position.y + entranceRoom2.position.height / 2 - 10 // Center vertically
        },
        orientation: 'vertical',
        isOpen: true,
        connectsRooms: ['spawn_p2', 'room_2_2']
      };
      doors.push(entranceDoor2);
    } else {
      console.error('ERROR: Room 2_2 not found for Player 2 door!');
    }

    // Create internal connecting doors between rooms only
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        // Create horizontal doors (connecting rooms horizontally)
        if (col < config.cols - 1) {
          const doorId = `door_${row}_${col}_h`;
          const door: Door = {
            id: doorId,
            type: 'open',
            position: {
              x: (col + 1) * config.roomWidth + 100 - 10, // Adjust for room offset
              y: row * config.roomHeight + 100 + config.roomHeight / 2 - 10
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
              x: col * config.roomWidth + 100 + config.roomWidth / 2 - 10,
              y: (row + 1) * config.roomHeight + 100 - 10
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

  private createTrashFromConfig(config: MazeConfig, rooms: RoomState[]): Trash[] {
    const trashItems: Trash[] = [];
    const availableTrashTypes = [
      TrashType.APPLE_CORE, TrashType.BANANA_PEEL, TrashType.CARDBOARD_BOX,
      TrashType.FISH_BONES, TrashType.GLASS_BOTTLE, TrashType.MILK_CARTON
    ];
    
    // Generate 6 trash items (matching server logic)
    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const roomId = `room_${row}_${col}`;
      const trashType = availableTrashTypes[i];
      const trashId = `trash_${trashType}_${roomId}`;
      
      // Calculate room position
      const roomX = col * config.roomWidth + 100;
      const roomY = row * config.roomHeight + 100;
      
      // Generate position within room bounds (similar to server)
      const margin = 30;
      const x = roomX + margin + Math.random() * (config.roomWidth - 2 * margin);
      const y = roomY + margin + Math.random() * (config.roomHeight - 2 * margin);
      
      const trash: Trash = {
        id: trashId,
        type: trashType,
        position: { x, y },
        collected: false,
        roomId: roomId
      };

      trashItems.push(trash);
      console.log(`🗑️ Generated trash: ${trashId} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }

    return trashItems;
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
    
    // Calculate center room ID to exclude from object generation
    const centerRow = Math.floor(config.rows / 2);
    const centerCol = Math.floor(config.cols / 2);
    const centerRoomId = `room_${centerRow}_${centerCol}`;
    
    rooms.forEach(room => {
      // Skip object generation for center room to keep treasure visible
      if (room.id === centerRoomId) {
        console.log(`🏛️ Skipping object generation for center room: ${room.id}`);
        return;
      }
      
      // Add furniture and wall objects to non-center rooms
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

    // Trash bin only
    const trashZone = this.getGridZone('corner_se', grid);
    const trashPos = this.selectRandomGridPosition(trashZone);
    if (trashPos) {
      objects.push(this.createObject(roomId, 'trash_1', ObjectType.TRASH_BIN, trashPos, {width: 1, height: 1}, true, false));
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
    
    // Only place light switch - remove all other wall decorations
    const switchPos = this.selectRandomGridPosition(wallZone);
    if (switchPos) {
      objects.push(this.createObject(roomId, 'switch_1', ObjectType.LIGHT_SWITCH, switchPos, {width: 1, height: 1}, false, true));
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

  // Treasure creation methods
  private createTreasureFromConfig(config: MazeConfig, rooms: RoomState[]): Treasure {
    // Find center room in the maze
    const centerRow = Math.floor(config.rows / 2);
    const centerCol = Math.floor(config.cols / 2);
    const centerRoomId = `room_${centerRow}_${centerCol}`;
    
    const centerRoom = rooms.find(room => room.id === centerRoomId);
    if (!centerRoom) {
      // Fallback: use first room if center not found
      const fallbackRoom = rooms[0];
      return this.createTreasureObject('center_treasure', fallbackRoom.id, fallbackRoom.position);
    }

    return this.createTreasureObject('center_treasure', centerRoomId, centerRoom.position);
  }

  private createTreasureForRoom1(): Treasure {
    // For single room setup, place treasure in room1
    const room1Position = this.calculateRoom1Position();
    return this.createTreasureObject('center_treasure', 'room1', {
      x: room1Position.x,
      y: room1Position.y,
      width: room1Position.width,
      height: room1Position.height
    });
  }

  private createTreasureObject(id: string, roomId: string, roomPosition: RoomCoordinates): Treasure {
    return {
      id: id,
      position: {
        x: roomPosition.x + roomPosition.width / 2,  // Center of room
        y: roomPosition.y + roomPosition.height / 2
      },
      roomId: roomId,
      trashRequired: GAME_CONFIG.KEYS_REQUIRED_FOR_TREASURE, // Reuse same config value
      claimed: false,
      claimedBy: undefined
    };
  }

  // These methods are now handled by the actual implementations above
  // Left as stubs for compatibility
}