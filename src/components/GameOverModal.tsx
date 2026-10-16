import React, { useEffect } from 'react';
import { MatchStats } from '../game/types';
import { sound } from '../services/audio';

interface GameOverModalProps {
  stats: MatchStats;
  isNewHighScore: boolean;
  onRestart: () => void;
  onReturnToLobby: () => void;
  onOpenLeaderboard: () => void;
  onOpenUpgrades: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isNewHighScore,
  onRestart,
  onReturnToLobby,
  onOpenLeaderboard,
  onOpenUpgrades,
}) => {
  // Enter/Space restarts, Esc returns to title
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        sound.playUiClick();
        onRestart();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        sound.playUiClick();
        onReturnToLobby();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart, onReturnToLobby]);

  const minutes = Math.floor(stats.survivalTimeSeconds / 60);
  const seconds = Math.floor(stats.survivalTimeSeconds % 60);
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm pointer-events-auto select-none">
      <div className="bg-slate-900 border border-rose-500/60 rounded-lg max-w-lg w-full flex flex-col shadow-[0_0_40px_rgba(244,63,94,0.35)] overflow-hidden animate-scale-up">
        {/* Header Banner */}
        <div className="px-6 py-5 bg-rose-950/40 border-b border-rose-500/30 text-center relative">
          {isNewHighScore && (
            <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] font-mono tracking-widest uppercase mb-2 shadow-[0_0_15px_rgba(245,158,11,0.8)]">
              ★ NEW HIGH SCORE RECORD ★
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-rose-400">
            CHASSIS COMPROMISED
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Vaporized by <strong className="text-rose-300">{stats.killerName || 'Energy Barrier'}</strong>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 font-mono">
            {/* Score */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Total Score</div>
              <div className="text-xl font-bold text-cyan-300 tabular-nums">
                {stats.score.toLocaleString()}
              </div>
            </div>

            {/* Mass */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Peak Mass</div>
              <div className="text-xl font-bold text-emerald-400 tabular-nums">
                {stats.mass.toLocaleString()}
              </div>
            </div>

            {/* Kills */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Snakes Annihilated</div>
              <div className="text-xl font-bold text-rose-400 tabular-nums">
                {stats.kills}
              </div>
            </div>

            {/* Max Combo */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Max Combo Streak</div>
              <div className="text-xl font-bold text-amber-400 tabular-nums">
                x{Math.min(10, 1 + Math.floor(stats.maxCombo / 3) * 0.5).toFixed(1)} ({stats.maxCombo})
              </div>
            </div>

            {/* Survival Time */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Survival Time</div>
              <div className="text-lg font-bold text-slate-200 tabular-nums">
                {formattedTime}
              </div>
            </div>

            {/* Credits Earned */}
            <div className="p-3 rounded bg-slate-950/80 border border-amber-500/30">
              <div className="text-[10px] text-amber-400 uppercase">Credits Harvested</div>
              <div className="text-lg font-bold text-amber-300 tabular-nums">
                +{stats.creditsEarned.toLocaleString()} CR
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                sound.playUiClick();
                onRestart();
              }}
              className="w-full py-3 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono tracking-wider text-base transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
              RE-DEPLOY NOW (SPACE)
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  sound.playUiClick();
                  onOpenUpgrades();
                }}
                className="py-2.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold tracking-wider transition-all truncate border border-slate-700"
              >
                UPGRADES
              </button>
              <button
                onClick={() => {
                  sound.playUiClick();
                  onOpenLeaderboard();
                }}
                className="py-2.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold tracking-wider transition-all truncate border border-slate-700"
              >
                RANKS
              </button>
              <button
                onClick={() => {
                  sound.playUiClick();
                  onReturnToLobby();
                }}
                className="py-2.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold tracking-wider transition-all truncate border border-slate-700"
              >
                LOBBY (ESC)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
