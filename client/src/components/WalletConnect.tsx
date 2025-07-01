import { useState } from 'react';

interface WalletConnectProps {
  onConnect: (walletAddress: string) => void;
}

const WalletConnect = ({ onConnect }: WalletConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Simulate wallet connection (will integrate real Backpack wallet later)
    setTimeout(() => {
      const mockAddress = "GorbTest" + Math.random().toString(36).substring(2, 8);
      setWalletAddress(mockAddress);
      onConnect(mockAddress);
      setIsConnecting(false);
    }, 1500);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    onConnect("");
  };

  if (walletAddress) {
    return (
      <div className="flex items-center space-x-3 bg-gray-800 px-4 py-2 rounded-lg">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <span className="text-green-400 font-mono text-sm">
          {walletAddress}
        </span>
        <button
          onClick={handleDisconnect}
          className="text-red-400 hover:text-red-300 text-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
    >
      {isConnecting ? (
        <>
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <span>🎒</span>
          <span>Connect Backpack</span>
        </>
      )}
    </button>
  );
};

export default WalletConnect;