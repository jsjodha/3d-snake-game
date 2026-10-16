import React, { useState } from 'react';
import { PlayerProfile } from '../game/types';
import { storage } from '../services/storage';
import { sound } from '../services/audio';

interface CloudSyncModalProps {
  profile: PlayerProfile;
  isOnline: boolean;
  onClose: () => void;
  onProfileUpdate: (updated: PlayerProfile) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  profile,
  isOnline,
  onClose,
  onProfileUpdate,
}) => {
  const [backupCode, setBackupCode] = useState<string>('');
  const [restoreInput, setRestoreInput] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleForceSync = async () => {
    sound.playUiClick();
    setSyncStatus('Synchronizing with Cloud Relay...');
    const res = await storage.triggerSync();
    if (res.success) {
      setSyncStatus(`Sync successful at ${new Date().toLocaleTimeString()}`);
      onProfileUpdate(storage.getProfile());
    } else {
      setSyncStatus('Sync deferred: offline or network timeout.');
    }
  };

  const handleGenerateBackup = () => {
    sound.playUiClick();
    const code = storage.generateBackupCode();
    setBackupCode(code);
  };

  const handleCopy = () => {
    if (!backupCode) return;
    navigator.clipboard.writeText(backupCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestore = async () => {
    if (!restoreInput.trim()) return;
    sound.playUiClick();
    const ok = await storage.restoreFromBackupCode(restoreInput);
    if (ok) {
      setSyncStatus('Profile restored successfully from backup code!');
      onProfileUpdate(storage.getProfile());
      setRestoreInput('');
    } else {
      setSyncStatus('Failed to parse backup code. Please check format.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-lg max-w-xl w-full flex flex-col shadow-[0_0_35px_rgba(16,185,129,0.3)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wider text-slate-100">CLOUD SYNC & BACKUP</h2>
              <p className="text-xs text-slate-400">IndexedDB local database with seamless cross-device cloud sync</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playUiClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Connection status card */}
          <div className="p-4 rounded-md bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
                <span className="font-bold text-slate-100 font-mono text-sm">
                  {isOnline ? 'ONLINE: CLOUD RELAY CONNECTED' : 'OFFLINE MODE: LOCAL INDEXEDDB ACTIVE'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Pilot ID: <strong className="text-cyan-400">{profile.userId}</strong> · Version #{profile.version}
              </div>
            </div>

            <button
              onClick={handleForceSync}
              className="px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              SYNC NOW
            </button>
          </div>

          {syncStatus && (
            <div className="p-2.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-[11px]">
              {syncStatus}
            </div>
          )}

          {/* Backup Code Generator */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 font-mono uppercase tracking-wider">
              Cross-Device Transfer / Backup Code
            </div>
            <p className="text-slate-400 text-[11px]">
              Generate a portable backup token to transfer your high scores, skins, and upgrades to your mobile iOS or Android device.
            </p>

            {backupCode ? (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={backupCode}
                  className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-cyan-300 flex-1 truncate select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono font-bold"
                >
                  {copied ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateBackup}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono font-bold border border-slate-700"
              >
                GENERATE BACKUP TOKEN
              </button>
            )}
          </div>

          {/* Restore Progress */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="font-bold text-slate-200 font-mono uppercase tracking-wider">
              Restore Profile from Backup
            </div>
            <div className="flex items-center gap-2">
              <input
                placeholder="Paste backup token here..."
                value={restoreInput}
                onChange={(e) => setRestoreInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200 flex-1"
              />
              <button
                onClick={handleRestore}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded font-mono font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                RESTORE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
