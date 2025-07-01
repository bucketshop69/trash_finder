interface GameHUDProps {
  playerKeys: number;
  opponentKeys: number;
  gameTime: number;
  playerName: string;
  opponentName: string;
  onExitGame: () => void;
}

const GameHUD = ({ 
  playerKeys, 
  opponentKeys, 
  gameTime, 
  playerName, 
  opponentName,
  onExitGame 
}: GameHUDProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
      <div className="flex justify-between items-center">
        {/* Player Status */}
        <div className="flex space-x-6">
          <div className="bg-blue-600 bg-opacity-80 px-4 py-2 rounded-lg">
            <div className="text-xs text-blue-200">YOU</div>
            <div className="font-bold">{playerName}</div>
            <div className="flex items-center space-x-1">
              <span>🗝️</span>
              <span>{playerKeys}</span>
            </div>
          </div>
          
          <div className="bg-red-600 bg-opacity-80 px-4 py-2 rounded-lg">
            <div className="text-xs text-red-200">OPPONENT</div>
            <div className="font-bold">{opponentName}</div>
            <div className="flex items-center space-x-1">
              <span>🗝️</span>
              <span>{opponentKeys}</span>
            </div>
          </div>
        </div>

        {/* Game Time */}
        <div className="bg-gray-800 bg-opacity-80 px-4 py-2 rounded-lg text-center">
          <div className="text-xs text-gray-300">TIME</div>
          <div className="text-xl font-bold font-mono">{formatTime(gameTime)}</div>
        </div>

        {/* Controls */}
        <div className="flex space-x-2">
          <div className="bg-gray-800 bg-opacity-80 px-3 py-2 rounded-lg text-xs">
            <div>WASD / Arrows to move</div>
          </div>
          <button
            onClick={onExitGame}
            className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;