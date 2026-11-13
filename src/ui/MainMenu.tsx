import React from 'react';
import {
  Play,
  RotateCcw,
  Map,
  User,
  Backpack,
  GitBranch,
  Trophy,
  Settings,
  Info,
} from 'lucide-react';
import titleKeyArt from '../assets/images/title_shadow_ninja_1794569693952.jpg';
import { t } from '../data/i18n';
import { ActiveModal, Language, PlayerProgress } from '../types/game';

interface MainMenuProps {
  language: Language;
  activeProgress: PlayerProgress | null;
  hasAnySave: boolean;
  onContinue: () => void;
  onOpenModal: (modal: ActiveModal) => void;
  onToggleLanguage: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  language,
  activeProgress,
  hasAnySave,
  onContinue,
  onOpenModal,
  onToggleLanguage,
}) => {
  const secondaryActions: { key: string; modal: ActiveModal; icon: React.ReactNode; disabled?: boolean }[] = [
    { key: 'levelSelection', modal: 'LEVEL_SELECT', icon: <Map className="h-4 w-4" />, disabled: !activeProgress },
    { key: 'character', modal: 'CHARACTER', icon: <User className="h-4 w-4" />, disabled: !activeProgress },
    { key: 'inventory', modal: 'INVENTORY', icon: <Backpack className="h-4 w-4" />, disabled: !activeProgress },
    { key: 'skillTree', modal: 'SKILL_TREE', icon: <GitBranch className="h-4 w-4" />, disabled: !activeProgress },
    { key: 'quests', modal: 'QUESTS', icon: <Trophy className="h-4 w-4" />, disabled: !activeProgress },
    { key: 'settings', modal: 'SETTINGS', icon: <Settings className="h-4 w-4" /> },
    { key: 'credits', modal: 'CREDITS', icon: <Info className="h-4 w-4" /> },
  ];

  return (
    <div className="relative flex h-full w-full items-center overflow-hidden bg-[#080a0f]">
      {/* Hand-Painted Anime Key Art Backdrop */}
      <img
        src={titleKeyArt}
        alt="Shadow Ninja Key Art"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-75"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080a0f]/95 via-[#080a0f]/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080a0f] via-transparent to-[#080a0f]/60" />

      {/* Top Language Toggle */}
      <div className="absolute right-6 top-5 z-10 flex items-center gap-4 text-xs text-slate-300">
        <span>{t(language, 'offlineBadge')}</span>
        <button
          type="button"
          onClick={onToggleLanguage}
          className="rounded-md border border-slate-600/70 bg-slate-900/85 px-3 py-1.5 font-semibold text-slate-100 transition hover:border-rose-500 whitespace-nowrap"
        >
          {language === 'id' ? 'ID / EN' : 'EN / ID'}
        </button>
      </div>

      {/* Main Left Editorial / Dark Fantasy Menu Panel */}
      <div className="relative z-10 flex h-full w-full max-w-4xl flex-col justify-center px-6 sm:px-12 py-8">
        <div className="max-w-xl">
          <p className="mb-2 text-xs font-semibold tracking-[0.24em] text-rose-400">
            {t(language, 'gameSubtitle')}
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-wider text-slate-50 drop-shadow-md">
            {t(language, 'gameTitle')}
          </h1>

          {activeProgress && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300">
              <span>
                {t(language, 'slotLabel')} #{activeProgress.slotId}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">
                {t(language, 'level')} {activeProgress.characterLevel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-amber-300">{activeProgress.gold} Ryo</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">
                {activeProgress.completedLevels.length}/5 {t(language, 'completed')}
              </span>
            </div>
          )}

          {/* Primary Play Actions */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {hasAnySave && (
              <button
                type="button"
                onClick={onContinue}
                className="flex items-center gap-2.5 rounded-lg bg-rose-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-950/50 transition duration-150 hover:bg-rose-500 active:scale-95 whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4 fill-current" />
                {t(language, 'continueGame')}
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenModal('SAVE_SLOTS')}
              className={`flex items-center gap-2 rounded-lg px-5 py-3.5 text-sm font-semibold transition duration-150 active:scale-95 whitespace-nowrap shrink-0 ${
                hasAnySave
                  ? 'border border-slate-600/80 bg-slate-900/85 text-slate-100 hover:border-rose-400 hover:bg-slate-800'
                  : 'bg-rose-600 text-white shadow-lg hover:bg-rose-500'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              {t(language, 'newGame')}
            </button>
          </div>

          {/* Secondary RPG Navigation Grid */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {secondaryActions.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => onOpenModal(item.modal)}
                className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs sm:text-sm font-medium transition duration-150 whitespace-nowrap ${
                  item.disabled
                    ? 'cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600'
                    : 'border-slate-700/70 bg-slate-900/80 text-slate-200 hover:border-rose-500/70 hover:bg-slate-800/90 hover:text-white active:scale-95'
                }`}
              >
                {item.icon}
                <span className="truncate">{t(language, item.key)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
