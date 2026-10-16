import { PlayerProfile, MatchStats, PlatformType } from '../game/types';

const DB_NAME = 'Ouroboros3D_DB';
const DB_VERSION = 1;
const PROFILE_STORE = 'player_profile';
const MATCHES_STORE = 'match_history';
const SYNC_QUEUE_STORE = 'sync_queue';

function detectPlatform(): PlatformType {
  if (typeof window === 'undefined') return 'Web';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  return 'Web';
}

export const DEFAULT_SKINS = [
  { id: 'neon-cyan', name: 'Cyber Cyan', primaryColor: '#06b6d4', emissiveColor: '#22d3ee', glowColor: '#0891b2', scalePattern: 'cyber-hex' as const, unlockedByDefault: true, cost: 0 },
  { id: 'crimson-inferno', name: 'Crimson Surge', primaryColor: '#f43f5e', emissiveColor: '#fb7185', glowColor: '#e11d48', scalePattern: 'plasma' as const, unlockedByDefault: true, cost: 0 },
  { id: 'matrix-lime', name: 'Matrix Circuit', primaryColor: '#10b981', emissiveColor: '#34d399', glowColor: '#059669', scalePattern: 'circuit' as const, unlockedByDefault: false, cost: 500 },
  { id: 'solar-gold', name: 'Solar Apex', primaryColor: '#f59e0b', emissiveColor: '#fbbf24', glowColor: '#d97706', scalePattern: 'carbon' as const, unlockedByDefault: false, cost: 1200 },
  { id: 'plasma-violet', name: 'Void Phantom', primaryColor: '#8b5cf6', emissiveColor: '#a78bfa', glowColor: '#7c3aed', scalePattern: 'plasma' as const, unlockedByDefault: false, cost: 2500 },
  { id: 'hazard-orange', name: 'Reactor Hazard', primaryColor: '#ea580c', emissiveColor: '#fb923c', glowColor: '#c2410c', scalePattern: 'hazard' as const, unlockedByDefault: false, cost: 4000 },
];

export const UPGRADE_DEFINITIONS = [
  {
    id: 'magnet_range',
    name: 'Vacuum Induction Core',
    description: 'Pulls energy orbs toward the snake head from greater range.',
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.8,
    baseValue: 4.0,
    perLevel: 1.5,
    unit: 'm radius',
    icon: 'magnet',
  },
  {
    id: 'boost_efficiency',
    name: 'Hyperdrive Thrusters',
    description: 'Increases boost acceleration while reducing body mass burn rate.',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.9,
    baseValue: 1.0,
    perLevel: 0.2,
    unit: 'x efficiency',
    icon: 'zap',
  },
  {
    id: 'kinetic_shield',
    name: 'Kinetic EMP Plating',
    description: 'Absorbs lethal head collisions or arena hazard impacts.',
    maxLevel: 5,
    baseCost: 350,
    costMultiplier: 2.1,
    baseValue: 0,
    perLevel: 1,
    unit: 'hits absorbed',
    icon: 'shield',
  },
  {
    id: 'mass_digestion',
    name: 'Plasma Synthesizer',
    description: 'Amplifies mass and score gained per energy orb eaten.',
    maxLevel: 5,
    baseCost: 250,
    costMultiplier: 2.0,
    baseValue: 1.0,
    perLevel: 0.25,
    unit: 'x mass yield',
    icon: 'trending-up',
  },
  {
    id: 'hazard_trail',
    name: 'Neon Blaze Exhaust',
    description: 'Leaves a searing hazard trail while boosting that slows & cuts off enemies.',
    maxLevel: 3,
    baseCost: 500,
    costMultiplier: 2.5,
    baseValue: 0,
    perLevel: 1,
    unit: 'tier potency',
    icon: 'flame',
  },
];

class StorageService {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private currentProfile: PlayerProfile | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.triggerSync();
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify();
      });
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async init(): Promise<PlayerProfile> {
    try {
      this.db = await this.openDatabase();
    } catch (e) {
      console.warn('IndexedDB unavailable, falling back to localStorage', e);
    }

    let profile = await this.loadLocalProfile();
    if (!profile) {
      profile = this.createDefaultProfile();
      await this.saveLocalProfile(profile);
    }
    this.currentProfile = profile;

    // Trigger cloud sync if online
    if (this.isOnline) {
      this.triggerSync().catch(console.error);
    }

    return profile;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PROFILE_STORE)) {
          db.createObjectStore(PROFILE_STORE, { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains(MATCHES_STORE)) {
          db.createObjectStore(MATCHES_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private createDefaultProfile(): PlayerProfile {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return {
      userId: `USR-${Date.now()}-${randomHex}`,
      username: `CYBER_${randomHex}`,
      credits: 300,
      highestScore: 0,
      highestMass: 100,
      totalKills: 0,
      matchesPlayed: 0,
      selectedSkin: 'neon-cyan',
      unlockedSkins: ['neon-cyan', 'crimson-inferno'],
      upgrades: {
        magnet_range: 1,
        boost_efficiency: 1,
        kinetic_shield: 0,
        mass_digestion: 1,
        hazard_trail: 0,
      },
      platform: detectPlatform(),
      region: 'US-East',
      lastSyncedAt: 0,
      version: 1,
    };
  }

  public getProfile(): PlayerProfile {
    if (!this.currentProfile) {
      this.currentProfile = this.createDefaultProfile();
    }
    return this.currentProfile;
  }

  public async updateProfile(updates: Partial<PlayerProfile>): Promise<PlayerProfile> {
    const updated = {
      ...this.getProfile(),
      ...updates,
      version: (this.currentProfile?.version || 1) + 1,
    };
    this.currentProfile = updated;
    await this.saveLocalProfile(updated);
    this.notify();

    if (this.isOnline) {
      this.triggerSync().catch(console.error);
    }
    return updated;
  }

  private async loadLocalProfile(): Promise<PlayerProfile | null> {
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(PROFILE_STORE, 'readonly');
          const store = tx.objectStore(PROFILE_STORE);
          const req = store.getAll();
          req.onsuccess = () => {
            if (req.result && req.result.length > 0) {
              resolve(req.result[0]);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    const raw = localStorage.getItem('ouroboros_profile');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }

  private async saveLocalProfile(profile: PlayerProfile): Promise<void> {
    localStorage.setItem('ouroboros_profile', JSON.stringify(profile));

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(PROFILE_STORE, 'readwrite');
          const store = tx.objectStore(PROFILE_STORE);
          store.put(profile);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  public async recordMatch(stats: MatchStats): Promise<{ newHigh: boolean; creditsEarned: number }> {
    const profile = this.getProfile();
    const newHigh = stats.score > profile.highestScore;

    const updatedProfile: PlayerProfile = {
      ...profile,
      highestScore: Math.max(profile.highestScore, stats.score),
      highestMass: Math.max(profile.highestMass, stats.mass),
      totalKills: profile.totalKills + stats.kills,
      matchesPlayed: profile.matchesPlayed + 1,
      credits: profile.credits + stats.creditsEarned,
      version: profile.version + 1,
    };

    this.currentProfile = updatedProfile;
    await this.saveLocalProfile(updatedProfile);

    // Queue for cloud sync
    const syncItem = {
      score: stats.score,
      mass: stats.mass,
      kills: stats.kills,
      timestamp: Date.now(),
    };
    await this.addToSyncQueue(syncItem);

    this.notify();

    if (this.isOnline) {
      this.triggerSync().catch(console.error);
    }

    return { newHigh, creditsEarned: stats.creditsEarned };
  }

  private async addToSyncQueue(item: any): Promise<void> {
    if (this.db) {
      try {
        const tx = this.db.transaction(SYNC_QUEUE_STORE, 'readwrite');
        tx.objectStore(SYNC_QUEUE_STORE).add(item);
      } catch {}
    } else {
      const q = JSON.parse(localStorage.getItem('ouroboros_sync_queue') || '[]');
      q.push(item);
      localStorage.setItem('ouroboros_sync_queue', JSON.stringify(q));
    }
  }

  public async triggerSync(): Promise<{ success: boolean; cloudTime?: number }> {
    if (!this.isOnline || !this.currentProfile) {
      return { success: false };
    }

    try {
      // Gather pending items
      let pendingScores: any[] = [];
      if (this.db) {
        pendingScores = await new Promise((resolve) => {
          try {
            const tx = this.db!.transaction(SYNC_QUEUE_STORE, 'readonly');
            const req = tx.objectStore(SYNC_QUEUE_STORE).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        });
      } else {
        pendingScores = JSON.parse(localStorage.getItem('ouroboros_sync_queue') || '[]');
      }

      const res = await fetch('/api/cloud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.currentProfile.userId,
          profile: this.currentProfile,
          pendingScores,
        }),
      });

      if (!res.ok) throw new Error('Sync failed');

      const data = await res.json();
      if (data.success) {
        this.currentProfile.lastSyncedAt = data.lastSyncedAt;
        await this.saveLocalProfile(this.currentProfile);

        // Clear sync queue
        if (this.db) {
          try {
            const tx = this.db.transaction(SYNC_QUEUE_STORE, 'readwrite');
            tx.objectStore(SYNC_QUEUE_STORE).clear();
          } catch {}
        }
        localStorage.removeItem('ouroboros_sync_queue');

        this.notify();
        return { success: true, cloudTime: data.lastSyncedAt };
      }
    } catch (e) {
      console.warn('Cloud sync temporarily failed, will retry when network permits:', e);
    }
    return { success: false };
  }

  /**
   * Export encrypted / base64 backup code for cross-device manual recovery
   */
  public generateBackupCode(): string {
    const profile = this.getProfile();
    const payload = JSON.stringify({
      v: 1,
      id: profile.userId,
      u: profile.username,
      c: profile.credits,
      hs: profile.highestScore,
      hm: profile.highestMass,
      k: profile.totalKills,
      mp: profile.matchesPlayed,
      s: profile.selectedSkin,
      us: profile.unlockedSkins,
      up: profile.upgrades,
      t: Date.now(),
    });
    return btoa(payload);
  }

  /**
   * Restore profile from export code
   */
  public async restoreFromBackupCode(code: string): Promise<boolean> {
    try {
      const decoded = atob(code.trim());
      const data = JSON.parse(decoded);
      if (!data.id || !data.u) return false;

      const restored: PlayerProfile = {
        userId: data.id,
        username: data.u,
        credits: Number(data.c) || 0,
        highestScore: Number(data.hs) || 0,
        highestMass: Number(data.hm) || 100,
        totalKills: Number(data.k) || 0,
        matchesPlayed: Number(data.mp) || 0,
        selectedSkin: data.s || 'neon-cyan',
        unlockedSkins: Array.isArray(data.us) ? data.us : ['neon-cyan'],
        upgrades: data.up || {},
        platform: detectPlatform(),
        region: 'US-East',
        lastSyncedAt: Date.now(),
        version: (this.currentProfile?.version || 1) + 1,
      };

      this.currentProfile = restored;
      await this.saveLocalProfile(restored);
      this.notify();
      if (this.isOnline) {
        this.triggerSync();
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const storage = new StorageService();
