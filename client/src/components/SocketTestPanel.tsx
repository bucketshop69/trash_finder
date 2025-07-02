import React, { useState, useEffect } from 'react';
import { socketManager } from '../services/SocketManager';

export const SocketTestPanel: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Set up socket event listeners
    socketManager.onConnect((connected) => {
      setIsConnected(connected);
      setConnectionStatus(connected ? 'Connected' : 'Disconnected');
      setPlayerId(connected ? socketManager.getPlayerId() : null);
      addLog(connected ? '✅ Connected to server' : '❌ Disconnected from server');
    });

    socketManager.onRoomJoin((data) => {
      setRoomId(data.roomId);
      addLog(`🏠 Joined room: ${data.roomId} (${data.playerCount}/2 players)`);
    });

    socketManager.onGameStart((data) => {
      addLog(`🎮 Game started! Room: ${data.roomId}`);
    });

    socketManager.onKeyCollection((data) => {
      addLog(`🗝️ Key collected: ${data.keyId} by ${data.playerId}`);
    });

    socketManager.onGameWin((data) => {
      addLog(`🏆 Game won by: ${data.winnerId}`);
    });

    socketManager.onPlayerMove((data) => {
      addLog(`👤 Player moved: ${data.playerId.substring(0, 8)} to (${data.position.x.toFixed(0)}, ${data.position.y.toFixed(0)})`);
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const handleConnect = async () => {
    try {
      setConnectionStatus('Connecting...');
      addLog('🔌 Attempting to connect...');
      await socketManager.connect();
    } catch (error) {
      setConnectionStatus('Connection Failed');
      addLog(`❌ Connection failed: ${error}`);
    }
  };

  const handleDisconnect = () => {
    socketManager.disconnect();
    setRoomId(null);
    addLog('🔌 Disconnected manually');
  };

  const handleJoinQueue = () => {
    if (!isConnected) {
      addLog('❌ Cannot join queue: not connected');
      return;
    }
    socketManager.joinQueue();
    addLog('🎮 Joining matchmaking queue...');
  };

  const handleLeaveQueue = () => {
    socketManager.leaveQueue();
    setRoomId(null);
    addLog('🚪 Left queue/room');
  };

  const handleTestMove = () => {
    if (!isConnected) {
      addLog('❌ Cannot send move: not connected');
      return;
    }
    const testPos = { x: 100 + Math.random() * 100, y: 100 + Math.random() * 100 };
    socketManager.sendPlayerMove({
      position: testPos
    });
    addLog(`🏃 Sent test move to (${testPos.x.toFixed(0)}, ${testPos.y.toFixed(0)})`);
  };

  const handleTestKey = () => {
    if (!isConnected) {
      addLog('❌ Cannot collect key: not connected');
      return;
    }
    socketManager.sendKeyCollection({
      keyId: 'test_key_' + Math.floor(Math.random() * 9),
      position: { x: 200, y: 200 }
    });
    addLog('🗝️ Sent test key collection');
  };

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md">
      <h3 className="text-lg font-bold mb-4">🔌 Socket Test Panel</h3>
      
      {/* Connection Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span>Status:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            isConnected ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {connectionStatus}
          </span>
        </div>
        
        {playerId && (
          <div className="text-sm text-gray-300">
            Player ID: {playerId.substring(0, 8)}...
          </div>
        )}
        
        {roomId && (
          <div className="text-sm text-gray-300">
            Room: {roomId}
          </div>
        )}
      </div>

      {/* Connection Controls */}
      <div className="mb-4 space-y-2">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Connect to Server
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Game Controls */}
      {isConnected && (
        <div className="mb-4 space-y-2">
          {!roomId ? (
            <button
              onClick={handleJoinQueue}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Join Queue
            </button>
          ) : (
            <button
              onClick={handleLeaveQueue}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
              Leave Room
            </button>
          )}
          
          {/* Test Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTestMove}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded text-sm"
            >
              Test Move
            </button>
            <button
              onClick={handleTestKey}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-1 px-2 rounded text-sm"
            >
              Test Key
            </button>
          </div>
          
          <button
            onClick={() => {
              // @ts-ignore - Access global scene for debugging
              if (window.gameScene && window.gameScene.enableNetworking) {
                window.gameScene.enableNetworking();
                addLog('🌐 Manually enabled networking');
              } else {
                addLog('❌ Game scene not found');
              }
            }}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-1 px-2 rounded text-sm"
          >
            Force Enable Networking
          </button>
        </div>
      )}

      {/* Event Log */}
      <div className="border-t border-gray-600 pt-2">
        <h4 className="text-sm font-semibold mb-2">Event Log:</h4>
        <div className="bg-gray-900 rounded p-2 h-32 overflow-y-auto text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500">No events yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};