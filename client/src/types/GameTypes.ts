// Game types for the maze game

export interface Position {
  x: number;
  y: number;
}

export interface RoomCoordinates {
  x: number;        // Top-left X position
  y: number;        // Top-left Y position
  width: number;    // Room width
  height: number;   // Room height
}

export interface Door {
  id: string;
  type: 'open' | 'locked' | 'spawn';
  position: Position;
  orientation: 'horizontal' | 'vertical';
  isOpen: boolean;
  requiredKeyId?: string;
  connectsRooms: [string, string];  // Room IDs this door connects
}

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
  position: Position;
  collected: boolean;
  roomId: string;
}

export interface Treasure {
  id: string;
  position: Position;
  roomId: string;
  trashRequired: number;
  claimed: boolean;
  claimedBy?: string;  // Player ID who claimed it
}

export enum LightingState {
  BRIGHT = "bright",    // Full visibility
  DIM = "dim",         // Reduced visibility
  DARK = "dark"        // Very limited visibility
}

export interface RoomState {
  id: string;
  position: RoomCoordinates;
  isLit: boolean;
  lightingState: LightingState;  // New: detailed lighting control
  hasTrash: boolean;
  trashId?: string;
  playerOccupancy: string[];  // Player IDs in room
  doors: Door[];             // Doors connected to this room
  objects: RoomObject[];     // Objects placed in this room
}

export interface MazeConfig {
  rows: number;
  cols: number;
  roomWidth: number;
  roomHeight: number;
}

export interface MazeData {
  rooms: RoomState[];
  doors: Door[];
  trash: Trash[];
  objects: RoomObject[];
  treasure: Treasure;
}

// Object System Types
export enum ObjectType {
  // Wall decorations
  PICTURE = "picture",
  LIGHT_SWITCH = "light_switch", 
  WHITEBOARD = "whiteboard",
  GRAFFITI = "graffiti",
  
  // Furniture objects  
  DESK = "desk",
  CHAIR = "chair",
  TRASH_BIN = "trash_bin",
  COMPUTER = "computer",
  FILING_CABINET = "filing_cabinet",
  CARDBOARD_BOX = "cardboard_box",
  
  // Internal walls (for complex layouts)
  WALL_SEGMENT = "wall_segment",
  INTERNAL_DOOR = "internal_door"
}

export enum RoomComplexity {
  SIMPLE = "simple",    // Just furniture objects
  MEDIUM = "medium",    // Add some internal wall segments  
  COMPLEX = "complex"   // Full internal maze with multiple sub-areas
}

export interface GridPosition {
  row: number;    // 0-8 in 9x9 grid
  col: number;    // 0-8 in 9x9 grid
}

export interface RoomObject {
  id: string;
  type: ObjectType;
  gridPosition: GridPosition;
  size: { width: number, height: number }; // in grid cells
  collision: boolean;     // Does this object block player movement?
  interactive: boolean;   // Can player interact with this object?
  roomId: string;        // Which room this object belongs to
}

export interface MazeGeneratorConfig {
  gridSize: { rows: number, cols: number };
  roomSize: { width: number, height: number };
  doorWidth: number;
  canvasSize: { width: number, height: number };
  gridCellSize: { width: number, height: number };
}

export interface Player {
  id: string;
  position: Position;
  currentRoomId: string;
  trashCollected: string[];
  isReady: boolean;
}

export interface GameState {
  rooms: Map<string, RoomState>;
  doors: Map<string, Door>;
  trash: Map<string, Trash>;
  players: Map<string, Player>;
  treasure: Treasure;
  gameStarted: boolean;
  gameEnded: boolean;
  winnerId?: string;
}