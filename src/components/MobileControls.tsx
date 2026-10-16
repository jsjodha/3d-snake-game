import React, { useRef, useState, useEffect } from 'react';
import { haptics } from '../services/haptics';

interface MobileControlsProps {
  onHeadingChange: (heading: number) => void;
  onBoostChange: (boosting: boolean) => void;
  isBoosting: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onHeadingChange,
  onBoostChange,
  isBoosting,
}) => {
  const [touchActive, setTouchActive] = useState<boolean>(false);
  const [joystickOrigin, setJoystickOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const joystickZoneRef = useRef<HTMLDivElement>(null);

  // Check if touch device
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  if (!isTouchDevice) {
    return null;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    const rect = joystickZoneRef.current?.getBoundingClientRect();
    if (!rect) return;

    const origin = { x: touch.clientX, y: touch.clientY };
    setJoystickOrigin(origin);
    setKnobOffset({ x: 0, y: 0 });
    setTouchActive(true);
    haptics.triggerLight();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null || !joystickOrigin) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const dx = touch.clientX - joystickOrigin.x;
        const dy = touch.clientY - joystickOrigin.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 45;

        let clampedX = dx;
        let clampedY = dy;
        if (dist > maxRadius) {
          clampedX = (dx / dist) * maxRadius;
          clampedY = (dy / dist) * maxRadius;
        }

        setKnobOffset({ x: clampedX, y: clampedY });

        if (dist > 8) {
          // Angle in world top-down plane
          const heading = Math.atan2(dx, dy);
          onHeadingChange(heading);
        }
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setTouchActive(false);
        setJoystickOrigin(null);
        setKnobOffset({ x: 0, y: 0 });
        break;
      }
    }
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      {/* Left Touch Joystick Zone */}
      <div
        ref={joystickZoneRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="absolute left-0 bottom-0 w-1/2 h-1/2 pointer-events-auto"
      >
        {touchActive && joystickOrigin && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-cyan-400/50 bg-slate-950/60 pointer-events-none flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            style={{ left: joystickOrigin.x, top: joystickOrigin.y }}
          >
            {/* Center Thumbstick Knob */}
            <div
              className="w-12 h-12 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_15px_rgba(6,182,212,0.8)]"
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Right Boost Button */}
      <div className="absolute right-6 bottom-20 pointer-events-auto">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onBoostChange(true);
            haptics.triggerBoost();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onBoostChange(false);
          }}
          className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all ${
            isBoosting
              ? 'bg-rose-500 scale-95 shadow-[0_0_30px_rgba(244,63,94,0.8)] border-4 border-white'
              : 'bg-slate-900/90 border-2 border-rose-500/80 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
          }`}
        >
          <svg className={`w-7 h-7 fill-current ${isBoosting ? 'text-white' : 'text-rose-400'}`} viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className={`text-[10px] font-bold font-mono tracking-wider ${isBoosting ? 'text-white' : 'text-rose-300'}`}>
            BOOST
          </span>
        </button>
      </div>
    </div>
  );
};
