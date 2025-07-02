import { useState } from 'react'
import GameCanvas from './game/GameCanvas'
import GameMenu from './components/GameMenu'
import GameLobby from './components/GameLobby'
import GameHUD from './components/GameHUD'
import { SocketTestPanel } from './components/SocketTestPanel'
import './App.css'

type GameState = 'menu' | 'lobby' | 'playing'

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [gameTime, setGameTime] = useState(0)

  const handleStartGame = () => {
    setGameState('playing')
    setGameTime(0)
    // Start game timer (will be managed by game logic later)
  }

  const handleBackToMenu = () => {
    setGameState('menu')
  }

  const handleEnterLobby = () => {
    setGameState('lobby')
  }

  const handleExitGame = () => {
    setGameState('lobby')
  }

  return (
    <div className="App">
      {gameState === 'menu' && (
        <GameMenu onStartGame={handleEnterLobby} />
      )}
      
      {gameState === 'lobby' && (
        <GameLobby 
          onStartGame={handleStartGame}
          onBackToMenu={handleBackToMenu}
        />
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
          {/* Socket Test Panel - positioned in bottom right */}
          <div className="fixed bottom-4 right-4 z-50">
            <SocketTestPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
