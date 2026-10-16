import * as THREE from 'three';

/**
 * Procedural texture and material generators for Ouroboros 3D Cyber Arena.
 * Zero external image dependencies (100% CanvasTexture and DataTexture).
 */

let maxAnisotropy = 8;
export function setMaxAnisotropy(val: number) {
  maxAnisotropy = Math.max(1, Math.min(16, val));
}

/**
 * Generates an ultra-crisp neon cyber hex/circuit arena grid
 */
export function createArenaFloorTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep obsidian cyber background
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, size, size);

  // Subtle carbon crosshatch
  ctx.strokeStyle = '#09152b';
  ctx.lineWidth = 1;
  const subGrid = 32;
  for (let x = 0; x < size; x += subGrid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y < size; y += subGrid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Major neon grid lines
  const majorGrid = 128;
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
  ctx.lineWidth = 2;
  for (let x = 0; x < size; x += majorGrid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y < size; y += majorGrid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Cyber nodes and accents at intersections
  for (let x = 0; x < size; x += majorGrid) {
    for (let y = 0; y < size; y += majorGrid) {
      // Glow circle
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Corner brackets
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 1.5;
      const b = 12;
      ctx.strokeRect(x - b / 2, y - b / 2, b, b);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Generates procedural snake skin texture with cyber hexagonal scales
 */
export function createSnakeSkinTexture(
  primaryColor: string,
  emissiveColor: string,
  pattern: 'cyber-hex' | 'circuit' | 'carbon' | 'plasma' | 'hazard' = 'cyber-hex'
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, size, size);

  if (pattern === 'cyber-hex') {
    const hexRadius = 24;
    const h = hexRadius * Math.sqrt(3);
    const w = hexRadius * 2;
    for (let row = -1; row < size / h + 2; row++) {
      for (let col = -1; col < size / (w * 0.75) + 2; col++) {
        const x = col * w * 0.75;
        const y = row * h + (col % 2 === 0 ? 0 : h / 2);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = x + hexRadius * 0.85 * Math.cos(angle);
          const hy = y + hexRadius * 0.85 * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();

        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.85;
        ctx.fill();

        ctx.strokeStyle = emissiveColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
      }
    }
  } else if (pattern === 'hazard') {
    // Diagonal chevron hazard bands
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    const stripeW = 40;
    for (let x = -size; x < size * 2; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW + size, size);
      ctx.lineTo(x + size, size);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Circuit / Carbon pattern
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = emissiveColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < size; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(i, i, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Glowing cyber eye lens texture
 */
export function createEyeTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, '#22d3ee');
  grad.addColorStop(0.7, '#0891b2');
  grad.addColorStop(1, '#02182b');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Slit pupil
  ctx.fillStyle = '#030712';
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, 6, size / 2 - 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * High-energy cyber barrier perimeter texture
 */
export function createBarrierTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
  ctx.fillRect(0, 0, size, size);

  // Vertical laser bars
  ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
  for (let x = 0; x < size; x += 16) {
    ctx.fillRect(x, 0, 4, size);
  }

  // Horizontal scanlines
  ctx.fillStyle = 'rgba(244, 63, 94, 0.6)';
  ctx.fillRect(0, 40, size, 4);
  ctx.fillRect(0, 120, size, 8);
  ctx.fillRect(0, 200, size, 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
