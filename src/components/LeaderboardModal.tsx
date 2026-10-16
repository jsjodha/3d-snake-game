import React, { useEffect, useState } from 'react';
import { LeaderboardRow, PlayerProfile } from '../game/types';
import { matchmaking } from '../services/matchmaking';
import { sound } from '../services/audio';

interface LeaderboardModalProps {
  profile: PlayerProfile;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ profile, onClose }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchScores = async (region: string) => {
    setIsLoading(true);
    const data = await matchmaking.getLeaderboard(region);
    setLeaderboard(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchScores(selectedRegion);
  }, [selectedRegion]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-[0_0_35px_rgba(6,182,212,0.3)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-950/80 border border-amber-500/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wider text-slate-100">GLOBAL HALL OF FAME</h2>
              <p className="text-xs text-slate-400">Cross-platform competitive rankings across iOS, Android & Web</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playUiClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Region Filter Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950/40 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">REGION:</span>
            {['all', 'US-East', 'EU-Central', 'Asia-East'].map(reg => (
              <button
                key={reg}
                onClick={() => {
                  sound.playUiClick();
                  setSelectedRegion(reg);
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  selectedRegion === reg
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {reg === 'all' ? 'Worldwide' : reg}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchScores(selectedRegion)}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-xs"
          >
            <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            REFRESH
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-sm">
              Connecting to Cross-Platform Relay Network...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <th className="py-2 px-3">Rank</th>
                  <th className="py-2 px-3">Pilot Name</th>
                  <th className="py-2 px-3">Platform</th>
                  <th className="py-2 px-3 text-right">Max Mass</th>
                  <th className="py-2 px-3 text-right">Kills</th>
                  <th className="py-2 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {leaderboard.map((row, idx) => {
                  const isTop3 = idx < 3;
                  const rankColor =
                    idx === 0 ? 'text-amber-400 font-bold' : idx === 1 ? 'text-slate-300 font-bold' : idx === 2 ? 'text-amber-600 font-bold' : 'text-slate-500';

                  return (
                    <tr
                      key={row.id || idx}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        row.name === profile.username ? 'bg-cyan-950/40 border border-cyan-500/30' : ''
                      }`}
                    >
                      <td className={`py-3 px-3 tabular-nums ${rankColor}`}>#{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{row.name}</span>
                          {row.name === profile.username && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-900 text-cyan-300 font-bold">YOU</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          row.platform === 'iOS'
                            ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                            : row.platform === 'Android'
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                            : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                        }`}>
                          {row.platform}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-emerald-400 font-bold">{row.mass.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-rose-400">{row.kills}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-cyan-300 font-bold text-sm">{row.score.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
