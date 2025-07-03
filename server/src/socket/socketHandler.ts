import { Server, Socket } from 'socket.io';
import { GameRoom } from '../game/GameRoom';
import { generateRoomId } from '../blockchain/config';

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

      // Handle creating wager room
      socket.on('create_wager_room', (data) => {
        this.handleCreateWagerRoom(socket, data);
      });

      // Handle player leaving queue
      socket.on('leave_queue', () => {
        this.handleLeaveQueue(socket);
      });

      socket.on('join_room', (data) => {
        this.handleJoinRoom(socket, data);
      });

      // Handle blockchain events
      socket.on('player_staked', (data) => {
        this.handlePlayerStaked(socket, data);
      });

      socket.on('get_unclaimed_wagers', (data) => {
        this.handleGetUnclaimedWagers(socket, data);
      });

      socket.on('wager_claimed', (data) => {
        this.handleWagerClaimed(socket, data);
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
    
    // Find available room or create new one (no wager)
    let availableRoom = this.findAvailableRoom();
    
    if (!availableRoom) {
      // Create new room without wager
      const roomId = generateRoomId();
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

  private handleCreateWagerRoom(socket: Socket, data: any) {
    console.log(`💰 Player ${socket.id} creating wager room:`, data);
    
    const { walletAddress, wagerAmount } = data;
    
    if (!walletAddress || !wagerAmount || wagerAmount <= 0) {
      socket.emit('wager_room_error', { message: 'Invalid wager amount or wallet address' });
      return;
    }

    // Create wager room
    const roomId = generateRoomId();
    const wagerRoom = new GameRoom(roomId, this.io, wagerAmount);
    this.gameRooms.set(roomId, wagerRoom);
    
    // Add creator to room
    const joined = wagerRoom.addPlayer(socket.id, walletAddress);
    
    if (joined) {
      socket.join(roomId);
      socket.emit('wager_room_created', {
        roomId,
        wagerAmount,
        gameWagerPDA: wagerRoom.getWager()?.gameWagerPDA,
        playerCount: wagerRoom.getPlayerCount()
      });
      
      console.log(`💰 Created wager room: ${roomId} with ${wagerAmount} GOR`);
    } else {
      socket.emit('wager_room_error', { message: 'Failed to create wager room' });
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

  private handlePlayerStaked(socket: Socket, data: any) {
    console.log(`💎 Player ${socket.id} staked:`, data);
    
    const { walletAddress, roomId } = data;
    const room = this.gameRooms.get(roomId);
    
    if (room) {
      room.markPlayerStaked(walletAddress);
      
      // Notify room about staking
      this.io.to(roomId).emit('player_staked', {
        walletAddress,
        playersStaked: room.allPlayersStaked()
      });
      
      // Try to start game if all players staked
      if (room.isFull() && room.allPlayersStaked()) {
        room.startGame();
      }
    }
  }

  private handleGetUnclaimedWagers(socket: Socket, data: any) {
    const { walletAddress } = data;
    let totalUnclaimed = 0;
    const unclaimedWagers: any[] = [];
    
    this.gameRooms.forEach((room, roomId) => {
      const unclaimed = room.getUnclaimedWager(walletAddress);
      if (unclaimed > 0) {
        totalUnclaimed += unclaimed;
        unclaimedWagers.push({
          roomId,
          amount: unclaimed,
          gameWagerPDA: room.getWager()?.gameWagerPDA
        });
      }
    });
    
    socket.emit('unclaimed_wagers', {
      totalUnclaimed,
      wagers: unclaimedWagers
    });
  }

  private handleWagerClaimed(socket: Socket, data: any) {
    console.log(`🏆 Player ${socket.id} claimed wager:`, data);
    
    const { walletAddress, roomId } = data;
    const room = this.gameRooms.get(roomId);
    
    if (room) {
      room.clearUnclaimedWager(walletAddress);
      console.log(`✅ Cleared unclaimed wager for ${walletAddress} in room ${roomId}`);
    }
  }

  private findAvailableRoom(): GameRoom | null {
    for (const room of this.gameRooms.values()) {
      if (!room.isFull() && !room.getWager()) {
        return room;
      }
    }
    return null;
  }

  public getAvailableWagerRooms(): any[] {
    const wagerRooms: any[] = [];
    
    this.gameRooms.forEach((room, roomId) => {
      const wager = room.getWager();
      if (wager && !room.isFull()) {
        wagerRooms.push({
          roomId,
          wagerAmount: wager.amount,
          gameWagerPDA: wager.gameWagerPDA,
          playerCount: room.getPlayerCount()
        });
      }
    });
    
    return wagerRooms;
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

  public getAllRooms(): any[] {
    const rooms: any[] = [];
    this.gameRooms.forEach((room, roomId) => {
      rooms.push(room.getRoomInfo());
    });
    return rooms;
  }
}