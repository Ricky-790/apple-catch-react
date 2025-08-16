import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface GameData {
  score: number;
  gameOver: boolean;
  restart: () => void;
}

class GameScene extends Phaser.Scene {
  private plate?: Phaser.Physics.Arcade.Sprite;
  private apples?: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private score = 0;
  private gameOver = false;
  private gameData?: GameData;
  private lastAppleTime = 0;
  private appleInterval = 1500; // Start with 1.5 seconds between apples

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameData) {
    this.gameData = data;
    this.score = 0;
    this.gameOver = false;
    this.lastAppleTime = 0;
  }

  preload() {
    // Create simple colored rectangles for our game objects
    this.load.image('plate', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    this.load.image('apple', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  }

  create() {
    // Create the plate at the bottom
    this.plate = this.physics.add.sprite(400, 550, 'plate');
    this.plate.setDisplaySize(100, 20);
    this.plate.setTint(0xF4A460); // Sandy brown color for the plate
    this.plate.setCollideWorldBounds(true);
    this.plate.body!.immovable = true;

    // Create apples group
    this.apples = this.physics.add.group();

    // Setup keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Collision detection between plate and apples
    this.physics.add.overlap(this.plate, this.apples, this.catchApple, undefined, this);

    // Update the game data
    this.updateGameState();
  }

  update(time: number) {
    if (this.gameOver) return;

    // Handle plate movement
    if (this.cursors!.left.isDown) {
      this.plate!.setVelocityX(-300);
    } else if (this.cursors!.right.isDown) {
      this.plate!.setVelocityX(300);
    } else {
      this.plate!.setVelocityX(0);
    }

    // Spawn apples
    if (time - this.lastAppleTime > this.appleInterval) {
      this.spawnApple();
      this.lastAppleTime = time;
      
      // Gradually increase difficulty
      if (this.appleInterval > 500) {
        this.appleInterval -= 10;
      }
    }

    // Check for apples that fell off screen
    this.apples!.children.entries.forEach((apple) => {
      const appleSprite = apple as Phaser.Physics.Arcade.Sprite;
      if (appleSprite.y > 600) {
        this.endGame();
      }
    });
  }

  private spawnApple() {
    const x = Phaser.Math.Between(50, 750);
    const apple = this.physics.add.sprite(x, -50, 'apple');
    apple.setDisplaySize(30, 30);
    apple.setTint(0xFF0000); // Red color for apples
    apple.setVelocityY(150 + this.score * 2); // Increase speed with score
    this.apples!.add(apple);
  }

  private catchApple(plate: any, apple: any) {
    apple.destroy();
    this.score += 1;
    this.updateGameState();
    
    // Add a little bounce effect to the plate
    this.tweens.add({
      targets: this.plate,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
  }

  private endGame() {
    this.gameOver = true;
    this.physics.pause();
    this.updateGameState();
  }

  private updateGameState() {
    if (this.gameData) {
      this.gameData.score = this.score;
      this.gameData.gameOver = this.gameOver;
    }
  }

  restart() {
    this.score = 0;
    this.gameOver = false;
    this.lastAppleTime = 0;
    this.appleInterval = 1500;
    
    // Clear all apples
    this.apples!.clear(true, true);
    
    // Reset plate position
    this.plate!.setPosition(400, 550);
    this.plate!.setVelocity(0, 0);
    
    // Resume physics
    this.physics.resume();
    
    this.updateGameState();
  }
}

export default function AppleCatcherGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const sceneRef = useRef<GameScene | null>(null);

  const gameData: GameData = {
    score,
    gameOver,
    restart: () => {
      sceneRef.current?.restart();
      setScore(0);
      setGameOver(false);
    }
  };

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameRef.current,
        backgroundColor: '#87CEEB',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
          }
        },
        scene: GameScene
      };

      phaserGameRef.current = new Phaser.Game(config);
      sceneRef.current = phaserGameRef.current.scene.getScene('GameScene') as GameScene;
      
      // Pass game data to scene
      phaserGameRef.current.scene.start('GameScene', gameData);

      // Setup game state polling
      const interval = setInterval(() => {
        if (sceneRef.current) {
          setScore(gameData.score);
          setGameOver(gameData.gameOver);
        }
      }, 100);

      return () => {
        clearInterval(interval);
        if (phaserGameRef.current) {
          phaserGameRef.current.destroy(true);
          phaserGameRef.current = null;
        }
      };
    }
  }, []);

  return (
    <div className="game-container">
      <div className="game-ui">
        <Card className="score-display">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍎</span>
            <div>
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-bold text-primary">{score}</p>
            </div>
          </div>
        </Card>
        
        <Card className="score-display">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Controls</p>
            <p className="text-xs">← → Arrow Keys</p>
          </div>
        </Card>
      </div>

      <div ref={gameRef} className="rounded-lg overflow-hidden shadow-2xl border-4 border-white/20" />

      {gameOver && (
        <div className="game-over-modal">
          <Card className="p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">🍎</div>
              <h2 className="text-3xl font-bold text-primary mb-2">Game Over!</h2>
              <p className="text-muted-foreground">
                You caught <span className="font-bold text-primary">{score}</span> apple{score !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={gameData.restart} 
                size="lg" 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300"
              >
                Play Again 🎮
              </Button>
              
              <div className="text-xs text-muted-foreground">
                <p>💡 Tip: The game gets faster as your score increases!</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}