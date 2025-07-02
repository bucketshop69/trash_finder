import Phaser from 'phaser';
import { MazeGenerator } from '../utils/MazeGenerator';
import type { RoomState, Door, Key, Player, MazeConfig, MazeData, RoomObject } from '../../types/GameTypes';
import { ObjectType, LightingState } from '../../types/GameTypes';

export class MazeScene extends Phaser.Scene {
  private mazeGenerator!: MazeGenerator;
  private rooms: RoomState[] = [];
  private doors: Door[] = [];
  private keys: Key[] = [];
  private objects: RoomObject[] = [];
  private players: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private roomGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private doorGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private keySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private keyGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private objectGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private lightingOverlays: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private internalDoorStates: Map<string, boolean> = new Map(); // true = open, false = closed
  private collectedKeys: Set<string> = new Set();
  private highlightedKey: Key | null = null;
  private activeKeyTween: Phaser.Tweens.Tween | null = null;

  // Player movement
  private player1!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: any;
  private spacebar!: Phaser.Input.Keyboard.Key;
  private playerSpeed: number = 100;

  // Flashlight system
  private flashlightGraphics!: Phaser.GameObjects.Graphics;
  private flashlightEnabled: boolean = false;
  private playerDirection: { x: number, y: number } = { x: 1, y: 0 }; // Default facing right
  private lastMovement: { x: number, y: number } = { x: 0, y: 0 };

  constructor() {
    super({ key: 'MazeScene' });
  }

  preload() {
    // Create simple colored rectangles for sprites (no external assets needed)
    this.load.image('player1', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    this.load.image('player2', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
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
    this.objects = mazeData.objects;

    // DEBUG: Validate all the data
    this.validateGameData();

    // Set dark background
    this.cameras.main.setBackgroundColor('#2a2a2a');

    // Create visual elements
    this.createRooms();
    this.createDoors();
    this.createKeys();
    this.createObjects();
    this.createLightingOverlays();
    this.createPlayers();
    this.createFlashlight();

    // Add title
    this.add.text(400, 20, 'Gorbagana Trash Finder - 2x2 Maze', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Add instructions
    this.add.text(400, 550, 'WASD to move | SPACE to collect keys | L to cycle lighting | F for flashlight | Reach center treasure!', {
      fontSize: '14px',
      color: '#cccccc',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Set up input controls
    this.setupControls();

    // Initialize key counter
    this.updateKeyCounter();

    // DEBUG: Final validation
    this.debugGameState();
  }

  private validateGameData() {
    console.log('=== GAME DATA VALIDATION ===');
    console.log('Rooms:', this.rooms.length, this.rooms);
    console.log('Doors:', this.doors.length, this.doors);
    console.log('Keys:', this.keys.length, this.keys);
    console.log('Objects:', this.objects.length, this.objects);

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

      // Room background
      if (room.id === 'center') {
        // Center room (treasure) - golden color
        graphics.fillStyle(0xf39c12, 0.8);
      } else {
        // Regular rooms - green tint
        graphics.fillStyle(0x27ae60, 0.3);
      }

      graphics.fillRect(room.position.x, room.position.y, room.position.width, room.position.height);

      // Room border
      graphics.lineStyle(3, 0xffffff, 1);
      graphics.strokeRect(room.position.x, room.position.y, room.position.width, room.position.height);

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

  private createDoors() {
    this.doors.forEach(door => {
      const graphics = this.add.graphics();

      if (door.type === 'open') {
        // Open door - green passage
        graphics.fillStyle(0x2ecc71, 1);
      } else {
        // Locked door - red barrier
        graphics.fillStyle(0xe74c3c, 1);
      }

      const doorWidth = 20; // Standard door width for new system

      if (door.orientation === 'horizontal') {
        // Horizontal door
        graphics.fillRect(door.position.x, door.position.y, doorWidth, 20);
      } else {
        // Vertical door
        graphics.fillRect(door.position.x, door.position.y, 20, doorWidth);
      }

      // Door outline
      graphics.lineStyle(2, 0xffffff, 1);
      if (door.orientation === 'horizontal') {
        graphics.strokeRect(door.position.x, door.position.y, doorWidth, 20);
      } else {
        graphics.strokeRect(door.position.x, door.position.y, 20, doorWidth);
      }

      // Add door labels
      const labelX = door.orientation === 'horizontal' ? door.position.x + 20 : door.position.x + 10;
      const labelY = door.orientation === 'horizontal' ? door.position.y - 15 : door.position.y + 20;

      let labelText = '';
      if (door.id === 'door_spawn_1') {
        labelText = '🚪 ENTER';
      } else if (door.type === 'open') {
        labelText = '🚪 OPEN';
      } else {
        labelText = '🔒 LOCKED';
      }

      this.add.text(labelX, labelY, labelText, {
        fontSize: '10px',
        color: door.type === 'open' ? '#2ecc71' : '#e74c3c',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.doorGraphics.set(door.id, graphics);
    });
  }

  private createKeys() {
    this.keys.forEach(key => {
      if (!key.collected) {
        // Create key graphics as colored circle
        const graphics = this.add.graphics();
        graphics.fillStyle(0xf1c40f, 1); // Gold color
        graphics.fillCircle(key.position.x, key.position.y, 10);
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.strokeCircle(key.position.x, key.position.y, 10);

        // Add key label
        const keyText = this.add.text(key.position.x, key.position.y - 25, '🗝️', {
          fontSize: '16px',
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
        // Solid internal wall - dark gray
        graphics.fillStyle(0x34495E, 1.0);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(3, 0x2C3E50, 1);
        graphics.strokeRect(x, y, width, height);
        // Add brick texture lines
        graphics.lineStyle(1, 0x2C3E50, 0.7);
        if (width > height) { // Horizontal wall
          for (let i = 1; i < height / 8; i++) {
            graphics.lineBetween(x, y + (i * 8), x + width, y + (i * 8));
          }
        } else { // Vertical wall
          for (let i = 1; i < width / 8; i++) {
            graphics.lineBetween(x + (i * 8), y, x + (i * 8), y + height);
          }
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
    // Create player 1 (blue circle) - controllable
    // Position outside the room entrance
    const firstRoom = this.rooms[0];
    const player1Pos = {
      x: firstRoom.position.x - 50,
      y: firstRoom.position.y + firstRoom.position.height / 2
    };

    this.player1 = this.add.graphics();
    this.player1.fillStyle(0x3498db, 1); // Blue
    this.player1.fillCircle(0, 0, 15);
    this.player1.lineStyle(3, 0xffffff, 1);
    this.player1.strokeCircle(0, 0, 15);
    this.player1.setPosition(player1Pos.x, player1Pos.y);

    // Player 1 label
    this.add.text(player1Pos.x, player1Pos.y - 35, 'YOU', {
      fontSize: '14px',
      color: '#3498db',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
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
    // Create cursor keys (arrow keys)
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Create WASD keys
    this.wasdKeys = this.input.keyboard!.addKeys('W,S,A,D');

    // Add spacebar for key collection
    this.spacebar = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
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
    this.updateObjectInteraction();
    this.updateDynamicLighting();
    this.updateFlashlight();
  }

  private handlePlayerMovement() {
    if (!this.player1) return;

    const speed = this.playerSpeed * (1 / 60); // 60 FPS movement

    let velocityX = 0;
    let velocityY = 0;


    // Check WASD keys
    if (this.wasdKeys.A.isDown || this.cursors.left.isDown) {
      velocityX = -speed;
    } else if (this.wasdKeys.D.isDown || this.cursors.right.isDown) {
      velocityX = speed;
    }

    if (this.wasdKeys.W.isDown || this.cursors.up.isDown) {
      velocityY = -speed;
    } else if (this.wasdKeys.S.isDown || this.cursors.down.isDown) {
      velocityY = speed;
    }

    // Apply movement with collision detection
    if (velocityX !== 0 || velocityY !== 0) {
      const currentX = this.player1.x;
      const currentY = this.player1.y;
      const newX = currentX + velocityX;
      const newY = currentY + velocityY;

      // Check if the new position is valid (no collision)
      if (this.isValidPosition(newX, newY)) {
        this.player1.setPosition(newX, newY);
        
        // Update player direction for flashlight
        this.updatePlayerDirection(velocityX, velocityY);
        this.lastMovement = { x: velocityX, y: velocityY };
      }
    }
  }

  private isValidPosition(x: number, y: number): boolean {
    const playerRadius = 15;

    // 1. Screen boundary check
    if (x - playerRadius < 0 || x + playerRadius > 800 ||
      y - playerRadius < 0 || y + playerRadius > 600) {
      return false;
    }

    // 2. Check room wall collision - can only enter through door
    if (this.isCollidingWithRoomWalls(x, y, playerRadius)) {
      return false;
    }

    // 3. Check locked door collisions
    if (this.isCollidingWithLockedDoor(x, y, playerRadius)) {
      return false;
    }

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

  private isCollidingWithRoomWalls(x: number, y: number, radius: number): boolean {
    const playerBounds = { left: x - radius, right: x + radius, top: y - radius, bottom: y + radius };

    const currentRoom = this.getRoomAtPosition(this.player1.x, this.player1.y);
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
      if (!door.isOpen) {
        const doorBounds = this.getDoorBounds(door, 0);

        // Check if player overlaps with locked door
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
    if (!this.player1) return;

    const playerX = this.player1.x;
    const playerY = this.player1.y;
    const interactionDistance = 35; // Player radius (15) + key radius (10) + buffer (10)

    let closestKey: Key | null = null;
    let minDistance = Infinity;

    // Find the closest uncollected key
    for (const key of this.keys) {
      if (!this.collectedKeys.has(key.id)) {
        const distance = Phaser.Math.Distance.Between(playerX, playerY, key.position.x, key.position.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestKey = key;
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

    // Check for spacebar press to collect the highlighted key
    if (this.highlightedKey && Phaser.Input.Keyboard.JustDown(this.spacebar)) {
      console.log("space clicked", this.highlightedKey.id);

      this.collectKey(this.highlightedKey.id);
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

  private updateObjectInteraction() {
    if (!this.player1) return;

    const playerX = this.player1.x;
    const playerY = this.player1.y;
    const interactionDistance = 40; // Player radius (15) + object size + buffer

    let closestInteractiveObject: RoomObject | null = null;
    let minDistance = Infinity;

    // Find the closest interactive object
    for (const obj of this.objects) {
      if (!obj.interactive) continue; // Skip non-interactive objects

      const objBounds = this.getObjectBounds(obj);
      if (!objBounds) continue;

      // Calculate distance to object center
      const objCenterX = objBounds.left + (objBounds.right - objBounds.left) / 2;
      const objCenterY = objBounds.top + (objBounds.bottom - objBounds.top) / 2;
      const distance = Phaser.Math.Distance.Between(playerX, playerY, objCenterX, objCenterY);

      if (distance < minDistance) {
        minDistance = distance;
        closestInteractiveObject = obj;
      }
    }

    // Show interaction prompt if close enough
    if (closestInteractiveObject && minDistance <= interactionDistance) {
      this.showInteractionPrompt(closestInteractiveObject);
      
      // Check for spacebar press to interact
      if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
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
}