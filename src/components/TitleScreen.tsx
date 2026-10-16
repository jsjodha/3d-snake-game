import React, { useEffect, useState } from 'react';
import { PlayerProfile, SnakeSkin } from '../game/types';
import { DEFAULT_SKINS } from '../services/storage';
import { MATCHMAKING_MODES, REGIONS } from '../services/matchmaking';
import { sound } from '../services/audio';

interface TitleScreenProps {
  profile: PlayerProfile;
  onStartGame: (selectedMode: string, selectedRegion: string) => void;
  onOpenUpgrades: () => void;
  onOpenLeaderboard: () => void;
  onOpenCloudSync: () => void;
  onSelectSkin: (skinId: string) => void;
  isOnline: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  profile,
  onStartGame,
  onOpenUpgrades,
  onOpenLeaderboard,
  onOpenCloudSync,
  onSelectSkin,
  isOnline,
}) => {
  const [selectedMode, setSelectedMode] = useState<string>('ranked');
  const [selectedRegion, setSelectedRegion] = useState<string>(profile.region || 'US-East');

  // Keyboard shortcut to start: Enter or Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        sound.playUiClick();
        onStartGame(selectedMode, selectedRegion);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode, selectedRegion, onStartGame]);

  const currentSkin = DEFAULT_SKINS.find(s => s.id === profile.selectedSkin) || DEFAULT_SKINS[0];

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 pointer-events-none select-none">
      {/* Top Bar: Profile Status, Credits, and Cloud Sync Badge */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Cyber Avatar badge */}
          <div className="w-10 h-10 rounded-sm bg-slate-900 border border-cyan-500/40 flex items-center justify-center neon-box-cyan">
            <svg className="w-6 h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-slate-100 text-sm">{profile.username}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono">
                {profile.platform}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>HIGH SCORE: <strong className="text-amber-400 font-mono tabular-nums">{profile.highestScore.toLocaleString()}</strong></span>
              <span>MASS: <strong className="text-emerald-400 font-mono tabular-nums">{profile.highestMass.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Action badges: Credits, Cloud Sync, Leaderboard */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cyber Credits */}
          <div className="px-3 py-1.5 rounded-sm bg-slate-900/90 border border-amber-500/40 flex items-center gap-2 text-xs">
            <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-amber-300 font-mono font-bold tabular-nums">{profile.credits.toLocaleString()} CR</span>
          </div>

          {/* Cloud Sync Status Button */}
          <button
            onClick={() => {
              sound.playUiClick();
              onOpenCloudSync();
            }}
            className={`px-3 py-1.5 rounded-sm border text-xs flex items-center gap-1.5 transition-all ${
              isOnline
                ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                : 'bg-slate-900/90 border-amber-500/40 text-amber-300 hover:border-amber-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
            <span className="hidden sm:inline font-mono">{isOnline ? 'CLOUD SYNC' : 'OFFLINE MODE'}</span>
          </button>

          {/* Leaderboard button */}
          <button
            onClick={() => {
              sound.playUiClick();
              onOpenLeaderboard();
            }}
            className="px-3 py-1.5 rounded-sm bg-slate-900/90 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 text-xs flex items-center gap-1.5 transition-all"
          >
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
              <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <span className="hidden sm:inline">LEADERBOARD</span>
          </button>
        </div>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup with 30-40% Negative Space */}
      <div className="flex flex-col items-center justify-center my-auto text-center pointer-events-auto">
        <div className="mb-2">
          {/* Bespoke inline SVG title lockup */}
          <svg className="w-72 sm:w-96 md:w-[480px] h-auto filter drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]" viewBox="0 0 600 130">
            <defs>
              <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>
            {/* Cyber hex decorative motif */}
            <polygon points="300,5 315,13 315,31 300,40 285,31 285,13" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
            <circle cx="300" cy="22" r="3" fill="#f43f5e" />
            {/* Main title text */}
            <text
              x="50%"
              y="85"
              textAnchor="middle"
              fill="url(#cyberGrad)"
              fontFamily="'Chakra Petch', sans-serif"
              fontWeight="700"
              fontSize="68"
              letterSpacing="6"
            >
              OUROBOROS
            </text>
            <text
              x="50%"
              y="120"
              textAnchor="middle"
              fill="#e2e8f0"
              fontFamily="'Chakra Petch', sans-serif"
              fontWeight="600"
              fontSize="20"
              letterSpacing="12"
              opacity="0.85"
            >
              3D CYBER ARENA
            </text>
          </svg>
        </div>

        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-6 tracking-wide">
          Realistic 3D slither combat. Consume energy nodes, slice enemy snakes, and dominate the cross-platform grid.
        </p>

        {/* Matchmaking Mode & Region Selector */}
        <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-md max-w-lg w-full mb-6 text-left">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Matchmaking Protocol</span>
            <span className="text-cyan-400">{isOnline ? 'Online Grid' : 'Offline Engine'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {MATCHMAKING_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => {
                  sound.playUiClick();
                  setSelectedMode(mode.id);
                }}
                className={`p-2 rounded text-left transition-all border ${
                  selectedMode === mode.id
                    ? 'bg-cyan-950/70 border-cyan-400 text-slate-100 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold">{mode.name}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono text-cyan-400">{mode.badge}</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight line-clamp-1">{mode.description}</div>
              </button>
            ))}
          </div>

          {/* Region selector */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Server Grid:</span>
            <div className="flex items-center gap-1.5">
              {REGIONS.map(reg => (
                <button
                  key={reg.id}
                  onClick={() => {
                    sound.playUiClick();
                    setSelectedRegion(reg.id);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                    selectedRegion === reg.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {reg.id} ({reg.basePing}ms)
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Start CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              sound.playUiClick();
              onStartGame(selectedMode, selectedRegion);
            }}
            className="w-64 sm:w-72 py-3.5 px-8 rounded-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-widest text-base sm:text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            ENTER ARENA
          </button>

          {/* Upgrades Garage Button */}
          <button
            onClick={() => {
              sound.playUiClick();
              onOpenUpgrades();
            }}
            className="w-64 sm:w-auto py-3.5 px-6 rounded-sm bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700 hover:border-cyan-500/50 text-slate-200 font-bold tracking-wider text-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            CYBER UPGRADES
          </button>
        </div>
      </div>

      {/* Bottom Footer: Single flat control-hint line */}
      <div className="w-full text-center pointer-events-auto">
        <div className="inline-flex items-center gap-2 sm:gap-4 px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-800/80 text-[11px] sm:text-xs text-slate-400 font-mono">
          <span><strong className="text-slate-200">WASD / Mouse / Touch</strong> Steer</span>
          <span className="text-slate-700">·</span>
          <span><strong className="text-cyan-400">Space / Click / Boost</strong> Hyperdrive</span>
          <span className="text-slate-700">·</span>
          <span><strong className="text-slate-200">Esc</strong> Pause</span>
        </div>
      </div>
    </div>
  );
};
