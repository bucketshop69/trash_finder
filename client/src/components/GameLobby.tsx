import { useState, useEffect } from 'react';
import { socketManager } from '../services/SocketManager';
import WalletConnect from './WalletConnect';
import PlayerStatus from './PlayerStatus';
import { 
  checkSufficientBalance, 
  buildInitializeWagerTransaction,
  buildJoinWagerTransaction, 
  signAndSendTransaction 
} from '../utils/transactions';
import { isBackpackInstalled, GORBAGANA_FAUCET_URL } from '../utils/blockchain';

interface GameLobbyProps {
  onCreateRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onBackToMenu: () => void;
}

const GameLobby = ({ onCreateRoom, onJoinRoom, onBackToMenu }: GameLobbyProps) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWagerOptions, setShowWagerOptions] = useState(false);
  const [selectedWager, setSelectedWager] = useState<number | null>(null);
  const [isCreatingWager, setIsCreatingWager] = useState(false);
  const [error, setError] = useState('');
  const [roomTimer, setRoomTimer] = useState<number>(0);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    // Check wallet connection first
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!isBackpackInstalled()) {
      setError('Please install Backpack wallet');
      return;
    }

    setIsConnecting(true);
    setError('');
    
    try {
      // Connect to server
      await socketManager.connect();
      
      // Join queue to create a room (no wager)
      socketManager.joinQueue(walletAddress);
      
      // Listen for room creation
      socketManager.onRoomJoin((data) => {
        onCreateRoom(data.roomId);
        setIsConnecting(false);
      });
      
    } catch (error) {
      console.error('Failed to create room:', error);
      setError('Failed to create room: ' + (error as Error).message);
      setIsConnecting(false);
    }
  };

  const handleCreateWagerRoom = async () => {
    if (!selectedWager) {
      setError('Please select a wager amount');
      return;
    }

    setIsCreatingWager(true);
    setError('');

    try {
      // Check balance
      const balanceCheck = await checkSufficientBalance(walletAddress, selectedWager);
      if (!balanceCheck.sufficient) {
        setError(`Insufficient GOR. Need ${balanceCheck.needed.toFixed(2)} GOR, have ${balanceCheck.currentBalance.toFixed(2)} GOR`);
        setIsCreatingWager(false);
        return;
      }

      // Connect to server first
      await socketManager.connect();

      // Create wager room on server
      socketManager.createWagerRoom(walletAddress, selectedWager);

      // Listen for wager room creation
      const socket = socketManager.getSocket();
      if (!socket) {
        setError('Socket not available');
        setIsCreatingWager(false);
        return;
      }

      socket.on('wager_room_created', async (data) => {
        try {
          // Build and send initialize wager transaction
          const tx = await buildInitializeWagerTransaction(
            walletAddress, 
            data.roomId, 
            selectedWager
          );
          
          const signature = await signAndSendTransaction(tx.transaction, walletAddress);
          console.log('Wager initialized:', signature);
          
          // Notify server that wager was staked
          socketManager.notifyPlayerStaked(walletAddress, data.roomId);
          
          // Start timer and show room sharing
          setCreatedRoomId(data.roomId);
          setRoomTimer(120); // 2 minutes
          setIsCreatingWager(false);
          setShowWagerOptions(false);
          
          onCreateRoom(data.roomId);
          
        } catch (txError) {
          console.error('Transaction failed:', txError);
          setError('Transaction failed: ' + (txError as Error).message);
          setIsCreatingWager(false);
        }
      });

      socket.on('wager_room_error', (data) => {
        setError(data.message);
        setIsCreatingWager(false);
      });
      
    } catch (error) {
      console.error('Failed to create wager room:', error);
      setError('Failed to create wager room: ' + (error as Error).message);
      setIsCreatingWager(false);
    }
  };

  const handleJoinExistingRoom = async () => {
    if (!joinRoomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }
    
    setIsConnecting(true);
    setError('');
    
    try {
      // Connect to server
      await socketManager.connect();
      
      socketManager.joinRoom(joinRoomId, walletAddress);
      
      // Listen for room join
      socketManager.onRoomJoin((data) => {
        console.log('🏠 Joined room:', data.roomId);
        
        // Check if this is a wager room
        if (data.wager) {
          handleJoinWager(data.roomId, data.wager.amount);
        }
        
        onJoinRoom(data.roomId);
        setIsConnecting(false);
      });
      
      const socket = socketManager.getSocket();
      socket?.on('queue_error', (data) => {
        setError(data.message);
        setIsConnecting(false);
      });
      
    } catch (error) {
      console.error('Failed to join room:', error);
      setError('Failed to join room: ' + (error as Error).message);
      setIsConnecting(false);
    }
  };

  const handleJoinWager = async (roomId: string, wagerAmount: number) => {
    try {
      // Check balance
      const balanceCheck = await checkSufficientBalance(walletAddress, wagerAmount);
      if (!balanceCheck.sufficient) {
        setError(`Insufficient GOR. Need ${balanceCheck.needed.toFixed(2)} GOR, have ${balanceCheck.currentBalance.toFixed(2)} GOR`);
        return;
      }

      // Show confirmation
      const confirmed = confirm(`Join wager for ${wagerAmount} GOR?`);
      if (!confirmed) return;

      // Build and send join wager transaction
      const tx = await buildJoinWagerTransaction(walletAddress, roomId, wagerAmount);
      const signature = await signAndSendTransaction(tx.transaction, walletAddress);
      console.log('Joined wager:', signature);
      
      // Notify server
      socketManager.notifyPlayerStaked(walletAddress, roomId);
      
    } catch (error) {
      console.error('Failed to join wager:', error);
      setError('Failed to join wager: ' + (error as Error).message);
    }
  };

  // Timer for created room
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (createdRoomId && roomTimer > 0) {
      interval = setInterval(() => {
        setRoomTimer(prev => {
          if (prev <= 1) {
            setCreatedRoomId(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [createdRoomId, roomTimer]);

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
              <WalletConnect onConnect={setWalletAddress} showBalance={true} />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Game Actions</h2>
              
              <div>
              {error && (
                <div style={{background: '#fee', color: '#c00', padding: '10px', borderRadius: '5px'}}>
                  {error}
                  {error.includes('Insufficient GOR') && (
                    <div>
                      <a href={GORBAGANA_FAUCET_URL} target="_blank" rel="noopener noreferrer">
                        Get GOR from Faucet
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {createdRoomId && (
                <div style={{background: '#e8f5e8', border: '1px solid #4a90e2', padding: '15px', borderRadius: '5px', margin: '10px 0'}}>
                  <h4>🎯 Wager Room Created!</h4>
                  <div style={{fontFamily: 'monospace', background: '#f0f0f0', padding: '8px', margin: '8px 0'}}>
                    Room ID: {createdRoomId}
                  </div>
                  <div style={{fontSize: '14px', color: '#666'}}>
                    ⏱️ Waiting for opponent: {Math.floor(roomTimer / 60)}:{(roomTimer % 60).toString().padStart(2, '0')}
                  </div>
                  <div style={{fontSize: '12px', color: '#888', marginTop: '5px'}}>
                    Share this Room ID with your opponent
                  </div>
                </div>
              )}
              
              <div style={{display: 'flex', gap: '10px'}}>
                <button
                  onClick={handleCreateRoom}
                  disabled={isConnecting || !walletAddress}
                  style={{flex: 1, padding: '15px', fontSize: '16px'}}
                >
                  {isConnecting ? 'Creating...' : 'Create Free Room'}
                </button>
                
                <button
                  onClick={() => setShowWagerOptions(!showWagerOptions)}
                  disabled={!walletAddress}
                  style={{flex: 1, padding: '15px', fontSize: '16px', background: '#f60'}}
                >
                  Create Wager Room
                </button>
              </div>
              
              {showWagerOptions && (
                <div style={{border: '1px solid #ccc', padding: '15px', borderRadius: '5px'}}>
                  <h4>Select Wager Amount:</h4>
                  <div style={{display: 'flex', gap: '10px', margin: '10px 0'}}>
                    {[0.1, 0.5, 1.0].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setSelectedWager(amount)}
                        style={{
                          padding: '10px 15px',
                          background: selectedWager === amount ? '#4a90e2' : '#ccc',
                          color: selectedWager === amount ? 'white' : 'black'
                        }}
                      >
                        {amount} GOR
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleCreateWagerRoom}
                    disabled={!selectedWager || isCreatingWager}
                    style={{width: '100%', padding: '12px', background: '#4a90e2', color: 'white'}}
                  >
                    {isCreatingWager ? 'Creating Wager...' : `Create ${selectedWager} GOR Wager`}
                  </button>
                </div>
              )}

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
                      disabled={isConnecting || !joinRoomId.trim() || !walletAddress}
                      style={{width: '100%', padding: '12px'}}
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