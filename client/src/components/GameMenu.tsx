interface GameMenuProps {
  onStartGame: () => void;
}

const GameMenu = ({ onStartGame }: GameMenuProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gorbagana-dark text-white">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gorbagana-light">
            🗑️ Gorbagana Trash Finder
          </h1>
          <p className="text-xl text-gray-300">
            Use WASD for navigation • Press space for trash picking
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">How to Play:</h3>
            <ul className="text-left space-y-2 text-gray-300">
              <li>• Race against your opponent through puzzle rooms</li>
              <li>• Collect 3 trash items scattered across the maze</li>
              <li>• Navigate to center trash bin and press space to win</li>
              <li>• First to claim the Gorbagana treasure wins!</li>
            </ul>
          </div>
          
          <button
            onClick={onStartGame}
            className="bg-gorbagana-green hover:bg-gorbagana-light px-8 py-4 rounded-lg text-xl font-semibold transition-colors"
          >
            Enter Game Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameMenu;