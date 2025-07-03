import Phaser from 'phaser';
import { MazeGenerator } from '../utils/MazeGenerator';
import type { RoomState, Door, Key, Treasure, MazeConfig, MazeData, RoomObject } from '../../types/GameTypes';
import { ObjectType, LightingState } from '../../types/GameTypes';
import { GAME_CONFIG, PLAYER_IDS } from '../config/GameConstants';
import { socketManager } from '../../services/SocketManager';

export class MazeScene extends Phaser.Scene {
  private mazeGenerator!: MazeGenerator;
  private rooms: RoomState[] = [];
  private doors: Door[] = [];
  private keys: Key[] = [];
  private treasure!: Treasure;
  private objects: RoomObject[] = [];
  private players: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private roomGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private doorGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private keySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private keyGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  // private treasureGraphics!: Phaser.GameObjects.Graphics; // Unused
  private treasureSprite!: Phaser.GameObjects.Sprite;
  private objectGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private lightingOverlays: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private internalDoorStates: Map<string, boolean> = new Map(); // true = open, false = closed
  private doorStates: Map<string, boolean> = new Map(); // true = open, false = closed (for main doors)
  private collectedKeys: Set<string> = new Set();
  private highlightedKey: Key | null = null;
  private activeKeyTween: Phaser.Tweens.Tween | null = null;

  // Game state tracking
  private isGameEnded: boolean = false;
  private winnerId: string | null = null;

  // Player movement
  private player1!: Phaser.GameObjects.Sprite;
  private player2!: Phaser.GameObjects.Sprite;
  private localPlayer!: Phaser.GameObjects.Sprite;
  private isHost: boolean = false;
  private playerIndex: number = 0; // 0 for host/Player1, 1 for joiner/Player2
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: any;
  private arrowKeys!: any;
  private spacebar!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private playerSpeed: number = GAME_CONFIG.PLAYER_SPEED;
  

  // Flashlight system
  private flashlightGraphics!: Phaser.GameObjects.Graphics;
  private flashlightEnabled: boolean = false;
  private playerDirection: { x: number, y: number } = { x: 1, y: 0 }; // Default facing right
  private lastMovement: { x: number, y: number } = { x: 0, y: 0 };

  // Network multiplayer state
  private isNetworked: boolean = false;
  private localPlayerId: string | null = null;
  private remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private lastSentPosition: { x: number, y: number } = { x: 0, y: 0 };
  private positionSendThreshold: number = 5; // Only send if moved > 5 pixels

  constructor() {
    super({ key: 'MazeScene' });
    // @ts-ignore - Expose for debugging
    window.gameScene = this;
  }

  preload() {
    // Load player SVG assets
    this.load.svg('player1', '/src/assets/players/player1.svg');
    this.load.svg('player2', '/src/assets/players/player2.svg');
    
    // Keep key placeholder for now
    this.load.image('key', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  }

  create() {
    console.log('MazeScene: Creating dynamic maze');

    // Initialize maze generator
    this.mazeGenerator = new MazeGenerator();

    // Define maze configuration - just Room1 for simplicity
    const mazeConfig: MazeConfig = {
      rows: 3,
      cols: 3,
      roomWidth: 200,
      roomHeight: 150
    };

    // Generate maze data using new method
    const mazeData: MazeData = this.mazeGenerator.generate(mazeConfig);

    this.rooms = mazeData.rooms;
    this.doors = mazeData.doors;
    this.keys = mazeData.keys;
    this.treasure = mazeData.treasure;
    this.objects = mazeData.objects;

    // DEBUG: Validate all the data
    this.validateGameData();

    // Set dark background
    this.cameras.main.setBackgroundColor('#2a2a2a');

    // Create visual elements
    this.createRooms();
    this.createDoors();
    this.createKeys();
    this.createTreasure();
    this.createObjects();
    this.createLightingOverlays();
    this.createPlayers();
    this.createFlashlight();

    // Add title
    this.add.text(400, 20, 'Gorbagana Trash Finder - 3x3 Multiplayer Maze', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Add instructions
    this.add.text(400, 550, 'P1: WASD + SPACE | P2: ARROWS + ENTER | L: lighting | F: flashlight | First to collect 3 keys wins!', {
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Set up input controls
    this.setupControls();

    // Initialize key counter
    this.updateKeyCounter();

    // Set up network multiplayer
    this.setupNetworking();

    // DEBUG: Final validation
    this.debugGameState();
  }

  private validateGameData() {
    console.log('=== GAME DATA VALIDATION ===');
    console.log('Rooms:', this.rooms.length, this.rooms);
    console.log('Doors:', this.doors.length, this.doors);
    console.log('Keys:', this.keys.length, this.keys);
    console.log('Treasure:', this.treasure);
    console.log('Objects:', this.objects.length, this.objects);

    // Debug door positions and status
    this.doors.forEach(door => {
      console.log(`Door ${door.id}: position (${door.position.x}, ${door.position.y}), isOpen: ${door.isOpen}, connects: ${door.connectsRooms.join(' <-> ')}`);
    });

    // Validate keys are positioned correctly
    this.keys.forEach(key => {
      console.log(`Key ${key.id}: position (${key.position.x}, ${key.position.y}), collected: ${key.collected}, roomId: ${key.roomId}`);
    });

    // Validate doors
    this.doors.forEach(door => {
      console.log(`Door ${door.id}: type ${door.type}, isOpen: ${door.isOpen}, requiredKey: ${door.requiredKeyId}`);
    });

    // Validate objects
    this.objects.forEach(obj => {
      console.log(`Object ${obj.id}: type ${obj.type}, grid (${obj.gridPosition.row},${obj.gridPosition.col}), collision: ${obj.collision}, roomId: ${obj.roomId}`);
    });
  }

  private debugGameState() {
    console.log('=== GAME STATE DEBUG ===');
    console.log('Key graphics created:', this.keyGraphics.size);
    console.log('Key sprites created:', this.keySprites.size);
    console.log('Collected keys:', this.collectedKeys.size);
    console.log('Player position:', this.player1?.x, this.player1?.y);
    console.log('Object graphics created:', this.objectGraphics.size);
    
    // Debug object collision bounds
    this.objects.forEach(obj => {
      if (obj.collision) {
        const bounds = this.getObjectBounds(obj);
        console.log(`Collision object ${obj.id}: bounds`, bounds);
      }
    });
  }

  private createRooms() {
    this.rooms.forEach(room => {
      const graphics = this.add.graphics();

      // Room floor with subtle tile texture
      this.drawTiledFloor(graphics, room);

      // Create mixed perspective walls
      this.drawMixedPerspectiveWalls(graphics, room);

      // Room label
      const centerX = room.position.x + room.position.width / 2;
      const centerY = room.position.y + room.position.height / 2;

      if (room.id === 'center') {
        this.add.text(centerX, centerY, '🗑️💎\nTREASURE', {
          fontSize: '20px',
          color: '#ffffff',
          fontFamily: 'Arial',
          align: 'center'
        }).setOrigin(0.5);
      } else {
        this.add.text(centerX, centerY - 20, room.id.toUpperCase(), {
          fontSize: '16px',
          color: '#ffffff',
          fontFamily: 'Arial'
        }).setOrigin(0.5);
      }

      this.roomGraphics.set(room.id, graphics);
    });
  }

  private drawMixedPerspectiveWalls(graphics: Phaser.GameObjects.Graphics, room: RoomState) {
    const { x, y, width, height } = room.position;

    // WALL HIERARCHY SYSTEM - Different thicknesses for different wall types
    const wallTypes = this.determineWallTypes(room);

    // HORIZONTAL WALLS WITH GAPS - Cut gaps where doors exist
    this.drawHorizontalWallWithGaps(graphics, x, y - wallTypes.top.thickness, width, wallTypes.top.thickness, wallTypes.top.type, 'top', room);
    this.drawHorizontalWallWithGaps(graphics, x, y + height, width, wallTypes.bottom.thickness, wallTypes.bottom.type, 'bottom', room);

    // VERTICAL WALLS WITH GAPS - Cut gaps where doors exist
    this.drawVerticalWallWithGaps(graphics, x - wallTypes.left.thickness, y, wallTypes.left.thickness, height, wallTypes.left.type, 'left', room);
    this.drawVerticalWallWithGaps(graphics, x + width, y, wallTypes.right.thickness, height, wallTypes.right.type, 'right', room);
  }

  private determineWallTypes(room: RoomState) {
    // Parse room coordinates from ID (e.g., "room_0_1" -> row=0, col=1)
    const idParts = room.id.split('_');
    const row = parseInt(idParts[1]) || 0;
    const col = parseInt(idParts[2]) || 0;
    
    // Determine maze boundaries (assuming 3x3 grid from config)
    const maxRow = 2; // 0, 1, 2
    const maxCol = 2; // 0, 1, 2
    
    const isTopRow = row === 0;
    const isBottomRow = row === maxRow;
    const isLeftCol = col === 0;
    const isRightCol = col === maxCol;

    return {
      top: { 
        thickness: isTopRow ? 16 : 12, // Exterior vs Interior
        type: isTopRow ? 'exterior' : 'interior'
      },
      bottom: { 
        thickness: isBottomRow ? 16 : 12,
        type: isBottomRow ? 'exterior' : 'interior' 
      },
      left: { 
        thickness: isLeftCol ? 16 : 12,
        type: isLeftCol ? 'exterior' : 'interior'
      },
      right: { 
        thickness: isRightCol ? 16 : 12,
        type: isRightCol ? 'exterior' : 'interior'
      }
    };
  }

  private drawHorizontalWallFace(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, thickness: number, wallType: string = 'interior') {
    // Different visual styles based on wall type
    if (wallType === 'exterior') {
      // EXTERIOR WALLS - Thicker, darker, more substantial
      graphics.fillStyle(0x3A3A3A, 1); // Darker base for exterior
      graphics.fillRect(x, y, width, thickness);

      // Thicker mortar lines for exterior walls
      graphics.lineStyle(2, 0x5A5A5A, 0.9);
      for (let i = 0; i < thickness; i += 6) {
        graphics.lineBetween(x, y + i, x + width, y + i);
      }

      // Larger stone blocks for exterior
      graphics.lineStyle(1, 0x5A5A5A, 0.7);
      for (let i = 0; i < width; i += 24) {
        graphics.lineBetween(x + i, y, x + i, y + thickness);
      }
    } else if (wallType === 'internal') {
      // INTERNAL WALLS - Lighter, thinner, more refined than room walls
      graphics.fillStyle(0x5A5A5A, 1); // Lighter gray for internal objects
      graphics.fillRect(x, y, width, thickness);

      // Fine mortar lines for internal walls
      graphics.lineStyle(1, 0x7A7A7A, 0.6);
      for (let i = 0; i < thickness; i += 3) {
        graphics.lineBetween(x, y + i, x + width, y + i);
      }

      // Small blocks for internal walls
      graphics.lineStyle(1, 0x7A7A7A, 0.4);
      for (let i = 0; i < width; i += 12) {
        graphics.lineBetween(x + i, y, x + i, y + thickness);
      }
    } else {
      // INTERIOR WALLS - Standard room separators
      graphics.fillStyle(0x4A4A4A, 1); // Standard gray base
      graphics.fillRect(x, y, width, thickness);

      // Standard mortar lines for interior walls
      graphics.lineStyle(1, 0x6A6A6A, 0.8);
      for (let i = 0; i < thickness; i += 4) {
        graphics.lineBetween(x, y + i, x + width, y + i);
      }

      // Smaller stone blocks for interior
      graphics.lineStyle(1, 0x6A6A6A, 0.6);
      for (let i = 0; i < width; i += 16) {
        graphics.lineBetween(x + i, y, x + i, y + thickness);
      }
    }
  }

  private drawVerticalWallEdge(graphics: Phaser.GameObjects.Graphics, x: number, y: number, thickness: number, height: number, wallType: string = 'interior') {
    // Different visual styles based on wall type
    if (wallType === 'exterior') {
      // EXTERIOR WALLS - Darker, more substantial edge
      graphics.fillStyle(0x2A2A2A, 1); // Very dark for exterior edge
      graphics.fillRect(x, y, thickness, height);

      // Stronger edge highlight for exterior
      graphics.lineStyle(2, 0x4A4A4A, 0.8);
      graphics.lineBetween(x, y, x, y + height); // Left edge highlight
      
      // Additional depth line for exterior
      graphics.lineStyle(1, 0x1A1A1A, 0.6);
      graphics.lineBetween(x + thickness - 1, y, x + thickness - 1, y + height); // Right edge shadow
    } else if (wallType === 'internal') {
      // INTERNAL WALLS - Lighter, thinner edge for furniture/internal objects
      graphics.fillStyle(0x4A4A4A, 1); // Lighter gray for internal objects
      graphics.fillRect(x, y, thickness, height);

      // Very subtle edge highlight for internal
      graphics.lineStyle(1, 0x6A6A6A, 0.5);
      graphics.lineBetween(x, y, x, y + height); // Left edge highlight
    } else {
      // INTERIOR WALLS - Standard room separator edge view
      graphics.fillStyle(0x3A3A3A, 1); // Standard gray for interior edge
      graphics.fillRect(x, y, thickness, height);

      // Subtle edge highlight for interior
      graphics.lineStyle(1, 0x5A5A5A, 0.7);
      graphics.lineBetween(x, y, x, y + height); // Left edge highlight
    }
  }

  private drawTiledFloor(graphics: Phaser.GameObjects.Graphics, room: RoomState) {
    const { x, y, width, height } = room.position;
    const tileSize = 22; // 9x9 grid = 198/9 = 22px per tile
    
    // Base floor color
    if (room.id === 'center') {
      graphics.fillStyle(0xf39c12, 0.8); // Golden for treasure room
    } else {
      graphics.fillStyle(0x27ae60, 0.3); // Green for regular rooms
    }
    graphics.fillRect(x, y, width, height);
    
    // Very subtle tile lines (soft)
    graphics.lineStyle(0.5, 0x000000, 0.1); // Very thin, very transparent
    
    // Vertical tile lines
    for (let i = 1; i < 9; i++) {
      const lineX = x + (i * tileSize);
      graphics.lineBetween(lineX, y, lineX, y + height);
    }
    
    // Horizontal tile lines  
    for (let i = 1; i < 9; i++) {
      const lineY = y + (i * tileSize);
      graphics.lineBetween(x, lineY, x + width, lineY);
    }
  }

  private drawHorizontalWallWithGaps(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, thickness: number, wallType: string, side: string, room: RoomState) {
    const gaps = this.findGapsInWall(room, side);
    
    if (gaps.length === 0) {
      // No gaps - draw full wall
      this.drawHorizontalWallFace(graphics, x, y, width, thickness, wallType);
      return;
    }

    // Draw wall segments with gaps
    let currentX = x;
    
    gaps.forEach(gap => {
      // Draw wall segment before gap
      if (gap.start > currentX) {
        const segmentWidth = gap.start - currentX;
        this.drawHorizontalWallFace(graphics, currentX, y, segmentWidth, thickness, wallType);
      }
      
      // Skip the gap (don't draw anything)
      currentX = gap.end;
    });
    
    // Draw final wall segment after last gap
    if (currentX < x + width) {
      const segmentWidth = (x + width) - currentX;
      this.drawHorizontalWallFace(graphics, currentX, y, segmentWidth, thickness, wallType);
    }
  }

  private drawVerticalWallWithGaps(graphics: Phaser.GameObjects.Graphics, x: number, y: number, thickness: number, height: number, wallType: string, side: string, room: RoomState) {
    const gaps = this.findGapsInWall(room, side);
    
    if (gaps.length === 0) {
      // No gaps - draw full wall
      this.drawVerticalWallEdge(graphics, x, y, thickness, height, wallType);
      return;
    }

    // Draw wall segments with gaps
    let currentY = y;
    
    gaps.forEach(gap => {
      // Draw wall segment before gap
      if (gap.start > currentY) {
        const segmentHeight = gap.start - currentY;
        this.drawVerticalWallEdge(graphics, x, currentY, thickness, segmentHeight, wallType);
      }
      
      // Skip the gap (don't draw anything)
      currentY = gap.end;
    });
    
    // Draw final wall segment after last gap
    if (currentY < y + height) {
      const segmentHeight = (y + height) - currentY;
      this.drawVerticalWallEdge(graphics, x, currentY, thickness, segmentHeight, wallType);
    }
  }

  private findGapsInWall(room: RoomState, side: string): Array<{start: number, end: number}> {
    const gaps: Array<{start: number, end: number}> = [];
    const gapWidth = 30; // Smaller collision-free space
    
    this.doors.forEach(door => {
      // Only create gaps for doors that connect to this specific room
      if (door.connectsRooms.includes(room.id) && this.isDoorOnRoomSide(door, room, side)) {
        if (side === 'top' || side === 'bottom') {
          // Horizontal gap
          gaps.push({
            start: door.position.x - gapWidth/2,
            end: door.position.x + gapWidth/2
          });
        } else {
          // Vertical gap
          gaps.push({
            start: door.position.y - gapWidth/2,
            end: door.position.y + gapWidth/2
          });
        }
      }
    });
    
    return gaps;
  }

  private isDoorOnRoomSide(door: Door, room: RoomState, side: string): boolean {
    const { x, y, width, height } = room.position;
    const doorX = door.position.x;
    const doorY = door.position.y;
    const tolerance = 50; // Increased tolerance to catch more doors
    
    // Debug logging
    console.log(`Checking door ${door.id} at (${doorX}, ${doorY}) for room ${room.id} side ${side}`);
    console.log(`Room bounds: x=${x}, y=${y}, width=${width}, height=${height}`);
    
    switch (side) {
      case 'top':
        const isTopDoor = doorY >= y - tolerance && doorY <= y + tolerance && 
               doorX >= x - tolerance && doorX <= x + width + tolerance;
        console.log(`Top door check: ${isTopDoor}`);
        return isTopDoor;
      case 'bottom':
        const isBottomDoor = doorY >= y + height - tolerance && doorY <= y + height + tolerance && 
               doorX >= x - tolerance && doorX <= x + width + tolerance;
        console.log(`Bottom door check: ${isBottomDoor}`);
        return isBottomDoor;
      case 'left':
        const isLeftDoor = doorX >= x - tolerance && doorX <= x + tolerance && 
               doorY >= y - tolerance && doorY <= y + height + tolerance;
        console.log(`Left door check: ${isLeftDoor}`);
        return isLeftDoor;
      case 'right':
        const isRightDoor = doorX >= x + width - tolerance && doorX <= x + width + tolerance && 
               doorY >= y - tolerance && doorY <= y + height + tolerance;
        console.log(`Right door check: ${isRightDoor}`);
        return isRightDoor;
      default:
        return false;
    }
  }

  private createDoors() {
    // NO DOOR GRAPHICS - doors are now just gaps in walls
    // Only track door positions for collision-free movement
    this.doors.forEach(door => {
      console.log(`Door gap created at: ${door.position.x}, ${door.position.y} (${door.orientation})`);
    });
  }


  private createKeys() {
    this.keys.forEach(key => {
      if (!key.collected) {
        // Create key graphics - just the emoji, no circle background
        const graphics = this.add.graphics();
        // Remove the yellow circle - key is just the emoji now

        // Add key label
        const keyText = this.add.text(key.position.x, key.position.y, '🗝️', {
          fontSize: '20px',
          fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Store graphics for visibility control
        this.keyGraphics.set(key.id, graphics);
        this.keyGraphics.set(`${key.id}_text`, keyText as any);

        // Store as sprite equivalent for collision detection
        const keySprite = this.add.sprite(key.position.x, key.position.y, 'key');
        keySprite.setVisible(false); // Use graphics instead
        keySprite.setData('keyId', key.id);

        this.keySprites.set(key.id, keySprite);
      }
    });
  }

  private createTreasure() {
    if (!this.treasure || this.treasure.claimed) return;

    const treasureX = this.treasure.position.x;
    const treasureY = this.treasure.position.y;
    
    // Just a simple trash can emoji - half the size
    this.add.text(treasureX, treasureY, '🗑️', {
      fontSize: '16px',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Create invisible sprite for interaction detection
    this.treasureSprite = this.add.sprite(treasureX, treasureY, 'key');
    this.treasureSprite.setVisible(false);
    this.treasureSprite.setData('treasureId', this.treasure.id);

    console.log(`Treasure created at: ${treasureX}, ${treasureY} in room ${this.treasure.roomId}`);
  }

  private createObjects() {
    this.objects.forEach(obj => {
      const graphics = this.add.graphics();
      
      // Calculate screen position from grid position
      const room = this.rooms.find(r => r.id === obj.roomId);
      if (!room) {
        console.warn(`Room ${obj.roomId} not found for object ${obj.id}`);
        return;
      }

      // Grid cell size - use generator config
      const gridCellWidth = 22;  // From MazeGenerator config
      const gridCellHeight = 16; // From MazeGenerator config
      
      const screenX = room.position.x + (obj.gridPosition.col * gridCellWidth);
      const screenY = room.position.y + (obj.gridPosition.row * gridCellHeight);
      const objectWidth = obj.size.width * gridCellWidth;
      const objectHeight = obj.size.height * gridCellHeight;

      // Draw object based on type
      this.drawObjectByType(graphics, obj.type, screenX, screenY, objectWidth, objectHeight);

      // Initialize internal door states (closed by default)
      if (obj.type === ObjectType.INTERNAL_DOOR) {
        this.internalDoorStates.set(obj.id, false); // false = closed
      }

      // Add object label for debugging
      this.add.text(screenX + objectWidth/2, screenY + objectHeight/2, this.getObjectEmoji(obj.type), {
        fontSize: '12px',
        fontFamily: 'Arial'
      }).setOrigin(0.5);

      this.objectGraphics.set(obj.id, graphics);
    });
  }

  private drawObjectByType(graphics: Phaser.GameObjects.Graphics, type: ObjectType, x: number, y: number, width: number, height: number) {
    switch (type) {
      case ObjectType.DESK:
        // Brown desk color
        graphics.fillStyle(0x8B4513, 0.8);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0x654321, 1);
        graphics.strokeRect(x, y, width, height);
        break;

      case ObjectType.CHAIR:
        // Dark gray chair
        graphics.fillStyle(0x2C3E50, 0.8);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0x1A252F, 1);
        graphics.strokeRect(x, y, width, height);
        break;

      case ObjectType.TRASH_BIN:
        // Dark green trash bin
        graphics.fillStyle(0x27AE60, 0.8);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0x1E8449, 1);
        graphics.strokeRect(x, y, width, height);
        break;

      case ObjectType.COMPUTER:
        // Blue-gray computer
        graphics.fillStyle(0x34495E, 0.8);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0x2C3E50, 1);
        graphics.strokeRect(x, y, width, height);
        break;

      case ObjectType.PICTURE:
        // Gold frame picture
        graphics.fillStyle(0xF1C40F, 0.6);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0xD4AC0D, 1);
        graphics.strokeRect(x, y, width, height);
        break;

      case ObjectType.LIGHT_SWITCH:
        // White light switch
        graphics.fillStyle(0xECF0F1, 0.9);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0xBDC3C7, 1);
        graphics.strokeRect(x, y, width, height);
        break;

      case ObjectType.WHITEBOARD:
        // White whiteboard with black border
        graphics.fillStyle(0xF8F9FA, 0.9);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(3, 0x2C3E50, 1);
        graphics.strokeRect(x, y, width, height);
        // Add some "text" lines
        graphics.lineStyle(1, 0x95A5A6, 0.7);
        for (let i = 1; i <= 3; i++) {
          graphics.lineBetween(x + 2, y + (height/4) * i, x + width - 2, y + (height/4) * i);
        }
        break;

      case ObjectType.GRAFFITI:
        // Colorful graffiti patch
        graphics.fillStyle(0xE74C3C, 0.6);
        graphics.fillRect(x, y, width, height);
        graphics.fillStyle(0x9B59B6, 0.4);
        graphics.fillRect(x + 2, y + 2, width - 4, height - 4);
        graphics.lineStyle(2, 0x8E44AD, 1);
        graphics.strokeRect(x, y, width, height);
        break;

      case ObjectType.WALL_SEGMENT:
        // Internal walls using mixed perspective system with internal hierarchy
        if (width > height) { 
          // Horizontal internal wall - full face view (elevation) - use internal style
          this.drawHorizontalWallFace(graphics, x, y, width, height, 'internal');
        } else { 
          // Vertical internal wall - edge view (plan) - use internal style  
          this.drawVerticalWallEdge(graphics, x, y, width, height, 'internal');
        }
        break;

      case ObjectType.INTERNAL_DOOR:
        // Internal door - brownish color
        graphics.fillStyle(0x8B4513, 0.9);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0x654321, 1);
        graphics.strokeRect(x, y, width, height);
        // Add door handle
        graphics.fillStyle(0xF1C40F, 1);
        graphics.fillCircle(x + width - 4, y + height/2, 2);
        break;

      default:
        // Default gray object
        graphics.fillStyle(0x95A5A6, 0.7);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0x7F8C8D, 1);
        graphics.strokeRect(x, y, width, height);
        break;
    }
  }

  private getObjectEmoji(type: ObjectType): string {
    switch (type) {
      case ObjectType.DESK: return '🗃️';
      case ObjectType.CHAIR: return '🪑';
      case ObjectType.TRASH_BIN: return '🗑️';
      case ObjectType.COMPUTER: return '💻';
      case ObjectType.PICTURE: return '🖼️';
      case ObjectType.LIGHT_SWITCH: return '💡';
      case ObjectType.FILING_CABINET: return '🗄️';
      case ObjectType.CARDBOARD_BOX: return '📦';
      case ObjectType.WHITEBOARD: return '📋';
      case ObjectType.GRAFFITI: return '🎨';
      case ObjectType.WALL_SEGMENT: return '🧱';
      case ObjectType.INTERNAL_DOOR: return '🚪';
      default: return '📦';
    }
  }

  private createLightingOverlays() {
    this.rooms.forEach(room => {
      const overlay = this.add.graphics();
      
      // Create lighting overlay based on room's lighting state
      this.updateRoomLighting(room.id, room.lightingState);
      
      this.lightingOverlays.set(room.id, overlay);
    });
  }

  private updateRoomLighting(roomId: string, lightingState: LightingState) {
    const room = this.rooms.find(r => r.id === roomId);
    const overlay = this.lightingOverlays.get(roomId);
    
    if (!room || !overlay) return;

    // Clear previous lighting
    overlay.clear();

    switch (lightingState) {
      case LightingState.BRIGHT:
        // No overlay - full visibility
        break;
        
      case LightingState.DIM:
        // Semi-transparent dark overlay
        overlay.fillStyle(0x000000, 0.3);
        overlay.fillRect(room.position.x, room.position.y, room.position.width, room.position.height);
        break;
        
      case LightingState.DARK:
        // Create mask for visibility
        this.createDarkRoomMask(room, overlay);
        break;
    }

    // Add lighting state indicator
    this.add.text(room.position.x + 5, room.position.y + 5, this.getLightingEmoji(lightingState), {
      fontSize: '16px',
      fontFamily: 'Arial'
    });
  }

  private createDarkRoomMask(room: RoomState, overlay: Phaser.GameObjects.Graphics) {
    // Start with full darkness
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(room.position.x, room.position.y, room.position.width, room.position.height);

    const playerInRoom = this.isPlayerInRoom(room.id);
    if (!playerInRoom || !this.player1) return;

    // Create visibility holes in the darkness
    if (this.flashlightEnabled) {
      // Use flashlight cone for visibility
      this.createFlashlightMask(overlay);
    } else {
      // Basic visibility circle
      overlay.fillStyle(0x000000, 0.3); // Lighter area around player
      overlay.fillCircle(this.player1.x, this.player1.y, 35);
    }
  }

  private createFlashlightMask(overlay: Phaser.GameObjects.Graphics) {
    const playerX = this.player1.x;
    const playerY = this.player1.y;
    const flashlightRange = 80;
    const coneAngle = Math.PI / 3; // 60 degrees

    // Calculate flashlight direction angle
    const directionAngle = Math.atan2(this.playerDirection.y, this.playerDirection.x);
    
    // Create cone mask points
    const conePoints: number[] = [];
    conePoints.push(playerX, playerY);
    
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const angle = directionAngle - coneAngle/2 + (coneAngle * i / steps);
      const x = playerX + Math.cos(angle) * flashlightRange;
      const y = playerY + Math.sin(angle) * flashlightRange;
      conePoints.push(x, y);
    }

    // Create illuminated area by drawing lighter overlay
    overlay.fillStyle(0x000000, 0.2); // Much lighter in flashlight area
    overlay.fillPoints(conePoints, true);

    // Bright center
    const centerPoints: number[] = [];
    centerPoints.push(playerX, playerY);
    
    const narrowConeAngle = Math.PI / 6; // 30 degrees
    for (let i = 0; i <= 6; i++) {
      const angle = directionAngle - narrowConeAngle/2 + (narrowConeAngle * i / 6);
      const x = playerX + Math.cos(angle) * (flashlightRange * 0.7);
      const y = playerY + Math.sin(angle) * (flashlightRange * 0.7);
      centerPoints.push(x, y);
    }
    
    overlay.fillStyle(0x000000, 0.1); // Very light in center
    overlay.fillPoints(centerPoints, true);

    // Bright core around player
    overlay.fillStyle(0x000000, 0.0); // Fully illuminated core
    overlay.fillCircle(
      playerX + Math.cos(directionAngle) * 20, 
      playerY + Math.sin(directionAngle) * 20, 
      20
    );
  }

  private isPlayerInRoom(roomId: string): boolean {
    if (!this.player1) return false;
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return false;

    return this.player1.x >= room.position.x && 
           this.player1.x <= room.position.x + room.position.width &&
           this.player1.y >= room.position.y && 
           this.player1.y <= room.position.y + room.position.height;
  }

  private getLightingEmoji(state: LightingState): string {
    switch (state) {
      case LightingState.BRIGHT: return '☀️';
      case LightingState.DIM: return '🌤️';
      case LightingState.DARK: return '🌙';
      default: return '💡';
    }
  }

  private createPlayers() {
    // Player role will be set by App component via setPlayerRole()
    // For now, create a default single player setup
    if (this.localPlayer) {
      // Player already created, skip
      return;
    }
    
    // Get spawn positions for both players
    const mazeConfig = {
      rows: 3,
      cols: 3,
      roomWidth: 200,
      roomHeight: 150
    };
    
    const player1Pos = this.mazeGenerator.getSpawnPosition(0, mazeConfig);
    const player2Pos = this.mazeGenerator.getSpawnPosition(1, mazeConfig);

    if (this.isHost) {
      // Host controls Player 1 (rainbow character, top-left)
      this.player1 = this.add.sprite(player1Pos.x, player1Pos.y, 'player1');
      this.player1.setScale(0.25); // Scale down from 120x140 to 30x35
      this.localPlayer = this.player1;

      // Player 1 label
      this.add.text(player1Pos.x, player1Pos.y - 35, 'PLAYER 1\n(WASD)', {
        fontSize: '12px',
        color: '#3498db',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);

      console.log(`Host spawned as Player 1 at: ${player1Pos.x}, ${player1Pos.y}`);
    } else {
      // Joiner controls Player 2 (rainbow character, bottom-right)
      this.player2 = this.add.sprite(player2Pos.x, player2Pos.y, 'player2');
      this.player2.setScale(0.25); // Scale down from 120x140 to 30x35
      this.localPlayer = this.player2;

      // Player 2 label  
      this.add.text(player2Pos.x, player2Pos.y - 35, 'PLAYER 2\n(WASD)', {
        fontSize: '12px',
        color: '#e74c3c',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);

      console.log(`Joiner spawned as Player 2 at: ${player2Pos.x}, ${player2Pos.y}`);
    }
  }

  private createFlashlight() {
    // Create flashlight graphics layer (rendered above lighting overlays)
    this.flashlightGraphics = this.add.graphics();
    this.flashlightGraphics.setDepth(1000); // Render on top of everything
  }

  private updatePlayerDirection(velocityX: number, velocityY: number) {
    // Normalize the movement vector to get direction
    const magnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    if (magnitude > 0) {
      this.playerDirection.x = velocityX / magnitude;
      this.playerDirection.y = velocityY / magnitude;
    }
  }

  private toggleFlashlight() {
    if (this.isGameEnded) return; // Disable when game is over
    this.flashlightEnabled = !this.flashlightEnabled;
    console.log(`Flashlight ${this.flashlightEnabled ? 'ON' : 'OFF'}`);
    
    if (!this.flashlightEnabled) {
      this.flashlightGraphics.clear();
    }
  }

  private updateFlashlight() {
    // Clear any old flashlight graphics (we now use mask system)
    this.flashlightGraphics.clear();
    
    // The flashlight effect is now handled in updateDynamicLighting()
    // through the mask system which properly reveals objects
  }

  private getCurrentPlayerRoom(): RoomState | null {
    if (!this.player1) return null;
    
    return this.rooms.find(room => 
      this.player1.x >= room.position.x && 
      this.player1.x <= room.position.x + room.position.width &&
      this.player1.y >= room.position.y && 
      this.player1.y <= room.position.y + room.position.height
    ) || null;
  }


  private setupControls() {
    // Create cursor keys (arrow keys) - Player 2
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Create WASD keys - Player 1
    this.wasdKeys = this.input.keyboard!.addKeys('W,S,A,D');

    // Add spacebar for Player 1 key collection
    this.spacebar = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Add Enter key for Player 2 key collection
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    
    // Add L key for cycling lighting states (for testing)
    const lKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    lKey.on('down', () => this.cycleLighting());

    // Add F key for toggling flashlight
    const fKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    fKey.on('down', () => this.toggleFlashlight());
    // DEBUG: Validate input setup
    console.log('Input setup complete:');
    console.log('- Cursors:', this.cursors);
    console.log('- WASD keys:', this.wasdKeys);
    console.log('- Keyboard manager:', this.input.keyboard);
  }

  update() {
    this.handlePlayerMovement();
    this.updateKeyInteraction();
    this.updateTreasureInteraction();
    this.updateObjectInteraction();
    this.updateDynamicLighting();
    this.updateFlashlight();
  }

  private handlePlayerMovement() {
    if (!this.localPlayer || this.isGameEnded) return;
    
    // Handle local player movement (always WASD for current player)
    this.handleLocalPlayerMovement();
  }

  private handleLocalPlayerMovement() {
    if (!this.localPlayer) return;

    const speed = this.playerSpeed * (1 / 60); // 60 FPS movement

    let velocityX = 0;
    let velocityY = 0;

    // WASD movement for local player (both host and joiner use WASD)
    if (this.wasdKeys.A.isDown) {
      velocityX = -speed;
    } else if (this.wasdKeys.D.isDown) {
      velocityX = speed;
    }

    if (this.wasdKeys.W.isDown) {
      velocityY = -speed;
    } else if (this.wasdKeys.S.isDown) {
      velocityY = speed;
    }

    // Apply movement with collision detection
    if (velocityX !== 0 || velocityY !== 0) {
      const currentX = this.localPlayer.x;
      const currentY = this.localPlayer.y;
      const newX = currentX + velocityX;
      const newY = currentY + velocityY;

      // Check if the new position is valid (no collision)
      if (this.isValidPosition(newX, newY, this.localPlayer)) {
        this.localPlayer.setPosition(newX, newY);
        
        // Update player direction for flashlight
        this.updatePlayerDirection(velocityX, velocityY);
        this.lastMovement = { x: velocityX, y: velocityY };
        
        // Send position to server if networked
        this.sendPlayerPositionIfNeeded(newX, newY);
      }
    }
  }

  private handlePlayer1Movement() {
    if (!this.player1) return;

    const speed = this.playerSpeed * (1 / 60); // 60 FPS movement

    let velocityX = 0;
    let velocityY = 0;


    // Check WASD keys only for Player 1
    if (this.wasdKeys.A.isDown) {
      velocityX = -speed;
    } else if (this.wasdKeys.D.isDown) {
      velocityX = speed;
    }

    if (this.wasdKeys.W.isDown) {
      velocityY = -speed;
    } else if (this.wasdKeys.S.isDown) {
      velocityY = speed;
    }

    // Apply movement with collision detection
    if (velocityX !== 0 || velocityY !== 0) {
      const currentX = this.player1.x;
      const currentY = this.player1.y;
      const newX = currentX + velocityX;
      const newY = currentY + velocityY;

      // Check if the new position is valid (no collision)
      if (this.isValidPosition(newX, newY, this.player1)) {
        this.player1.setPosition(newX, newY);
        
        // Update player direction for flashlight
        this.updatePlayerDirection(velocityX, velocityY);
        this.lastMovement = { x: velocityX, y: velocityY };
        
        // Send position to server if networked
        this.sendPlayerPositionIfNeeded(newX, newY);
      }
    }
  }

  private handlePlayer2Movement() {
    if (!this.player2) return;

    const speed = this.playerSpeed * (1 / 60); // 60 FPS movement

    let velocityX = 0;
    let velocityY = 0;

    // Check Arrow keys only for Player 2
    if (this.cursors.left.isDown) {
      velocityX = -speed;
    } else if (this.cursors.right.isDown) {
      velocityX = speed;
    }

    if (this.cursors.up.isDown) {
      velocityY = -speed;
    } else if (this.cursors.down.isDown) {
      velocityY = speed;
    }

    // Apply movement with collision detection
    if (velocityX !== 0 || velocityY !== 0) {
      const currentX = this.player2.x;
      const currentY = this.player2.y;
      const newX = currentX + velocityX;
      const newY = currentY + velocityY;

      // Check if the new position is valid (no collision)
      if (this.isValidPosition(newX, newY, this.player2)) {
        this.player2.setPosition(newX, newY);
      }
    }
  }

  private isValidPosition(x: number, y: number, player?: Phaser.GameObjects.Sprite): boolean {
    const playerRadius = 15;

    // 1. Screen boundary check
    if (x - playerRadius < 0 || x + playerRadius > 800 ||
      y - playerRadius < 0 || y + playerRadius > 600) {
      return false;
    }

    // 2. Check room wall collision - can only enter through door
    if (this.isCollidingWithRoomWalls(x, y, playerRadius, player)) {
      return false;
    }

    // 3. Door gaps are collision-free - no door collision needed

    // 4. Check object collisions
    if (this.isCollidingWithObjects(x, y, playerRadius)) {
      return false;
    }

    return true;
  }

  private getRoomAtPosition(x: number, y: number): RoomState | null {
    // Note: This is a point-based check. For a player with a radius, the center point is sufficient
    // for determining the primary room the player is in.
    for (const room of this.rooms) {
      if (x >= room.position.x && x <= room.position.x + room.position.width &&
        y >= room.position.y && y <= room.position.y + room.position.height) {
        return room;
      }
    }
    return null;
  }

  private isCollidingWithRoomWalls(x: number, y: number, radius: number, player?: Phaser.GameObjects.Sprite): boolean {
    const playerBounds = { left: x - radius, right: x + radius, top: y - radius, bottom: y + radius };

    // Use the specific player's current position, default to player1 for backward compatibility
    const currentPlayer = player || this.player1;
    const currentRoom = this.getRoomAtPosition(currentPlayer.x, currentPlayer.y);
    const nextRoom = this.getRoomAtPosition(x, y);


    // If the player is not changing rooms, there is no wall collision.
    // This covers movement within a single room, or movement completely outside of any room.
    if (currentRoom === nextRoom) {
      return false;
    }

    // At this point, the player is attempting to cross a boundary.
    // (e.g., from outside to a room, from a room to outside, or from one room to another).
    // This transition is only allowed if it happens through an open door.

    const isPassingThroughOpenDoor = this.doors.some(door => {
      if (!door.isOpen) return false;

      const doorBounds = this.getDoorBounds(door, 5); // Padding for smoother entry


      // Check for overlap between the player's next position and the door's bounds.
      return !(playerBounds.right < doorBounds.left ||
        playerBounds.left > doorBounds.right ||
        playerBounds.bottom < doorBounds.top ||
        playerBounds.top > doorBounds.bottom);
    });

    // If the player is crossing a boundary AND not passing through a door, it's a collision.
    // Otherwise, the movement is allowed.
    return !isPassingThroughOpenDoor;
  }


  private isCollidingWithLockedDoor(x: number, y: number, radius: number): boolean {
    const playerBounds = {
      left: x - radius,
      right: x + radius,
      top: y - radius,
      bottom: y + radius
    };

    for (const door of this.doors) {
      // Use our new door state system instead of door.isOpen
      const isDoorOpen = this.doorStates.get(door.id) || false;
      
      if (!isDoorOpen) {
        const doorBounds = this.getDoorBounds(door, 0);

        // Check if player overlaps with closed door
        if (!(playerBounds.right < doorBounds.left ||
          playerBounds.left > doorBounds.right ||
          playerBounds.bottom < doorBounds.top ||
          playerBounds.top > doorBounds.bottom)) {
          return true;
        }
      }
    }

    return false;
  }

  private getDoorBounds(door: Door, padding: number = 0) {
    const doorWidth = 20; // Standard door width for new system

    if (door.orientation === 'horizontal') {
      return {
        left: door.position.x - padding,
        right: door.position.x + doorWidth + padding,
        top: door.position.y - padding,
        bottom: door.position.y + 20 + padding
      };
    } else {
      return {
        left: door.position.x - padding,
        right: door.position.x + 20 + padding,
        top: door.position.y - padding,
        bottom: door.position.y + doorWidth + padding
      };
    }
  }

  private isCollidingWithObjects(x: number, y: number, playerRadius: number): boolean {
    const playerBounds = {
      left: x - playerRadius,
      right: x + playerRadius,
      top: y - playerRadius,
      bottom: y + playerRadius
    };

    // Check collision with all objects that have collision enabled
    for (const obj of this.objects) {
      if (!obj.collision) continue; // Skip non-collision objects

      // Special handling for internal doors
      if (obj.type === ObjectType.INTERNAL_DOOR) {
        const isOpen = this.internalDoorStates.get(obj.id) || false;
        if (isOpen) continue; // Open doors don't block movement
      }

      // Get object bounds from grid position
      const objBounds = this.getObjectBounds(obj);
      if (!objBounds) continue;

      // Check if player overlaps with object
      if (!(playerBounds.right < objBounds.left ||
            playerBounds.left > objBounds.right ||
            playerBounds.bottom < objBounds.top ||
            playerBounds.top > objBounds.bottom)) {
        return true; // Collision detected
      }
    }

    return false;
  }

  private getObjectBounds(obj: RoomObject): { left: number, right: number, top: number, bottom: number } | null {
    // Find the room this object belongs to
    const room = this.rooms.find(r => r.id === obj.roomId);
    if (!room) return null;

    // Convert grid position to screen coordinates
    const gridCellWidth = 22;  // From MazeGenerator config
    const gridCellHeight = 16; // From MazeGenerator config
    
    const screenX = room.position.x + (obj.gridPosition.col * gridCellWidth);
    const screenY = room.position.y + (obj.gridPosition.row * gridCellHeight);
    const objectWidth = obj.size.width * gridCellWidth;
    const objectHeight = obj.size.height * gridCellHeight;

    return {
      left: screenX,
      right: screenX + objectWidth,
      top: screenY,
      bottom: screenY + objectHeight
    };
  }

  private updateDynamicLighting() {
    // Update lighting overlays that depend on player position (like DARK rooms)
    this.rooms.forEach(room => {
      if (room.lightingState === LightingState.DARK) {
        this.updateRoomLighting(room.id, room.lightingState);
      }
    });
  }

  public cycleLighting() {
    if (this.isGameEnded) return; // Disable when game is over
    // Cycle through lighting states for testing
    this.rooms.forEach(room => {
      switch (room.lightingState) {
        case LightingState.BRIGHT:
          room.lightingState = LightingState.DIM;
          break;
        case LightingState.DIM:
          room.lightingState = LightingState.DARK;
          break;
        case LightingState.DARK:
          room.lightingState = LightingState.BRIGHT;
          break;
      }
      this.updateRoomLighting(room.id, room.lightingState);
    });
    
    console.log('Lighting cycled! Press L to cycle again.');
  }

  private updateKeyInteraction() {
    if ((!this.player1 && !this.player2) || this.isGameEnded) return;

    const interactionDistance = GAME_CONFIG.KEY_INTERACTION_DISTANCE;

    let closestKey: Key | null = null;
    let minDistance = Infinity;

    // Check proximity for both players
    const players = [
      { player: this.player1, key: this.spacebar, name: 'Player1' },
      { player: this.player2, key: this.enterKey, name: 'Player2' }
    ].filter(p => p.player); // Only include existing players

    // Find the closest uncollected key to any player
    for (const key of this.keys) {
      if (!this.collectedKeys.has(key.id)) {
        for (const playerData of players) {
          const distance = Phaser.Math.Distance.Between(
            playerData.player.x, 
            playerData.player.y, 
            key.position.x, 
            key.position.y
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestKey = key;
          }
        }
      }
    }

    // If the closest key is within interaction range, highlight it.
    if (closestKey && minDistance <= interactionDistance) {
      if (this.highlightedKey !== closestKey) {
        this.highlightKey(closestKey);
      }
    } else {
      // If no key is close enough, stop highlighting.
      this.unhighlightKey();
    }

    // Check for spacebar (Player 1) or enter (Player 2) press to collect the highlighted key
    if (this.highlightedKey && (Phaser.Input.Keyboard.JustDown(this.spacebar) || Phaser.Input.Keyboard.JustDown(this.enterKey))) {
      const keyPressed = Phaser.Input.Keyboard.JustDown(this.spacebar) ? "SPACE" : "ENTER";
      console.log(`${keyPressed} pressed`, this.highlightedKey.id);

      this.attemptKeyCollection(this.highlightedKey);
    }
  }

  private highlightKey(key: Key) {
    this.unhighlightKey(); // Stop any previous highlight

    this.highlightedKey = key;
    const keyGraphics = this.keyGraphics.get(key.id);
    const keyText = this.keyGraphics.get(`${key.id}_text`);

    if (keyGraphics && keyText) {
      // Create a tween that fades the key and its icon in and out
      this.activeKeyTween = this.tweens.add({
        targets: [keyGraphics, keyText],
        alpha: 0.5,
        duration: 600,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
  }

  private unhighlightKey() {
    if (this.highlightedKey) {
      const keyGraphics = this.keyGraphics.get(this.highlightedKey.id);
      const keyText = this.keyGraphics.get(`${this.highlightedKey.id}_text`);

      // Stop the tween and reset alpha
      if (this.activeKeyTween) {
        this.activeKeyTween.stop();
        this.activeKeyTween = null;
      }

      if (keyGraphics && keyText) {
        keyGraphics.setAlpha(1);
        keyText.setAlpha(1);
      }

      this.highlightedKey = null;
    }
  }

  private collectKey(keyId: string) {
    console.log(`Attempting to collect key: ${keyId}`); // For debugging

    // Stop the active tween if it exists for the collected key.
    if (this.activeKeyTween && this.highlightedKey?.id === keyId) {
      this.activeKeyTween.stop();
      this.activeKeyTween = null;
    }

    // Update the game state.
    this.collectedKeys.add(keyId);
    const key = this.keys.find(k => k.id === keyId);
    if (!key) {
      console.error(`Could not find key ${keyId} to collect.`);
      return;
    }
    key.collected = true;

    // Destroy the key's visual components.
    const keyGraphics = this.keyGraphics.get(keyId);
    if (keyGraphics) {
      keyGraphics.destroy();
      this.keyGraphics.delete(keyId);
    }
    const keyText = this.keyGraphics.get(`${keyId}_text`);
    if (keyText) {
      keyText.destroy();
      this.keyGraphics.delete(`${keyId}_text`);
    }

    // Unlock associated doors.
    for (const doorId of key.unlocksDoorsIds) {
      this.unlockDoor(doorId);
    }

    // Update the UI and provide feedback.
    this.updateKeyCounter();
    this.showKeyCollectionFeedback(key.position.x, key.position.y, keyId);

    // Clear the highlight state as the key is now gone.
    this.highlightedKey = null;

    console.log(`Successfully collected key: ${keyId}`);
  }

  private updateTreasureInteraction() {
    if ((!this.player1 && !this.player2) || !this.treasure || this.treasure.claimed || this.isGameEnded) return;

    const interactionDistance = GAME_CONFIG.TREASURE_INTERACTION_DISTANCE;

    // Check if either player is close enough to treasure
    const players = [this.player1, this.player2].filter(p => p);
    let isAnyPlayerNear = false;

    for (const player of players) {
      const distance = Phaser.Math.Distance.Between(
        player.x, player.y, 
        this.treasure.position.x, this.treasure.position.y
      );

      if (distance <= interactionDistance) {
        isAnyPlayerNear = true;
        break;
      }
    }

    // Check if any player is close enough to treasure
    if (isAnyPlayerNear) {
      this.showTreasureInteractionPrompt();
      
      // Check for spacebar (Player 1) or enter (Player 2) press to claim treasure
      if (Phaser.Input.Keyboard.JustDown(this.spacebar) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.attemptTreasureClaim();
      }
    } else {
      this.hideTreasureInteractionPrompt();
    }
  }

  private showTreasureInteractionPrompt() {
    // Remove existing prompt
    const existingPrompt = this.children.getByName('treasure_interaction_prompt');
    if (existingPrompt) return; // Already showing

    const treasureX = this.treasure.position.x;
    const treasureY = this.treasure.position.y;

    // Show interaction prompt above treasure
    this.add.text(
      treasureX,
      treasureY - 30,
      'Press SPACE to claim treasure',
      {
        fontSize: '12px',
        color: '#F39C12',
        fontFamily: 'Arial',
        backgroundColor: '#2C3E50',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5).setName('treasure_interaction_prompt');
  }

  private hideTreasureInteractionPrompt() {
    const existingPrompt = this.children.getByName('treasure_interaction_prompt');
    if (existingPrompt) existingPrompt.destroy();
  }

  private attemptTreasureClaim() {
    console.log(`Attempting to claim treasure. Player has ${this.collectedKeys.size} keys, needs ${this.treasure.keysRequired}`);
    
    if (this.isNetworked && socketManager.getConnectionStatus()) {
      // Networked mode: Send to server for validation
      console.log('🌐 Sending treasure claim to server');
      const playerPos = this.player1 ? { x: this.player1.x, y: this.player1.y } : { x: 0, y: 0 };
      socketManager.sendTreasureClaim({
        position: playerPos,
        keysCollected: this.collectedKeys.size
      });
    } else {
      // Local mode: Handle immediately
      console.log('🏠 Local treasure claim attempt');
      if (this.collectedKeys.size >= this.treasure.keysRequired) {
        this.claimTreasureLocally();
      } else {
        this.showInsufficientKeysFeedback();
      }
    }
  }

  private claimTreasureLocally() {
    console.log('Treasure claimed locally! Player wins!');
    
    // Update game state
    this.isGameEnded = true;
    this.winnerId = PLAYER_IDS.PLAYER_ONE; // Single player for now
    
    // Mark treasure as claimed
    this.treasure.claimed = true;
    this.treasure.claimedBy = this.winnerId;
    
    // Hide interaction prompt
    this.hideTreasureInteractionPrompt();
    
    // Show victory screen (no wager data in local mode)
    this.showVictoryMessage();
    
    console.log(`Game ended! Winner: ${this.winnerId}`);
  }

  // Public methods for game state access
  public isGameOver(): boolean {
    return this.isGameEnded;
  }

  public getWinner(): string | null {
    return this.winnerId;
  }

  public getGameState() {
    return {
      isEnded: this.isGameEnded,
      winnerId: this.winnerId,
      keysCollected: this.collectedKeys.size,
      keysRequired: this.treasure?.keysRequired || GAME_CONFIG.KEYS_REQUIRED_FOR_TREASURE,
      treasureClaimed: this.treasure?.claimed || false
    };
  }

  private showInsufficientKeysFeedback() {
    const treasureX = this.treasure.position.x;
    const treasureY = this.treasure.position.y;
    
    const feedbackText = this.add.text(
      treasureX,
      treasureY + 20,
      `Need ${this.treasure.keysRequired} keys! You have ${this.collectedKeys.size}`,
      {
        fontSize: '12px',
        color: '#E74C3C',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: '#2C3E50',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5);

    // Animate feedback
    this.tweens.add({
      targets: feedbackText,
      y: treasureY - 10,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => feedbackText.destroy()
    });
  }

  private showVictoryMessage(wager?: any) {
    // Victory message
    const victoryText = this.add.text(
      400, 200,
      '🏆 VICTORY!\nYou Won!',
      {
        fontSize: '32px',
        color: '#27AE60',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: '#2C3E50',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);

    let yOffset = 300;

    // Show wager info if available
    if (wager && wager.amount) {
      const wagerText = this.add.text(
        400, 260,
        `💰 You Won: ${wager.amount} GOR\nCheck lobby to claim`,
        {
          fontSize: '18px',
          color: '#F39C12',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          align: 'center',
          backgroundColor: '#2C3E50',
          padding: { x: 15, y: 8 }
        }
      ).setOrigin(0.5);

      yOffset = 340;
    }

    // Back to lobby button
    const lobbyButton = this.add.text(
      400, yOffset,
      'Back to Lobby',
      {
        fontSize: '18px',
        color: '#3498DB',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: '#2C3E50',
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5)
     .setInteractive({ useHandCursor: true })
     .on('pointerdown', () => this.returnToLobby())
     .on('pointerover', () => {
       lobbyButton.setStyle({ color: '#E74C3C' }); // Red on hover
     })
     .on('pointerout', () => {
       lobbyButton.setStyle({ color: '#3498DB' }); // Blue default
     });

    console.log('Victory screen displayed with lobby button');
  }

  private showDefeatMessage(winnerId: string, wager?: any) {
    // Defeat message
    const defeatText = this.add.text(
      400, 200,
      `😔 DEFEAT!\nYou Lost!`,
      {
        fontSize: '32px',
        color: '#E74C3C',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: '#2C3E50',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);

    let yOffset = 300;

    // Show wager loss if there was a wager
    if (wager && wager.amount) {
      const wagerText = this.add.text(
        400, 260,
        `💔 You Lost: ${wager.amount / 2} GOR`,
        {
          fontSize: '20px',
          color: '#E74C3C',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          align: 'center',
          backgroundColor: '#2C3E50',
          padding: { x: 15, y: 8 }
        }
      ).setOrigin(0.5);

      yOffset = 330;
    }

    // Back to lobby button
    const lobbyButton = this.add.text(
      400, yOffset,
      'Back to Lobby',
      {
        fontSize: '18px',
        color: '#3498DB',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: '#2C3E50',
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5)
     .setInteractive({ useHandCursor: true })
     .on('pointerdown', () => this.returnToLobby())
     .on('pointerover', () => {
       lobbyButton.setStyle({ color: '#E74C3C' }); // Red on hover
     })
     .on('pointerout', () => {
       lobbyButton.setStyle({ color: '#3498DB' }); // Blue default
     });

    console.log('Defeat screen displayed with lobby button');
  }


  private returnToLobby() {
    console.log('Returning to lobby...');
    
    // TODO: Replace with actual lobby scene transition
    // For now, we'll redirect to a basic menu/lobby
    // In a real implementation, this would be:
    // this.scene.start('LobbyScene');
    
    // Placeholder: Log and reload page (simulates going to lobby)
    console.log('Returning to lobby... (placeholder - would go to actual lobby scene)');
    window.location.reload();
    
    console.log('Lobby return triggered');
  }

  private updateObjectInteraction() {
    if ((!this.player1 && !this.player2) || this.isGameEnded) return;

    const interactionDistance = GAME_CONFIG.OBJECT_INTERACTION_DISTANCE;

    let closestInteractiveObject: RoomObject | null = null;
    let minDistance = Infinity;

    // Check both players
    const players = [this.player1, this.player2].filter(p => p);

    // Find the closest interactive object for any player IN THE SAME ROOM
    for (const obj of this.objects) {
      if (!obj.interactive) continue; // Skip non-interactive objects

      const objBounds = this.getObjectBounds(obj);
      if (!objBounds) continue;

      // Calculate distance to object center for each player
      const objCenterX = objBounds.left + (objBounds.right - objBounds.left) / 2;
      const objCenterY = objBounds.top + (objBounds.bottom - objBounds.top) / 2;

      for (const player of players) {
        // ROOM CHECK: Only allow interaction with objects in the same room as this player
        const playerRoom = this.getRoomAtPosition(player.x, player.y);
        if (!playerRoom || playerRoom.id !== obj.roomId) continue;

        const distance = Phaser.Math.Distance.Between(player.x, player.y, objCenterX, objCenterY);

        if (distance < minDistance) {
          minDistance = distance;
          closestInteractiveObject = obj;
        }
      }
    }

    // Show interaction prompt if close enough
    if (closestInteractiveObject && minDistance <= interactionDistance) {
      this.showInteractionPrompt(closestInteractiveObject);
      
      // Check for spacebar (Player 1) or enter (Player 2) press to interact
      if (Phaser.Input.Keyboard.JustDown(this.spacebar) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.interactWithObject(closestInteractiveObject);
      }
    } else {
      this.hideInteractionPrompt();
    }
  }

  private showInteractionPrompt(obj: RoomObject) {
    // Remove existing prompt
    const existingPrompt = this.children.getByName('interaction_prompt');
    if (existingPrompt) existingPrompt.destroy();

    const objBounds = this.getObjectBounds(obj);
    if (!objBounds) return;

    let promptText = '';
    switch (obj.type) {
      case ObjectType.LIGHT_SWITCH:
        promptText = 'Press SPACE to toggle lights';
        break;
      case ObjectType.COMPUTER:
        promptText = 'Press SPACE to use computer';
        break;
      case ObjectType.INTERNAL_DOOR:
        promptText = 'Press SPACE to open/close door';
        break;
      default:
        promptText = 'Press SPACE to interact';
        break;
    }

    // Show prompt above the object
    this.add.text(
      objBounds.left + (objBounds.right - objBounds.left) / 2,
      objBounds.top - 25,
      promptText,
      {
        fontSize: '12px',
        color: '#F39C12',
        fontFamily: 'Arial',
        backgroundColor: '#2C3E50',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5).setName('interaction_prompt');
  }

  private hideInteractionPrompt() {
    const existingPrompt = this.children.getByName('interaction_prompt');
    if (existingPrompt) existingPrompt.destroy();
  }

  private interactWithObject(obj: RoomObject) {
    console.log(`Interacting with ${obj.type} - ${obj.id}`);

    switch (obj.type) {
      case ObjectType.LIGHT_SWITCH:
        this.toggleRoomLighting(obj.roomId);
        break;
      case ObjectType.COMPUTER:
        this.useComputer(obj);
        break;
      case ObjectType.INTERNAL_DOOR:
        this.toggleInternalDoor(obj);
        break;
      default:
        console.log(`No interaction defined for ${obj.type}`);
        break;
    }
  }

  private toggleRoomLighting(roomId: string) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    // Cycle through lighting states
    switch (room.lightingState) {
      case LightingState.BRIGHT:
        room.lightingState = LightingState.DIM;
        break;
      case LightingState.DIM:
        room.lightingState = LightingState.DARK;
        break;
      case LightingState.DARK:
        room.lightingState = LightingState.BRIGHT;
        break;
    }

    // Update the lighting visually
    this.updateRoomLighting(roomId, room.lightingState);

    // Show feedback
    this.showLightSwitchFeedback(roomId, room.lightingState);
  }

  private showLightSwitchFeedback(roomId: string, newState: LightingState) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    const feedbackText = this.add.text(
      room.position.x + room.position.width / 2,
      room.position.y + room.position.height / 2,
      `Lights: ${newState.toUpperCase()}`,
      {
        fontSize: '16px',
        color: '#F39C12',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: '#2C3E50',
        padding: { x: 8, y: 4 }
      }
    ).setOrigin(0.5);

    // Animate feedback
    this.tweens.add({
      targets: feedbackText,
      y: room.position.y + room.position.height / 2 - 30,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => feedbackText.destroy()
    });

    console.log(`Room ${roomId} lighting changed to: ${newState}`);
  }

  private useComputer(obj: RoomObject) {
    // Placeholder for computer interaction
    const objBounds = this.getObjectBounds(obj);
    if (!objBounds) return;

    const feedbackText = this.add.text(
      objBounds.left + (objBounds.right - objBounds.left) / 2,
      objBounds.top - 10,
      'Computer activated!',
      {
        fontSize: '12px',
        color: '#3498DB',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Animate feedback
    this.tweens.add({
      targets: feedbackText,
      y: objBounds.top - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => feedbackText.destroy()
    });

    console.log(`Used computer: ${obj.id}`);
  }

  private toggleInternalDoor(obj: RoomObject) {
    const currentState = this.internalDoorStates.get(obj.id) || false;
    const newState = !currentState;
    this.internalDoorStates.set(obj.id, newState);

    // Update visual appearance
    this.updateInternalDoorVisual(obj, newState);

    // Show feedback
    const objBounds = this.getObjectBounds(obj);
    if (!objBounds) return;

    const feedbackText = this.add.text(
      objBounds.left + (objBounds.right - objBounds.left) / 2,
      objBounds.top - 20,
      newState ? 'Door OPENED' : 'Door CLOSED',
      {
        fontSize: '12px',
        color: newState ? '#27AE60' : '#E74C3C',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: '#2C3E50',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5);

    // Animate feedback
    this.tweens.add({
      targets: feedbackText,
      y: objBounds.top - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => feedbackText.destroy()
    });

    console.log(`Internal door ${obj.id} ${newState ? 'opened' : 'closed'}`);
  }

  private updateInternalDoorVisual(obj: RoomObject, isOpen: boolean) {
    const graphics = this.objectGraphics.get(obj.id);
    if (!graphics) return;

    const objBounds = this.getObjectBounds(obj);
    if (!objBounds) return;

    const x = objBounds.left;
    const y = objBounds.top;
    const width = objBounds.right - objBounds.left;
    const height = objBounds.bottom - objBounds.top;

    // Clear and redraw
    graphics.clear();

    if (isOpen) {
      // Open door - lighter brown, partially transparent
      graphics.fillStyle(0xD2691E, 0.5);
      graphics.fillRect(x, y, width, height);
      graphics.lineStyle(2, 0xA0522D, 0.7);
      graphics.strokeRect(x, y, width, height);
      // Door slightly ajar indicator
      graphics.fillStyle(0x000000, 0.3);
      graphics.fillRect(x + 2, y, 2, height);
    } else {
      // Closed door - solid brown
      graphics.fillStyle(0x8B4513, 0.9);
      graphics.fillRect(x, y, width, height);
      graphics.lineStyle(2, 0x654321, 1);
      graphics.strokeRect(x, y, width, height);
      // Door handle
      graphics.fillStyle(0xF1C40F, 1);
      graphics.fillCircle(x + width - 4, y + height/2, 2);
    }
  }

  private showKeyCollectionFeedback(x: number, y: number, keyId: string) {
    // Create floating text feedback
    const feedbackText = this.add.text(x, y, '🗝️ KEY COLLECTED!', {
      fontSize: '14px',
      color: '#f1c40f',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Animate the feedback text
    this.tweens.add({
      targets: feedbackText,
      y: y - 30,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        feedbackText.destroy();
      }
    });

    // Update key counter in UI
    this.updateKeyCounter();
  }

  private updateKeyCounter() {
    // Add or update key counter display
    const existingCounter = this.children.getByName('keyCounter') as Phaser.GameObjects.Text;
    if (existingCounter) {
      existingCounter.setText(`Keys: ${this.collectedKeys.size}/${this.keys.length}`);
    } else {
      this.add.text(20, 60, `Keys: ${this.collectedKeys.size}/${this.keys.length}`, {
        fontSize: '16px',
        color: '#f1c40f',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setName('keyCounter');
    }
  }

  // Public methods for game logic
  public updatePlayerPosition(playerId: string, position: { x: number, y: number }) {
    const playerSprite = this.players.get(playerId);
    if (playerSprite) {
      playerSprite.setPosition(position.x, position.y);
    }
  }


  public unlockDoor(doorId: string) {
    const doorGraphics = this.doorGraphics.get(doorId);
    const door = this.doors.find(d => d.id === doorId);

    if (doorGraphics && door && !door.isOpen) {
      // Update door state
      door.isOpen = true;

      // Clear and redraw as open door (green)
      doorGraphics.clear();
      doorGraphics.fillStyle(0x2ecc71, 1);

      const doorWidth = 20; // Standard door width for new system

      if (door.orientation === 'horizontal') {
        doorGraphics.fillRect(door.position.x, door.position.y, doorWidth, 20);
      } else {
        doorGraphics.fillRect(door.position.x, door.position.y, 20, doorWidth);
      }

      // Add door outline
      doorGraphics.lineStyle(2, 0xffffff, 1);
      if (door.orientation === 'horizontal') {
        doorGraphics.strokeRect(door.position.x, door.position.y, doorWidth, 20);
      } else {
        doorGraphics.strokeRect(door.position.x, door.position.y, 20, doorWidth);
      }

      // Show unlock feedback
      this.showDoorUnlockFeedback(door.position.x, door.position.y, doorId);

      console.log(`Door unlocked: ${doorId}`);
    }
  }

  private showDoorUnlockFeedback(x: number, y: number, doorId: string) {
    // Create floating text feedback
    const feedbackText = this.add.text(x + 20, y - 10, '🔓 UNLOCKED!', {
      fontSize: '12px',
      color: '#2ecc71',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Animate the feedback text
    this.tweens.add({
      targets: feedbackText,
      y: y - 40,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        feedbackText.destroy();
      }
    });
  }

  // ====== NETWORKING METHODS ======

  private setupNetworking(): void {
    // Always set up event listeners (they'll be ignored if not connected)
    console.log('🔧 Setting up networking event listeners...');
    
    socketManager.onPlayerMove((data) => {
      console.log('📨 Received player move:', data);
      this.handleRemotePlayerMove(data);
    });

    socketManager.onGameState((data) => {
      this.handleGameStateUpdate(data);
    });

    socketManager.onKeyCollection((data) => {
      this.handleRemoteKeyCollection(data);
    });

    socketManager.onGameWin((data) => {
      this.handleRemoteTreasureClaim(data);
    });

    // Note: Game start listener is handled by App component
    // Networking will be enabled automatically when game starts

    // Check initial state
    this.checkNetworkingState();
  }

  private checkNetworkingState(): void {
    this.isNetworked = socketManager.getConnectionStatus() && socketManager.getRoomId() !== null;
    this.localPlayerId = socketManager.getPlayerId();

    console.log('🔍 Network state check:', {
      connected: socketManager.getConnectionStatus(),
      hasRoom: socketManager.getRoomId() !== null,
      playerId: this.localPlayerId,
      roomId: socketManager.getRoomId(),
      finalNetworked: this.isNetworked
    });

    if (this.isNetworked) {
      this.enableNetworking();
    }
  }

  public enableNetworking(): void {
    this.isNetworked = true;
    this.localPlayerId = socketManager.getPlayerId();
    
    console.log('🌐 NETWORKING ENABLED!', {
      playerId: this.localPlayerId,
      roomId: socketManager.getRoomId()
    });

    // Initialize starting position
    if (this.localPlayer) {
      this.lastSentPosition = { x: this.localPlayer.x, y: this.localPlayer.y };
      console.log('📍 Initial position set:', this.lastSentPosition);
    }
  }

  public setPlayerRole(isHost: boolean): void {
    console.log(`🎭 setPlayerRole called with isHost: ${isHost}`);
    this.isHost = isHost;
    this.playerIndex = isHost ? 0 : 1;
    console.log(`🎯 Player will spawn as: ${isHost ? 'HOST (Player 1 - TOP LEFT)' : 'JOINER (Player 2 - BOTTOM RIGHT)'}`);
    
    // Destroy existing players if any
    if (this.player1) {
      this.player1.destroy();
      this.player1 = undefined as any;
    }
    if (this.player2) {
      this.player2.destroy();
      this.player2 = undefined as any;
    }
    this.localPlayer = undefined as any;
    
    // Create player with the correct role
    this.createPlayers();
  }

  private sendPlayerPositionIfNeeded(x: number, y: number): void {
    if (!this.isNetworked || !socketManager.getConnectionStatus()) {
      console.log('🚫 Not sending position - not networked or not connected');
      return;
    }

    // Only send if we've moved significantly (reduces network traffic)
    const deltaX = Math.abs(x - this.lastSentPosition.x);
    const deltaY = Math.abs(y - this.lastSentPosition.y);

    if (deltaX > this.positionSendThreshold || deltaY > this.positionSendThreshold) {
      console.log(`📤 Sending position: (${x}, ${y}) - delta: (${deltaX}, ${deltaY})`);
      socketManager.sendPlayerMove({
        position: { x, y },
        direction: this.playerDirection
      });
      
      this.lastSentPosition = { x, y };
    }
  }

  private handleRemotePlayerMove(data: any): void {
    const { playerId, position, timestamp } = data;
    
    // Don't update our own player
    if (playerId === this.localPlayerId) {
      return;
    }

    // Get or create remote player graphics
    let remotePlayer = this.remotePlayers.get(playerId);
    
    if (!remotePlayer) {
      // Create new remote player using opposite sprite
      const spriteKey = this.isHost ? 'player2' : 'player1';
      remotePlayer = this.add.sprite(position.x, position.y, spriteKey);
      remotePlayer.setScale(0.25); // Same scale as local players
      remotePlayer.setTint(0x9B59B6); // Purple tint to distinguish remote player
      this.remotePlayers.set(playerId, remotePlayer);
      
      console.log('👤 Created remote player:', playerId);
    }

    // Update remote player position
    remotePlayer.setPosition(position.x, position.y);
  }

  private handleGameStateUpdate(data: any): void {
    // Handle server-authoritative game state updates
    // console.log('🎮 Game state update received:', data); // DISABLED - was causing infinite loop
    
    // TODO: Update keys, treasure state based on server authority
  }

  private handleRemoteKeyCollection(data: any): void {
    const { keyId, playerId } = data;
    
    console.log(`🗝️ Remote key collection: ${keyId} by ${playerId}`);
    
    // Remove the key from our local display
    if (this.collectedKeys.has(keyId)) {
      console.log(`Key ${keyId} already collected locally`);
      return; // Already collected locally
    }
    
    // Mark as collected and remove visually
    this.collectedKeys.add(keyId);
    
    // Remove key graphics
    const keyGraphics = this.keyGraphics.get(keyId);
    if (keyGraphics) {
      keyGraphics.destroy();
      this.keyGraphics.delete(keyId);
    }
    
    // Remove key text
    const keyText = this.keyGraphics.get(`${keyId}_text`);
    if (keyText) {
      keyText.destroy();
      this.keyGraphics.delete(`${keyId}_text`);
    }
    
    // Clear the highlight state if this was the highlighted key
    if (this.highlightedKey?.id === keyId) {
      this.highlightedKey = null;
      if (this.activeKeyTween) {
        this.activeKeyTween.stop();
        this.activeKeyTween = null;
      }
    }
    
    // Update key counter
    this.updateKeyCounter();
    
    console.log(`✅ Remote key ${keyId} removed from display`);
  }

  private handleRemoteTreasureClaim(data: any): void {
    const { winnerId, winnerWallet, wager } = data;
    
    console.log(`🏆 Remote treasure claimed by: ${winnerId}`, data);
    
    // Update game state
    this.isGameEnded = true;
    this.winnerId = winnerId;
    
    // Mark treasure as claimed
    this.treasure.claimed = true;
    this.treasure.claimedBy = winnerId;
    
    // Hide interaction prompt
    this.hideTreasureInteractionPrompt();
    
    // Show victory/defeat screen based on who won
    if (winnerId === this.localPlayerId) {
      this.showVictoryMessage(wager);
    } else {
      this.showDefeatMessage(winnerId, wager);
    }
    
    console.log(`🏁 Game ended! Winner: ${winnerId}`);
  }

  private attemptKeyCollection(key: Key): void {
    if (this.isNetworked && socketManager.getConnectionStatus()) {
      // Networked mode: Send to server for validation
      console.log('🌐 Sending key collection to server:', key.id);
      socketManager.sendKeyCollection({
        keyId: key.id,
        position: this.player1 ? { x: this.player1.x, y: this.player1.y } : { x: 0, y: 0 }
      });
    } else {
      // Local mode: Handle immediately
      console.log('🏠 Local key collection:', key.id);
      this.collectKeyLocally(key.id);
    }
  }

  private collectKeyLocally(keyId: string): void {
    // Check if key already collected
    if (this.collectedKeys.has(keyId)) {
      console.log(`Key ${keyId} already collected`);
      return;
    }

    // Mark key as collected
    this.collectedKeys.add(keyId);

    // Remove key graphics
    const keyGraphics = this.keyGraphics.get(keyId);
    if (keyGraphics) {
      keyGraphics.destroy();
      this.keyGraphics.delete(keyId);
    }

    // Remove key text
    const keyText = this.keyGraphics.get(`${keyId}_text`);
    if (keyText) {
      keyText.destroy();
      this.keyGraphics.delete(`${keyId}_text`);
    }

    // Clear the highlight state
    this.highlightedKey = null;

    // Update UI
    this.updateKeyCounter();

    console.log(`✅ Key collected locally: ${keyId}`);
  }

  private cleanupNetworking(): void {
    // Clean up remote players
    this.remotePlayers.forEach((player) => {
      player.destroy();
    });
    this.remotePlayers.clear();
  }
}