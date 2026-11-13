import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { SoundEngine } from './audio/SoundEngine';
import { createPhaserGame } from './config/phaserConfig';
import { t } from './data/i18n';
import { LEVELS_DATA } from './data/levelsData';
import { QUESTS_LIST } from './data/progressionData';
import { GameBridgeCallbacks, GameScene } from './scenes/GameScene';
import {
  addInventoryItem,
  consumeInventoryItem,
  getItemById,
  grantXpToProgress,
  updateQuestCounters,
  upgradeSkillNode,
} from './systems/ProgressionSystem';
import {
  createInitialProgress,
  DEFAULT_SETTINGS,
  SaveSystem,
} from './systems/SaveSystem';
import {
  ActiveModal,
  GameSettings,
  HudSnapshot,
  LevelClearSummary,
  PlayerProgress,
  ScreenMode,
  VirtualInputState,
} from './types/game';
import { GameHUD } from './ui/GameHUD';
import { LevelSelectModal } from './ui/LevelSelectModal';
import { MainMenu } from './ui/MainMenu';
import {
  CharacterModal,
  InventoryModal,
  QuestsModal,
  SkillTreeModal,
} from './ui/ProgressionModals';
import { SaveSlotsModal } from './ui/SaveSlotsModal';
import {
  CreditsModal,
  GameOverModal,
  LevelCompleteModal,
  PauseModal,
  SettingsModal,
} from './ui/SystemModals';

const INITIAL_HUD: HudSnapshot = {
  hp: 140,
  maxHp: 140,
  energy: 100,
  maxEnergy: 100,
  xp: 0,
  xpToNext: 120,
  level: 1,
  gold: 150,
  combo: 0,
  comboTimerRatio: 0,
  skillCooldown: 0,
  skillMaxCooldown: 3.2,
  dashCooldown: 0,
  dashMaxCooldown: 1.05,
  ultimateCharge: 35,
  isGuarding: false,
  bossActive: false,
  bossName: '',
  bossTitle: '',
  bossHp: 0,
  bossMaxHp: 1,
  bossPhase: 1,
  isMiniBoss: false,
  levelIndex: 0,
  levelName: 'Shadow Forest',
  checkpointReached: false,
  secretsFoundInLevel: 0,
  fps: 60,
  bannerText: null,
  potionsCount: 3,
};

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [slots, setSlots] = useState<(PlayerProgress | null)[]>([null, null, null]);
  const [activeProgress, setActiveProgress] = useState<PlayerProgress | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>('MAIN_MENU');
  const [activeModal, setActiveModal] = useState<ActiveModal>('NONE');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [clearSummary, setClearSummary] = useState<LevelClearSummary | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const phaserMountRef = useRef<HTMLDivElement | null>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const progressRef = useRef<PlayerProgress | null>(null);
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);

  progressRef.current = activeProgress;
  settingsRef.current = settings;

  // Boot load settings and save slots from IndexedDB
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [loadedSettings, loadedSlots, latest] = await Promise.all([
        SaveSystem.loadSettings(),
        SaveSystem.listSlots(),
        SaveSystem.getLatestSlot(),
      ]);
      if (!mounted) return;
      setSettings(loadedSettings);
      SoundEngine.updateSettings(loadedSettings);
      setSlots(loadedSlots);
      setActiveProgress(latest);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Unlock Web Audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      SoundEngine.unlock();
      if (screenMode === 'MAIN_MENU') {
        SoundEngine.setMusicMood('menu');
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [screenMode]);

  // Escape / P pause shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (screenMode === 'PLAYING' && activeModal === 'NONE') {
          getActiveScene()?.setPausedState(true);
          setScreenMode('PAUSED');
        } else if (screenMode === 'PAUSED' && activeModal === 'NONE') {
          getActiveScene()?.setPausedState(false);
          setScreenMode('PLAYING');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenMode, activeModal]);

  const getActiveScene = (): GameScene | null => {
    const game = phaserGameRef.current;
    if (!game) return null;
    return game.scene.getScene('GameScene') as GameScene | null;
  };

  const commitProgress = useCallback(async (next: PlayerProgress) => {
    progressRef.current = next;
    setActiveProgress(next);
    setSlots((prev) => {
      const copy = [...prev];
      copy[next.slotId - 1] = next;
      return copy;
    });
    getActiveScene()?.updateProgressAndSettings(next, settingsRef.current);
    await SaveSystem.saveProgress(next);
  }, []);

  const destroyPhaser = () => {
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
      phaserGameRef.current = null;
    }
  };

  useEffect(() => {
    return () => destroyPhaser();
  }, []);

  const startRealm = useCallback(
    (levelIndex: number, overrideProgress?: PlayerProgress) => {
      const prog = overrideProgress ?? progressRef.current;
      if (!prog) return;

      SoundEngine.unlock();
      setActiveModal('NONE');
      setClearSummary(null);
      setSaveFeedback(null);
      setCurrentLevelIdx(levelIndex);
      setScreenMode('PLAYING');

      destroyPhaser();

      requestAnimationFrame(() => {
        if (!phaserMountRef.current) return;
        const game = createPhaserGame(phaserMountRef.current, settingsRef.current);
        phaserGameRef.current = game;

        const callbacks: GameBridgeCallbacks = {
          onHudUpdate: (snapshot) => setHud(snapshot),
          onAutoSave: (delta) => {
            const cur = progressRef.current;
            if (!cur) return;
            let next: PlayerProgress = {
              ...cur,
              gold: cur.gold + (delta.goldGained ?? 0),
              shadowOrbs: cur.shadowOrbs + (delta.orbsGained ?? 0),
              stats: {
                ...cur.stats,
                totalKills: cur.stats.totalKills + (delta.kills ?? 0),
                bossesDefeated: cur.stats.bossesDefeated + (delta.bossDefeated ? 1 : 0),
                secretsFound: cur.stats.secretsFound + (delta.secretsFound ?? 0),
                maxCombo: Math.max(cur.stats.maxCombo, delta.maxCombo ?? 0),
                perfectParries: cur.stats.perfectParries + (delta.parries ?? 0),
              },
            };

            if (delta.foundItemId) {
              next = addInventoryItem(next, delta.foundItemId, 1);
            }

            if (delta.xpGained && delta.xpGained > 0) {
              const { updated, leveledUp } = grantXpToProgress(next, delta.xpGained);
              next = updated;
              if (leveledUp) SoundEngine.playSfx('level_up');
            }

            next = updateQuestCounters(next, {
              kills: delta.kills,
              bosses: delta.bossDefeated ? 1 : 0,
              orbs: delta.orbsGained,
              secrets: delta.secretsFound,
            });

            commitProgress(next);
          },
          onLevelComplete: (summary) => {
            const cur = progressRef.current;
            if (cur) {
              const completed = Array.from(new Set([...cur.completedLevels, summary.levelIndex]));
              const nextUnlocked = Math.min(
                LEVELS_DATA.length - 1,
                Math.max(cur.unlockedLevelIndex, summary.levelIndex + 1)
              );
              let next: PlayerProgress = {
                ...cur,
                gold: cur.gold + summary.rewardGold,
                completedLevels: completed,
                unlockedLevelIndex: nextUnlocked,
                stats: {
                  ...cur.stats,
                  playTimeSeconds: cur.stats.playTimeSeconds + summary.timeSeconds,
                },
              };
              const { updated } = grantXpToProgress(next, summary.rewardXp);
              next = updateQuestCounters(updated, { levelsCleared: completed.length });
              commitProgress(next);
            }
            setClearSummary(summary);
            setScreenMode('LEVEL_COMPLETE');
          },
          onGameOver: () => {
            setScreenMode('GAME_OVER');
          },
          onConsumePotion: () => {
            const cur = progressRef.current;
            if (!cur) return false;
            const qty = cur.inventory.find((i) => i.itemId === 'potion_vitality')?.quantity ?? 0;
            if (qty <= 0) return false;
            const next = consumeInventoryItem(cur, 'potion_vitality', 1);
            commitProgress(next);
            return true;
          },
        };

        game.scene.start('GameScene', {
          levelIndex,
          progress: prog,
          settings: settingsRef.current,
          callbacks,
        });
      });
    },
    [commitProgress]
  );

  const handleSettingsChange = async (next: GameSettings) => {
    setSettings(next);
    SoundEngine.updateSettings(next);
    if (activeProgress) {
      getActiveScene()?.updateProgressAndSettings(activeProgress, next);
    }
    await SaveSystem.saveSettings(next);
  };

  const handleSelectNewSlot = async (slotId: number) => {
    SoundEngine.playSfx('ui_click');
    const fresh = createInitialProgress(slotId);
    await commitProgress(fresh);
    setActiveModal('NONE');
    startRealm(0, fresh);
  };

  const handleLoadSlot = async (slotId: number) => {
    SoundEngine.playSfx('ui_click');
    const loaded = await SaveSystem.loadSlot(slotId);
    if (!loaded) return;
    setActiveProgress(loaded);
    setActiveModal('LEVEL_SELECT');
  };

  const handleDeleteSlot = async (slotId: number) => {
    SoundEngine.playSfx('ui_click');
    await SaveSystem.deleteSlot(slotId);
    const updatedSlots = await SaveSystem.listSlots();
    setSlots(updatedSlots);
    if (activeProgress?.slotId === slotId) {
      const fallback = await SaveSystem.getLatestSlot();
      setActiveProgress(fallback);
    }
  };

  const handleContinue = () => {
    SoundEngine.playSfx('ui_click');
    if (!activeProgress) {
      setActiveModal('SAVE_SLOTS');
      return;
    }
    startRealm(activeProgress.unlockedLevelIndex, activeProgress);
  };

  const handleEquipItem = (itemId: string) => {
    if (!activeProgress) return;
    const item = getItemById(itemId);
    if (!item) return;
    SoundEngine.playSfx('ui_click');
    const nextEquipped = { ...activeProgress.equipped };
    if (item.category === 'weapon') nextEquipped.weapon = itemId;
    if (item.category === 'armor') nextEquipped.armor = itemId;
    if (item.category === 'talisman') nextEquipped.talisman = itemId;
    commitProgress({ ...activeProgress, equipped: nextEquipped });
  };

  const handleBuyItem = (itemId: string) => {
    if (!activeProgress) return;
    const item = getItemById(itemId);
    if (!item || activeProgress.gold < item.price) return;
    SoundEngine.playSfx('pickup');
    let next: PlayerProgress = {
      ...activeProgress,
      gold: activeProgress.gold - item.price,
    };
    next = addInventoryItem(next, item.id, 1);
    if (item.category === 'weapon' || item.category === 'armor' || item.category === 'talisman') {
      next = {
        ...next,
        equipped: {
          ...next.equipped,
          [item.category]: item.id,
        },
      };
    }
    commitProgress(next);
  };

  const handleUpgradeSkill = (nodeId: string) => {
    if (!activeProgress) return;
    const next = upgradeSkillNode(activeProgress, nodeId);
    if (!next) return;
    SoundEngine.playSfx('level_up');
    commitProgress(next);
  };

  const handleClaimQuest = (questId: string) => {
    if (!activeProgress || activeProgress.claimedQuests.includes(questId)) return;
    const q = QUESTS_LIST.find((item) => item.id === questId);
    if (!q) return;
    SoundEngine.playSfx('level_up');
    let next: PlayerProgress = {
      ...activeProgress,
      gold: activeProgress.gold + q.rewardGold,
      claimedQuests: [...activeProgress.claimedQuests, questId],
    };
    if (q.rewardItemId) {
      next = addInventoryItem(next, q.rewardItemId, 1);
    }
    const { updated } = grantXpToProgress(next, q.rewardXp);
    commitProgress(updated);
  };

  const handleReturnToMenu = () => {
    SoundEngine.playSfx('ui_click');
    destroyPhaser();
    setScreenMode('MAIN_MENU');
    setActiveModal('NONE');
    SoundEngine.setMusicMood('menu');
  };

  const handleVirtualInput = (patch: Partial<VirtualInputState>) => {
    getActiveScene()?.setVirtualInput(patch);
  };

  const handlePulseAction = (
    action: 'jumpPressed' | 'attackPressed' | 'dashPressed' | 'skillPressed' | 'ultimatePressed'
  ) => {
    getActiveScene()?.pulseVirtualAction(action);
  };

  const hasAnySave = slots.some((s) => s !== null) || activeProgress !== null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#080a0f] text-slate-100">
      {/* Main Menu */}
      {screenMode === 'MAIN_MENU' && (
        <MainMenu
          language={settings.language}
          activeProgress={activeProgress}
          hasAnySave={hasAnySave}
          onContinue={handleContinue}
          onOpenModal={(modal) => {
            SoundEngine.playSfx('ui_click');
            setActiveModal(modal);
          }}
          onToggleLanguage={() =>
            handleSettingsChange({
              ...settings,
              language: settings.language === 'id' ? 'en' : 'id',
            })
          }
        />
      )}

      {/* Phaser Gameplay Viewport */}
      {screenMode !== 'MAIN_MENU' && (
        <div className="relative h-full w-full">
          <div ref={phaserMountRef} className="h-full w-full" />

          {screenMode === 'PLAYING' && (
            <GameHUD
              hud={hud}
              language={settings.language}
              sensitivity={settings.controlSensitivity}
              onPause={() => {
                SoundEngine.playSfx('ui_click');
                getActiveScene()?.setPausedState(true);
                setSaveFeedback(null);
                setScreenMode('PAUSED');
              }}
              onInputChange={handleVirtualInput}
              onPulseAction={handlePulseAction}
              onUsePotion={() => getActiveScene()?.tryUsePotion()}
            />
          )}

          {screenMode === 'PAUSED' && activeModal === 'NONE' && (
            <PauseModal
              language={settings.language}
              saveFeedback={saveFeedback}
              onResume={() => {
                SoundEngine.playSfx('ui_click');
                getActiveScene()?.setPausedState(false);
                setScreenMode('PLAYING');
              }}
              onRestart={() => startRealm(currentLevelIdx)}
              onManualSave={async () => {
                if (activeProgress) {
                  await commitProgress(activeProgress);
                  SoundEngine.playSfx('pickup');
                  setSaveFeedback(t(settings.language, 'savedNotice'));
                }
              }}
              onOpenSettings={() => setActiveModal('SETTINGS')}
              onMainMenu={handleReturnToMenu}
            />
          )}

          {screenMode === 'LEVEL_COMPLETE' && clearSummary && (
            <LevelCompleteModal
              language={settings.language}
              summary={clearSummary}
              hasNextLevel={currentLevelIdx < LEVELS_DATA.length - 1}
              onNextLevel={() => startRealm(currentLevelIdx + 1)}
              onReplay={() => startRealm(currentLevelIdx)}
              onMainMenu={handleReturnToMenu}
            />
          )}

          {screenMode === 'GAME_OVER' && (
            <GameOverModal
              language={settings.language}
              onRespawn={() => {
                SoundEngine.playSfx('ui_click');
                getActiveScene()?.respawnPlayerAtCheckpoint();
                setScreenMode('PLAYING');
              }}
              onRestart={() => startRealm(currentLevelIdx)}
              onMainMenu={handleReturnToMenu}
            />
          )}
        </div>
      )}

      {/* Sub-Modals */}
      {activeModal === 'SAVE_SLOTS' && (
        <SaveSlotsModal
          language={settings.language}
          slots={slots}
          onSelectNewSlot={handleSelectNewSlot}
          onLoadSlot={handleLoadSlot}
          onDeleteSlot={handleDeleteSlot}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'LEVEL_SELECT' && activeProgress && (
        <LevelSelectModal
          language={settings.language}
          progress={activeProgress}
          onStartLevel={(idx) => startRealm(idx)}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'CHARACTER' && activeProgress && (
        <CharacterModal
          language={settings.language}
          progress={activeProgress}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'INVENTORY' && activeProgress && (
        <InventoryModal
          language={settings.language}
          progress={activeProgress}
          onEquipItem={handleEquipItem}
          onBuyItem={handleBuyItem}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'SKILL_TREE' && activeProgress && (
        <SkillTreeModal
          language={settings.language}
          progress={activeProgress}
          onUpgradeSkill={handleUpgradeSkill}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'QUESTS' && activeProgress && (
        <QuestsModal
          language={settings.language}
          progress={activeProgress}
          onClaimQuest={handleClaimQuest}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'SETTINGS' && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'CREDITS' && (
        <CreditsModal
          language={settings.language}
          onClose={() => setActiveModal('NONE')}
        />
      )}
    </div>
  );
}
