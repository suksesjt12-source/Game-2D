export type Language = 'id' | 'en';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type FPSLimit = 60 | 30;
export type ResolutionScale = 'native' | 'balanced' | 'performance';

export type ScreenMode =
  | 'MAIN_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_COMPLETE'
  | 'GAME_OVER';

export type ActiveModal =
  | 'NONE'
  | 'SAVE_SLOTS'
  | 'LEVEL_SELECT'
  | 'CHARACTER'
  | 'INVENTORY'
  | 'SKILL_TREE'
  | 'QUESTS'
  | 'SETTINGS'
  | 'CREDITS';

export interface GameSettings {
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  graphicsQuality: GraphicsQuality;
  fpsLimit: FPSLimit;
  resolution: ResolutionScale;
  language: Language;
  controlSensitivity: number; // 0.5..2.0
}

export type ItemCategory = 'weapon' | 'armor' | 'talisman' | 'consumable' | 'relic';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemStats {
  damage?: number;
  maxHp?: number;
  maxEnergy?: number;
  critChance?: number;
  speedBonus?: number;
  defense?: number;
  healHp?: number;
  restoreEnergy?: number;
}

export interface GameItem {
  id: string;
  nameId: string;
  nameEn: string;
  descId: string;
  descEn: string;
  category: ItemCategory;
  rarity: ItemRarity;
  price: number;
  stats: ItemStats;
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export interface SkillNode {
  id: string;
  branch: 'offense' | 'vitality' | 'shadow';
  nameId: string;
  nameEn: string;
  descId: string;
  descEn: string;
  maxLevel: number;
  costPerLevel: number;
  requires?: string;
  unlockSkillKey?: 'crimson_tempest' | 'phantom_shuriken' | 'eclipse_judgement';
  statBonus: {
    damageFlat?: number;
    maxHpFlat?: number;
    maxEnergyFlat?: number;
    critChance?: number;
    dashCooldownReduce?: number;
    energyRegen?: number;
  };
}

export interface QuestDefinition {
  id: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  type: 'kill_enemies' | 'defeat_boss' | 'collect_orbs' | 'discover_secrets' | 'clear_levels';
  targetCount: number;
  rewardGold: number;
  rewardXp: number;
  rewardItemId?: string;
}

export interface AchievementDefinition {
  id: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  conditionType:
    | 'first_blood'
    | 'combo_20'
    | 'perfect_parry'
    | 'boss_slayer_1'
    | 'boss_slayer_5'
    | 'secret_hunter'
    | 'level_10';
  rewardGold: number;
}

export interface PlayerProgress {
  slotId: number;
  savedAt: number;
  checksum: string;
  version: number;
  characterLevel: number;
  xp: number;
  xpToNext: number;
  skillPoints: number;
  gold: number;
  shadowOrbs: number;
  unlockedLevelIndex: number; // 0..4
  completedLevels: number[];
  skillLevels: Record<string, number>;
  equipped: {
    weapon: string;
    armor: string;
    talisman: string;
  };
  inventory: InventoryEntry[];
  questProgress: Record<string, number>;
  claimedQuests: string[];
  unlockedAchievements: string[];
  stats: {
    totalKills: number;
    bossesDefeated: number;
    secretsFound: number;
    maxCombo: number;
    perfectParries: number;
    playTimeSeconds: number;
  };
}

export type EnemyType =
  | 'shadow_stalker'
  | 'ronin_spearman'
  | 'tengu_archer'
  | 'oni_brute'
  | 'cursed_kunoichi';

export type MiniBossType =
  | 'forest_warden'
  | 'blood_executioner'
  | 'storm_kirin';

export type BossType =
  | 'kodama_overlord'
  | 'ash_shogun'
  | 'raijin_sentinel'
  | 'temple_seraph'
  | 'demon_lord_maou';

export interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'ground' | 'stone' | 'wood' | 'bridge' | 'secret_wall';
}

export interface HazardDef {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'spikes' | 'cursed_totem' | 'lava_vent' | 'lightning_pillar';
  damage: number;
}

export interface EnemySpawnDef {
  x: number;
  y: number;
  type: EnemyType;
  patrolWidth: number;
}

export interface PickupSpawnDef {
  x: number;
  y: number;
  kind: 'gold_cache' | 'health_orb' | 'energy_orb' | 'secret_chest' | 'relic';
  itemId?: string;
}

export interface LevelDefinition {
  id: string;
  index: number;
  nameId: string;
  nameEn: string;
  subtitleId: string;
  subtitleEn: string;
  recommendedLevel: number;
  bgKey: string;
  bgImagePath: string;
  themeColor: string;
  accentColor: string;
  weather: 'fireflies' | 'embers' | 'storm' | 'runes' | 'ash';
  worldWidth: number;
  worldHeight: number;
  spawnX: number;
  spawnY: number;
  checkpointX: number;
  checkpointY: number;
  miniBoss: {
    x: number;
    y: number;
    type: MiniBossType;
    nameId: string;
    nameEn: string;
  };
  bossArenaX: number;
  boss: {
    x: number;
    y: number;
    type: BossType;
    nameId: string;
    nameEn: string;
    titleId: string;
    titleEn: string;
  };
  platforms: PlatformDef[];
  hazards: HazardDef[];
  enemies: EnemySpawnDef[];
  pickups: PickupSpawnDef[];
  secretZone: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rewardGold: number;
  rewardXp: number;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  xp: number;
  xpToNext: number;
  level: number;
  gold: number;
  combo: number;
  comboTimerRatio: number;
  skillCooldown: number;
  skillMaxCooldown: number;
  dashCooldown: number;
  dashMaxCooldown: number;
  ultimateCharge: number; // 0..100
  isGuarding: boolean;
  bossActive: boolean;
  bossName: string;
  bossTitle: string;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: 1 | 2;
  isMiniBoss: boolean;
  levelIndex: number;
  levelName: string;
  checkpointReached: boolean;
  secretsFoundInLevel: number;
  fps: number;
  bannerText: string | null;
  potionsCount: number;
}

export interface LevelClearSummary {
  levelIndex: number;
  levelName: string;
  timeSeconds: number;
  kills: number;
  maxCombo: number;
  secretsFound: number;
  rewardGold: number;
  rewardXp: number;
  rank: 'S' | 'A' | 'B';
}

export interface VirtualInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1
  sprint: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  dashPressed: boolean;
  skillPressed: boolean;
  ultimatePressed: boolean;
  guardHeld: boolean;
}
