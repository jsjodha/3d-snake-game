import React, { useEffect } from 'react';
import { sound } from '../services/audio';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onQuit }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        sound.playUiClick();
        onResume();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResume]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto select-none">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-lg max-w-sm w-full p-6 text-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
        <h2 className="text-xl font-bold font-mono tracking-widest text-slate-100 mb-1">SIMULATION PAUSED</h2>
        <p className="text-xs text-slate-400 mb-6 font-mono">Neural telemetry frozen in place</p>

        <div className="space-y-3 font-mono">
          <button
            onClick={() => {
              sound.playUiClick();
              onResume();
            }}
            className="w-full py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wider text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            RESUME (ESC)
          </button>
          <button
            onClick={() => {
              sound.playUiClick();
              onRestart();
            }}
            className="w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold tracking-wider text-sm border border-slate-700"
          >
            RESTART ARENA
          </button>
          <button
            onClick={() => {
              sound.playUiClick();
              onQuit();
            }}
            className="w-full py-2.5 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 font-bold tracking-wider text-sm border border-rose-500/40"
          >
            QUIT TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};
