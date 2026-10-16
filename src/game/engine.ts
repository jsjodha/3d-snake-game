import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GameSimulation } from './simulation';
import { createArenaFloorTexture, createBarrierTexture, setMaxAnisotropy } from './materials';
import { sound } from '../services/audio';

// Reusable math objects for zero-GC render tick
const _camPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _shakeVec = new THREE.Vector3();

export interface EngineCallbacks {
  onGameOver: (stats: any) => void;
  onUpdateStats: (score: number, mass: number, combo: number, kills: number, maxCombo: number) => void;
}

export class GameEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public simulation: GameSimulation | null = null;
  public container: HTMLElement;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock;
  private floorMesh: THREE.Mesh | null = null;
  private barrierMesh: THREE.Mesh | null = null;
  private callbacks: EngineCallbacks;

  // Camera settings
  private targetCamDistance: number = 28;
  private currentCamDistance: number = 28;
  private camFollowPos = new THREE.Vector3(0, 0, 0);
  private titleOrbitAngle: number = 0;
  public isTitleMode: boolean = true;

  // Input states
  public inputHeading: number = 0;
  public isBoostHeld: boolean = false;
  private keysHeld: Set<string> = new Set();
  private pointerPos = { x: 0, y: 0 };
  private isPointerDown: boolean = false;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    // 1. Initialize Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);
    this.scene.fog = new THREE.FogExp2(0x020617, 0.008);

    // 2. Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 600);
    this.camera.position.set(0, 35, 30);
    this.camera.lookAt(0, 0, 0);

    // 3. Modern WebGL Renderer Pipeline
    const isHeadless = typeof navigator !== 'undefined' && (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting Setup
    this.setupLighting();

    // 6. Arena Environment (Floor + Barrier)
    this.setupArena();

    // 7. Input Event Listeners
    this.setupInputs();

    // Resize observer
    window.addEventListener('resize', this.handleResize);

    // Start render loop
    this.isRunning = true;
    this.loop();
  }

  private setupLighting() {
    // Balanced Studio Rig: Key Light + Fill Light + Rim
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(40, 70, 30);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 180;
    keyLight.shadow.camera.left = -50;
    keyLight.shadow.camera.right = 50;
    keyLight.shadow.camera.top = 50;
    keyLight.shadow.camera.bottom = -50;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Warm key vs cool sky hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0x06b6d4, 0x0f172a, 1.2);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Rim light from the opposite edge
    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.4);
    rimLight.position.set(-50, 20, -50);
    this.scene.add(rimLight);
  }

  private setupArena() {
    const arenaRadius = 180;

    // 1. Procedural Grid Floor
    const floorGeo = new THREE.CircleGeometry(arenaRadius, 64);
    const floorTexture = createArenaFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.35,
      metalness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // 2. High-energy Cyber Barrier Cylinder
    const barrierGeo = new THREE.CylinderGeometry(arenaRadius, arenaRadius, 14, 64, 1, true);
    const barrierTexture = createBarrierTexture();
    const barrierMat = new THREE.MeshBasicMaterial({
      map: barrierTexture,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
    this.barrierMesh.position.y = 7;
    this.scene.add(this.barrierMesh);

    // 3. Perimeter Ring Light
    const ringGeo = new THREE.TorusGeometry(arenaRadius, 0.4, 8, 96);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.2;
    this.scene.add(ringMesh);
  }

  public startMatch(skinId: string, upgrades: Record<string, number>) {
    if (this.simulation) {
      this.simulation.dispose();
      this.simulation = null;
    }

    this.isTitleMode = false;
    this.simulation = new GameSimulation(this.scene, skinId, upgrades);
    this.camFollowPos.set(0, 0, 0);
    this.currentCamDistance = 28;
    this.targetCamDistance = 28;
    sound.startAmbient();
  }

  public endMatch() {
    this.isTitleMode = true;
    sound.stopAmbient();
  }

  public setBoostState(boosting: boolean) {
    this.isBoostHeld = boosting;
    if (this.simulation && this.simulation.player) {
      this.simulation.player.isBoosting = boosting;
      sound.setBoosting(boosting);
    }
  }

  public setHeading(heading: number) {
    this.inputHeading = heading;
    if (this.simulation && this.simulation.player) {
      this.simulation.player.targetHeading = heading;
    }
  }

  private setupInputs() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      this.keysHeld.add(e.code);
      if (e.code === 'Space') {
        this.setBoostState(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
      if (e.code === 'Space') {
        this.setBoostState(false);
      }
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.setBoostState(false);
    });

    // Mouse / Pointer steering
    const onPointerMove = (e: MouseEvent) => {
      if (this.isTitleMode || !this.simulation || !this.simulation.player) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      if (Math.hypot(dx, dy) > 15) {
        // Angle in top-down plane
        const angle = Math.atan2(dx, dy);
        this.setHeading(angle);
      }
    };

    window.addEventListener('mousemove', onPointerMove);

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !this.isTitleMode) {
        // Left mouse click to boost
        this.setBoostState(true);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.setBoostState(false);
      }
    });
  }

  private handleKeyboardSteering(dt: number) {
    if (!this.simulation || !this.simulation.player) return;

    let turnDelta = 0;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) {
      turnDelta += 4.5 * dt;
    }
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) {
      turnDelta -= 4.5 * dt;
    }

    if (turnDelta !== 0) {
      this.inputHeading += turnDelta;
      this.setHeading(this.inputHeading);
    }
  }

  private handleResize = () => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private loop = () => {
    if (!this.isRunning) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05); // Clamp frame delta time for silky 60fps simulation
    const time = this.clock.getElapsedTime();

    // Rotate barrier texture scanlines
    if (this.barrierMesh && (this.barrierMesh.material as THREE.MeshBasicMaterial).map) {
      (this.barrierMesh.material as THREE.MeshBasicMaterial).map!.offset.x = (time * 0.05) % 1;
    }

    if (this.isTitleMode) {
      // Atmospheric live-world cinematic camera pan over glowing arena
      this.titleOrbitAngle += dt * 0.25;
      const orbitRadius = 65;
      const orbitY = 32 + Math.sin(time * 0.5) * 4;
      this.camera.position.set(
        Math.cos(this.titleOrbitAngle) * orbitRadius,
        orbitY,
        Math.sin(this.titleOrbitAngle) * orbitRadius
      );
      this.camera.lookAt(0, 2, 0);
    } else if (this.simulation) {
      // Handle keyboard steering
      this.handleKeyboardSteering(dt);

      // Tick Simulation
      this.simulation.update(dt, time);

      // Push stats to React UI
      this.callbacks.onUpdateStats(
        this.simulation.stats.score,
        this.simulation.stats.mass,
        this.simulation.combo.multiplier,
        this.simulation.stats.kills,
        this.simulation.stats.maxCombo
      );

      // Check Game Over
      if (this.simulation.isGameOver) {
        this.callbacks.onGameOver(this.simulation.stats);
      }

      // Smooth Camera Kinematics tracking player snake with exponential damping
      const playerPos = this.simulation.player.headPosition;
      this.camFollowPos.x = THREE.MathUtils.damp(this.camFollowPos.x, playerPos.x, 6, dt);
      this.camFollowPos.z = THREE.MathUtils.damp(this.camFollowPos.z, playerPos.z, 6, dt);

      // Dynamic camera zoom based on mass and boosting speed
      const targetDist = 26 + Math.min(35, this.simulation.player.mass * 0.035) + (this.simulation.player.isBoosting ? 5 : 0);
      this.currentCamDistance = THREE.MathUtils.damp(this.currentCamDistance, targetDist, 4, dt);

      const camHeight = this.currentCamDistance * 0.95;
      const camZOffset = this.currentCamDistance * 0.75;

      // Camera shake
      let shakeX = 0;
      let shakeZ = 0;
      if (this.simulation.cameraShake > 0) {
        shakeX = (Math.random() - 0.5) * this.simulation.cameraShake * 2.5;
        shakeZ = (Math.random() - 0.5) * this.simulation.cameraShake * 2.5;
      }

      this.camera.position.set(
        this.camFollowPos.x + shakeX,
        camHeight,
        this.camFollowPos.z + camZOffset + shakeZ
      );
      this.camera.lookAt(this.camFollowPos.x, 0.5, this.camFollowPos.z);
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public dispose() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);

    if (this.simulation) {
      this.simulation.dispose();
      this.simulation = null;
    }

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
