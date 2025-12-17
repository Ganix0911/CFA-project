import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { Loader2, UserPlus, Play, RefreshCw, LogOut } from 'lucide-react';
import { socketService } from '@/services/socketService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface GameSession {
  roomId: string;
  gameType: string;
  players: { userId: string, username: string, color: string }[];
  status: string;
  createdAt: string;
}

export const Lobby: React.FC = () => {
  const [activeGames, setActiveGames] = useState<GameSession[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const fetchGames = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/game`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveGames(data);
      }
    } catch (error) {
      console.error("Failed to fetch games", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000); // 5s Polling for lobby
    return () => clearInterval(interval);
  }, []);

  const handleCreateGame = async (gameType: 'CHESS' | 'CHECKERS') => {
    if (!user) return;
    setCreating(true);
    try {
      const roomId = await socketService.createRoom(user.username, gameType);
      if (roomId) {
        navigate(`/game/${roomId}`);
      }
    } catch (error) {
      console.error("Failed to create room", error);
      alert("Failed to create room: " + error);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async (roomId: string) => {
    if (!user) return;
    try {
      const success = await socketService.joinRoom(roomId, user.username);
      if (success) {
        navigate(`/game/${roomId}`);
      } else {
        alert("Failed to join room (Full or Not Found)");
      }
    } catch (error) {
      console.error("Failed to join room", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="bg-emerald-500 w-3 h-3 rounded-full animate-pulse"></span>
              Game Lobby
            </h1>
            <p className="text-zinc-400 mt-1">Welcome back, <span className="text-white font-bold">{user?.username}</span></p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" onClick={fetchGames} disabled={loading}>
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-2" /> Logout
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Game Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Play className="text-emerald-500" /> Start New Game
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => handleCreateGame('CHESS')}
                  disabled={creating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-4 rounded-xl flex items-center justify-between group transition-all"
                >
                  <span className="font-bold">Create Chess Match</span>
                  <Play className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => handleCreateGame('CHECKERS')}
                  disabled={creating}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white p-4 rounded-xl flex items-center justify-between group transition-all"
                >
                  <span className="font-bold">Create Checkers Match</span>
                  <Play className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold text-zinc-400 text-sm uppercase mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-400">{user?.stats.wins || 0}</div>
                  <div className="text-xs text-zinc-500">Wins</div>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-red-400">{user?.stats.losses || 0}</div>
                  <div className="text-xs text-zinc-500">Losses</div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Games List */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-[600px] flex flex-col">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <UserPlus className="text-emerald-500" /> Active Games
              </h2>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
                {loading && activeGames.length === 0 ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  </div>
                ) : activeGames.length === 0 ? (
                  <div className="text-center text-zinc-500 py-10">
                    No active games found. Create one to start playing!
                  </div>
                ) : (
                  activeGames.map((game) => (
                    <div key={game.roomId} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-emerald-500/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${game.gameType === 'CHESS' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {game.gameType === 'CHESS' ? '♔' : '◎'}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {game.players[0]?.username}'s Room
                          </div>
                          <div className="text-xs text-zinc-500 flex gap-2">
                            <span>{game.gameType}</span>
                            <span>•</span>
                            <span className="font-mono">{game.roomId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="text-sm text-zinc-400">{game.players.length}/2 Players</div>
                          <div className="text-xs text-zinc-500">{game.status}</div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleJoinGame(game.roomId)}
                          disabled={game.players.length >= 2 || game.status !== 'waiting'}
                        >
                          {game.players.length >= 2 ? 'Full' : 'Join'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};