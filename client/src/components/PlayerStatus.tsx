interface PlayerStatusProps {
  walletAddress: string;
  playerName?: string;
  isConnected: boolean;
}

const PlayerStatus = ({ walletAddress, playerName, isConnected }: PlayerStatusProps) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div>
            <div className="font-semibold">
              {playerName || 'Anonymous Player'}
            </div>
            {walletAddress && (
              <div className="text-sm text-gray-400 font-mono">
                {walletAddress}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-gray-400">Status</div>
          <div className={`text-sm font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatus;