import { useState, useEffect } from 'react';
import { 
  isBackpackInstalled, 
  connectBackpack, 
  disconnectBackpack, 
  getConnectedWallet, 
  getGORBalance,
  formatGORAmount 
} from '../utils/blockchain';

interface WalletConnectProps {
  onConnect: (walletAddress: string) => void;
  showBalance?: boolean;
}

interface WalletState {
  address: string | null;
  balance: number;
  isConnecting: boolean;
  isLoadingBalance: boolean;
}

const WalletConnect = ({ onConnect, showBalance = false }: WalletConnectProps) => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: 0,
    isConnecting: false,
    isLoadingBalance: false
  });

  useEffect(() => {
    // Check if wallet is already connected on component mount
    const checkConnection = () => {
      const connectedAddress = getConnectedWallet();
      if (connectedAddress) {
        setWallet(prev => ({ ...prev, address: connectedAddress }));
        onConnect(connectedAddress);
        if (showBalance) {
          loadBalance(connectedAddress);
        }
      }
    };

    checkConnection();
  }, [onConnect, showBalance]);

  const loadBalance = async (address: string) => {
    setWallet(prev => ({ ...prev, isLoadingBalance: true }));
    try {
      const balance = await getGORBalance(address);
      setWallet(prev => ({ ...prev, balance, isLoadingBalance: false }));
    } catch (error) {
      console.error('Failed to load balance:', error);
      setWallet(prev => ({ ...prev, balance: 0, isLoadingBalance: false }));
    }
  };

  const handleConnect = async () => {
    if (!isBackpackInstalled()) {
      alert('Please install Backpack wallet extension and configure it for Gorbagana testnet (https://rpc.gorbagana.wtf/)');
      return;
    }

    setWallet(prev => ({ ...prev, isConnecting: true }));
    
    try {
      const address = await connectBackpack();
      if (address) {
        setWallet(prev => ({ ...prev, address, isConnecting: false }));
        onConnect(address);
        if (showBalance) {
          loadBalance(address);
        }
      } else {
        setWallet(prev => ({ ...prev, isConnecting: false }));
        alert('Failed to connect to Backpack wallet');
      }
    } catch (error) {
      setWallet(prev => ({ ...prev, isConnecting: false }));
      alert('Error connecting to Backpack wallet: ' + (error as Error).message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectBackpack();
      setWallet({
        address: null,
        balance: 0,
        isConnecting: false,
        isLoadingBalance: false
      });
      onConnect("");
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (wallet.address) {
    return (
      <div className="flex items-center space-x-3 bg-gray-800 px-4 py-2 rounded-lg">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <div className="flex flex-col">
          <span className="text-green-400 font-mono text-sm">
            {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
          </span>
          {showBalance && (
            <span className="text-gray-400 text-xs">
              {wallet.isLoadingBalance ? 'Loading...' : formatGORAmount(wallet.balance)}
            </span>
          )}
        </div>
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
      disabled={wallet.isConnecting}
      className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
    >
      {wallet.isConnecting ? (
        <>
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <span>🎒</span>
          <span>{isBackpackInstalled() ? 'Connect Backpack' : 'Install Backpack'}</span>
        </>
      )}
    </button>
  );
};

export default WalletConnect;