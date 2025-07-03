import { useState, useEffect } from 'react'
import { socketManager } from './services/SocketManager'
import GameCanvas from './game/GameCanvas'
import GameMenu from './components/GameMenu'
import GameLobby from './components/GameLobby'
import GameHUD from './components/GameHUD'
import { buildClaimWagerTransaction, signAndSendTransaction } from './utils/transactions'
import { getConnectedWallet } from './utils/blockchain'
import './App.css'

// Deployment trigger comment - updated for production build

type GameState = 'menu' | 'lobby' | 'waiting' | 'playing' | 'winner'

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [gameTime, setGameTime] = useState(0)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [playerCount, setPlayerCount] = useState(1)
  const [winnerData, setWinnerData] = useState<any>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [waitingTime, setWaitingTime] = useState(0)

  const handleStartGame = () => {
    console.log('🚀 GAME STARTING - isHost:', isHost, 'roomId:', roomId)
    setGameState('playing')
    setGameTime(0)

    // Enable networking and set player role in the game scene
    setTimeout(() => {
      // Access global scene for networking
      const gameScene = (window as any).gameScene;
      if (gameScene) {
        console.log('🌐 Enabling networking for multiplayer game')
        console.log('🎭 Setting player role:', isHost ? 'HOST' : 'JOINER')
        console.log('🔍 isHost value:', isHost)

        // Set player role first  
        console.log('🎯 About to call setPlayerRole with isHost:', isHost)
        if (gameScene.setPlayerRole) {
          gameScene.setPlayerRole(isHost)
        }

        // Then enable networking
        if (gameScene.enableNetworking) {
          gameScene.enableNetworking()
        }
      }
    }, 500) // Small delay to ensure scene is ready

    // Start game timer (will be managed by game logic later)
  }

  const handleBackToMenu = () => {
    setGameState('menu')
    setRoomId(null)
    setIsHost(false)
  }

  const handleEnterLobby = () => {
    setGameState('lobby')
  }

  const handleExitGame = () => {
    setGameState('lobby')
  }

  const handleCreateRoom = (newRoomId: string) => {
    console.log('🏠 HOST creating room:', newRoomId)
    setRoomId(newRoomId)
    setIsHost(true)
    setPlayerCount(1)
    setGameState('waiting')
    setWaitingTime(0)
    console.log('✅ Host state set - isHost:', true)
  }

  const handleJoinRoom = (joinRoomId: string) => {
    console.log('🚪 JOINER joining room:', joinRoomId)
    setRoomId(joinRoomId)
    setIsHost(false)
    setPlayerCount(2) // Joining means room now has 2 players
    setGameState('waiting')
    setWaitingTime(0)
    console.log('✅ Joiner state set - isHost:', false)
  }

  const handleBackToLobby = () => {
    setGameState('lobby')
    setRoomId(null)
    setIsHost(false)
  }

  // Listen for game start when both players join
  useEffect(() => {
    if (gameState === 'waiting') {
      console.log('🎧 Setting up game start listener for both players...')

      // Listen for players joining the room
      socketManager.onRoomJoin((data) => {
        console.log('👤 Player joined room, count:', data.playerCount)
        setPlayerCount(data.playerCount)
      })

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up game start listener')
      }
    }
  }, [gameState])

  // Centralized event listener setup
  useEffect(() => {
    console.log('🎧 Setting up game event listeners')

    const handleGameStart = (data: any) => {
      console.log('🎮 Game starting with both players!', data)
      console.log('🔍 State before handleStartGame - isHost:', isHost, 'roomId:', roomId)
      handleStartGame()
    }

    socketManager.onGameStart(handleGameStart)

    // No cleanup needed if SocketManager handles listeners correctly
  }, [isHost, roomId])

  // Set up game win listener separately (only once)
  useEffect(() => {
    const handleGameWin = (data: any) => {
      console.log('🏆 APP: Game won event received:', data)
      console.log('🏆 APP: Setting winner data and changing state to winner')
      setWinnerData(data)
      setGameState('winner')
    }

    socketManager.onGameWin(handleGameWin)
  }, [])

  // Waiting timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameState === 'waiting') {
      interval = setInterval(() => {
        setWaitingTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState])

  const handleClaimWager = async () => {
    if (!winnerData?.wager || !roomId) return

    const walletAddress = getConnectedWallet()
    if (!walletAddress) {
      console.error('Wallet not connected')
      return
    }

    setIsClaiming(true)
    try {
      const tx = await buildClaimWagerTransaction(walletAddress, roomId)
      const signature = await signAndSendTransaction(tx.transaction, walletAddress)
      console.log('Wager claimed:', signature)

      // Notify server
      socketManager.notifyWagerClaimed(walletAddress, roomId)

      // Go back to lobby
      handleBackToMenu()
    } catch (error) {
      console.error('Failed to claim wager:', error)
      console.error('Failed to claim wager:', (error as Error).message)
    }
    setIsClaiming(false)
  }

  return (
    <div className="App">
      {gameState === 'menu' && (
        <GameMenu onStartGame={handleEnterLobby} />
      )}

      {gameState === 'lobby' && (
        <GameLobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {gameState === 'waiting' && (
        <div className="min-h-screen bg-gorbagana-dark text-white p-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <button
                onClick={handleBackToLobby}
                className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
              >
                ← Back to Lobby
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4 text-gorbagana-light">
                {isHost ? 'Room Created!' : 'Joining Room...'}
              </h2>

              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2">Room ID:</div>
                <div className="flex items-center gap-2">
                  <div className="bg-gorbagana-dark p-3 rounded font-mono text-lg text-gorbagana-light border flex-1">
                    {roomId}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(roomId || '')}
                    className="bg-gorbagana-accent hover:bg-orange-600 px-3 py-3 rounded transition-colors text-white"
                    title="Copy Room ID"
                  >
                    📋
                  </button>
                </div>
                {isHost && (
                  <div className="text-sm text-gray-400 mt-2">
                    Share this Room ID with your opponent
                  </div>
                )}
              </div>

              <div className="text-gray-300 mb-4">
                <div className="mb-2">
                  Players: {playerCount}/2
                </div>
                <div className="mb-2">
                  ⏱️ Waiting time: {Math.floor(waitingTime / 60)}:{(waitingTime % 60).toString().padStart(2, '0')}
                </div>
                <div>
                  {isHost ?
                    (playerCount === 1 ? 'Waiting for opponent to join...' : 'Opponent joined! Starting game...') :
                    'Connecting to room...'
                  }
                </div>
              </div>

              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gorbagana-light"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="relative">
          {/* <GameHUD
            playerKeys={0}
            opponentKeys={0}
            gameTime={gameTime}
            playerName="You"
            opponentName="Opponent"
            onExitGame={handleExitGame}
          /> */}
          <div className="flex justify-center pt-16">
            <GameCanvas />
          </div>
        </div>
      )}

      {gameState === 'winner' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a', color: 'white' }}>
          <div style={{ textAlign: 'center', background: '#2a2a2a', padding: '40px', borderRadius: '10px', maxWidth: '500px' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
              {winnerData?.winnerId === socketManager.getPlayerId() ? '🏆 You Won!' : '😔 You Lost'}
            </h1>

            {winnerData?.wager && winnerData?.winnerId === socketManager.getPlayerId() && (
              <div>
                <div style={{ fontSize: '24px', margin: '20px 0', color: '#f60' }}>
                  💰 Claim Your Wager: {winnerData.wager.amount * 2} GOR
                </div>

                <button
                  onClick={handleClaimWager}
                  disabled={isClaiming}
                  style={{
                    padding: '15px 30px',
                    fontSize: '18px',
                    background: '#f60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: isClaiming ? 'not-allowed' : 'pointer',
                    marginBottom: '20px'
                  }}
                >
                  {isClaiming ? 'Claiming...' : 'Claim Wager'}
                </button>
              </div>
            )}

            <div style={{ margin: '20px 0' }}>
              <div>Game Time: {winnerData?.gameTime || 0}s</div>
              <div>Winner: {winnerData?.winnerWallet?.slice(0, 8)}...</div>
            </div>

            <button
              onClick={handleBackToMenu}
              style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
