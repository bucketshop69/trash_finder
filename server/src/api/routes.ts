import { Router, Request, Response } from 'express';
import { redisManager } from '../utils/redis';

const router = Router();

// Game status endpoints
router.get('/status', (req: Request, res: Response) => {
  res.json({
    server: 'Gorbagana Trash Finder Server',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    redisConnected: redisManager.isRedisConnected(),
    timestamp: new Date().toISOString()
  });
});

// Player management endpoints
router.post('/player/register', async (req: Request, res: Response) => {
  try {
    const { walletAddress, playerName } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const playerData = {
      walletAddress,
      playerName: playerName || 'Anonymous',
      registeredAt: new Date().toISOString(),
      gamesPlayed: 0,
      wins: 0
    };

    // Store player data in Redis/memory
    const playerId = `player_${Date.now()}`;
    await redisManager.setPlayerSession(playerId, playerData);

    res.json({
      success: true,
      playerId,
      playerData
    });
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({ error: 'Failed to register player' });
  }
});

router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const playerData = await redisManager.getPlayerSession(playerId);
    
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      success: true,
      playerData
    });
  } catch (error) {
    console.error('Error getting player:', error);
    res.status(500).json({ error: 'Failed to get player data' });
  }
});

// Game room endpoints
router.get('/rooms', (req, res) => {
  // This would typically fetch from a room manager
  // For now, return mock data
  res.json({
    totalRooms: 0,
    activeGames: 0,
    playersInQueue: 0,
    availableRooms: []
  });
});

router.post('/room/create', (req, res) => {
  try {
    const { playerId, gameType = '1v1' } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const roomId = `room_${Date.now()}`;
    
    res.json({
      success: true,
      roomId,
      gameType,
      maxPlayers: 2,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Leaderboard endpoints
router.get('/leaderboard', (req, res) => {
  // Mock leaderboard data - would fetch from database in production
  const mockLeaderboard = [
    { rank: 1, playerName: 'TrashHunter', wins: 15, gamesPlayed: 20, winRate: 75 },
    { rank: 2, playerName: 'KeyMaster', wins: 12, gamesPlayed: 18, winRate: 67 },
    { rank: 3, playerName: 'MazeRunner', wins: 8, gamesPlayed: 15, winRate: 53 }
  ];

  res.json({
    success: true,
    leaderboard: mockLeaderboard,
    totalPlayers: mockLeaderboard.length
  });
});

// Health and monitoring endpoints
router.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    redis: redisManager.isRedisConnected() ? 'connected' : 'disconnected',
    version: '1.0.0'
  };

  res.json(health);
});

router.get('/metrics', (req, res) => {
  // Game metrics for monitoring
  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    game: {
      totalRooms: 0, // Would get from room manager
      activeGames: 0,
      playersOnline: 0,
      gamesPlayedToday: 0
    },
    redis: {
      connected: redisManager.isRedisConnected(),
      status: redisManager.isRedisConnected() ? 'healthy' : 'disconnected'
    }
  });
});

// Error handling middleware for routes
router.use((error: any, req: any, res: any, next: any) => {
  console.error('API Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

export default router;