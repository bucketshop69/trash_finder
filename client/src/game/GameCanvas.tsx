import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const GameCanvas = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      // Phaser game configuration
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 1200,
        height: 800,
        parent: gameRef.current,
        backgroundColor: '#1a4a2e',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 }, // No gravity for top-down maze game
            debug: false
          }
        },
        scene: [GameScene],
        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.NO_CENTER
        }
      };

      // Create Phaser game instance
      phaserGameRef.current = new Phaser.Game(config);
      console.log('Phaser game initialized');
    }

    // Cleanup function
    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
        console.log('Phaser game destroyed');
      }
    };
  }, []);

  return (
    <div className="game-container">
      <div ref={gameRef} className="game-canvas" />
    </div>
  );
};

export default GameCanvas;