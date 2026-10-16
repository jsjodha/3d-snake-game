import * as THREE from 'three';
import { EnergyOrb } from './types';

const MAX_ORBS = 1800;
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();

const ORB_PALETTE = [
  new THREE.Color(0x06b6d4), // Cyan (Common, 10 mass)
  new THREE.Color(0xf43f5e), // Rose/Magenta (Uncommon, 25 mass)
  new THREE.Color(0x10b981), // Lime (Energy, 40 mass)
  new THREE.Color(0xf59e0b), // Gold (High value, 75 mass)
  new THREE.Color(0xa855f7), // Plasma Purple (Mega, 150 mass)
];

export class OrbManager {
  public instancedMesh: THREE.InstancedMesh;
  public orbs: EnergyOrb[] = [];
  public arenaRadius: number = 180;

  constructor(scene: THREE.Scene, arenaRadius: number = 180) {
    this.arenaRadius = arenaRadius;

    // High performance instanced glowing sphere
    const geo = new THREE.IcosahedronGeometry(0.38, 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_ORBS);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    this.instancedMesh.frustumCulled = false;

    // Initialize orb pool
    for (let i = 0; i < MAX_ORBS; i++) {
      this.orbs.push({
        id: i,
        x: 0,
        y: 0.4,
        z: 0,
        value: 10,
        colorType: 0,
        scale: 1,
        pulsePhase: Math.random() * Math.PI * 2,
        active: false,
      });
    }

    // Populate initial field
    this.seedArena(1200);

    scene.add(this.instancedMesh);
  }

  public seedArena(count: number) {
    for (let i = 0; i < Math.min(count, MAX_ORBS); i++) {
      const orb = this.orbs[i];
      const r = Math.sqrt(Math.random()) * (this.arenaRadius - 8);
      const theta = Math.random() * Math.PI * 2;

      const typeRand = Math.random();
      const colorType = typeRand < 0.6 ? 0 : typeRand < 0.8 ? 1 : typeRand < 0.93 ? 2 : typeRand < 0.98 ? 3 : 4;
      const values = [10, 25, 45, 80, 150];

      orb.x = r * Math.cos(theta);
      orb.y = 0.45;
      orb.z = r * Math.sin(theta);
      orb.value = values[colorType];
      orb.colorType = colorType;
      orb.scale = 0.8 + colorType * 0.2;
      orb.pulsePhase = Math.random() * Math.PI * 2;
      orb.active = true;

      this.updateInstance(i, orb, 0);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Spawns a fountain of high-value energy orbs where a defeated snake fell
   */
  public spawnDeathOrbs(points: { x: number; z: number }[], totalMass: number) {
    const orbCount = Math.min(60, Math.max(10, Math.floor(totalMass / 35)));
    const valuePerOrb = Math.max(20, Math.floor(totalMass / orbCount));

    let spawned = 0;
    for (let i = 0; i < MAX_ORBS && spawned < orbCount; i++) {
      if (!this.orbs[i].active) {
        const orb = this.orbs[i];
        const sourcePoint = points[spawned % points.length] || points[0];
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 4.5;

        orb.x = sourcePoint.x + Math.cos(angle) * dist;
        orb.y = 0.45;
        orb.z = sourcePoint.z + Math.sin(angle) * dist;
        orb.value = valuePerOrb;
        orb.colorType = valuePerOrb > 80 ? 3 : valuePerOrb > 40 ? 2 : 1;
        orb.scale = 1.3 + (orb.colorType === 3 ? 0.4 : 0.1);
        orb.pulsePhase = Math.random() * Math.PI * 2;
        orb.active = true;

        this.updateInstance(i, orb, 0);
        spawned++;
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Updates an individual instance transform & color in the buffer
   */
  private updateInstance(i: number, orb: EnergyOrb, time: number) {
    if (!orb.active) {
      _scale.set(0, 0, 0);
      _position.set(0, -100, 0);
      _matrix.compose(_position, _quat, _scale);
      this.instancedMesh.setMatrixAt(i, _matrix);
      return;
    }

    const bob = Math.sin(time * 3 + orb.pulsePhase) * 0.12;
    const pulse = 1 + Math.sin(time * 5 + orb.pulsePhase) * 0.15;
    const s = orb.scale * pulse;

    _position.set(orb.x, orb.y + bob, orb.z);
    _scale.set(s, s, s);
    _matrix.compose(_position, _quat, _scale);
    this.instancedMesh.setMatrixAt(i, _matrix);

    const baseColor = ORB_PALETTE[orb.colorType];
    this.instancedMesh.setColorAt(i, baseColor);
  }

  /**
   * Continuous loop update: bobs orbs and replenishes field
   */
  public update(time: number, dt: number) {
    let activeCount = 0;

    for (let i = 0; i < MAX_ORBS; i++) {
      const orb = this.orbs[i];
      if (orb.active) {
        activeCount++;
        // Update visual bob every frame
        const bob = Math.sin(time * 3 + orb.pulsePhase) * 0.12;
        const pulse = 1 + Math.sin(time * 5 + orb.pulsePhase) * 0.12;
        const s = orb.scale * pulse;

        _position.set(orb.x, orb.y + bob, orb.z);
        _scale.set(s, s, s);
        _matrix.compose(_position, _quat, _scale);
        this.instancedMesh.setMatrixAt(i, _matrix);
      }
    }

    // Replenish if orbs get low
    if (activeCount < 850) {
      for (let i = 0; i < MAX_ORBS && activeCount < 1100; i++) {
        if (!this.orbs[i].active) {
          const orb = this.orbs[i];
          const r = Math.sqrt(Math.random()) * (this.arenaRadius - 10);
          const theta = Math.random() * Math.PI * 2;
          const colorType = Math.random() < 0.65 ? 0 : Math.random() < 0.85 ? 1 : 2;

          orb.x = r * Math.cos(theta);
          orb.y = 0.45;
          orb.z = r * Math.sin(theta);
          orb.value = [10, 25, 45][colorType];
          orb.colorType = colorType;
          orb.scale = 0.8 + colorType * 0.2;
          orb.pulsePhase = Math.random() * Math.PI * 2;
          orb.active = true;
          activeCount++;
        }
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public collectOrb(id: number) {
    if (this.orbs[id]) {
      this.orbs[id].active = false;
      _scale.set(0, 0, 0);
      _position.set(0, -100, 0);
      _matrix.compose(_position, _quat, _scale);
      this.instancedMesh.setMatrixAt(id, _matrix);
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.instancedMesh);
    this.instancedMesh.geometry.dispose();
    if (Array.isArray(this.instancedMesh.material)) {
      this.instancedMesh.material.forEach(m => m.dispose());
    } else {
      this.instancedMesh.material.dispose();
    }
  }
}
