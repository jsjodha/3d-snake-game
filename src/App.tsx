/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { GameState, MatchStats, PlayerProfile } from './game/types';
import { storage } from './services/storage';
import { matchmaking } from './services/matchmaking';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { MobileControls } from './components/MobileControls';
import { SettingsDock } from './components/SettingsDock';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { UpgradesModal } from './components/UpgradesModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { CloudSyncModal } from './components/CloudSyncModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Core Game State
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [profile, setProfile] = useState<PlayerProfile>(storage.getProfile());
  const [isOnline, setIsOnline] = useState<boolean>(storage.getOnlineStatus());

  // Match Live Stats (for HUD)
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentMass, setCurrentMass] = useState<number>(120);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1.0);
  const [currentKills, setCurrentKills] = useState<number>(0);
  const [isBoosting, setIsBoosting] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Modals
  const [lastMatchStats, setLastMatchStats] = useState<MatchStats | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [showUpgrades, setShowUpgrades] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showCloudSync, setShowCloudSync] = useState<boolean>(false);

  // Active match info
  const selectedModeRef = useRef<string>('ranked');
  const selectedRegionRef = useRef<string>('US-East');

  // Initialize Storage & Database
  useEffect(() => {
    storage.init().then(p => {
      setProfile(p);
    });

    const unsubscribe = storage.subscribe(() => {
      setProfile(storage.getProfile());
      setIsOnline(storage.getOnlineStatus());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize Isolated Three.js Engine
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, {
      onGameOver: async (stats: MatchStats) => {
        // Record in IndexedDB and cloud sync queue
        const { newHigh, creditsEarned } = await storage.recordMatch(stats);
        setIsNewHighScore(newHigh);
        setLastMatchStats(stats);
        setGameState('GAMEOVER');

        // Post score to global leaderboard if online
        if (storage.getOnlineStatus()) {
          matchmaking.submitScore({
            name: profile.username,
            score: stats.score,
            mass: stats.mass,
            kills: stats.kills,
            platform: profile.platform,
            skin: profile.selectedSkin,
            region: profile.region,
          }).catch(console.error);
        }
      },
      onUpdateStats: (score, mass, combo, kills) => {
        setCurrentScore(score);
        setCurrentMass(mass);
        setComboMultiplier(combo);
        setCurrentKills(kills);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard shortcut for pausing (Esc or P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Escape' || e.code === 'KeyP') && gameState === 'PLAYING') {
        e.preventDefault();
        setGameState('PAUSED');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Start game session
  const handleStartGame = (mode: string, region: string) => {
    selectedModeRef.current = mode;
    selectedRegionRef.current = region;

    if (engineRef.current) {
      engineRef.current.startMatch(profile.selectedSkin, profile.upgrades);
      setGameState('PLAYING');
      setCurrentScore(0);
      setCurrentMass(120);
      setComboMultiplier(1.0);
      setCurrentKills(0);
      setIsBoosting(false);
    }
  };

  const handleRestart = () => {
    handleStartGame(selectedModeRef.current, selectedRegionRef.current);
  };

  const handleReturnToLobby = () => {
    if (engineRef.current) {
      engineRef.current.endMatch();
    }
    setGameState('TITLE');
    setIsBoosting(false);
  };

  const handleResume = () => {
    setGameState('PLAYING');
  };

  const handleHeadingChange = (heading: number) => {
    if (engineRef.current) {
      engineRef.current.setHeading(heading);
    }
  };

  const handleBoostChange = (boosting: boolean) => {
    setIsBoosting(boosting);
    if (engineRef.current) {
      engineRef.current.setBoostState(boosting);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. Dedicated Isolated Three.js Mount Container (Never torn down by React renders) */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 z-0 w-full h-full cursor-crosshair overflow-hidden touch-none"
      />

      {/* 2. Title Screen State */}
      {gameState === 'TITLE' && (
        <TitleScreen
          profile={profile}
          onStartGame={handleStartGame}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenCloudSync={() => setShowCloudSync(true)}
          onSelectSkin={(skinId) => {
            storage.updateProfile({ selectedSkin: skinId }).then(setProfile);
          }}
          isOnline={isOnline}
        />
      )}

      {/* 3. In-Game Low-Occlusion HUD Overlay (<15% viewport occlusion) */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && !isZenMode && (
        <HUD
          score={currentScore}
          mass={currentMass}
          comboMultiplier={comboMultiplier}
          kills={currentKills}
          maxCombo={engineRef.current?.simulation?.stats.maxCombo || 1}
          simulation={engineRef.current?.simulation || null}
          onPause={() => setGameState('PAUSED')}
          isBoosting={isBoosting}
        />
      )}

      {/* 4. Touch Controls for Mobile Devices (iOS & Android) */}
      {gameState === 'PLAYING' && (
        <MobileControls
          onHeadingChange={handleHeadingChange}
          onBoostChange={handleBoostChange}
          isBoosting={isBoosting}
        />
      )}

      {/* 5. Collapsible Bottom Settings Dock */}
      <SettingsDock
        onToggleZenMode={() => setIsZenMode(prev => !prev)}
        isZenMode={isZenMode}
      />

      {/* 6. Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={handleReturnToLobby}
        />
      )}

      {/* 7. Game Over Modal */}
      {gameState === 'GAMEOVER' && lastMatchStats && (
        <GameOverModal
          stats={lastMatchStats}
          isNewHighScore={isNewHighScore}
          onRestart={handleRestart}
          onReturnToLobby={handleReturnToLobby}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenUpgrades={() => setShowUpgrades(true)}
        />
      )}

      {/* 8. Workshop / Upgrades Modal */}
      {showUpgrades && (
        <UpgradesModal
          profile={profile}
          onClose={() => setShowUpgrades(false)}
          onProfileUpdate={(updated) => setProfile(updated)}
        />
      )}

      {/* 9. Global Cross-Platform Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          profile={profile}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* 10. Cloud Sync & Backup Modal */}
      {showCloudSync && (
        <CloudSyncModal
          profile={profile}
          isOnline={isOnline}
          onClose={() => setShowCloudSync(false)}
          onProfileUpdate={(updated) => setProfile(updated)}
        />
      )}
    </div>
  );
}
