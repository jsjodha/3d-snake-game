import React, { useState } from 'react';
import { PlayerProfile, SnakeSkin } from '../game/types';
import { DEFAULT_SKINS, UPGRADE_DEFINITIONS, storage } from '../services/storage';
import { sound } from '../services/audio';

interface UpgradesModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onProfileUpdate: (updated: PlayerProfile) => void;
}

export const UpgradesModal: React.FC<UpgradesModalProps> = ({
  profile,
  onClose,
  onProfileUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'upgrades' | 'skins'>('upgrades');

  const handleUpgrade = async (upgradeId: string) => {
    const def = UPGRADE_DEFINITIONS.find(u => u.id === upgradeId);
    if (!def) return;

    const currentLvl = profile.upgrades[upgradeId] || 0;
    if (currentLvl >= def.maxLevel) return;

    const cost = Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLvl));
    if (profile.credits < cost) return;

    sound.playUiClick();

    const updatedUpgrades = {
      ...profile.upgrades,
      [upgradeId]: currentLvl + 1,
    };

    const updated = await storage.updateProfile({
      credits: profile.credits - cost,
      upgrades: updatedUpgrades,
    });
    onProfileUpdate(updated);
  };

  const handleSelectSkin = async (skinId: string) => {
    sound.playUiClick();
    const updated = await storage.updateProfile({ selectedSkin: skinId });
    onProfileUpdate(updated);
  };

  const handleUnlockSkin = async (skin: SnakeSkin) => {
    if (profile.credits < skin.cost) return;
    sound.playUiClick();

    const updatedUnlocked = [...profile.unlockedSkins, skin.id];
    const updated = await storage.updateProfile({
      credits: profile.credits - skin.cost,
      unlockedSkins: updatedUnlocked,
      selectedSkin: skin.id,
    });
    onProfileUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_0_35px_rgba(6,182,212,0.3)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wider text-slate-100">CYBERNETIC WORKSHOP</h2>
              <p className="text-xs text-slate-400">Enhance snake subsystems and unlock neural chassis skins</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Current Credits */}
            <div className="px-3 py-1.5 rounded bg-slate-900 border border-amber-500/40 flex items-center gap-2">
              <span className="text-amber-400 font-mono font-bold tabular-nums">{profile.credits.toLocaleString()} CR</span>
            </div>
            {/* Close Button */}
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
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6">
          <button
            onClick={() => {
              sound.playUiClick();
              setActiveTab('upgrades');
            }}
            className={`py-3 px-4 font-mono text-xs font-bold tracking-wider border-b-2 transition-all ${
              activeTab === 'upgrades'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            SUBSYSTEM UPGRADES
          </button>
          <button
            onClick={() => {
              sound.playUiClick();
              setActiveTab('skins');
            }}
            className={`py-3 px-4 font-mono text-xs font-bold tracking-wider border-b-2 transition-all ${
              activeTab === 'skins'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            CHASSIS SKINS
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'upgrades' && (
            <div className="space-y-3">
              {UPGRADE_DEFINITIONS.map(def => {
                const currentLvl = profile.upgrades[def.id] || 0;
                const isMax = currentLvl >= def.maxLevel;
                const cost = Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLvl));
                const canAfford = profile.credits >= cost && !isMax;

                // Current calculated value
                const curVal = def.baseValue + currentLvl * def.perLevel;
                const nextVal = def.baseValue + (currentLvl + 1) * def.perLevel;

                return (
                  <div
                    key={def.id}
                    className="p-4 rounded-md bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-100 text-sm">{def.name}</span>
                        <div className="flex gap-1 ml-2">
                          {Array.from({ length: def.maxLevel }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-2.5 h-1.5 rounded-xs ${
                                i < currentLvl ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{def.description}</p>
                      <div className="text-xs font-mono text-cyan-400">
                        {isMax ? (
                          <span>MAXED OUT ({curVal} {def.unit})</span>
                        ) : (
                          <span>
                            CURRENT: <strong>{curVal} {def.unit}</strong> → NEXT: <strong className="text-emerald-400">{nextVal} {def.unit}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={isMax || !canAfford}
                      onClick={() => handleUpgrade(def.id)}
                      className={`px-4 py-2 rounded text-xs font-mono font-bold tracking-wider transition-all whitespace-nowrap ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : canAfford
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'MAX LEVEL' : `UPGRADE (${cost.toLocaleString()} CR)`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'skins' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFAULT_SKINS.map(skin => {
                const isUnlocked = profile.unlockedSkins.includes(skin.id);
                const isSelected = profile.selectedSkin === skin.id;
                const canAfford = profile.credits >= skin.cost;

                return (
                  <div
                    key={skin.id}
                    className={`p-3.5 rounded-md border flex items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color Preview Swatch */}
                      <div
                        className="w-8 h-8 rounded-full border-2 border-slate-700 flex items-center justify-center"
                        style={{ backgroundColor: skin.primaryColor, boxShadow: `0 0 10px ${skin.glowColor}` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: skin.emissiveColor }} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 text-xs sm:text-sm">{skin.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase">{skin.scalePattern}</div>
                      </div>
                    </div>

                    <div>
                      {isSelected ? (
                        <span className="text-[11px] font-mono text-cyan-400 font-bold px-3 py-1 rounded bg-cyan-950/80 border border-cyan-500/40">
                          EQUIPPED
                        </span>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleSelectSkin(skin.id)}
                          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all"
                        >
                          EQUIP
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => handleUnlockSkin(skin)}
                          className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          UNLOCK ({skin.cost} CR)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
