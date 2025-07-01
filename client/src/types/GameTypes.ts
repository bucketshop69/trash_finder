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

export interface Key {
  id: string;
  position: Position;
  collected: boolean;
  roomId: string;
  unlocksDoorsIds: string[];  // Door IDs this key unlocks
}

export interface RoomState {
  id: string;
  position: RoomCoordinates;
  isLit: boolean;
  hasKey: boolean;
  keyId?: string;
  playerOccupancy: string[];  // Player IDs in room
  doors: Door[];             // Doors connected to this room
}

export interface MazeConfig {
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
  keysCollected: string[];
  isReady: boolean;
}

export interface GameState {
  rooms: Map<string, RoomState>;
  doors: Map<string, Door>;
  keys: Map<string, Key>;
  players: Map<string, Player>;
  gameStarted: boolean;
  winnerId?: string;
}