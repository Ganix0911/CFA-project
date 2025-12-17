import React from 'react';
import { Button } from './Button';
import { ArrowLeft, TrendingUp, Trophy, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const data = [
  { name: 'Chess', wins: 14, losses: 2 },
  { name: 'Checkers', wins: 8, losses: 5 },
  { name: 'Go', wins: 3, losses: 7 },
  { name: 'Backgammon', wins: 10, losses: 3 },
];

export const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // We can use real stats from user object
  const realData = [
    { name: 'Total', wins: user?.stats.wins || 0, losses: user?.stats.losses || 0 }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center gap-4 mb-12">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Menu
          </Button>
          <h1 className="text-3xl font-bold">Player Statistics</h1>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 font-medium">Win Ratio</span>
              <TrendingUp className="text-emerald-500" />
            </div>
            {/* Calculate Ratio */}
            <div className="text-4xl font-bold text-emerald-400">
              {user ? Math.round((user.stats.wins / (user.stats.wins + user.stats.losses || 1)) * 100) : 0}%
            </div>
            <div className="text-sm text-zinc-500 mt-2">Based on total games</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 font-medium">Total Wins</span>
              <Trophy className="text-yellow-500" />
            </div>
            <div className="text-4xl font-bold text-white">{user?.stats.wins || 0}</div>
            <div className="text-sm text-zinc-500 mt-2">Rank: Rookie</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 font-medium">ELO Rating</span>
              <Clock className="text-purple-500" />
            </div>
            <div className="text-4xl font-bold text-white">{user?.stats.rating || 1200}</div>
            <div className="text-sm text-zinc-500 mt-2">Global Ranking: --</div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl h-[400px]">
          <h3 className="text-xl font-bold mb-6">Performance</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={realData.length ? realData : data}>
              <XAxis dataKey="name" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                cursor={{ fill: '#27272a' }}
              />
              <Bar dataKey="wins" name="Wins" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};