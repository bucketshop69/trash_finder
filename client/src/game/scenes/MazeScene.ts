import Phaser from 'phaser';
import { MazeGenerator } from '../utils/MazeGenerator';
import type { RoomState, Door, Key, Player, MazeConfig, MazeData } from '../../types/GameTypes';

export class MazeScene extends Phaser.Scene {
  private mazeGenerator!: MazeGenerator;
  private rooms: RoomState[] = [];
  private doors: Door[] = [];
  private keys: Key[] = [];
  private players: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private roomGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private doorGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private keySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private keyGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private collectedKeys: Set<string> = new Set();
  private highlightedKey: Key | null = null;
  private activeKeyTween: Phaser.Tweens.Tween | null = null;

  // Player movement
  private player1!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: any;
  private spacebar!: Phaser.Input.Keyboard.Key;
  private playerSpeed: number = 200;

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
      rows: 1,
      cols: 1,
      roomWidth: 200,
      roomHeight: 150
    };

    // Generate maze data using new method
    const mazeData: MazeData = this.mazeGenerator.generate(mazeConfig);

    this.rooms = mazeData.rooms;
    this.doors = mazeData.doors;
    this.keys = mazeData.keys;

    // DEBUG: Validate all the data
    this.validateGameData();

    // Set dark background
    this.cameras.main.setBackgroundColor('#2a2a2a');

    // Create visual elements
    this.createRooms();
    this.createDoors();
    this.createKeys();
    this.createPlayers();

    // Add title
    this.add.text(400, 20, 'Gorbagana Trash Finder - 2x2 Maze', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Add instructions
    this.add.text(400, 550, 'WASD to move | Collect keys to unlock doors | Reach center treasure!', {
      fontSize: '16px',
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

    // Validate keys are positioned correctly
    this.keys.forEach(key => {
      console.log(`Key ${key.id}: position (${key.position.x}, ${key.position.y}), collected: ${key.collected}, roomId: ${key.roomId}`);
    });

    // Validate doors
    this.doors.forEach(door => {
      console.log(`Door ${door.id}: type ${door.type}, isOpen: ${door.isOpen}, requiredKey: ${door.requiredKeyId}`);
    });
  }

  private debugGameState() {
    console.log('=== GAME STATE DEBUG ===');
    console.log('Key graphics created:', this.keyGraphics.size);
    console.log('Key sprites created:', this.keySprites.size);
    console.log('Collected keys:', this.collectedKeys.size);
    console.log('Player position:', this.player1?.x, this.player1?.y);
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

      const doorWidth = 40; // Standard door width for new system
      
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

  private setupControls() {
    // Create cursor keys (arrow keys)
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Create WASD keys
    this.wasdKeys = this.input.keyboard!.addKeys('W,S,A,D');

    // Add spacebar for key collection
    this.spacebar = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    console.log(this.spacebar)
    // DEBUG: Validate input setup
    console.log('Input setup complete:');
    console.log('- Cursors:', this.cursors);
    console.log('- WASD keys:', this.wasdKeys);
    console.log('- Keyboard manager:', this.input.keyboard);
  }

  update() {
    this.handlePlayerMovement();
    this.updateKeyInteraction();
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
    const doorWidth = 40; // Standard door width for new system
    
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

      const doorWidth = 40; // Standard door width for new system
      
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