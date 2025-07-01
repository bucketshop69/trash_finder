import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SocketHandler } from './socket/socketHandler';
import { redisManager } from './utils/redis';
import apiRoutes from './api/routes';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: "http://localhost:5173", // Vite dev server
  credentials: true
}));
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Basic health check endpoint (keep for backwards compatibility)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Gorbagana Game Server is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.io setup with full multiplayer handling
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Initialize socket handler for multiplayer
const socketHandler = new SocketHandler(io);

// Initialize Redis connection
async function initializeServer() {
  try {
    await redisManager.connect();
    console.log('🔗 Redis initialization complete');
  } catch (error) {
    console.log('⚠️ Redis connection failed, continuing with memory storage');
  }

  // Start server
  server.listen(PORT, () => {
    console.log(`🎮 Gorbagana Game Server running on port ${PORT}`);
    console.log(`📡 Socket.io server ready for multiplayer connections`);
    console.log(`🌐 API endpoints: http://localhost:${PORT}/api`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Metrics: http://localhost:${PORT}/api/metrics`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  try {
    await redisManager.disconnect();
    console.log('✅ Redis connection closed');
  } catch (error) {
    console.log('⚠️ Error closing Redis connection');
  }
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await redisManager.disconnect();
  server.close(() => {
    process.exit(0);
  });
});

// Start the server
initializeServer();