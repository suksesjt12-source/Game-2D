import {
  ACHIEVEMENTS_LIST,
  ITEMS_CATALOG,
  QUESTS_LIST,
  SKILL_TREE_NODES,
} from '../data/progressionData';
import { GameItem, PlayerProgress } from '../types/game';

export interface ComputedPlayerStats {
  maxHp: number;
  maxEnergy: number;
  attackDamage: number;
  critChance: number;
  defense: number;
  moveSpeedBonus: number;
  dashCooldown: number;
  energyRegen: number;
  hasCrimsonTempest: boolean;
  hasPhantomShuriken: boolean;
  hasEclipseMastery: boolean;
}

export function getItemById(itemId: string): GameItem | undefined {
  return ITEMS_CATALOG.find((item) => item.id === itemId);
}

export function computePlayerStats(progress: PlayerProgress): ComputedPlayerStats {
  const lv = progress.characterLevel;
  let maxHp = 120 + (lv - 1) * 22;
  let maxEnergy = 100 + (lv - 1) * 8;
  let attackDamage = 18 + (lv - 1) * 5;
  let critChance = 0.08;
  let defense = 2 + Math.floor((lv - 1) * 1.2);
  let moveSpeedBonus = 0;
  let dashCooldown = 1.05;
  let energyRegen = 7.5;

  // Equipped items
  const eqIds = [
    progress.equipped.weapon,
    progress.equipped.armor,
    progress.equipped.talisman,
  ];
  for (const id of eqIds) {
    if (!id) continue;
    const item = getItemById(id);
    if (!item) continue;
    maxHp += item.stats.maxHp ?? 0;
    maxEnergy += item.stats.maxEnergy ?? 0;
    attackDamage += item.stats.damage ?? 0;
    critChance += item.stats.critChance ?? 0;
    defense += item.stats.defense ?? 0;
    moveSpeedBonus += item.stats.speedBonus ?? 0;
  }

  // Passive relics in inventory automatically empower the shinobi
  for (const entry of progress.inventory) {
    const item = getItemById(entry.itemId);
    if (item && item.category === 'relic' && entry.quantity > 0) {
      maxHp += item.stats.maxHp ?? 0;
      attackDamage += item.stats.damage ?? 0;
      maxEnergy += item.stats.maxEnergy ?? 0;
    }
  }

  // Skill tree nodes
  for (const node of SKILL_TREE_NODES) {
    const rank = progress.skillLevels[node.id] ?? 0;
    if (rank <= 0) continue;
    attackDamage += (node.statBonus.damageFlat ?? 0) * rank;
    maxHp += (node.statBonus.maxHpFlat ?? 0) * rank;
    maxEnergy += (node.statBonus.maxEnergyFlat ?? 0) * rank;
    critChance += (node.statBonus.critChance ?? 0) * rank;
    dashCooldown -= (node.statBonus.dashCooldownReduce ?? 0) * rank;
    energyRegen += (node.statBonus.energyRegen ?? 0) * rank;
  }

  return {
    maxHp: Math.round(maxHp),
    maxEnergy: Math.round(maxEnergy),
    attackDamage: Math.round(attackDamage),
    critChance: Math.min(0.65, critChance),
    defense: Math.round(defense),
    moveSpeedBonus,
    dashCooldown: Math.max(0.45, dashCooldown),
    energyRegen,
    hasCrimsonTempest: (progress.skillLevels['crimson_tempest_node'] ?? 0) > 0,
    hasPhantomShuriken: (progress.skillLevels['phantom_shuriken_node'] ?? 0) > 0,
    hasEclipseMastery: (progress.skillLevels['eclipse_mastery_node'] ?? 0) > 0,
  };
}

export function grantXpToProgress(
  progress: PlayerProgress,
  amount: number
): { updated: PlayerProgress; leveledUp: boolean } {
  let xp = progress.xp + amount;
  let characterLevel = progress.characterLevel;
  let xpToNext = progress.xpToNext;
  let skillPoints = progress.skillPoints;
  let leveledUp = false;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    characterLevel += 1;
    skillPoints += 1;
    xpToNext = Math.round(120 * Math.pow(1.24, characterLevel - 1));
    leveledUp = true;
  }

  const next: PlayerProgress = {
    ...progress,
    xp,
    characterLevel,
    xpToNext,
    skillPoints,
  };

  return { updated: checkAchievements(next), leveledUp };
}

export function addInventoryItem(
  progress: PlayerProgress,
  itemId: string,
  qty = 1
): PlayerProgress {
  const existing = progress.inventory.find((i) => i.itemId === itemId);
  const nextInv = existing
    ? progress.inventory.map((i) =>
        i.itemId === itemId ? { ...i, quantity: i.quantity + qty } : i
      )
    : [...progress.inventory, { itemId, quantity: qty }];
  return { ...progress, inventory: nextInv };
}

export function consumeInventoryItem(
  progress: PlayerProgress,
  itemId: string,
  qty = 1
): PlayerProgress {
  const nextInv = progress.inventory
    .map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity - qty } : i))
    .filter((i) => i.quantity > 0);
  return { ...progress, inventory: nextInv };
}

export function upgradeSkillNode(
  progress: PlayerProgress,
  nodeId: string
): PlayerProgress | null {
  const node = SKILL_TREE_NODES.find((n) => n.id === nodeId);
  if (!node) return null;
  const currentRank = progress.skillLevels[nodeId] ?? 0;
  if (currentRank >= node.maxLevel) return null;
  if (progress.skillPoints < node.costPerLevel) return null;
  if (node.requires && (progress.skillLevels[node.requires] ?? 0) <= 0) return null;

  return {
    ...progress,
    skillPoints: progress.skillPoints - node.costPerLevel,
    skillLevels: {
      ...progress.skillLevels,
      [nodeId]: currentRank + 1,
    },
  };
}

export function updateQuestCounters(
  progress: PlayerProgress,
  delta: Partial<{
    kills: number;
    bosses: number;
    orbs: number;
    secrets: number;
    levelsCleared: number;
  }>
): PlayerProgress {
  const nextQuest = { ...progress.questProgress };
  for (const q of QUESTS_LIST) {
    let inc = 0;
    if (q.type === 'kill_enemies' && delta.kills) inc = delta.kills;
    if (q.type === 'defeat_boss' && delta.bosses) inc = delta.bosses;
    if (q.type === 'collect_orbs' && delta.orbs) inc = delta.orbs;
    if (q.type === 'discover_secrets' && delta.secrets) inc = delta.secrets;
    if (q.type === 'clear_levels') {
      nextQuest[q.id] = progress.completedLevels.length;
      continue;
    }
    if (inc > 0) {
      nextQuest[q.id] = Math.min(q.targetCount, (nextQuest[q.id] ?? 0) + inc);
    }
  }
  return checkAchievements({ ...progress, questProgress: nextQuest });
}

export function checkAchievements(progress: PlayerProgress): PlayerProgress {
  let gold = progress.gold;
  const unlocked = new Set(progress.unlockedAchievements);

  for (const ach of ACHIEVEMENTS_LIST) {
    if (unlocked.has(ach.id)) continue;
    let met = false;
    switch (ach.conditionType) {
      case 'first_blood':
        met = progress.stats.totalKills >= 1;
        break;
      case 'combo_20':
        met = progress.stats.maxCombo >= 20;
        break;
      case 'perfect_parry':
        met = progress.stats.perfectParries >= 1;
        break;
      case 'boss_slayer_1':
        met = progress.stats.bossesDefeated >= 1;
        break;
      case 'boss_slayer_5':
        met = progress.completedLevels.length >= 5;
        break;
      case 'secret_hunter':
        met = progress.stats.secretsFound >= 1;
        break;
      case 'level_10':
        met = progress.characterLevel >= 10;
        break;
    }
    if (met) {
      unlocked.add(ach.id);
      gold += ach.rewardGold;
    }
  }

  return {
    ...progress,
    gold,
    unlockedAchievements: Array.from(unlocked),
  };
}
