import * as THREE from 'three';
import { SnakeEntity, SnakeSegment, SnakeSkin } from './types';
import { createSnakeSkinTexture, createEyeTexture } from './materials';

// Pre-allocated reusable helpers for zero-GC render ticks
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export class SnakeMesh3D {
  public group: THREE.Group;
  public headGroup: THREE.Group;
  public segments: THREE.Mesh[] = [];
  public coreRings: THREE.Mesh[] = [];
  public shieldMesh: THREE.Mesh | null = null;
  public headlight: THREE.SpotLight | null = null;
  public bodyMaterial: THREE.MeshStandardMaterial;
  public coreMaterial: THREE.MeshBasicMaterial;
  public eyeMaterial: THREE.MeshBasicMaterial;
  public skinTexture: THREE.CanvasTexture;

  constructor(public entity: SnakeEntity, scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.headGroup = new THREE.Group();

    // Procedural skin texture
    this.skinTexture = createSnakeSkinTexture(
      entity.skin.primaryColor,
      entity.skin.emissiveColor,
      entity.skin.scalePattern
    );

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      roughness: 0.25,
      metalness: 0.7,
      color: new THREE.Color(entity.skin.primaryColor),
      emissive: new THREE.Color(entity.skin.emissiveColor),
      emissiveIntensity: 0.35,
    });

    this.coreMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(entity.skin.glowColor),
    });

    const eyeTex = createEyeTexture();
    this.eyeMaterial = new THREE.MeshBasicMaterial({
      map: eyeTex,
    });

    // Build composite 3-12 part procedural Head
    this.buildHead();
    this.group.add(this.headGroup);

    // Build kinetic EMP shield dome
    const shieldGeo = new THREE.SphereGeometry(2.4, 24, 16);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.visible = entity.shieldHp > 0;
    this.headGroup.add(this.shieldMesh);

    scene.add(this.group);
  }

  /**
   * Assembles a 3-12 part predatory cyber-snake head
   */
  private buildHead() {
    // 1. Primary Snout & Cranium (Sculpted tapered box)
    const craniumGeo = new THREE.BoxGeometry(1.5, 0.9, 2.2);
    const cranium = new THREE.Mesh(craniumGeo, this.bodyMaterial);
    cranium.position.set(0, 0.45, 0);
    cranium.castShadow = true;
    cranium.receiveShadow = true;
    this.headGroup.add(cranium);

    // 2. Beveled Lower Jaw Chassis
    const jawGeo = new THREE.BoxGeometry(1.2, 0.4, 1.8);
    const jawMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.4,
      metalness: 0.85,
    });
    const jaw = new THREE.Mesh(jawGeo, jawMat);
    jaw.position.set(0, -0.15, 0.1);
    jaw.castShadow = true;
    this.headGroup.add(jaw);

    // 3 & 4. Left and Right Glowing Cyber Eyes
    const eyeGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    leftEye.position.set(0.72, 0.6, -0.35);
    leftEye.rotation.y = Math.PI / 4;

    const rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    rightEye.position.set(-0.72, 0.6, -0.35);
    rightEye.rotation.y = -Math.PI / 4;

    this.headGroup.add(leftEye);
    this.headGroup.add(rightEye);

    // 5 & 6. Left and Right Articulated Fangs
    const fangGeo = new THREE.ConeGeometry(0.1, 0.45, 8);
    fangGeo.rotateX(Math.PI);
    const fangMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.4,
    });
    const leftFang = new THREE.Mesh(fangGeo, fangMat);
    leftFang.position.set(0.45, 0.0, -0.9);
    const rightFang = new THREE.Mesh(fangGeo, fangMat);
    rightFang.position.set(-0.45, 0.0, -0.9);
    this.headGroup.add(leftFang);
    this.headGroup.add(rightFang);

    // 7. Dorsal Sensory Crest / Horn
    const crestGeo = new THREE.CylinderGeometry(0.04, 0.25, 1.2, 4);
    crestGeo.rotateX(-Math.PI / 3);
    const crest = new THREE.Mesh(crestGeo, this.bodyMaterial);
    crest.position.set(0, 0.9, 0.5);
    this.headGroup.add(crest);

    // 8 & 9. Lateral Radiator Slats / Glowing Cooling Vents
    const ventGeo = new THREE.BoxGeometry(0.1, 0.15, 0.8);
    const leftVent = new THREE.Mesh(ventGeo, this.coreMaterial);
    leftVent.position.set(0.76, 0.35, 0.3);
    const rightVent = new THREE.Mesh(ventGeo, this.coreMaterial);
    rightVent.position.set(-0.76, 0.35, 0.3);
    this.headGroup.add(leftVent);
    this.headGroup.add(rightVent);

    // 10. Forward Headlight Spotlight (for player snake)
    if (this.entity.isPlayer) {
      this.headlight = new THREE.SpotLight(0x22d3ee, 3.5, 45, Math.PI / 6, 0.4, 1.2);
      this.headlight.position.set(0, 0.6, -0.8);
      const targetObj = new THREE.Object3D();
      targetObj.position.set(0, 0, -25);
      this.headGroup.add(this.headlight);
      this.headGroup.add(targetObj);
      this.headlight.target = targetObj;
    }
  }

  /**
   * Updates or synchronizes the number of body segment meshes
   */
  public syncSegments(targetCount: number) {
    const segmentGeo = new THREE.SphereGeometry(0.85, 14, 10);
    segmentGeo.scale(1.1, 0.85, 1.1);

    const ringGeo = new THREE.TorusGeometry(0.86, 0.08, 6, 16);

    // Add missing segments
    while (this.segments.length < targetCount) {
      const idx = this.segments.length;
      const segMesh = new THREE.Mesh(segmentGeo, this.bodyMaterial);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;

      // Inner glowing cyber ring
      const ring = new THREE.Mesh(ringGeo, this.coreMaterial);
      ring.rotation.x = Math.PI / 2;
      segMesh.add(ring);

      this.group.add(segMesh);
      this.segments.push(segMesh);
      this.coreRings.push(ring);
    }

    // Remove excess segments
    while (this.segments.length > targetCount) {
      const segMesh = this.segments.pop()!;
      this.coreRings.pop();
      this.group.remove(segMesh);
      segMesh.geometry.dispose();
    }
  }

  /**
   * Smooth 60fps kinematics update
   */
  public update(time: number) {
    // 1. Update Head Transform
    this.headGroup.position.copy(this.entity.headPosition);
    this.headGroup.rotation.y = this.entity.heading;

    // Organic head pitch & roll tilt when turning or boosting
    const turnRate = this.entity.targetHeading - this.entity.heading;
    this.headGroup.rotation.z = THREE.MathUtils.clamp(-turnRate * 0.8, -0.4, 0.4);
    this.headGroup.rotation.x = this.entity.isBoosting ? 0.08 : 0.02;

    // Shield status
    if (this.shieldMesh) {
      this.shieldMesh.visible = this.entity.shieldHp > 0;
      if (this.shieldMesh.visible) {
        this.shieldMesh.rotation.y += 0.03;
      }
    }

    // 2. Kinematics for Body Segments following along history spline
    const needed = Math.max(3, Math.floor(this.entity.mass / 25));
    if (this.segments.length !== needed) {
      this.syncSegments(needed);
    }

    const history = this.entity.historyPoints;
    const spacing = 3; // spacing in history array samples

    for (let i = 0; i < this.segments.length; i++) {
      const segMesh = this.segments[i];
      const histIndex = Math.min((i + 1) * spacing, history.length - 1);
      const point = history[histIndex] || history[history.length - 1];

      // Slither wave equation (lateral oscillation)
      const waveFreq = 4.0;
      const waveAmp = 0.3 * (1 - i / this.segments.length);
      const wave = Math.sin(time * waveFreq - i * 0.4) * waveAmp;

      // Calculate tangent from next/prev history points
      const prevPt = history[Math.max(0, histIndex - 1)] || point;
      _dir.set(prevPt.x - point.x, 0, prevPt.z - point.z);
      if (_dir.lengthSq() > 0.0001) {
        _dir.normalize();
        const segHeading = Math.atan2(-_dir.x, -_dir.z);
        segMesh.rotation.y = segHeading;
      }

      // Orthogonal slither offset
      const perpX = Math.cos(segMesh.rotation.y);
      const perpZ = -Math.sin(segMesh.rotation.y);

      segMesh.position.set(
        point.x + perpX * wave,
        0.5 + Math.sin(time * 3 + i * 0.3) * 0.04,
        point.z + perpZ * wave
      );

      // Taper along length: starts round, thins out at the tail tip
      const progress = i / this.segments.length;
      const scale = Math.max(0.3, 1.0 - progress * 0.7);
      segMesh.scale.set(scale, scale * 0.9, scale);
    }
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.segments.forEach(s => {
      s.geometry.dispose();
      this.group.remove(s);
    });
    this.segments = [];
    this.coreRings = [];
    this.skinTexture.dispose();
    this.bodyMaterial.dispose();
    this.coreMaterial.dispose();
    this.eyeMaterial.dispose();
  }
}
