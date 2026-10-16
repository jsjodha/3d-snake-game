import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  mass: number;
  kills: number;
  platform: 'iOS' | 'Android' | 'Web';
  skin: string;
  timestamp: number;
  region: string;
}

// In-memory cross-platform leaderboard database with initial high-tier records
const globalLeaderboard: LeaderboardEntry[] = [
  { id: 'lb-1', name: 'CYBER_V1P3R', score: 184500, mass: 12400, kills: 29, platform: 'iOS', skin: 'neon-cyan', timestamp: Date.now() - 1000 * 60 * 30, region: 'US-East' },
  { id: 'lb-2', name: 'NEXUS_SERPENT', score: 142100, mass: 9800, kills: 22, platform: 'Android', skin: 'crimson-inferno', timestamp: Date.now() - 1000 * 60 * 95, region: 'EU-Central' },
  { id: 'lb-3', name: 'KINETIC_BOA', score: 119800, mass: 8350, kills: 18, platform: 'Web', skin: 'matrix-lime', timestamp: Date.now() - 1000 * 60 * 140, region: 'Asia-East' },
  { id: 'lb-4', name: 'APEX_TITAN', score: 98400, mass: 6900, kills: 15, platform: 'iOS', skin: 'solar-gold', timestamp: Date.now() - 1000 * 60 * 240, region: 'US-East' },
  { id: 'lb-5', name: 'VOID_CRAWLER', score: 84300, mass: 5800, kills: 13, platform: 'Android', skin: 'plasma-violet', timestamp: Date.now() - 1000 * 60 * 320, region: 'EU-Central' },
  { id: 'lb-6', name: 'GLITCH_FANG', score: 71200, mass: 4950, kills: 11, platform: 'Web', skin: 'neon-cyan', timestamp: Date.now() - 1000 * 60 * 400, region: 'Global' },
  { id: 'lb-7', name: 'NEO_HYDRA', score: 58900, mass: 4100, kills: 9, platform: 'iOS', skin: 'crimson-inferno', timestamp: Date.now() - 1000 * 60 * 480, region: 'Asia-East' },
  { id: 'lb-8', name: 'SYNTH_ORBIT', score: 46700, mass: 3300, kills: 7, platform: 'Android', skin: 'solar-gold', timestamp: Date.now() - 1000 * 60 * 560, region: 'US-East' },
];

// Cloud backup storage map (User ID -> Cloud Saved Profile Data)
const cloudBackups = new Map<string, any>();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '5mb' }));

  // API Endpoints
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', serverTime: Date.now(), service: 'Ouroboros 3D Arena Server' });
  });

  // Global Cross-Platform Leaderboard
  app.get('/api/leaderboard', (req: Request, res: Response) => {
    const region = req.query.region as string;
    let list = [...globalLeaderboard];
    if (region && region !== 'all') {
      list = list.filter(item => item.region === region || item.region === 'Global');
    }
    list.sort((a, b) => b.score - a.score);
    res.json({ success: true, count: list.length, leaderboard: list.slice(0, 50) });
  });

  // Submit high score to global leaderboard
  app.post('/api/leaderboard', (req: Request, res: Response) => {
    const { name, score, mass, kills, platform, skin, region } = req.body;
    if (!name || typeof score !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid score payload' });
    }

    const newEntry: LeaderboardEntry = {
      id: `lb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: String(name).slice(0, 20),
      score: Math.max(0, Math.floor(score)),
      mass: Math.max(100, Math.floor(mass || 100)),
      kills: Math.max(0, Math.floor(kills || 0)),
      platform: ['iOS', 'Android', 'Web'].includes(platform) ? platform : 'Web',
      skin: skin || 'neon-cyan',
      timestamp: Date.now(),
      region: region || 'Global',
    };

    globalLeaderboard.push(newEntry);
    globalLeaderboard.sort((a, b) => b.score - a.score);
    if (globalLeaderboard.length > 200) {
      globalLeaderboard.length = 200;
    }

    const rank = globalLeaderboard.findIndex(e => e.id === newEntry.id) + 1;
    res.json({ success: true, entry: newEntry, rank });
  });

  // Cloud Save Sync
  app.post('/api/cloud/sync', (req: Request, res: Response) => {
    const { userId, profile, pendingScores } = req.body;
    if (!userId || !profile) {
      return res.status(400).json({ success: false, error: 'userId and profile are required' });
    }

    // Process any offline scores in batch
    if (Array.isArray(pendingScores) && pendingScores.length > 0) {
      for (const scoreItem of pendingScores) {
        if (scoreItem.score) {
          globalLeaderboard.push({
            id: `lb-sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: profile.username || 'CyberPilot',
            score: Math.floor(scoreItem.score),
            mass: Math.floor(scoreItem.mass || 100),
            kills: Math.floor(scoreItem.kills || 0),
            platform: profile.platform || 'Web',
            skin: profile.selectedSkin || 'neon-cyan',
            timestamp: scoreItem.timestamp || Date.now(),
            region: profile.region || 'Global',
          });
        }
      }
      globalLeaderboard.sort((a, b) => b.score - a.score);
    }

    // Update cloud backup record
    const existingBackup = cloudBackups.get(userId);
    const updatedProfile = {
      ...profile,
      lastSyncedAt: Date.now(),
      version: (existingBackup?.version || 0) + 1,
    };
    cloudBackups.set(userId, updatedProfile);

    res.json({
      success: true,
      lastSyncedAt: updatedProfile.lastSyncedAt,
      version: updatedProfile.version,
      cloudProfile: updatedProfile,
    });
  });

  // Cloud Save Retrieval
  app.get('/api/cloud/sync/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    const backup = cloudBackups.get(userId);
    if (!backup) {
      return res.json({ success: true, exists: false });
    }
    res.json({ success: true, exists: true, profile: backup });
  });

  // Matchmaking Lobby Simulation
  app.post('/api/matchmake', (req: Request, res: Response) => {
    const { mode, region, rating } = req.body;
    const arenaId = `arena-${(region || 'US-East').toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`;
    const basePing = region === 'Asia-East' ? 28 : region === 'EU-Central' ? 32 : 18;
    const ping = basePing + Math.floor(Math.random() * 12);

    res.json({
      success: true,
      arenaId,
      mode: mode || 'ranked',
      region: region || 'US-East',
      pingMs: ping,
      connectedPlayers: Math.floor(8 + Math.random() * 6),
      maxPlayers: 16,
      arenaBounds: 360,
      tier: rating > 2000 ? 'Diamond' : rating > 1200 ? 'Gold' : 'Silver',
    });
  });

  if (!isProduction) {
    // Mount Vite in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Ouroboros 3D Arena] Server operational on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
