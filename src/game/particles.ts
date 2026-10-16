import * as THREE from 'three';

const MAX_PARTICLES = 1200;

export class ParticlePool {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private velocities: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private nextIdx: number = 0;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.life = new Float32Array(MAX_PARTICLES);
    this.maxLife = new Float32Array(MAX_PARTICLES);

    // Initialize all off-screen
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.positions[i * 3 + 1] = -500;
      this.life[i] = 0;
      this.maxLife[i] = 1;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Canvas particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(34, 211, 238, 0.8)');
    grad.addColorStop(0.8, 'rgba(6, 182, 212, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const pTex = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.2,
      map: pTex,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  public emit(x: number, y: number, z: number, color: THREE.Color, count: number = 10, speed: number = 4) {
    for (let i = 0; i < count; i++) {
      const idx = this.nextIdx;
      this.nextIdx = (this.nextIdx + 1) % MAX_PARTICLES;

      this.positions[idx * 3] = x;
      this.positions[idx * 3 + 1] = y;
      this.positions[idx * 3 + 2] = z;

      this.colors[idx * 3] = color.r;
      this.colors[idx * 3 + 1] = color.g;
      this.colors[idx * 3 + 2] = color.b;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const vel = (0.5 + Math.random() * 0.5) * speed;

      this.velocities[idx * 3] = Math.sin(phi) * Math.cos(theta) * vel;
      this.velocities[idx * 3 + 1] = Math.cos(phi) * vel * 0.7 + 0.5;
      this.velocities[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * vel;

      this.life[idx] = 0;
      this.maxLife[idx] = 0.3 + Math.random() * 0.4;
    }
  }

  public emitBoostJet(x: number, y: number, z: number, dirX: number, dirZ: number, color: THREE.Color) {
    for (let i = 0; i < 3; i++) {
      const idx = this.nextIdx;
      this.nextIdx = (this.nextIdx + 1) % MAX_PARTICLES;

      const spread = (Math.random() - 0.5) * 0.4;
      this.positions[idx * 3] = x + (Math.random() - 0.5) * 0.3;
      this.positions[idx * 3 + 1] = y + (Math.random() - 0.5) * 0.2;
      this.positions[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.3;

      this.colors[idx * 3] = color.r;
      this.colors[idx * 3 + 1] = color.g;
      this.colors[idx * 3 + 2] = color.b;

      // Shoot backwards
      this.velocities[idx * 3] = -dirX * 6 + spread * 3;
      this.velocities[idx * 3 + 1] = 0.2 + Math.random() * 0.5;
      this.velocities[idx * 3 + 2] = -dirZ * 6 + spread * 3;

      this.life[idx] = 0;
      this.maxLife[idx] = 0.2 + Math.random() * 0.15;
    }
  }

  public update(dt: number) {
    let hasAlive = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.life[i] < this.maxLife[i]) {
        hasAlive = true;
        this.life[i] += dt;

        this.positions[i * 3] += this.velocities[i * 3] * dt;
        this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
        this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;

        // Gravity / drag
        this.velocities[i * 3] *= 0.96;
        this.velocities[i * 3 + 1] -= 2.0 * dt;
        this.velocities[i * 3 + 2] *= 0.96;

        if (this.positions[i * 3 + 1] < 0.1) {
          this.positions[i * 3 + 1] = 0.1;
          this.velocities[i * 3 + 1] = 0;
        }

        if (this.life[i] >= this.maxLife[i]) {
          this.positions[i * 3 + 1] = -500;
        }
      }
    }

    if (hasAlive) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.points);
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
