# Refactoring Plan: Dynamic Maze Generation

This document outlines the plan to refactor the maze generation system from a hardcoded implementation to a dynamic, data-driven one.

**Goal:** Decouple the maze's data generation logic from its visual representation in Phaser. This will make the system scalable, easier to test, and faster to add new features to.

---

### Phase 1: Make `MazeGenerator.ts` a Pure Data Factory

The `MazeGenerator.ts` file will be modified to be a "pure" data generator. It will no longer have any knowledge of Phaser and will simply transform a configuration object into a data structure representing the maze.

**Tasks:**
1.  **Create a `generate` method:** This will be the main public method. It will accept a `MazeConfig` object as an argument.
2.  **Implement Loop-Based Generation:** The method will use `for` loops based on the `rows` and `cols` in the config to create the grid of rooms.
3.  **Calculate Positions Dynamically:** Room and door positions will be calculated using math (`col * roomWidth`, `row * roomHeight`) instead of being hardcoded.
4.  **Return Pure Data:** The `generate` method will return a single `MazeData` object containing arrays of `rooms`, `doors`, and `keys`.

---

### Phase 2: Update `MazeScene.ts` to Be a Data Consumer

The `MazeScene.ts` file will be updated to use the new `MazeGenerator`. It will be responsible for taking the data and rendering it on the screen.

**Tasks:**
1.  **Define a `MazeConfig`:** In the `create()` method, we will define the configuration for the maze we want to build (e.g., 2x2 grid).
2.  **Instantiate and Call the Generator:** We will create a new `MazeGenerator` instance and call its `generate(config)` method to get the maze data.
3.  **Use the Returned Data:** The scene will store the returned `rooms`, `doors`, and `keys` in its own properties.
4.  **Render from Data:** The existing `createRooms()`, `createDoors()`, and `createKeys()` methods will continue to work as they already loop through these arrays. No major changes should be needed in those rendering methods.

---

### Phase 3: Create Shared Type Definitions

To ensure type safety and a clear contract between the generator and the scene, we will add new interfaces to `shared/types/GameTypes.ts`.

**Tasks:**
1.  **Define `MazeConfig` interface:** This will define the shape of the configuration object that the `MazeGenerator` expects.
    ```typescript
    export interface MazeConfig {
      rows: number;
      cols: number;
      roomWidth: number;
      roomHeight: number;
    }
    ```
2.  **Define `MazeData` interface:** This will define the shape of the data object that the `MazeGenerator` returns.
    ```typescript
    export interface MazeData {
      rooms: RoomState[];
      doors: Door[];
      keys: Key[];
      // spawnPoints, etc.
    }
    ```

---

By following this plan, we will have a robust and scalable foundation ready for adding new features like more objects, lighting, and larger, more complex mazes.
