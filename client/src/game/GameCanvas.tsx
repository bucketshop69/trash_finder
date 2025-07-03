import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MazeScene } from './scenes/MazeScene';

const GameCanvas = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      // Phaser game configuration for 2x2 maze
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameRef.current,
        backgroundColor: '#2a2a2a',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 }, // No gravity for top-down maze game
            debug: false
          }
        },
        scene: [MazeScene],
        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.NO_CENTER
        }
      };

      // Create Phaser game instance
      phaserGameRef.current = new Phaser.Game(config);
      
      // Expose scene globally for App component access
      setTimeout(() => {
        const scene = phaserGameRef.current?.scene.getScene('MazeScene') as MazeScene;
        if (scene) {
          (window as any).gameScene = scene;
          console.log('🌐 Game scene exposed globally');
        }
      }, 100);
      
      console.log('Phaser 2x2 maze game initialized');
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