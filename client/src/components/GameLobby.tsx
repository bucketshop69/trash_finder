import { useState } from 'react';
import { socketManager } from '../services/SocketManager';
import WalletConnect from './WalletConnect';
import PlayerStatus from './PlayerStatus';

interface GameLobbyProps {
  onCreateRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onBackToMenu: () => void;
}

const GameLobby = ({ onCreateRoom, onJoinRoom, onBackToMenu }: GameLobbyProps) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleCreateRoom = async () => {
    setIsConnecting(true);
    
    try {
      // Connect to server
      await socketManager.connect();
      
      // Join queue to create a room
      socketManager.joinQueue(walletAddress || 'demo_wallet_' + Date.now());
      
      // Listen for room creation
      socketManager.onRoomJoin((data) => {
        onCreateRoom(data.roomId);
        setIsConnecting(false);
      });
      
    } catch (error) {
      console.error('Failed to create room:', error);
      setIsConnecting(false);
    }
  };

  const handleJoinExistingRoom = async () => {
    if (!joinRoomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Connect to server
      await socketManager.connect();
      
      // For room joining, we'll use the same queue system since it automatically
      // finds available rooms. The timing should work if the host created a room recently.
      socketManager.joinRoom(joinRoomId, walletAddress || 'demo_wallet_' + Date.now());
      
      // Listen for room join
      socketManager.onRoomJoin((data) => {
        console.log('🏠 Joined room:', data.roomId);
        onJoinRoom(data.roomId);
        setIsConnecting(false);
      });
      
      // Note: Game start listener is handled by App component
      
    } catch (error) {
      console.error('Failed to join room:', error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gorbagana-dark text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gorbagana-light">Game Lobby</h1>
          <button
            onClick={onBackToMenu}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Menu
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Player Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Status</h2>
              <PlayerStatus 
                walletAddress={walletAddress}
                isConnected={!!walletAddress}
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
              <WalletConnect onConnect={setWalletAddress} />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Game Actions</h2>
              
              {/* Create New Room */}
              <div className="space-y-4">
                <button
                  onClick={handleCreateRoom}
                  disabled={isConnecting}
                  className="w-full bg-gorbagana-green hover:bg-gorbagana-light disabled:bg-gray-600 px-6 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Creating Room...</span>
                    </>
                  ) : (
                    <span>🎯 Create New Room</span>
                  )}
                </button>

                {/* Join Existing Room */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-gorbagana-light">Join Existing Room</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter Room ID (e.g., room_1751472377967)"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-gorbagana-light focus:outline-none"
                      disabled={isConnecting}
                    />
                    <button
                      onClick={handleJoinExistingRoom}
                      disabled={isConnecting || !joinRoomId.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      {isConnecting ? 'Joining...' : 'Join Room'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Game Info Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Game Rules</h2>
              <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-gorbagana-accent">🗝️</span>
                  <div>
                    <div className="font-semibold">Collect Keys</div>
                    <div className="text-sm text-gray-400">Navigate rooms to find keys that unlock the center</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-gorbagana-accent">💡</span>
                  <div>
                    <div className="font-semibold">Light Challenge</div>
                    <div className="text-sm text-gray-400">Rooms may go dark - navigate by memory!</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-gorbagana-accent">🏆</span>
                  <div>
                    <div className="font-semibold">Win Condition</div>
                    <div className="text-sm text-gray-400">First to reach center and claim treasure wins</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Rewards</h2>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gorbagana-accent">🗑️💎</div>
                  <div className="font-semibold">Gorbagana Tokens</div>
                  <div className="text-sm text-gray-400">Winners receive native testnet tokens</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;