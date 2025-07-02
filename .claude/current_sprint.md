# Current Sprint - Gorbagana Trash Finder

## Sprint Rules
- **ONE TASK AT A TIME** - Focus on single task until completion
- **All active tasks MUST be listed in this file**
- **Update this file whenever starting/completing tasks**
- **Reference this file at the start of each session**

## Current Sprint Goal
**Sprint 3.2: Lighting System & Room Objects Implementation**

**FOCUS**: Add interactive room objects and dynamic lighting to enhance gameplay experience

## Active Tasks

### Step-by-Step Implementation Plan:

**Phase 1: Object System Foundation**
1. Create RoomObject interface and ObjectType enum in GameTypes.ts
2. Add object generation methods to MazeGenerator.ts  
3. Create basic furniture objects (desk, chair, trash_bin) rendering in MazeScene.ts
4. Implement grid-based object placement system (9x9 grid per room)

**Phase 2: Object Collision & Interaction**
5. Add object collision detection to player movement
6. Create wall-mounted objects (pictures, light_switch, whiteboard)

**Phase 3: Lighting System**
7. Add basic lighting system with room brightness states (bright/dim/dark)
8. Implement flashlight/vision cone for dark rooms
9. Create interactive light switch objects to control room lighting

**Phase 4: Advanced Features** 
10. Add internal wall objects for complex room layouts
11. Test and polish object system with multiple complexity levels

### Current Task: 
**Task 1** - Create RoomObject interface and ObjectType enum in GameTypes.ts

## Notes
- All previous work documented in `/docs/maze-design.md`
- Ready to begin next sprint based on user priorities