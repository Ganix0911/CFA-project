import React from 'react';
import { Player, PlayerColor } from '@/types';
import { Trophy, ShieldAlert, CircleDot } from 'lucide-react';

interface PlayerPanelProps {
  player: Player;
  isCurrentTurn: boolean;
  align?: 'left' | 'right';
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ player, isCurrentTurn, align = 'left' }) => {
  return (
    <div className={`
      flex flex-col gap-4 p-5 rounded-xl border transition-all duration-500
      ${isCurrentTurn 
        ? 'bg-zinc-800/80 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)] scale-105' 
        : 'bg-zinc-900/50 border-zinc-800 opacity-80'
      }
    `}>
      {/* Header */}
      <div className={`flex items-center gap-4 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
        <div className="relative">
          <img 
            src={player.avatar} 
            alt={player.name} 
            className={`w-16 h-16 rounded-full border-2 ${isCurrentTurn ? 'border-emerald-400' : 'border-zinc-600'}`}
          />
          <div className={`
            absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-zinc-900 flex items-center justify-center
            ${player.color === PlayerColor.RED ? 'bg-red-500' : 'bg-blue-500'}
          `}>
             <span className="w-2 h-2 rounded-full bg-white/50"></span>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-white">{player.name}</h3>
          <div className={`flex items-center gap-2 text-sm ${align === 'right' ? 'justify-end' : ''}`}>
            {isCurrentTurn ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
                <CircleDot size={12} /> Making Move...
              </span>
            ) : (
              <span className="text-zinc-500">Waiting</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Mini-Dashboard */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Trophy size={12} className="text-yellow-500" /> WINS
          </div>
          <p className="text-lg font-mono text-white">{player.stats.wins}</p>
        </div>
        <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <ShieldAlert size={12} className="text-red-500" /> LOSSES
          </div>
          <p className="text-lg font-mono text-white">{player.stats.losses}</p>
        </div>
      </div>
    </div>
  );
};