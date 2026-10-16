import React, { useState, useEffect } from 'react';
import { sound } from '../services/audio';
import { haptics } from '../services/haptics';

interface SettingsDockProps {
  onToggleZenMode?: () => void;
  isZenMode?: boolean;
}

export const SettingsDock: React.FC<SettingsDockProps> = ({
  onToggleZenMode,
  isZenMode = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(haptics.isEnabled());
  const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'perf'>('high');

  // Keyboard shortcut 'H' to toggle dock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setIsCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleSound = () => {
    const state = sound.toggleMute();
    setIsMuted(state);
    if (!state) sound.playUiClick();
  };

  const handleToggleHaptics = () => {
    const state = haptics.toggle();
    setHapticsEnabled(state);
    sound.playUiClick();
  };

  return (
    <div
      className="fixed z-30 pointer-events-auto transition-transform duration-300 ease-out"
      style={{
        bottom: '12px',
        left: '50%',
        transform: `translateX(-50%) translateY(${isCollapsed ? 'calc(100% - 32px)' : '0px'})`,
        maxWidth: 'min(720px, 94vw)',
        width: '100%',
      }}
    >
      {/* Collapse / Expand Tab */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => {
            sound.playUiClick();
            setIsCollapsed(!isCollapsed);
          }}
          className="px-4 py-1 rounded-t-md bg-slate-900 border-t border-x border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <span>{isCollapsed ? '▴ Show Controls (H)' : '▾ Hide Controls (H)'}</span>
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-b-md px-4 py-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Audio Toggle */}
        <button
          onClick={handleToggleSound}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${
            !isMuted
              ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-950 border-slate-800 text-slate-500'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {!isMuted ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            )}
          </svg>
          <span className="font-mono">{!isMuted ? 'SYNTH SFX: ON' : 'SYNTH SFX: MUTED'}</span>
        </button>

        {/* Haptic Feedback Toggle */}
        <button
          onClick={handleToggleHaptics}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${
            hapticsEnabled
              ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
              : 'bg-slate-950 border-slate-800 text-slate-500'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 0 0-9.33-5M15 12a3 3 0 0 0-4.66-2.5M6 15.34A6 6 0 0 0 15.34 21" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <span className="font-mono">{hapticsEnabled ? 'HAPTICS: ON' : 'HAPTICS: OFF'}</span>
        </button>

        {/* Graphics Performance Mode (Mobile vs Desktop) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
          <button
            onClick={() => {
              setGraphicsQuality('high');
              sound.playUiClick();
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
              graphicsQuality === 'high'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Fidelity
          </button>
          <button
            onClick={() => {
              setGraphicsQuality('perf');
              sound.playUiClick();
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
              graphicsQuality === 'perf'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            60FPS Mobile
          </button>
        </div>

        {/* Cinema / Zen View Mode */}
        {onToggleZenMode && (
          <button
            onClick={() => {
              sound.playUiClick();
              onToggleZenMode();
            }}
            className={`px-3 py-1.5 rounded border font-mono transition-all ${
              isZenMode
                ? 'bg-purple-950/70 border-purple-500/50 text-purple-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isZenMode ? 'EXIT ZEN MODE' : 'ZEN / CINEMA'}
          </button>
        )}
      </div>
    </div>
  );
};
