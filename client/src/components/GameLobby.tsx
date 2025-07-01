import { useState } from 'react';
import WalletConnect from './WalletConnect';
import PlayerStatus from './PlayerStatus';

interface GameLobbyProps {
  onStartGame: () => void;
  onBackToMenu: () => void;
}

const GameLobby = ({ onStartGame, onBackToMenu }: GameLobbyProps) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleFindGame = () => {
    // Skip wallet check for now - go straight to game
    setIsSearching(true);
    
    // Simulate finding opponent
    setTimeout(() => {
      setIsSearching(false);
      onStartGame();
    }, 2000);
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
              <button
                onClick={handleFindGame}
                disabled={isSearching}
                className="w-full bg-gorbagana-green hover:bg-gorbagana-light disabled:bg-gray-600 px-6 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Finding Opponent...</span>
                  </>
                ) : (
                  <span>🎯 Find 1v1 Match</span>
                )}
              </button>
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