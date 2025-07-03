import { Server, Socket } from 'socket.io';
import { GameRoom } from '../game/GameRoom';

export class SocketHandler {
  private io: Server;
  private gameRooms: Map<string, GameRoom> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🎮 Player connected: ${socket.id}`);

      // Send welcome message
      socket.emit('welcome', {
        message: 'Connected to Gorbagana Game Server',
        playerId: socket.id,
        timestamp: new Date().toISOString()
      });

      // Handle player joining queue
      socket.on('join_queue', (data) => {
        this.handleJoinQueue(socket, data);
      });

      // Handle player leaving queue
      socket.on('leave_queue', () => {
        this.handleLeaveQueue(socket);
      });

      socket.on('join_room', (data) => {
        this.handleJoinRoom(socket, data);
      });

      // Handle game actions
      socket.on('player_move', (data) => {
        this.handlePlayerMove(socket, data);
      });

      socket.on('collect_key', (data) => {
        this.handleCollectKey(socket, data);
      });

      socket.on('claim_treasure', (data) => {
        this.handleClaimTreasure(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`👋 Player disconnected: ${socket.id}`);
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinQueue(socket: Socket, data: any) {
    console.log(`🔍 Player ${socket.id} joining queue:`, data);
    
    // Find available room or create new one
    let availableRoom = this.findAvailableRoom();
    
    if (!availableRoom) {
      // Create new room
      const roomId = `room_${Date.now()}`;
      availableRoom = new GameRoom(roomId, this.io);
      this.gameRooms.set(roomId, availableRoom);
      console.log(`🏠 Created new room: ${roomId}`);
    }

    // Add player to room
    const joined = availableRoom.addPlayer(socket.id, data.walletAddress);
    
    if (joined) {
      socket.join(availableRoom.id);
      socket.emit('room_joined', {
        roomId: availableRoom.id,
        playerCount: availableRoom.getPlayerCount()
      });

      // If room is full, start game
      if (availableRoom.isFull()) {
        availableRoom.startGame();
      }
    } else {
      socket.emit('queue_error', { message: 'Failed to join room' });
    }
  }

  private handleJoinRoom(socket: Socket, data: any) {
    console.log(`🚪 Player ${socket.id} joining room ${data.roomId}:`, data);
    const room = this.gameRooms.get(data.roomId);

    if (room && !room.isFull()) {
      const joined = room.addPlayer(socket.id, data.walletAddress);
      if (joined) {
        socket.join(room.id);
        socket.emit('room_joined', {
          roomId: room.id,
          playerCount: room.getPlayerCount()
        });

        if (room.isFull()) {
          room.startGame();
        }
      } else {
        socket.emit('queue_error', { message: 'Failed to join room' });
      }
    } else {
      socket.emit('queue_error', { message: 'Room not found or is full' });
    }
  }

  private handleLeaveQueue(socket: Socket) {
    console.log(`🚪 Player ${socket.id} leaving queue`);
    
    // Remove player from any room they're in
    this.gameRooms.forEach((room, roomId) => {
      if (room.hasPlayer(socket.id)) {
        room.removePlayer(socket.id);
        socket.leave(roomId);
        
        // Clean up empty rooms
        if (room.isEmpty()) {
          this.gameRooms.delete(roomId);
          console.log(`🗑️ Removed empty room: ${roomId}`);
        }
      }
    });
  }

  private handlePlayerMove(socket: Socket, data: any) {
    // Find player's room and handle move
    this.gameRooms.forEach((room) => {
      if (room.hasPlayer(socket.id)) {
        room.handlePlayerMove(socket.id, data);
      }
    });
  }

  private handleCollectKey(socket: Socket, data: any) {
    // Find player's room and handle key collection
    this.gameRooms.forEach((room) => {
      if (room.hasPlayer(socket.id)) {
        room.handleKeyCollection(socket.id, data);
      }
    });
  }

  private handleClaimTreasure(socket: Socket, data: any) {
    // Find player's room and handle treasure claim
    this.gameRooms.forEach((room) => {
      if (room.hasPlayer(socket.id)) {
        room.handleTreasureClaim(socket.id, data);
      }
    });
  }

  private handleDisconnect(socket: Socket) {
    this.handleLeaveQueue(socket);
  }

  private findAvailableRoom(): GameRoom | null {
    for (const room of this.gameRooms.values()) {
      if (!room.isFull()) {
        return room;
      }
    }
    return null;
  }

  public getRoomCount(): number {
    return this.gameRooms.size;
  }

  public getActivePlayerCount(): number {
    let count = 0;
    this.gameRooms.forEach(room => {
      count += room.getPlayerCount();
    });
    return count;
  }
}