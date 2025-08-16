// Import React hooks for managing component state and lifecycle
import { useEffect, useRef, useState } from 'react';
// Import Phaser.js - a powerful 2D game framework for HTML5
import Phaser from 'phaser';
// Import UI components for the game interface
import { Button } from './ui/button';
import { Card } from './ui/card';

// Interface to define the structure of data shared between React and Phaser
interface GameData {
  score: number;        // Current player score
  gameOver: boolean;    // Whether the game has ended
  restart: () => void;  // Function to restart the game
}

/**
 * GameScene class extends Phaser.Scene - this is where all our game logic lives
 * In Phaser, a Scene is like a "screen" or "level" in your game
 * This scene handles the main gameplay: plate movement, apple spawning, collision detection
 */
class GameScene extends Phaser.Scene {
  // Game objects - these are the visual elements in our game
  private plate?: Phaser.Physics.Arcade.Sprite;    // The player-controlled plate at the bottom
  private apples?: Phaser.Physics.Arcade.Group;    // A group that holds all falling apples
  
  // Input handling - Phaser's way of detecting key presses
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;  // Arrow keys for plate movement
  
  // Game state variables
  private score = 0;                  // Current player score
  private gameOver = false;           // Is the game currently over?
  private gameData?: GameData;        // Reference to data shared with React component
  
  // Timing variables for apple spawning
  private lastAppleTime = 0;          // When was the last apple created?
  private appleInterval = 1500;       // How long to wait between apples (in milliseconds)

  /**
   * Constructor - sets up the scene with a unique key
   * The key 'GameScene' is used to identify this scene in Phaser's scene manager
   */
  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * init() - Called when the scene starts
   * This method receives data passed from React and initializes the game state
   * @param data - GameData object shared between React and Phaser
   */
  init(data: GameData) {
    this.gameData = data;        // Store reference to shared data
    this.score = 0;              // Reset score to 0
    this.gameOver = false;       // Game starts in active state
    this.lastAppleTime = 0;      // Reset apple spawning timer
  }

  /**
   * preload() - Called before create(), used to load game assets
   * In a real game, you'd load images, sounds, etc. here
   * We're using tiny 1x1 pixel images (base64 encoded) as placeholders
   * These will be colored using tint to create our plate and apples
   */
  preload() {
    // Load a tiny transparent image that we'll color later
    // This creates both 'plate' and 'apple' image assets
    this.load.image('plate', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    this.load.image('apple', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  }

  /**
   * create() - Called after preload(), this is where we set up our game world
   * This method creates all game objects, sets up physics, input, and collisions
   */
  create() {
    // Create the player's plate at the bottom of the screen
    // this.physics.add.sprite() creates a sprite with physics enabled
    this.plate = this.physics.add.sprite(400, 550, 'plate');  // x=400 (center), y=550 (near bottom)
    this.plate.setDisplaySize(100, 20);                       // Make it 100px wide, 20px tall
    this.plate.setTint(0xF4A460);                            // Color it sandy brown (hex color)
    this.plate.setCollideWorldBounds(true);                  // Prevent it from moving off-screen
    this.plate.body!.immovable = true;                       // Other objects bounce off it, but it doesn't move

    // Create a group to hold all our apples
    // Groups in Phaser are collections of similar objects for easy management
    this.apples = this.physics.add.group();

    // Set up keyboard input - this creates an object with left/right/up/down arrow key states
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Set up collision detection between the plate and apples
    // When they overlap, call the catchApple method
    this.physics.add.overlap(this.plate, this.apples, this.catchApple, undefined, this);

    // Initialize the game state data
    this.updateGameState();
  }

  /**
   * update() - The game loop! Called every frame (60 times per second)
   * This is where all the real-time game logic happens
   * @param time - Current timestamp in milliseconds since the game started
   */
  update(time: number) {
    // If the game is over, stop processing
    if (this.gameOver) return;

    // Handle plate movement based on arrow key input
    // setVelocityX() sets the horizontal speed in pixels per second
    if (this.cursors!.left.isDown) {
      this.plate!.setVelocityX(-300);  // Move left at 300 pixels/second
    } else if (this.cursors!.right.isDown) {
      this.plate!.setVelocityX(300);   // Move right at 300 pixels/second
    } else {
      this.plate!.setVelocityX(0);     // Stop moving if no keys are pressed
    }

    // Apple spawning logic - create new apples at intervals
    // time is the current game time, we compare it with when we last spawned an apple
    if (time - this.lastAppleTime > this.appleInterval) {
      this.spawnApple();                // Create a new apple
      this.lastAppleTime = time;        // Remember when we created this apple
      
      // Progressive difficulty - make apples spawn faster as the game continues
      // But don't go faster than every 500ms (0.5 seconds)
      if (this.appleInterval > 500) {
        this.appleInterval -= 10;       // Reduce interval by 10ms each time
      }
    }

    // Check if any apples have fallen off the bottom of the screen
    // If so, the player missed it and the game ends
    this.apples!.children.entries.forEach((apple) => {
      const appleSprite = apple as Phaser.Physics.Arcade.Sprite;
      if (appleSprite.y > 600) {        // 600 is the bottom of our game world
        this.endGame();                 // End the game immediately
      }
    });
  }

  /**
   * spawnApple() - Creates a new falling apple at a random horizontal position
   * This method is called from the update loop at timed intervals
   */
  private spawnApple() {
    // Choose a random x position between 50 and 750 (within screen bounds with padding)
    const x = Phaser.Math.Between(50, 750);
    
    // Create a new apple sprite above the screen (y = -50, so it falls into view)
    const apple = this.physics.add.sprite(x, -50, 'apple');
    apple.setDisplaySize(30, 30);                          // Make apple 30x30 pixels
    apple.setTint(0xFF0000);                              // Color it red (hex color)
    
    // Set downward velocity - gets faster as score increases for progressive difficulty
    apple.setVelocityY(150 + this.score * 2);             // Base speed 150 + (score * 2)
    
    // Add the apple to our apples group for collision detection and management
    this.apples!.add(apple);
  }

  /**
   * catchApple() - Called when the plate and an apple overlap (collision detected)
   * This is the success condition - player caught an apple!
   * @param plate - The plate sprite (automatically passed by Phaser's collision system)
   * @param apple - The apple sprite that was caught (automatically passed by Phaser)
   */
  private catchApple(plate: any, apple: any) {
    apple.destroy();                    // Remove the caught apple from the game
    this.score += 1;                    // Increase the player's score
    this.updateGameState();             // Sync the score with React component
    
    // Add a visual feedback effect - make the plate briefly "bounce" up
    // This is a tween (smooth animation) that makes the game feel more responsive
    this.tweens.add({
      targets: this.plate,              // Animate the plate
      scaleY: 1.2,                     // Scale it up to 120% height
      duration: 100,                   // Animation lasts 100 milliseconds
      yoyo: true,                      // Reverse the animation (scale back down)
      ease: 'Power2'                   // Use smooth easing for natural feel
    });
  }

  /**
   * endGame() - Called when the player misses an apple (it falls off screen)
   * This stops all game activity and triggers the game over state
   */
  private endGame() {
    this.gameOver = true;           // Mark the game as over
    this.physics.pause();           // Stop all physics (movement, collisions)
    this.updateGameState();         // Sync game over state with React
  }

  /**
   * updateGameState() - Syncs the Phaser game state with React component state
   * This allows the React UI to display current score and game status
   */
  private updateGameState() {
    if (this.gameData) {
      this.gameData.score = this.score;           // Update score in shared data
      this.gameData.gameOver = this.gameOver;     // Update game over status
    }
  }

  /**
   * restart() - Resets the game to its initial state for a new game
   * This method is called when the player clicks "Play Again"
   */
  restart() {
    // Reset all game variables to starting values
    this.score = 0;                   // Reset score to 0
    this.gameOver = false;            // Game is active again
    this.lastAppleTime = 0;           // Reset apple spawning timer
    this.appleInterval = 1500;        // Reset apple spawn rate to initial speed
    
    // Clean up the game world
    this.apples!.clear(true, true);   // Remove all existing apples from screen
    
    // Reset the player's plate to starting position and stop any movement
    this.plate!.setPosition(400, 550);   // Center plate at bottom
    this.plate!.setVelocity(0, 0);       // Stop any existing movement
    
    // Restart the physics system (which was paused during game over)
    this.physics.resume();
    
    // Sync the new state with React
    this.updateGameState();
  }
}

/**
 * AppleCatcherGame - The main React component that hosts the Phaser game
 * This component creates the bridge between React and Phaser, handling:
 * - Creating the Phaser game instance
 * - Managing React state that mirrors the game state
 * - Rendering the UI overlay (score, controls, game over modal)
 */
export default function AppleCatcherGame() {
  // React refs - these allow us to directly reference DOM elements and objects
  const gameRef = useRef<HTMLDivElement>(null);        // Reference to the div where Phaser renders
  const phaserGameRef = useRef<Phaser.Game | null>(null);  // Reference to the Phaser game instance
  const sceneRef = useRef<GameScene | null>(null);     // Reference to our custom GameScene
  
  // React state - these trigger re-renders when they change
  const [score, setScore] = useState(0);               // Current score (mirrors Phaser state)
  const [gameOver, setGameOver] = useState(false);     // Is game over? (mirrors Phaser state)
  const [gameStarted, setGameStarted] = useState(false); // Has the player started the game?

  // Function to start the game - called when start button is clicked
  const startGame = () => {
    setGameStarted(true);         // Mark game as started
    setScore(0);                  // Reset score
    setGameOver(false);           // Reset game over status
    
    // Start the Phaser scene with our shared data
    if (phaserGameRef.current && sceneRef.current) {
      sceneRef.current.restart();  // Reset the game state in Phaser
    }
  };

  // Shared data object - this is passed to Phaser so both sides can communicate
  const gameData: GameData = {
    score,                    // Current score
    gameOver,                 // Current game over state
    restart: () => {          // Function that both React and Phaser can call to restart
      sceneRef.current?.restart();   // Tell Phaser to restart the game
      setScore(0);                   // Reset React state
      setGameOver(false);            // Reset React state
      setGameStarted(true);          // Keep game in started state for restart
    }
  };

  // useEffect - runs once when component mounts, sets up the Phaser game
  useEffect(() => {
    // Only create the game if we have a container div and haven't created it yet
    if (gameRef.current && !phaserGameRef.current && gameStarted) {
      // Phaser game configuration object
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,              // Let Phaser choose WebGL or Canvas automatically
        width: 800,                     // Game world width in pixels
        height: 600,                    // Game world height in pixels
        parent: gameRef.current,        // HTML element to render the game inside
        backgroundColor: '#87CEEB',     // Sky blue background color
        physics: {
          default: 'arcade',            // Use Phaser's simple arcade physics system
          arcade: {
            gravity: { x: 0, y: 0 },    // No global gravity (we handle apple falling manually)
            debug: false                // Don't show physics debugging visuals
          }
        },
        scene: GameScene                // Use our custom GameScene class
      };

      // Create the Phaser game instance
      phaserGameRef.current = new Phaser.Game(config);
      
      // Get a reference to our scene so we can call methods on it
      sceneRef.current = phaserGameRef.current.scene.getScene('GameScene') as GameScene;
      
      // Start the scene and pass our shared data object to it
      phaserGameRef.current.scene.start('GameScene', gameData);

      // Set up polling to sync Phaser state with React state
      // This runs every 100ms to keep React UI updated with game state
      const interval = setInterval(() => {
        if (sceneRef.current) {
          setScore(gameData.score);         // Update React score state
          setGameOver(gameData.gameOver);   // Update React game over state
        }
      }, 100);

      // Cleanup function - runs when component unmounts
      return () => {
        clearInterval(interval);              // Stop the polling
        if (phaserGameRef.current) {
          phaserGameRef.current.destroy(true);  // Destroy Phaser game instance
          phaserGameRef.current = null;         // Clear the reference
        }
      };
    }
  }, [gameStarted]); // Runs when gameStarted changes

  // JSX Return - The UI that React renders
  return (
    <div className="game-container">
      {/* Start Screen - only shows when game hasn't started yet */}
      {!gameStarted && !gameOver && (
        <div className="game-over-modal">
          <Card className="p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">🍎</div>
              <h2 className="text-3xl font-bold text-primary mb-2">Apple Catcher</h2>
              <p className="text-muted-foreground">
                Catch falling apples with your plate!<br />
                Use arrow keys to move left and right.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Start button - begins the game */}
              <Button 
                onClick={startGame} 
                size="lg" 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300"
              >
                Start Game 🎮
              </Button>
              
              <div className="text-xs text-muted-foreground">
                <p>💡 Don't let any apples hit the ground!</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Game UI - only shows when game has started */}
      {gameStarted && (
        <>
          {/* Top UI bar with score and controls info */}
          <div className="game-ui">
            {/* Score display card */}
            <Card className="score-display">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍎</span>
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold text-primary">{score}</p>
                </div>
              </div>
            </Card>
            
            {/* Controls instruction card */}
            <Card className="score-display">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Controls</p>
                <p className="text-xs">← → Arrow Keys</p>
              </div>
            </Card>
          </div>

          {/* This div is where Phaser renders the actual game */}
          <div ref={gameRef} className="rounded-lg overflow-hidden shadow-2xl border-4 border-white/20" />
        </>
      )}

      {/* Game Over Modal - only shows when gameOver is true */}
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
              {/* Restart button - calls the restart function in gameData */}
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