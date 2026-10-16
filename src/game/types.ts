import * as THREE from 'three';

export type GameState = 'TITLE' | 'MATCHMAKING' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type PlatformType = 'iOS' | 'Android' | 'Web';

export interface SnakeSkin {
  id: string;
  name: string;
  primaryColor: string;
  emissiveColor: string;
  glowColor: string;
  scalePattern: 'cyber-hex' | 'circuit' | 'carbon' | 'plasma' | 'hazard';
  unlockedByDefault: boolean;
  cost: number;
}

export interface SnakeUpgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  currentValue: number;
  unit: string;
  icon: string;
}

export interface PlayerProfile {
  userId: string;
  username: string;
  credits: number;
  highestScore: number;
  highestMass: number;
  totalKills: number;
  matchesPlayed: number;
  selectedSkin: string;
  unlockedSkins: string[];
  upgrades: Record<string, number>;
  platform: PlatformType;
  region: string;
  lastSyncedAt: number;
  version: number;
}

export interface EnergyOrb {
  id: number;
  x: number;
  y: number;
  z: number;
  value: number; // mass value
  colorType: number; // 0=cyan, 1=magenta, 2=lime, 3=gold, 4=purple
  scale: number;
  pulsePhase: number;
  active: boolean;
}

export interface SnakeSegment {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  mesh?: THREE.Object3D;
  scale: number;
}

export interface SnakeEntity {
  id: string;
  name: string;
  isPlayer: boolean;
  isAlive: boolean;
  skin: SnakeSkin;
  headPosition: THREE.Vector3;
  heading: number; // in radians
  targetHeading: number;
  speed: number;
  baseSpeed: number;
  boostSpeed: number;
  isBoosting: boolean;
  mass: number;
  targetMass: number;
  segments: SnakeSegment[];
  historyPoints: { x: number; z: number }[];
  kills: number;
  score: number;
  shieldHp: number;
  maxShieldHp: number;
  magnetRange: number;
  aiAggression?: number; // 0=timid/farming, 1=aggressive hunter
  aiTarget?: { x: number; z: number };
  color: THREE.Color;
  emissiveColor: THREE.Color;
}

export interface ComboState {
  count: number;
  multiplier: number;
  timer: number;
  maxTimer: number;
  recentPoints: number;
}

export interface MatchStats {
  score: number;
  mass: number;
  kills: number;
  maxCombo: number;
  survivalTimeSeconds: number;
  orbsConsumed: number;
  creditsEarned: number;
  killerName?: string;
  isNewHighScore?: boolean;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  score: number;
  mass: number;
  kills: number;
  platform: PlatformType;
  skin: string;
  timestamp: number;
  region: string;
}

export interface MatchmakingRoom {
  arenaId: string;
  mode: string;
  region: string;
  pingMs: number;
  connectedPlayers: number;
  maxPlayers: number;
  arenaBounds: number;
  tier: string;
}
