/**
 * Haptic feedback service for mobile devices (iOS/Android)
 * Uses navigator.vibrate with fallbacks and feature checks.
 */

class HapticsService {
  private enabled: boolean = true;

  constructor() {
    const saved = localStorage.getItem('ouroboros_haptics');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'vibrate' in navigator;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('ouroboros_haptics', String(this.enabled));
    if (this.enabled) {
      this.triggerLight();
    }
    return this.enabled;
  }

  public triggerLight() {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate(10);
    } catch {}
  }

  public triggerEatOrb() {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate(12);
    } catch {}
  }

  public triggerBoost() {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate(25);
    } catch {}
  }

  public triggerKill() {
    if (!this.enabled || !this.isSupported()) return;
    try {
      // Powerful double pulse
      navigator.vibrate([45, 30, 70]);
    } catch {}
  }

  public triggerShieldHit() {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate([60, 40, 60]);
    } catch {}
  }

  public triggerDeath() {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate([100, 50, 180]);
    } catch {}
  }

  public triggerComboUp() {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate([20, 20, 30, 20, 45]);
    } catch {}
  }
}

export const haptics = new HapticsService();
