# Current Sprint - Gorbagana Trash Finder

## Sprint Rules
- **ONE TASK AT A TIME** - Focus on single task until completion
- **All active tasks MUST be listed in this file**
- **Update this file whenever starting/completing tasks**
- **Reference this file at the start of each session**

## Current Sprint Goal
**Sprint 3.3: Win Conditions - ACTIVE**

**FOCUS**: Complete the core gameplay loop with treasure collection and victory mechanics

## Sprint 3.3 Implementation Plan

### Win Conditions Design
- **Key Requirement**: 3 keys required to claim treasure
- **Testing Mode**: Single-player only (for now)
- **Key Placement**: Keep current key locations (strategic placement in dedicated sprint later)
- **Treasure Interaction**: Player must press SPACE near treasure to claim
- **Key Requirement Display**: Show "Need 3 keys" near treasure
- **UI Display**: Show player's current key count: "Keys: X/3"

### Victory System
- **Victory Screen**: Simple overlay "Player One Won!" 
- **Game End**: Show victory overlay with back button to lobby
- **No Hand-holding**: Players discover key requirements through gameplay

## MICRO TASKS - Sprint 3.3

### Phase 1: Treasure System
- [x] **Task 1.1**: Add treasure object to GameTypes.ts (interface Treasure)
- [x] **Task 1.2**: Create treasure spawning in center room (MazeGenerator)
- [x] **Task 1.3**: Add treasure graphics/visual in center room (MazeScene)
- [x] **Task 1.4**: Implement treasure interaction detection (player near treasure)
- [x] **Task 1.5**: ~~Add "Need 3 keys" text display near treasure~~ (REMOVED - no text needed)

### Phase 2: Key Requirements
- [x] **Task 2.1**: Add key requirement constant (KEYS_REQUIRED = 3)
- [x] **Task 2.2**: Implement treasure claim validation (check player has 3 keys)
- [x] **Task 2.3**: Add SPACE key interaction for treasure claiming
- [x] **Task 2.4**: Handle insufficient keys case (show feedback/do nothing)

### Phase 3: Victory System
- [x] **Task 3.1**: Add game state tracking (isGameEnded, winnerId)
- [x] **Task 3.2**: Implement win condition trigger (successful treasure claim)
- [x] **Task 3.3**: Create victory overlay UI component
- [x] **Task 3.4**: Add "Player One Won!" victory message
- [x] **Task 3.5**: Add back to lobby button functionality

### Phase 4: UI Updates
- [x] **Task 4.1**: Update key counter display to show "Keys: X/3" format
- [x] **Task 4.2**: Add treasure interaction prompt ("Press SPACE to claim")
- [x] **Task 4.3**: Test all UI elements display correctly

### Phase 5: Testing & Polish
- [x] **Task 5.1**: Test complete flow: spawn → collect 3 keys → claim treasure → win
- [x] **Task 5.2**: Test edge cases (not enough keys, multiple interactions)
- [x] **Task 5.3**: Verify victory screen and lobby return works
- [x] **Task 5.4**: Final gameplay testing and bug fixes

## Current Status
**SPRINT 3.3 COMPLETE!** 🎉 All win conditions implemented and tested successfully!

