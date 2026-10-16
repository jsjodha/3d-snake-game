import { LeaderboardRow, MatchmakingRoom, PlatformType } from '../game/types';

export const MATCHMAKING_MODES = [
  {
    id: 'ranked',
    name: 'Ranked Cyber League',
    description: 'Tiered competitive arena with skill-based matchmaking and rating rewards.',
    badge: 'COMPETITIVE',
    color: 'cyan',
    icon: 'trophy',
  },
  {
    id: 'quick',
    name: 'Neon Quick Match',
    description: 'Instant drop-in 16-snake frenzy. Casual combat and fast respawns.',
    badge: 'CASUAL',
    color: 'emerald',
    icon: 'zap',
  },
  {
    id: 'high-roller',
    name: 'Apex Bounty Arena',
    description: 'High stakes: double orb mass, aggressive predator AI, 2.5x credit payouts.',
    badge: 'HIGH STAKES',
    color: 'rose',
    icon: 'flame',
  },
  {
    id: 'offline',
    name: 'Offline Simulation Protocol',
    description: 'Zero network required. Full 3D simulation against autonomous neural bot snakes.',
    badge: 'OFFLINE SYNC',
    color: 'amber',
    icon: 'shield',
  },
];

export const REGIONS = [
  { id: 'US-East', name: 'North America (US-East)', basePing: 18 },
  { id: 'EU-Central', name: 'Europe (EU-Central)', basePing: 34 },
  { id: 'Asia-East', name: 'Asia Pacific (Asia-East)', basePing: 26 },
  { id: 'Global', name: 'Global Mesh (Fastest)', basePing: 22 },
];

class MatchmakingService {
  public async requestMatch(mode: string, region: string, rating: number): Promise<MatchmakingRoom> {
    if (mode === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return {
        arenaId: `local-sim-${Math.random().toString(36).substring(2, 6)}`,
        mode: 'offline',
        region: 'Local Mesh',
        pingMs: 0,
        connectedPlayers: 12,
        maxPlayers: 16,
        arenaBounds: 340,
        tier: 'Autonomous Grid',
      };
    }

    try {
      const res = await fetch('/api/matchmake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, region, rating }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data;
        }
      }
    } catch {}

    // Fallback room
    const regionObj = REGIONS.find(r => r.id === region) || REGIONS[0];
    return {
      arenaId: `arena-${region.toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`,
      mode,
      region,
      pingMs: regionObj.basePing + Math.floor(Math.random() * 8),
      connectedPlayers: 14,
      maxPlayers: 16,
      arenaBounds: 360,
      tier: rating > 1800 ? 'Cyber Master' : rating > 1200 ? 'Gold Tier' : 'Silver Tier',
    };
  }

  public async getLeaderboard(region: string = 'all'): Promise<LeaderboardRow[]> {
    try {
      const res = await fetch(`/api/leaderboard?region=${encodeURIComponent(region)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.leaderboard)) {
          return data.leaderboard;
        }
      }
    } catch {}

    // Offline / fallback leaderboard records
    const fallback: LeaderboardRow[] = [
      { id: 'fb-1', name: 'CYBER_V1P3R', score: 184500, mass: 12400, kills: 29, platform: 'iOS', skin: 'neon-cyan', timestamp: Date.now() - 3600000, region: 'US-East' },
      { id: 'fb-2', name: 'NEXUS_SERPENT', score: 142100, mass: 9800, kills: 22, platform: 'Android', skin: 'crimson-inferno', timestamp: Date.now() - 7200000, region: 'EU-Central' },
      { id: 'fb-3', name: 'KINETIC_BOA', score: 119800, mass: 8350, kills: 18, platform: 'Web', skin: 'matrix-lime', timestamp: Date.now() - 10800000, region: 'Asia-East' },
      { id: 'fb-4', name: 'APEX_TITAN', score: 98400, mass: 6900, kills: 15, platform: 'iOS', skin: 'solar-gold', timestamp: Date.now() - 14400000, region: 'US-East' },
      { id: 'fb-5', name: 'VOID_CRAWLER', score: 84300, mass: 5800, kills: 13, platform: 'Android', skin: 'plasma-violet', timestamp: Date.now() - 18000000, region: 'EU-Central' },
    ];
    return fallback;
  }

  public async submitScore(entry: {
    name: string;
    score: number;
    mass: number;
    kills: number;
    platform: PlatformType;
    skin: string;
    region: string;
  }): Promise<{ success: boolean; rank?: number }> {
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, rank: data.rank };
      }
    } catch {}
    return { success: false };
  }
}

export const matchmaking = new MatchmakingService();
