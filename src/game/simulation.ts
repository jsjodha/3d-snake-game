import * as THREE from 'three';
import { SnakeEntity, ComboState, MatchStats, SnakeSkin } from './types';
import { SnakeMesh3D } from './snake';
import { OrbManager } from './orbs';
import { ParticlePool } from './particles';
import { sound } from '../services/audio';
import { haptics } from '../services/haptics';
import { DEFAULT_SKINS, UPGRADE_DEFINITIONS } from '../services/storage';

const ARENA_RADIUS = 180;

const AI_NAMES = [
  'V1P3R-9', 'NEON_TITAN', 'CYBER_BASILISK', 'GHOST_NAGA', 'VOLT_BOA',
  'APEX_WYRM', 'QUANTUM_SERP', 'ZERO_PYTHON', 'CHRONO_DRAKE', 'NEXUS_FANG',
  'SOLAR_KRAIT', 'VOID_STRIKER', 'HYPER_MAMBA', 'GLITCH_COBRA'
];

export class GameSimulation {
  public player: SnakeEntity;
  public playerMesh: SnakeMesh3D;
  public aiSnakes: SnakeEntity[] = [];
  public aiMeshes: Map<string, SnakeMesh3D> = new Map();
  public orbs: OrbManager;
  public particles: ParticlePool;
  public scene: THREE.Scene;

  public combo: ComboState = {
    count: 0,
    multiplier: 1.0,
    timer: 0,
    maxTimer: 2.5,
    recentPoints: 0,
  };

  public stats: MatchStats = {
    score: 0,
    mass: 120,
    kills: 0,
    maxCombo: 1,
    survivalTimeSeconds: 0,
    orbsConsumed: 0,
    creditsEarned: 0,
  };

  public isGameOver: boolean = false;
  public cameraShake: number = 0;
  public arenaRadius: number = ARENA_RADIUS;

  // Upgrades active for current match
  private magnetRadius: number = 4.0;
  private boostBurnMultiplier: number = 1.0;
  private massYieldMultiplier: number = 1.0;
  private maxShieldHits: number = 0;
  private hazardTrailTier: number = 0;

  constructor(scene: THREE.Scene, playerSkinId: string = 'neon-cyan', upgrades: Record<string, number> = {}) {
    this.scene = scene;
    this.orbs = new OrbManager(scene, ARENA_RADIUS);
    this.particles = new ParticlePool(scene);

    // Apply upgrade effects
    this.applyUpgrades(upgrades);

    // Find selected skin
    const skin = DEFAULT_SKINS.find(s => s.id === playerSkinId) || DEFAULT_SKINS[0];

    // Create player entity
    this.player = this.createSnake('player', 'CYBER_PILOT', true, skin, 0, 0);
    this.player.shieldHp = this.maxShieldHits;
    this.player.maxShieldHp = this.maxShieldHits;
    this.player.magnetRange = this.magnetRadius;

    this.playerMesh = new SnakeMesh3D(this.player, scene);

    // Spawn AI bots
    this.spawnAiBots(12);
  }

  private applyUpgrades(upgrades: Record<string, number>) {
    const magDef = UPGRADE_DEFINITIONS.find(u => u.id === 'magnet_range');
    const magLvl = upgrades['magnet_range'] || 1;
    this.magnetRadius = (magDef?.baseValue || 4.0) + (magLvl - 1) * (magDef?.perLevel || 1.5);

    const boostDef = UPGRADE_DEFINITIONS.find(u => u.id === 'boost_efficiency');
    const boostLvl = upgrades['boost_efficiency'] || 1;
    this.boostBurnMultiplier = Math.max(0.35, 1.0 - (boostLvl - 1) * 0.15);

    const massDef = UPGRADE_DEFINITIONS.find(u => u.id === 'mass_digestion');
    const massLvl = upgrades['mass_digestion'] || 1;
    this.massYieldMultiplier = (massDef?.baseValue || 1.0) + (massLvl - 1) * (massDef?.perLevel || 0.25);

    const shieldDef = UPGRADE_DEFINITIONS.find(u => u.id === 'kinetic_shield');
    const shieldLvl = upgrades['kinetic_shield'] || 0;
    this.maxShieldHits = shieldLvl;

    this.hazardTrailTier = upgrades['hazard_trail'] || 0;
  }

  private createSnake(id: string, name: string, isPlayer: boolean, skin: SnakeSkin, x: number, z: number): SnakeEntity {
    const startHeading = Math.random() * Math.PI * 2;
    const initialMass = isPlayer ? 140 : 100 + Math.floor(Math.random() * 250);

    const historyPoints: { x: number; z: number }[] = [];
    for (let i = 0; i < 150; i++) {
      historyPoints.push({
        x: x + Math.cos(startHeading + Math.PI) * (i * 0.4),
        z: z + Math.sin(startHeading + Math.PI) * (i * 0.4),
      });
    }

    return {
      id,
      name,
      isPlayer,
      isAlive: true,
      skin,
      headPosition: new THREE.Vector3(x, 0.45, z),
      heading: startHeading,
      targetHeading: startHeading,
      speed: 12,
      baseSpeed: 12,
      boostSpeed: 23,
      isBoosting: false,
      mass: initialMass,
      targetMass: initialMass,
      segments: [],
      historyPoints,
      kills: 0,
      score: 0,
      shieldHp: isPlayer ? this.maxShieldHits : (Math.random() < 0.2 ? 1 : 0),
      maxShieldHp: isPlayer ? this.maxShieldHits : 1,
      magnetRange: isPlayer ? this.magnetRadius : 3.0,
      aiAggression: Math.random(),
      aiTarget: { x: 0, z: 0 },
      color: new THREE.Color(skin.primaryColor),
      emissiveColor: new THREE.Color(skin.emissiveColor),
    };
  }

  private spawnAiBots(count: number) {
    for (let i = 0; i < count; i++) {
      const name = AI_NAMES[i % AI_NAMES.length];
      const skin = DEFAULT_SKINS[i % DEFAULT_SKINS.length];
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5);
      const dist = 50 + Math.random() * 90;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const ai = this.createSnake(`ai-${i}-${Date.now()}`, name, false, skin, x, z);
      this.aiSnakes.push(ai);
      const mesh = new SnakeMesh3D(ai, this.scene);
      this.aiMeshes.set(ai.id, mesh);
    }
  }

  /**
   * Main game tick
   */
  public update(dt: number, time: number) {
    if (this.isGameOver) {
      // Still update particles and existing meshes
      this.particles.update(dt);
      this.orbs.update(time, dt);
      return;
    }

    this.stats.survivalTimeSeconds += dt;

    // Decay camera shake
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 3.5);
    }

    // Update Combo Timer
    if (this.combo.timer > 0) {
      this.combo.timer -= dt;
      if (this.combo.timer <= 0) {
        this.combo.count = 0;
        this.combo.multiplier = 1.0;
      }
    }

    // 1. Update Player Entity
    this.updateSnakePhysics(this.player, dt, time);
    this.playerMesh.update(time);

    // 2. Update AI Snakes
    for (let i = this.aiSnakes.length - 1; i >= 0; i--) {
      const ai = this.aiSnakes[i];
      if (!ai.isAlive) continue;

      this.updateAiLogic(ai, dt);
      this.updateSnakePhysics(ai, dt, time);

      const mesh = this.aiMeshes.get(ai.id);
      if (mesh) {
        mesh.update(time);
      }
    }

    // 3. Orbs & Particles
    this.orbs.update(time, dt);
    this.particles.update(dt);

    // 4. Collision Detection
    this.checkCollisions();

    // 5. Respawn AI snakes if needed to keep arena buzzing
    if (this.aiSnakes.filter(s => s.isAlive).length < 10) {
      this.spawnReplacementAi();
    }
  }

  private spawnReplacementAi() {
    const skin = DEFAULT_SKINS[Math.floor(Math.random() * DEFAULT_SKINS.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 90;
    const name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
    const ai = this.createSnake(`ai-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, name, false, skin, Math.cos(angle) * dist, Math.sin(angle) * dist);
    this.aiSnakes.push(ai);
    const mesh = new SnakeMesh3D(ai, this.scene);
    this.aiMeshes.set(ai.id, mesh);
  }

  private updateSnakePhysics(snake: SnakeEntity, dt: number, time: number) {
    // Smooth turn dampening
    let diff = snake.targetHeading - snake.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const turnSpeed = snake.isBoosting ? 3.8 : 4.8;
    snake.heading += diff * Math.min(1, turnSpeed * dt);

    // Speed calculation
    const currentSpeed = snake.isBoosting && snake.mass > 60 ? snake.boostSpeed : snake.baseSpeed;
    snake.speed = currentSpeed;

    // Boost mass burn
    if (snake.isBoosting && snake.mass > 60) {
      const burnRate = 8 * this.boostBurnMultiplier * dt;
      snake.mass = Math.max(60, snake.mass - burnRate);

      // Boost particles
      const forwardX = -Math.sin(snake.heading);
      const forwardZ = -Math.cos(snake.heading);
      this.particles.emitBoostJet(
        snake.headPosition.x,
        snake.headPosition.y + 0.3,
        snake.headPosition.z,
        forwardX,
        forwardZ,
        snake.color
      );
    }

    // Forward displacement
    const moveDist = snake.speed * dt;
    snake.headPosition.x -= Math.sin(snake.heading) * moveDist;
    snake.headPosition.z -= Math.cos(snake.heading) * moveDist;

    // Arena boundary containment
    const distFromCenter = Math.sqrt(snake.headPosition.x * snake.headPosition.x + snake.headPosition.z * snake.headPosition.z);
    if (distFromCenter > this.arenaRadius) {
      // Force turn back towards center
      const angleToCenter = Math.atan2(-snake.headPosition.x, -snake.headPosition.z);
      snake.targetHeading = angleToCenter;

      if (distFromCenter > this.arenaRadius + 2) {
        const clampRatio = this.arenaRadius / distFromCenter;
        snake.headPosition.x *= clampRatio;
        snake.headPosition.z *= clampRatio;

        if (snake.isPlayer) {
          this.cameraShake = 0.4;
          haptics.triggerLight();
        }
      }
    }

    // History trail update
    const headPt = { x: snake.headPosition.x, z: snake.headPosition.z };
    const lastHist = snake.historyPoints[0];
    const distSq = (headPt.x - lastHist.x) ** 2 + (headPt.z - lastHist.z) ** 2;

    if (distSq > 0.2) {
      snake.historyPoints.unshift(headPt);
      const maxHistory = Math.max(100, Math.floor(snake.mass * 1.5));
      if (snake.historyPoints.length > maxHistory) {
        snake.historyPoints.pop();
      }
    }
  }

  private updateAiLogic(ai: SnakeEntity, dt: number) {
    const headX = ai.headPosition.x;
    const headZ = ai.headPosition.z;

    // Check distance to arena boundary
    const distFromCenter = Math.hypot(headX, headZ);
    if (distFromCenter > this.arenaRadius - 25) {
      ai.targetHeading = Math.atan2(-headX, -headZ);
      ai.isBoosting = false;
      return;
    }

    // AI tactical behavior: Hunt player if larger, or graze orbs
    const distToPlayer = Math.hypot(this.player.headPosition.x - headX, this.player.headPosition.z - headZ);

    if (distToPlayer < 40 && this.player.isAlive) {
      if (ai.mass > this.player.mass * 1.15 && (ai.aiAggression || 0) > 0.4) {
        // Aggressive: Lead the player to cut off their head!
        const leadDist = 8;
        const playerForwardX = -Math.sin(this.player.heading) * leadDist;
        const playerForwardZ = -Math.cos(this.player.heading) * leadDist;
        const interceptX = this.player.headPosition.x + playerForwardX;
        const interceptZ = this.player.headPosition.z + playerForwardZ;

        ai.targetHeading = Math.atan2(headX - interceptX, headZ - interceptZ);
        ai.isBoosting = distToPlayer < 25 && ai.mass > 80;
        return;
      } else if (ai.mass < this.player.mass * 0.9) {
        // Flee from player
        ai.targetHeading = Math.atan2(headX - this.player.headPosition.x, headZ - this.player.headPosition.z);
        ai.isBoosting = distToPlayer < 18 && ai.mass > 80;
        return;
      }
    }

    // Default: Seek nearby high-value energy orbs
    if (Math.random() < 0.05 || !ai.aiTarget) {
      let bestDist = 70;
      let targetX = headX + (Math.random() - 0.5) * 40;
      let targetZ = headZ + (Math.random() - 0.5) * 40;

      for (let i = 0; i < 20; i++) {
        const randOrb = this.orbs.orbs[Math.floor(Math.random() * this.orbs.orbs.length)];
        if (randOrb && randOrb.active) {
          const d = Math.hypot(randOrb.x - headX, randOrb.z - headZ);
          if (d < bestDist) {
            bestDist = d;
            targetX = randOrb.x;
            targetZ = randOrb.z;
          }
        }
      }

      ai.aiTarget = { x: targetX, z: targetZ };
      ai.targetHeading = Math.atan2(headX - targetX, headZ - targetZ);
      ai.isBoosting = false;
    }
  }

  private checkCollisions() {
    const allSnakes = [this.player, ...this.aiSnakes.filter(s => s.isAlive)];

    // 1. Orb Consumption & Magnetism
    for (const snake of allSnakes) {
      const headX = snake.headPosition.x;
      const headZ = snake.headPosition.z;
      const magnetRange = snake.magnetRange;
      const magnetRangeSq = magnetRange * magnetRange;
      const eatDistSq = 2.2 * 2.2;

      for (let i = 0; i < this.orbs.orbs.length; i++) {
        const orb = this.orbs.orbs[i];
        if (!orb.active) continue;

        const dx = headX - orb.x;
        const dz = headZ - orb.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < eatDistSq) {
          // Devour orb
          this.orbs.collectOrb(orb.id);

          const massGain = orb.value * (snake.isPlayer ? this.massYieldMultiplier : 1.0);
          snake.mass += massGain;

          if (snake.isPlayer) {
            // Update combo streak
            this.combo.count++;
            const newMult = Math.min(10, 1.0 + Math.floor(this.combo.count / 3) * 0.5);
            if (newMult > this.combo.multiplier) {
              sound.playComboUp(newMult);
              haptics.triggerComboUp();
            }
            this.combo.multiplier = newMult;
            this.combo.timer = this.combo.maxTimer;

            // Score calculation
            const pts = Math.round(orb.value * 12 * this.combo.multiplier);
            this.stats.score += pts;
            this.stats.orbsConsumed++;
            this.stats.mass = Math.round(snake.mass);
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo.count);
            this.stats.creditsEarned = Math.floor(this.stats.score / 50);

            // SFX & Haptics
            sound.playEatOrb(this.combo.multiplier);
            haptics.triggerEatOrb();

            // Spark particles
            this.particles.emit(orb.x, 0.45, orb.z, snake.color, 4, 2);
          }
        } else if (distSq < magnetRangeSq) {
          // Magnetism vacuum pull towards snake head
          const pullSpeed = 18;
          const dist = Math.sqrt(distSq);
          orb.x += (dx / dist) * pullSpeed * 0.016;
          orb.z += (dz / dist) * pullSpeed * 0.016;
        }
      }
    }

    // 2. Snake to Snake Body Collisions
    for (const attacker of allSnakes) {
      if (!attacker.isAlive) continue;
      const headX = attacker.headPosition.x;
      const headZ = attacker.headPosition.z;

      for (const defender of allSnakes) {
        if (!defender.isAlive) continue;

        // Check defender's history points (body segments)
        // Skip first 6 points to avoid self-collision with own neck
        const startIndex = attacker.id === defender.id ? 8 : 1;
        const history = defender.historyPoints;

        for (let i = startIndex; i < history.length; i += 2) {
          const pt = history[i];
          const distSq = (headX - pt.x) ** 2 + (headZ - pt.z) ** 2;

          if (distSq < 1.8 * 1.8) {
            // Collision occurred!
            if (attacker.shieldHp > 0) {
              // Shield absorbs impact!
              attacker.shieldHp--;
              sound.playShieldDeflect();
              haptics.triggerShieldHit();
              this.particles.emit(headX, 0.5, headZ, new THREE.Color(0x22d3ee), 25, 6);

              // Bounce back
              attacker.heading += Math.PI * 0.8;
              attacker.targetHeading = attacker.heading;
              if (attacker.isPlayer) {
                this.cameraShake = 0.5;
              }
              break;
            } else {
              // Fatal collision! Attacker dies
              this.killSnake(attacker, defender);
              break;
            }
          }
        }
      }
    }
  }

  private killSnake(victim: SnakeEntity, killer?: SnakeEntity) {
    if (!victim.isAlive) return;
    victim.isAlive = false;

    // Disperse body into high-value energy orbs
    this.orbs.spawnDeathOrbs(victim.historyPoints, victim.mass);

    // Massive particle explosion
    this.particles.emit(victim.headPosition.x, 0.5, victim.headPosition.z, victim.color, 45, 8);

    // Audio & Haptic impact
    sound.playKillExplosion();
    haptics.triggerKill();

    if (killer && killer.isPlayer) {
      killer.kills++;
      this.stats.kills++;
      const bonusPts = Math.round(victim.mass * 25 * this.combo.multiplier);
      this.stats.score += bonusPts;
      this.combo.count += 5;
      this.combo.multiplier = Math.min(10, this.combo.multiplier + 1.0);
      this.combo.timer = this.combo.maxTimer;
      this.cameraShake = 0.6;
    }

    if (victim.isPlayer) {
      this.isGameOver = true;
      this.cameraShake = 0.8;
      this.stats.killerName = killer?.name || 'Arena Hazard';
      sound.playGameOver();
      haptics.triggerDeath();
    } else {
      // Remove AI mesh
      const mesh = this.aiMeshes.get(victim.id);
      if (mesh) {
        mesh.dispose(this.scene);
        this.aiMeshes.delete(victim.id);
      }
    }
  }

  /**
   * Returns live leaderboard in current arena sorted by mass
   */
  public getLiveArenaLeaderboard(): { name: string; mass: number; kills: number; isPlayer: boolean }[] {
    const all = [this.player, ...this.aiSnakes.filter(s => s.isAlive)];
    all.sort((a, b) => b.mass - a.mass);
    return all.slice(0, 10).map(s => ({
      name: s.name,
      mass: Math.round(s.mass),
      kills: s.kills,
      isPlayer: s.isPlayer,
    }));
  }

  public dispose() {
    this.playerMesh.dispose(this.scene);
    this.aiMeshes.forEach(mesh => mesh.dispose(this.scene));
    this.aiMeshes.clear();
    this.orbs.dispose(this.scene);
    this.particles.dispose(this.scene);
  }
}
