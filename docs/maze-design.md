# Maze Design & Layout System

## Overview
The game uses a grid-based maze system where players race from opposite sides to reach the center treasure room. Each player sees the maze from their perspective, creating a mirrored view experience.

## Layout Evolution

### Development Phases
1. **Phase 1**: 2x2 grid (4 rooms + center) - Current implementation
2. **Phase 2**: 3x3 grid (8 rooms + center) - Future expansion  
3. **Phase 3**: Full 3x3 grid (12 rooms + center) - Complete maze

### Phase 1: 2x2 Grid Layout (Current)

```
Player 1 View:                    Player 2 View:
🚪ME                              🚪OPPONENT
│                                 │
┌───────┬───────┐                ┌───────┬───────┐
│   1   ┃   2   │                │   2   ┃   1   │
│  🗝️   ┃       │                │       ┃  🗝️   │
├───────╋───────┤                ├───────╋───────┤
│   3   🚪 🗑️💎  │                │ 🗑️💎  🚪   3   │
│  🗝️   ┃   C   │                │   C   ┃  🗝️   │
└───────┻───────┘                └───────┻───────┘
    │                                 │
🚪OPPONENT                         🚪ME

Legend:
┃ ┻ ╋ = Open doors (always passable)
🚪 = Locked doors (require keys)
🗝️ = Keys to unlock doors
🗑️💎 = Treasure (center room)
```

**Room Specifications:**
- **Room Size**: 200x150px each
- **Canvas Size**: 800x600px (fits 2x2 layout)
- **Spawn Points**: 
  - Player 1: (-50, 225) - Left side
  - Player 2: (850, 225) - Right side
- **Center Room**: (400, 300) - Contains treasure
- **Keys**: 2 total (1 per side), need 1 key to unlock center

### Phase 3: Full 3x3 Grid Layout (Future)

```
Player 1 View:                    Player 2 View:
🚪ME                              🚪OPPONENT
│                                 │
┌───┬───┬─────┬───┬───┐          ┌───┬───┬─────┬───┬───┐
│ 1 │ 2 │     │ 3 │ 4 │  TOP     │ 4 │ 3 │     │ 2 │ 1 │
│🗝️ │   │     │   │🗝️ │          │🗝️ │   │     │   │🗝️ │
├───┼───┼─────┼───┼───┤          ├───┼───┼─────┼───┼───┤
│ 5 │ 6 │🗑️💎 │ 7 │ 8 │ MIDDLE   │ 8 │ 7 │🗑️💎 │ 6 │ 5 │
│   │🗝️ │  C  │🗝️ │   │          │   │🗝️ │  C  │🗝️ │   │
├───┼───┼─────┼───┼───┤          ├───┼───┼─────┼───┼───┤
│ 9 │10 │     │11 │12 │ BOTTOM   │12 │11 │     │10 │ 9 │
│🗝️ │   │     │   │🗝️ │          │🗝️ │   │     │   │🗝️ │
└───┴───┴─────┴───┴───┘          └───┴───┴─────┴───┴───┘
                │                                 │
            🚪OPPONENT                         🚪ME
```

## Mirror Perspective System

**Key Concept**: Both players see the same physical maze but from their own perspective.

**Implementation**:
- Single maze data structure
- Camera/viewport flips based on player ID
- Room numbering appears different to each player
- UI shows "Your side" vs "Opponent side"

## Door System

### Door Types
1. **Open Doors** (┃ ┻ ╋): Always passable between adjacent rooms
2. **Locked Doors** (🚪): Require specific keys to unlock  
3. **Spawn Doors** (🚪): Entry points from outside maze (always open)

### Door Mechanics
- **Visual Representation**: Door sprites at room boundaries
- **Collision Detection**: Blocks movement until unlocked
- **Key-Door Pairing**: Each key unlocks specific doors
- **State Synchronization**: Door states synced between all players
- **Visual Feedback**: Doors animate open/closed with sound effects

### Door Layout Strategy
- **Center Access**: Locked doors protect treasure room (requires keys)
- **Exploration Flow**: Open doors allow initial room exploration
- **Strategic Depth**: Players must find keys before accessing center

## Room Generation Logic

### Room Types
1. **Puzzle Rooms**: Contains obstacles, some have keys
2. **Treasure Room**: Center room with Gorbagana trash (locked access)
3. **Spawn Areas**: Entry points outside the maze
4. **Door Connections**: Doorways between adjacent rooms

### Key Distribution
- **Phase 1**: 2 keys total, need 1 to unlock center
- **Phase 3**: 6 keys total, need 3 to unlock center
- Keys distributed equally on both sides for fair gameplay

### Lighting System
- Rooms can randomly go dark (30% visibility)
- Creates dynamic difficulty
- Forces players to memorize layouts
- Adds strategic depth

## Room Transitions

**Smooth Movement**: Players move freely between connected rooms
**Collision Detection**: Invisible walls at room boundaries where no path exists
**Visual Feedback**: Room boundaries highlighted when approached
**State Sync**: Real-time position updates between players

## Technical Specifications

### Coordinate System
```typescript
interface RoomCoordinates {
  x: number;        // Top-left X position
  y: number;        // Top-left Y position
  width: number;    // Room width
  height: number;   // Room height
}

interface MazeConfig {
  gridSize: { rows: number, cols: number };
  roomSize: { width: number, height: number };
  doorWidth: number;
  canvasSize: { width: number, height: number };
}
```

### Door System Types
```typescript
interface Door {
  id: string;
  type: 'open' | 'locked' | 'spawn';
  position: { x: number, y: number };
  orientation: 'horizontal' | 'vertical';
  isOpen: boolean;
  requiredKeyId?: string;
  connectsRooms: [string, string];  // Room IDs this door connects
}

interface Key {
  id: string;
  position: { x: number, y: number };
  collected: boolean;
  roomId: string;
  unlocksDoorsIds: string[];  // Door IDs this key unlocks
}
```

### Room States
```typescript
interface RoomState {
  id: string;
  position: RoomCoordinates;
  isLit: boolean;
  hasKey: boolean;
  keyId?: string;
  playerOccupancy: string[];  // Player IDs in room
  doors: Door[];             // Doors connected to this room
  obstacles: Obstacle[];
}
```

## Game Flow

1. **Spawn**: Players enter from opposite sides
2. **Explore**: Navigate through maze rooms
3. **Collect**: Find keys to unlock center room
4. **Race**: First to reach center and claim treasure wins
5. **Dynamic**: Rooms go dark, changing optimal paths

## Advanced Design Discussions

### Player Movement & Collision Philosophy

**The Core Question**: How should players move through the maze?

**Option 1: Room-Based State System**
```typescript
player.currentRoom = "spawn" | "room1" | "room2" | "room3" | "center"
// Benefits: Clear game state, easy multiplayer sync, simple lighting system
// Movement: Teleport between rooms through doors
```

**Option 2: Smooth Coordinate Movement** (CHOSEN)
```typescript
player.x = 150, player.y = 125  // Free movement
player.currentRoom = detectRoomFromPosition(x, y)  // Background tracking
// Benefits: Natural movement, no teleportation, better game feel
// Implementation: Invisible room boundaries, door-based collision only
```

**Decision**: Hybrid approach - smooth X,Y movement with invisible room state tracking for game logic.

### Object Placement Strategy - Desperados-Inspired Grid System

**Inspiration**: Desperados tactical western game with rich environmental interaction.

**9x9 Grid System per Room**:
```
┌─┬─┬─┬─┬─┬─┬─┬─┬─┐
│W│W│W│W│D│W│W│W│W│ ← Row 0 (Walls + Door)
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│F│.│O│.│.│O│.│W│ ← Row 1 (Wall + Furniture/Objects)
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│.│.│.│.│.│.│W│ ← Row 2 (Open space)
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│O│.│K│.│.│.│O│W│ ← Row 3 (Objects + Key)
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│.│.│P│.│.│.│W│ ← Row 4 (Player space)
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│O│.│.│.│O│.│W│ ← Row 5 (More objects)
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│.│.│.│.│.│.│W│ ← Row 6 (Open space)
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│L│.│.│.│.│.│L│W│ ← Row 7 (Lights on walls)
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│W│W│W│D│W│W│W│W│ ← Row 8 (Walls + Door)
└─┴─┴─┴─┴─┴─┴─┴─┴─┘

Legend:
W = Wall        D = Door        . = Walkable
F = Furniture   O = Obstacle    K = Key
P = Player      L = Light       
```

**Object Categories by Zone**:
```typescript
// Wall decorations (Rows 0,8 / Cols 0,8)
wall_objects = ["lights", "pictures", "switches", "graffiti"]

// Room furniture/obstacles (Inner grid 1-7, 1-7)
room_objects = [
  "trash_cans",      // 🗑️ (theme-appropriate!)
  "old_computers",   // 💻 
  "broken_chairs",   // 🪑
  "cardboard_boxes", // 📦
  "filing_cabinets", // 🗄️
  "server_racks"     // 🗄️ (tech office theme)
]

// Interactive objects
interactive = [
  "keys",              // 🗝️ (collectible)
  "hidden_passages",   // 🕳️ (secret doors)
  "light_switches",    // 💡 (room lighting control)
  "computer_terminals" // 💻 (future: mini-games)
]
```

**Random Placement Strategy - "Layered Randomness"**:
```typescript
// Step 1: Pick zone type randomly
zones = ["near_entrance", "far_corner", "center", "side_wall", "furniture_cluster"]
chosen_zone = random_pick(zones)

// Step 2: Random position within zone constraints
zone_constraints = get_zone_grid_cells(chosen_zone)
exact_grid_cell = random_within(zone_constraints)

// Step 3: Ensure gameplay balance
if (is_reachable(exact_grid_cell) && !blocks_critical_path(exact_grid_cell)) {
  place_object(exact_grid_cell)
} else {
  fallback_to_safe_position()
}
```

**Desperados-Style Features for Future**:
1. **Line of Sight**: Objects block vision when lights are off
2. **Cover System**: Hide behind furniture from opponent
3. **Environmental Interaction**: Knock over objects to block paths  
4. **Stealth Elements**: Sneak around obstacles
5. **Multiple Solutions**: Different paths through each room
6. **Strategic Positioning**: Use furniture for tactical advantage

**Benefits of Grid System**:
- **Predictable but Random**: Objects always in sensible locations
- **Rich Environments**: Detailed, interactive rooms like Desperados
- **Scalable**: Easy to add more object types and interactions
- **Balanced Gameplay**: Ensures fair object distribution
- **Theme Coherent**: "Trashy office" aesthetic with appropriate objects

### Room State Tracking Benefits

**Why Track Player Room Location**:

1. **Lighting System** 🔦
   ```typescript
   if (player.currentRoom === "room2") { 
     turnOffLights("room2") 
     // Player can only see current room
   }
   ```

2. **Key Collection Logic** 🗝️
   ```typescript
   // Keys only collectible when in correct room
   if (player.currentRoom === key.roomId) {
     collectKey(key)
   }
   ```

3. **Multiplayer Sync** 👥
   ```typescript
   // Send "Player2 entered room1" instead of constant X,Y coordinates
   socket.emit('player_room_change', { playerId, newRoom: 'room1' })
   ```

4. **Advanced Features** 🎮
   - Room-specific challenges and puzzles
   - Strategic gameplay (blocking opponent access)
   - Performance optimization (only check interactions in current room)
   - Easy debugging ("Player stuck in room2" vs coordinates)

**Implementation**: Invisible boundary detection that updates `player.currentRoom` as they move, enabling rich game mechanics without affecting movement feel.

### Advanced Object System - Internal Room Walls & Complex Layouts

**Evolution from Simple Objects to Maze-within-Maze**

Building on the 9x9 grid system, we can create **internal room complexity** that transforms simple rectangular rooms into mini-mazes:

#### **Wall Objects for Decoration**
```typescript
// Wall-mounted objects (perimeter placement)
wall_objects = {
  pictures: ["motivational_poster", "company_photo", "abstract_art"],
  utilities: ["light_switch", "electrical_panel", "whiteboard"],
  storage: ["wall_shelves", "coat_hooks", "fire_extinguisher"]
}

// Placement strategy: Along grid edges (0,x), (8,x), (x,0), (x,8)
placement_zones = ["north_wall", "south_wall", "east_wall", "west_wall"]
```

#### **Internal Room Walls - Creating Mini-Mazes**
```
Example: Room with Internal Wall System
┌─┬─┬─┬─┬─┬─┬─┬─┬─┐
│W│W│W│W│D│W│W│W│W│ ← Perimeter walls
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│.│P│.│.│.│.│W│ ← Open area
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│■│■│d│■│■│.│W│ ← Internal wall with door
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│■│.│.│.│■│.│W│ ← Wall segments
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│■│.│K│.│■│.│W│ ← Key in sub-area
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│■│■│■│■│■│.│W│ ← Solid internal wall
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│.│.│.│.│.│.│W│ ← Open area
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│.│.│.│.│.│.│.│W│
├─┼─┼─┼─┼─┼─┼─┼─┼─┤
│W│W│W│W│D│W│W│W│W│

Legend:
■ = Internal wall segment    d = Internal door
P = Pictures on walls        K = Key in sub-room
```

#### **Implementation Strategy**

**1. Object Types Enhancement**:
```typescript
enum ObjectType {
  // Wall decorations
  PICTURE = "picture",
  LIGHT_SWITCH = "light_switch", 
  WHITEBOARD = "whiteboard",
  
  // Furniture objects  
  DESK = "desk",
  TRASH_BIN = "trash_bin",
  CHAIR = "chair",
  
  // Internal walls (NEW!)
  WALL_SEGMENT = "wall_segment",
  INTERNAL_DOOR = "internal_door"
}

interface RoomObject {
  type: ObjectType;
  gridPosition: { row: number, col: number };
  size: { width: number, height: number }; // in grid cells
  collision: boolean;
  interactive: boolean;
}
```

**2. Room Complexity Levels**:
```typescript
enum RoomComplexity {
  SIMPLE,    // Just furniture objects
  MEDIUM,    // Add some internal wall segments  
  COMPLEX,   // Full internal maze with multiple sub-areas
  BOSS       // Complex + special challenges
}

// Generation logic
function generateRoomObjects(room: RoomState, complexity: RoomComplexity) {
  const objects: RoomObject[] = [];
  
  // Always add wall decorations
  objects.push(...generateWallDecorations(room));
  
  switch(complexity) {
    case SIMPLE:
      objects.push(...generateBasicFurniture(room));
      break;
    case MEDIUM:
      objects.push(...generateBasicFurniture(room));
      objects.push(...generateSimpleInternalWalls(room));
      break;
    case COMPLEX:
      objects.push(...generateInternalMaze(room));
      break;
  }
  
  return objects;
}
```

**3. Internal Wall System**:
```typescript
// Create L-shaped internal walls
function generateSimpleInternalWalls(room: RoomState): RoomObject[] {
  return [
    // Horizontal wall segment
    { type: WALL_SEGMENT, gridPosition: {row: 3, col: 2}, size: {width: 4, height: 1}, collision: true },
    // Vertical wall segment  
    { type: WALL_SEGMENT, gridPosition: {row: 3, col: 6}, size: {width: 1, height: 3}, collision: true },
    // Internal door in the wall
    { type: INTERNAL_DOOR, gridPosition: {row: 3, col: 4}, size: {width: 1, height: 1}, collision: false }
  ];
}

// Create complex internal maze
function generateInternalMaze(room: RoomState): RoomObject[] {
  // Create cross-shaped or T-shaped internal walls
  // Multiple sub-areas with connecting doors
  // Force players to navigate internal complexity
}
```

#### **Gameplay Benefits**

**Difficulty Scaling**: 
- Early rooms: Simple furniture layout
- Mid-game rooms: Some internal walls to navigate around
- Late rooms: Complex internal mazes requiring exploration

**Strategic Depth**:
- Players must explore sub-areas within rooms to find keys
- Multiple paths through the same room
- Hide-and-seek gameplay when opponent is in same room

**Visual Richness**:
- Pictures and decorations make rooms feel lived-in
- Internal walls create architectural variety
- Each room feels unique and memorable

#### **Perfect Integration with Existing Systems**

✅ **Uses same 9x9 grid system** - no new coordinate logic needed  
✅ **Reuses collision detection** - walls are just objects with collision=true  
✅ **Extends door system** - internal doors work like room doors  
✅ **Leverages object placement** - walls are placed like furniture objects  
✅ **Maintains performance** - all calculated once during room generation  

This approach transforms the simple "4 walls and some furniture" rooms into **genuinely challenging mini-mazes** while using the exact same underlying systems we already have built.

## Expansion Possibilities

- **Procedural Generation**: Random maze layouts using grid system
- **Power-ups**: Special abilities in certain rooms
- **Obstacles**: Moving barriers, puzzles using object grid
- **Multiple Floors**: Vertical maze expansion
- **Team Mode**: 2v2 collaborative gameplay
- **Environmental Storytelling**: Rich office environments with narrative elements