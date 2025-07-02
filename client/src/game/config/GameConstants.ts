// Game Constants and Configuration
// Central place for all game balance and mechanics settings

export const GAME_CONFIG = {
  // Win Conditions
  KEYS_REQUIRED_FOR_TREASURE: 3,
  
  // Player Settings
  PLAYER_SPEED: 100,
  PLAYER_RADIUS: 15,
  
  // Interaction Distances
  KEY_INTERACTION_DISTANCE: 35,
  TREASURE_INTERACTION_DISTANCE: 40,
  OBJECT_INTERACTION_DISTANCE: 40,
  
  // Maze Settings
  DEFAULT_MAZE_SIZE: { rows: 3, cols: 3 },
  DEFAULT_ROOM_SIZE: { width: 200, height: 150 },
  
  // Lighting Settings
  FLASHLIGHT_RANGE: 80,
  FLASHLIGHT_CONE_ANGLE: Math.PI / 3, // 60 degrees
  
  // UI Settings
  KEY_COUNTER_FORMAT: 'Keys: {current}/{total}',
  
  // Animation Durations
  KEY_HIGHLIGHT_DURATION: 600,
  FEEDBACK_ANIMATION_DURATION: 2000
} as const;

// Game State Constants
export const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory'
} as const;

// Player IDs for single/multiplayer
export const PLAYER_IDS = {
  PLAYER_ONE: 'player1',
  PLAYER_TWO: 'player2'
} as const;