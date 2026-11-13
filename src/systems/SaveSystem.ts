import { GameSettings, PlayerProgress } from '../types/game';

const DB_NAME = 'ShadowNinjaSaveDB';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';
const STORE_SETTINGS = 'settings';
const LS_SETTINGS_KEY = 'shadow_ninja_settings_v1';
const LS_SLOT_PREFIX = 'shadow_ninja_slot_v1_';
const CURRENT_SAVE_VERSION = 1;

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.85,
  musicVolume: 0.65,
  sfxVolume: 0.85,
  graphicsQuality: 'high',
  fpsLimit: 60,
  resolution: 'native',
  language: 'id',
  controlSensitivity: 1.0,
};

function computeChecksum(data: Omit<PlayerProgress, 'checksum'>): string {
  const payload = JSON.stringify({
    slotId: data.slotId,
    version: data.version,
    characterLevel: data.characterLevel,
    xp: data.xp,
    gold: data.gold,
    unlockedLevelIndex: data.unlockedLevelIndex,
    completedLevels: data.completedLevels,
    skillLevels: data.skillLevels,
    equipped: data.equipped,
    inventory: data.inventory,
  });
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createInitialProgress(slotId: number): PlayerProgress {
  const base: Omit<PlayerProgress, 'checksum'> = {
    slotId,
    savedAt: Date.now(),
    version: CURRENT_SAVE_VERSION,
    characterLevel: 1,
    xp: 0,
    xpToNext: 120,
    skillPoints: 2,
    gold: 150,
    shadowOrbs: 0,
    unlockedLevelIndex: 0,
    completedLevels: [],
    skillLevels: {},
    equipped: {
      weapon: 'katana_iron',
      armor: 'armor_shinobi',
      talisman: '',
    },
    inventory: [
      { itemId: 'katana_iron', quantity: 1 },
      { itemId: 'armor_shinobi', quantity: 1 },
      { itemId: 'potion_vitality', quantity: 3 },
      { itemId: 'potion_ki', quantity: 2 },
    ],
    questProgress: {},
    claimedQuests: [],
    unlockedAchievements: [],
    stats: {
      totalKills: 0,
      bossesDefeated: 0,
      secretsFound: 0,
      maxCombo: 0,
      perfectParries: 0,
      playTimeSeconds: 0,
    },
  };
  return {
    ...base,
    checksum: computeChecksum(base),
  };
}

function validateAndSanitizeProgress(raw: unknown, slotId: number): PlayerProgress | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<PlayerProgress>;
  if (
    typeof obj.characterLevel !== 'number' ||
    obj.characterLevel < 1 ||
    !Array.isArray(obj.inventory) ||
    !obj.equipped ||
    typeof obj.gold !== 'number'
  ) {
    return null;
  }

  const sanitizedBase: Omit<PlayerProgress, 'checksum'> = {
    slotId,
    savedAt: typeof obj.savedAt === 'number' ? obj.savedAt : Date.now(),
    version: CURRENT_SAVE_VERSION,
    characterLevel: Math.max(1, Math.floor(obj.characterLevel)),
    xp: Math.max(0, Math.floor(obj.xp ?? 0)),
    xpToNext: Math.max(100, Math.floor(obj.xpToNext ?? 120)),
    skillPoints: Math.max(0, Math.floor(obj.skillPoints ?? 0)),
    gold: Math.max(0, Math.floor(obj.gold)),
    shadowOrbs: Math.max(0, Math.floor(obj.shadowOrbs ?? 0)),
    unlockedLevelIndex: Math.min(4, Math.max(0, Math.floor(obj.unlockedLevelIndex ?? 0))),
    completedLevels: Array.isArray(obj.completedLevels)
      ? obj.completedLevels.filter((n) => typeof n === 'number' && n >= 0 && n <= 4)
      : [],
    skillLevels: obj.skillLevels && typeof obj.skillLevels === 'object' ? obj.skillLevels : {},
    equipped: {
      weapon: typeof obj.equipped.weapon === 'string' ? obj.equipped.weapon : 'katana_iron',
      armor: typeof obj.equipped.armor === 'string' ? obj.equipped.armor : 'armor_shinobi',
      talisman: typeof obj.equipped.talisman === 'string' ? obj.equipped.talisman : '',
    },
    inventory: obj.inventory.filter(
      (i) => i && typeof i.itemId === 'string' && typeof i.quantity === 'number' && i.quantity > 0
    ),
    questProgress:
      obj.questProgress && typeof obj.questProgress === 'object' ? obj.questProgress : {},
    claimedQuests: Array.isArray(obj.claimedQuests) ? obj.claimedQuests : [],
    unlockedAchievements: Array.isArray(obj.unlockedAchievements) ? obj.unlockedAchievements : [],
    stats: {
      totalKills: Math.max(0, obj.stats?.totalKills ?? 0),
      bossesDefeated: Math.max(0, obj.stats?.bossesDefeated ?? 0),
      secretsFound: Math.max(0, obj.stats?.secretsFound ?? 0),
      maxCombo: Math.max(0, obj.stats?.maxCombo ?? 0),
      perfectParries: Math.max(0, obj.stats?.perfectParries ?? 0),
      playTimeSeconds: Math.max(0, obj.stats?.playTimeSeconds ?? 0),
    },
  };

  const expected = computeChecksum(sanitizedBase);
  if (obj.checksum && obj.checksum !== expected) {
    // Attempt safe recovery if checksum mismatches due to minor schema drift, otherwise reject
    if (typeof obj.version !== 'number') return null;
  }

  return {
    ...sanitizedBase,
    checksum: expected,
  };
}

class SaveSystemClass {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private openDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_SAVES)) {
            db.createObjectStore(STORE_SAVES, { keyPath: 'slotId' });
          }
          if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
            db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.dbPromise;
  }

  async saveSettings(settings: GameSettings): Promise<void> {
    try {
      localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
    const db = await this.openDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_SETTINGS, 'readwrite');
        tx.objectStore(STORE_SETTINGS).put({ id: 'user_settings', ...settings });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async loadSettings(): Promise<GameSettings> {
    const db = await this.openDB();
    if (db) {
      const fromDb = await new Promise<Partial<GameSettings> | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_SETTINGS, 'readonly');
          const req = tx.objectStore(STORE_SETTINGS).get('user_settings');
          req.onsuccess = () => resolve((req.result as Partial<GameSettings>) ?? null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
      if (fromDb) {
        return { ...DEFAULT_SETTINGS, ...fromDb };
      }
    }

    try {
      const raw = localStorage.getItem(LS_SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GameSettings>) };
      }
    } catch {
      // Fallback to defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  async saveProgress(progress: PlayerProgress): Promise<PlayerProgress> {
    const base: Omit<PlayerProgress, 'checksum'> = {
      ...progress,
      savedAt: Date.now(),
      version: CURRENT_SAVE_VERSION,
    };
    const signed: PlayerProgress = {
      ...base,
      checksum: computeChecksum(base),
    };

    try {
      localStorage.setItem(`${LS_SLOT_PREFIX}${signed.slotId}`, JSON.stringify(signed));
    } catch {
      // Ignore storage quota errors
    }

    const db = await this.openDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_SAVES, 'readwrite');
          tx.objectStore(STORE_SAVES).put(signed);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    return signed;
  }

  async loadSlot(slotId: number): Promise<PlayerProgress | null> {
    const db = await this.openDB();
    if (db) {
      const fromDb = await new Promise<unknown>((resolve) => {
        try {
          const tx = db.transaction(STORE_SAVES, 'readonly');
          const req = tx.objectStore(STORE_SAVES).get(slotId);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
      const validated = validateAndSanitizeProgress(fromDb, slotId);
      if (validated) return validated;
    }

    try {
      const raw = localStorage.getItem(`${LS_SLOT_PREFIX}${slotId}`);
      if (raw) {
        return validateAndSanitizeProgress(JSON.parse(raw), slotId);
      }
    } catch {
      return null;
    }
    return null;
  }

  async listSlots(): Promise<(PlayerProgress | null)[]> {
    return Promise.all([this.loadSlot(1), this.loadSlot(2), this.loadSlot(3)]);
  }

  async getLatestSlot(): Promise<PlayerProgress | null> {
    const slots = await this.listSlots();
    const valid = slots.filter((s): s is PlayerProgress => s !== null);
    if (valid.length === 0) return null;
    valid.sort((a, b) => b.savedAt - a.savedAt);
    return valid[0];
  }

  async deleteSlot(slotId: number): Promise<void> {
    try {
      localStorage.removeItem(`${LS_SLOT_PREFIX}${slotId}`);
    } catch {
      // ignore
    }
    const db = await this.openDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_SAVES, 'readwrite');
        tx.objectStore(STORE_SAVES).delete(slotId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const SaveSystem = new SaveSystemClass();
