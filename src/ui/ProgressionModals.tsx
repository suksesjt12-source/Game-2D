import React, { useState } from 'react';
import { Check, Lock, Shield, Sword, X, Zap } from 'lucide-react';
import { t } from '../data/i18n';
import {
  ACHIEVEMENTS_LIST,
  ITEMS_CATALOG,
  QUESTS_LIST,
  SKILL_TREE_NODES,
} from '../data/progressionData';
import { computePlayerStats, getItemById } from '../systems/ProgressionSystem';
import { Language, PlayerProgress } from '../types/game';

interface ModalBaseProps {
  language: Language;
  progress: PlayerProgress;
  onClose: () => void;
}

export const CharacterModal: React.FC<ModalBaseProps> = ({ language, progress, onClose }) => {
  const stats = computePlayerStats(progress);
  const weapon = getItemById(progress.equipped.weapon);
  const armor = getItemById(progress.equipped.armor);
  const talisman = progress.equipped.talisman ? getItemById(progress.equipped.talisman) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto custom-scroll rounded-xl border border-slate-700/80 bg-[#0d111a] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-display text-xl font-bold text-slate-100">
            {t(language, 'character')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-rose-500 hover:text-white"
            aria-label={t(language, 'close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Core Attributes */}
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg font-bold text-rose-400">
                Kuro · {t(language, 'level')} {progress.characterLevel}
              </span>
              <span className="font-mono-num text-xs text-slate-400">
                XP {progress.xp}/{progress.xpToNext}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-slate-400">{t(language, 'hp')}</span>
                <span className="font-mono-num font-semibold text-emerald-400">{stats.maxHp}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">{t(language, 'energy')}</span>
                <span className="font-mono-num font-semibold text-sky-400">{stats.maxEnergy}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">{t(language, 'damage')}</span>
                <span className="font-mono-num font-semibold text-rose-400">{stats.attackDamage}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">{t(language, 'crit')}</span>
                <span className="font-mono-num font-semibold text-amber-300">
                  {Math.round(stats.critChance * 100)}%
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">{t(language, 'defense')}</span>
                <span className="font-mono-num font-semibold text-slate-200">{stats.defense}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">{t(language, 'skillPoints')}</span>
                <span className="font-mono-num font-bold text-amber-300">{progress.skillPoints}</span>
              </div>
            </div>
          </div>

          {/* Equipped Gear & Battle Record */}
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-400">
                Loadout
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Sword className="h-4 w-4 text-rose-400" /> Weapon
                  </span>
                  <span className="font-medium text-slate-100">
                    {weapon ? (language === 'id' ? weapon.nameId : weapon.nameEn) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Shield className="h-4 w-4 text-sky-400" /> Armor
                  </span>
                  <span className="font-medium text-slate-100">
                    {armor ? (language === 'id' ? armor.nameId : armor.nameEn) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Zap className="h-4 w-4 text-amber-400" /> Talisman
                  </span>
                  <span className="font-medium text-slate-100">
                    {talisman ? (language === 'id' ? talisman.nameId : talisman.nameEn) : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-400">{t(language, 'enemiesSlain')}</div>
                  <div className="font-mono-num mt-0.5 text-base font-bold text-slate-100">
                    {progress.stats.totalKills}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Bosses</div>
                  <div className="font-mono-num mt-0.5 text-base font-bold text-rose-400">
                    {progress.stats.bossesDefeated}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">{t(language, 'maxCombo')}</div>
                  <div className="font-mono-num mt-0.5 text-base font-bold text-amber-300">
                    {progress.stats.maxCombo}x
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">{t(language, 'secretsFound')}</div>
                  <div className="font-mono-num mt-0.5 text-base font-bold text-teal-300">
                    {progress.stats.secretsFound}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InventoryModalProps extends ModalBaseProps {
  onEquipItem: (itemId: string) => void;
  onBuyItem: (itemId: string) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  language,
  progress,
  onEquipItem,
  onBuyItem,
  onClose,
}) => {
  const [tab, setTab] = useState<'bag' | 'forge'>('bag');

  const rarityTextColor: Record<string, string> = {
    common: 'text-slate-300',
    rare: 'text-sky-400',
    epic: 'text-purple-400',
    legendary: 'text-amber-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-700/80 bg-[#0d111a] p-5 sm:p-6 shadow-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-xl font-bold text-slate-100">
              {t(language, 'inventory')}
            </h2>
            <span className="font-mono-num text-sm font-semibold text-amber-300">
              {progress.gold} Ryo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setTab('bag')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'bag' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t(language, 'inventory')}
              </button>
              <button
                type="button"
                onClick={() => setTab('forge')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'forge' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t(language, 'buyItem')}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-rose-500 hover:text-white"
              aria-label={t(language, 'close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="custom-scroll grid grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {tab === 'bag' &&
            progress.inventory.map((entry) => {
              const item = getItemById(entry.itemId);
              if (!item) return null;
              const isEquipped =
                progress.equipped.weapon === item.id ||
                progress.equipped.armor === item.id ||
                progress.equipped.talisman === item.id;
              const equipable =
                item.category === 'weapon' ||
                item.category === 'armor' ||
                item.category === 'talisman';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3.5"
                >
                  <div>
                    <div className={`text-sm font-bold ${rarityTextColor[item.rarity]}`}>
                      {language === 'id' ? item.nameId : item.nameEn}
                      {entry.quantity > 1 && (
                        <span className="font-mono-num ml-2 text-xs text-slate-400">
                          x{entry.quantity}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {language === 'id' ? item.descId : item.descEn}
                    </p>
                  </div>

                  {equipable && (
                    <button
                      type="button"
                      disabled={isEquipped}
                      onClick={() => onEquipItem(item.id)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap shrink-0 ${
                        isEquipped
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/40'
                          : 'bg-slate-800 text-slate-100 hover:bg-rose-600'
                      }`}
                    >
                      {isEquipped ? t(language, 'equipped') : t(language, 'equip')}
                    </button>
                  )}
                </div>
              );
            })}

          {tab === 'forge' &&
            ITEMS_CATALOG.filter((item) => item.price > 0).map((item) => {
              const ownedQty =
                progress.inventory.find((i) => i.itemId === item.id)?.quantity ?? 0;
              const canAfford = progress.gold >= item.price;
              const alreadyOwnedGear = item.category !== 'consumable' && ownedQty > 0;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3.5"
                >
                  <div>
                    <div className={`text-sm font-bold ${rarityTextColor[item.rarity]}`}>
                      {language === 'id' ? item.nameId : item.nameEn}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {language === 'id' ? item.descId : item.descEn}
                    </p>
                    <div className="font-mono-num mt-1 text-xs text-amber-300">
                      {item.price} Ryo
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford || alreadyOwnedGear}
                    onClick={() => onBuyItem(item.id)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap shrink-0 ${
                      alreadyOwnedGear
                        ? 'bg-slate-800 text-emerald-400'
                        : canAfford
                        ? 'bg-rose-600 text-white hover:bg-rose-500'
                        : 'cursor-not-allowed bg-slate-800 text-slate-500'
                    }`}
                  >
                    {alreadyOwnedGear ? t(language, 'equipped') : t(language, 'buyItem')}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

interface SkillTreeModalProps extends ModalBaseProps {
  onUpgradeSkill: (nodeId: string) => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  language,
  progress,
  onUpgradeSkill,
  onClose,
}) => {
  const branches: { key: 'offense' | 'vitality' | 'shadow'; labelKey: string }[] = [
    { key: 'offense', labelKey: 'branchOffense' },
    { key: 'vitality', labelKey: 'branchVitality' },
    { key: 'shadow', labelKey: 'branchShadow' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-700/80 bg-[#0d111a] p-5 sm:p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-xl font-bold text-slate-100">
              {t(language, 'skillTree')}
            </h2>
            <span className="font-mono-num text-sm font-bold text-amber-300">
              {t(language, 'skillPoints')}: {progress.skillPoints}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-rose-500 hover:text-white"
            aria-label={t(language, 'close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scroll grid grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-3">
          {branches.map((br) => (
            <div
              key={br.key}
              className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4"
            >
              <h3 className="font-display text-sm font-bold tracking-wider text-rose-400">
                {t(language, br.labelKey)}
              </h3>
              {SKILL_TREE_NODES.filter((n) => n.branch === br.key).map((node) => {
                const rank = progress.skillLevels[node.id] ?? 0;
                const reqMet = !node.requires || (progress.skillLevels[node.requires] ?? 0) > 0;
                const maxed = rank >= node.maxLevel;
                const canUpgrade = !maxed && reqMet && progress.skillPoints >= node.costPerLevel;

                return (
                  <div
                    key={node.id}
                    className={`rounded-lg border p-3.5 ${
                      maxed
                        ? 'border-amber-500/45 bg-slate-900'
                        : reqMet
                        ? 'border-slate-700/80 bg-slate-950/75'
                        : 'border-slate-800/60 bg-slate-950/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-100">
                        {language === 'id' ? node.nameId : node.nameEn}
                      </span>
                      <span className="font-mono-num text-xs text-slate-300">
                        {rank}/{node.maxLevel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {language === 'id' ? node.descId : node.descEn}
                    </p>
                    <button
                      type="button"
                      disabled={!canUpgrade}
                      onClick={() => onUpgradeSkill(node.id)}
                      className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition ${
                        maxed
                          ? 'bg-emerald-950/60 text-emerald-300'
                          : canUpgrade
                          ? 'bg-rose-600 text-white hover:bg-rose-500'
                          : 'cursor-not-allowed bg-slate-800 text-slate-500'
                      }`}
                    >
                      {!reqMet && <Lock className="h-3.5 w-3.5" />}
                      {maxed
                        ? t(language, 'maxed')
                        : `${t(language, 'upgrade')} (${node.costPerLevel} SP)`}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface QuestsModalProps extends ModalBaseProps {
  onClaimQuest: (questId: string) => void;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({
  language,
  progress,
  onClaimQuest,
  onClose,
}) => {
  const [tab, setTab] = useState<'quests' | 'achievements'>('quests');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-700/80 bg-[#0d111a] p-5 sm:p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold text-slate-100">
              {t(language, 'quests')}
            </h2>
            <div className="flex rounded-lg bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setTab('quests')}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  tab === 'quests' ? 'bg-rose-600 text-white' : 'text-slate-400'
                }`}
              >
                {t(language, 'questsTab')}
              </button>
              <button
                type="button"
                onClick={() => setTab('achievements')}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  tab === 'achievements' ? 'bg-rose-600 text-white' : 'text-slate-400'
                }`}
              >
                {t(language, 'achievementsTab')}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-rose-500 hover:text-white"
            aria-label={t(language, 'close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scroll space-y-3 overflow-y-auto pr-1">
          {tab === 'quests' &&
            QUESTS_LIST.map((q) => {
              const cur =
                q.type === 'clear_levels'
                  ? progress.completedLevels.length
                  : progress.questProgress[q.id] ?? 0;
              const completed = cur >= q.targetCount;
              const claimed = progress.claimedQuests.includes(q.id);

              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-100">
                      {language === 'id' ? q.titleId : q.titleEn}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {language === 'id' ? q.descId : q.descEn}
                    </p>
                    <div className="font-mono-num mt-1.5 text-xs text-amber-300">
                      {Math.min(cur, q.targetCount)} / {q.targetCount} · +{q.rewardGold} Ryo · +{q.rewardXp} XP
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!completed || claimed}
                    onClick={() => onClaimQuest(q.id)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap ${
                      claimed
                        ? 'bg-emerald-950/60 text-emerald-300'
                        : completed
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {claimed
                      ? t(language, 'claimed')
                      : completed
                      ? t(language, 'claimReward')
                      : t(language, 'inProgress')}
                  </button>
                </div>
              );
            })}

          {tab === 'achievements' &&
            ACHIEVEMENTS_LIST.map((ach) => {
              const unlocked = progress.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${
                    unlocked
                      ? 'border-amber-500/45 bg-slate-900/80'
                      : 'border-slate-800 bg-slate-950/60 opacity-65'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-slate-100">
                      {language === 'id' ? ach.titleId : ach.titleEn}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {language === 'id' ? ach.descId : ach.descEn}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 whitespace-nowrap">
                    {unlocked ? <Check className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4 text-slate-500" />}
                    <span className="font-mono-num">+{ach.rewardGold} Ryo</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
