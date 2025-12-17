import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameState, Move, ChatMessage, PlayerColor } from '@/types';
import { socketService } from '@/services/socketService';
import { GameBoard } from './GameBoard';
import { PlayerPanel } from './PlayerPanel';
import { GameLogChat } from './GameLogChat';
import { Button } from './Button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/lobby');
      return;
    }

    const initGame = async () => {
      try {
        setLoading(true);
        // Attempt to join via socket if not already there?
        // SocketService.joinRoom ensures we are connected and in the room
        // Re-joining is fine (idempotent on backend mostly)
        const joined = await socketService.joinRoom(roomId, user.username);
        if (!joined) {
          setError('Failed to join room. It might be full or closed.');
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };

    initGame();

    socketService.on('room_update', (data: { players: any[], gameState: GameState }) => {
      setPlayers(data.players);
      if (data.gameState) {
        setGameState({ ...data.gameState });
      }
    });

    socketService.on('game_start', (state: GameState) => {
      setGameState({ ...state });
      addSystemMessage('Game Started!');
    });

    socketService.on('game_update', (newState: GameState) => {
      setGameState({ ...newState });
    });

    socketService.on('gameOver', (result: any) => {
      addSystemMessage(`Game Over! Result: ${result.result}`);
    });

    socketService.on('chat_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    socketService.on('error', (err: any) => {
      setError(err.message);
    });

    return () => {
      socketService.off('room_update', () => { });
      socketService.off('game_start', () => { });
      socketService.off('game_update', () => { });
      socketService.off('gameOver', () => { });
      socketService.off('chat_message', () => { });
      socketService.off('error', () => { });
    };
  }, [roomId, user, navigate]);

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      senderId: 'system',
      senderName: 'System',
      text,
      timestamp: Date.now(),
      type: 'SYSTEM'
    }]);
  };

  const handleMove = (move: Move) => {
    socketService.makeMove(move);
  };

  const handleSendMessage = (text: string) => {
    if (user) {
      socketService.sendMessage(text, { id: user._id, name: user.username, ...user } as any);
    }
  };

  const handleLeave = () => {
    socketService.disconnect(); // Or just leave room? Disconnect is safer for ensuring we leave cleanly
    navigate('/lobby');
    // Reconnection handled by AuthContext if needed? NO, AuthContext only reconnects on login/init.
    // If we disconnect here, we might lose socket connection for Lobby.
    // Better to emit 'leaveRoom'. Backend doesn't support 'leaveRoom' explicit event other than disconnect.
    // Let's just navigate. Backend cleans up on disconnect? No, only disconnect cleans up.
    // Ideally we should emit 'leaveRoom' or just keep socket open and navigate away.
    // If we navigate away, we just unmount.
    // Let's just navigate.

    // Actually, to implement "Back to Lobby", we should probably ensure we leave the socket room?
    // Current backend `disconnect` removes from room. 
    // If we want to stay connected but leave room, we need a `leaveRoom` event on backend.
    // For now, let's just use `navigate` and rely on user closing tab or simple navigation.
    // A page refresh would reset.
  };

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <span className="ml-4">Joining Room...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/lobby')}>Back to Lobby</Button>
        </div>
      </div>
    );
  }

  if (!gameState || !user) return null;

  const currentPlayer = players.find(p => p.name === user.username) || { id: user._id, name: user.username, color: PlayerColor.RED }; // Fallback
  const opponent = players.find(p => p.name !== user.username) || players.find(p => p.id !== user._id);

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleLeave}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Lobby
          </Button>
          <span className="text-zinc-500 text-sm hidden sm:inline">Room: <span className="text-zinc-300 font-mono">{roomId}</span></span>
        </div>
        <div className="font-bold text-xl tracking-tight">
          TABLETOP<span className="text-emerald-500">LIVE</span>
        </div>
        <div className="w-[100px]"></div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-2 md:p-4 lg:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">

        {/* Left Panel: Current Player */}
        <div className="hidden lg:flex lg:col-span-3 flex-col justify-center">
          <PlayerPanel
            player={currentPlayer as any}
            isCurrentTurn={gameState.turn === currentPlayer.color}
            align="left"
          />
        </div>

        {/* Center Panel: Board */}
        <div className="lg:col-span-6 flex items-center justify-center min-h-[400px]">
          <GameBoard
            gameState={gameState}
            myColor={currentPlayer.color}
            onMove={handleMove}
          />
        </div>

        {/* Right Panel: Opponent & Chat */}
        <div className="lg:col-span-3 flex flex-col gap-6 h-full max-h-[calc(100vh-128px)]">
          {/* Mobile opponent view */}
          <div className="lg:hidden">
            <PlayerPanel
              player={opponent as any || { name: 'Waiting...', avatar: 'https://via.placeholder.com/64' }}
              isCurrentTurn={opponent ? gameState.turn === opponent.color : false}
              align="right"
            />
          </div>

          <div className="hidden lg:block">
            <PlayerPanel
              player={opponent as any || { name: 'Waiting...', avatar: 'https://via.placeholder.com/64' }}
              isCurrentTurn={opponent ? gameState.turn === opponent.color : false}
              align="right"
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <GameLogChat
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUser={currentPlayer as any}
            />
          </div>
        </div>

      </main>
    </div>
  );
};