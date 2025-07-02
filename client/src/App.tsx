import { useState, useEffect } from 'react'
import { socketManager } from './services/SocketManager'
import GameCanvas from './game/GameCanvas'
import GameMenu from './components/GameMenu'
import GameLobby from './components/GameLobby'
import GameHUD from './components/GameHUD'
import './App.css'

type GameState = 'menu' | 'lobby' | 'waiting' | 'playing'

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [gameTime, setGameTime] = useState(0)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [playerCount, setPlayerCount] = useState(1)

  const handleStartGame = () => {
    setGameState('playing')
    setGameTime(0)
    
    // Enable networking in the game scene
    setTimeout(() => {
      // @ts-ignore - Access global scene for networking
      if (window.gameScene && window.gameScene.enableNetworking) {
        console.log('🌐 Enabling networking for multiplayer game')
        window.gameScene.enableNetworking()
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
    setRoomId(newRoomId)
    setIsHost(true)
    setPlayerCount(1)
    setGameState('waiting')
  }

  const handleJoinRoom = (joinRoomId: string) => {
    setRoomId(joinRoomId)
    setIsHost(false)
    setPlayerCount(2) // Joining means room now has 2 players
    setGameState('waiting')
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
    const handleGameStart = (data: any) => {
      console.log('🎮 Game starting with both players!', data)
      handleStartGame()
    }

    socketManager.onGameStart(handleGameStart)

    // No cleanup needed if SocketManager handles listeners correctly
  }, [])

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
                <div className="bg-gorbagana-dark p-3 rounded font-mono text-lg text-gorbagana-light border">
                  {roomId}
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
          <GameHUD
            playerKeys={0}
            opponentKeys={0}
            gameTime={gameTime}
            playerName="You"
            opponentName="Opponent"
            onExitGame={handleExitGame}
          />
          <div className="flex justify-center pt-16">
            <GameCanvas />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
