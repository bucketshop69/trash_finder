import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load assets here later
    console.log('GameScene: preload');
  }

  create() {
    // Set background color to dark green (trash/maze theme)
    this.cameras.main.setBackgroundColor('#1a4a2e');
    
    // Add some basic text for testing
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    
    this.add.text(centerX, centerY, 'Gorbagana Trash Finder', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    this.add.text(centerX, centerY + 50, 'Game Canvas Ready!', {
      fontSize: '16px',
      color: '#cccccc',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    console.log('GameScene: created');
  }

  update() {
    // Game loop - will add player movement, collision detection, etc.
  }
}