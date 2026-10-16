import React from 'react';
import { GameSimulation } from '../game/simulation';

interface HUDProps {
  score: number;
  mass: number;
  comboMultiplier: number;
  kills: number;
  maxCombo: number;
  simulation: GameSimulation | null;
  onPause: () => void;
  isBoosting: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  mass,
  comboMultiplier,
  kills,
  simulation,
  onPause,
  isBoosting,
}) => {
  const liveLeaderboard = simulation ? simulation.getLiveArenaLeaderboard() : [];
  const comboState = simulation?.combo;
  const comboPercent = comboState && comboState.timer > 0 ? (comboState.timer / comboState.maxTimer) * 100 : 0;
  const shieldHp = simulation?.player.shieldHp || 0;

  // Radar coordinates calculation
  const playerPos = simulation?.player.headPosition || { x: 0, z: 0 };
  const arenaRadius = simulation?.arenaRadius || 180;
  const radarSize = 100;
  const toRadar = (x: number, z: number) => {
    const rx = (x / arenaRadius) * (radarSize / 2 - 6) + radarSize / 2;
    const rz = (z / arenaRadius) * (radarSize / 2 - 6) + radarSize / 2;
    return { x: rx, y: rz };
  };

  const playerRadar = toRadar(playerPos.x, playerPos.z);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Bar */}
      <div className="w-full flex items-start justify-between">
        {/* Left Status Cluster: Score, Mass, Kills, Shield */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Main Score & Mass */}
          <div className="bg-slate-950/85 border border-cyan-500/40 px-3 py-2 rounded-sm shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Score</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 tabular-nums leading-none">
                {score.toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Mass</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums leading-none">
                {mass.toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Kills</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-rose-400 tabular-nums leading-none">
                {kills}
              </div>
            </div>
          </div>

          {/* Shield Status indicator */}
          {shieldHp > 0 && (
            <div className="bg-slate-950/85 border border-cyan-400/60 px-2.5 py-1 rounded-sm text-xs flex items-center gap-2 text-cyan-300 font-mono">
              <svg className="w-3.5 h-3.5 text-cyan-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
              </svg>
              <span>EMP SHIELD: <strong>{shieldHp} CHARGE{shieldHp > 1 ? 'S' : ''}</strong></span>
            </div>
          )}
        </div>

        {/* Center: Dynamic Combo Multiplier Banner */}
        <div className="flex flex-col items-center">
          {comboMultiplier > 1 && (
            <div className="flex flex-col items-center animate-bounce-short">
              <div className="px-4 py-1 rounded-sm bg-slate-950/90 border border-rose-500/80 text-rose-400 font-black tracking-widest text-lg sm:text-xl font-mono shadow-[0_0_20px_rgba(244,63,94,0.6)]">
                COMBO x{comboMultiplier.toFixed(1)}
              </div>
              {/* Decaying streak timer bar */}
              <div className="w-32 h-1.5 bg-slate-900 border border-rose-500/30 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, comboPercent))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Status Cluster: Pause button & Real-time Arena Top 10 */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Pause Button */}
          <button
            onClick={onPause}
            className="p-2 rounded-sm bg-slate-950/85 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Pause Game (Esc)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>

          {/* Arena Top 10 Leaderboard */}
          <div className="hidden sm:block bg-slate-950/85 border border-slate-800 p-2.5 rounded-sm w-48 text-xs">
            <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-800/80 pb-1">
              <span>ARENA TOP 10</span>
              <span className="text-cyan-400">MASS</span>
            </div>
            <div className="space-y-0.5">
              {liveLeaderboard.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between font-mono text-[11px] px-1 py-0.5 rounded ${
                    item.isPlayer
                      ? 'bg-cyan-950/70 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="truncate max-w-[100px]">
                    {idx + 1}. {item.name}
                  </span>
                  <span className="tabular-nums font-mono">{item.mass}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Perimeter Bar: Boost status & Radar Minimap */}
      <div className="w-full flex items-end justify-between">
        {/* Boost status */}
        <div className="flex items-center gap-2">
          {isBoosting && (
            <div className="px-3 py-1 rounded bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs font-mono font-bold tracking-wider animate-pulse flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              HYPERDRIVE ACTIVE
            </div>
          )}
        </div>

        {/* Circular Radar Minimap (Bottom-Right) */}
        <div className="pointer-events-auto bg-slate-950/90 border border-cyan-500/40 rounded-full p-1 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <svg width={radarSize} height={radarSize} className="rounded-full overflow-hidden">
            {/* Arena boundary circle */}
            <circle
              cx={radarSize / 2}
              cy={radarSize / 2}
              r={radarSize / 2 - 3}
              fill="#030712"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            {/* Inner radar grid crosshair */}
            <line
              x1={radarSize / 2}
              y1={4}
              x2={radarSize / 2}
              y2={radarSize - 4}
              stroke="rgba(6, 182, 212, 0.2)"
              strokeWidth="1"
            />
            <line
              x1={4}
              y1={radarSize / 2}
              x2={radarSize - 4}
              y2={radarSize / 2}
              stroke="rgba(6, 182, 212, 0.2)"
              strokeWidth="1"
            />

            {/* Other AI snakes on radar */}
            {simulation?.aiSnakes
              .filter(s => s.isAlive)
              .map(ai => {
                const pt = toRadar(ai.headPosition.x, ai.headPosition.z);
                return (
                  <circle
                    key={ai.id}
                    cx={pt.x}
                    cy={pt.y}
                    r={Math.min(4, Math.max(2, ai.mass / 80))}
                    fill="#f43f5e"
                    opacity="0.8"
                  />
                );
              })}

            {/* Player snake on radar */}
            <circle
              cx={playerRadar.x}
              cy={playerRadar.y}
              r="3.5"
              fill="#22d3ee"
              stroke="#ffffff"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
