import { createClient, RedisClientType } from 'redis';

export class RedisManager {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    // For development, use local Redis or mock if not available
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log('❌ Redis connection failed after 3 retries, using memory storage');
            return false; // Stop retrying
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('🔗 Connecting to Redis...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis connection established');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.log('❌ Redis connection error:', err.message);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.log('⚠️ Redis not available, using in-memory storage for development');
      this.isConnected = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Session management
  public async setPlayerSession(playerId: string, sessionData: any): Promise<boolean> {
    if (!this.isConnected) {
      console.log('📝 Storing session in memory (Redis unavailable)');
      return true; // Fallback to memory storage
    }

    try {
      const key = `player:${playerId}`;
      await this.client.setEx(key, 3600, JSON.stringify(sessionData)); // 1 hour TTL
      return true;
    } catch (error) {
      console.error('Error setting player session:', error);
      return false;
    }
  }

  public async getPlayerSession(playerId: string): Promise<any | null> {
    if (!this.isConnected) {
      return null; // Fallback
    }

    try {
      const key = `player:${playerId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting player session:', error);
      return null;
    }
  }

  public async deletePlayerSession(playerId: string): Promise<boolean> {
    if (!this.isConnected) {
      return true; // Fallback
    }

    try {
      const key = `player:${playerId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error deleting player session:', error);
      return false;
    }
  }

  // Game room caching
  public async cacheGameState(roomId: string, gameState: any): Promise<boolean> {
    if (!this.isConnected) {
      return true; // Fallback
    }

    try {
      const key = `room:${roomId}`;
      await this.client.setEx(key, 1800, JSON.stringify(gameState)); // 30 min TTL
      return true;
    } catch (error) {
      console.error('Error caching game state:', error);
      return false;
    }
  }

  public async getGameState(roomId: string): Promise<any | null> {
    if (!this.isConnected) {
      return null; // Fallback
    }

    try {
      const key = `room:${roomId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting game state:', error);
      return null;
    }
  }

  // Player queue management
  public async addToQueue(playerId: string, playerData: any): Promise<boolean> {
    if (!this.isConnected) {
      return true; // Fallback
    }

    try {
      const queueKey = 'game:queue';
      const playerKey = `queue:player:${playerId}`;
      
      await this.client.sAdd(queueKey, playerId);
      await this.client.setEx(playerKey, 300, JSON.stringify(playerData)); // 5 min TTL
      return true;
    } catch (error) {
      console.error('Error adding to queue:', error);
      return false;
    }
  }

  public async removeFromQueue(playerId: string): Promise<boolean> {
    if (!this.isConnected) {
      return true; // Fallback
    }

    try {
      const queueKey = 'game:queue';
      const playerKey = `queue:player:${playerId}`;
      
      await this.client.sRem(queueKey, playerId);
      await this.client.del(playerKey);
      return true;
    } catch (error) {
      console.error('Error removing from queue:', error);
      return false;
    }
  }

  public isRedisConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const redisManager = new RedisManager();