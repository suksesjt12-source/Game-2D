import React from 'react';
import { Lock, Play, Check, X } from 'lucide-react';
import { t } from '../data/i18n';
import { LEVELS_DATA } from '../data/levelsData';
import { Language, PlayerProgress } from '../types/game';

interface LevelSelectModalProps {
  language: Language;
  progress: PlayerProgress;
  onStartLevel: (levelIndex: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  language,
  progress,
  onStartLevel,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-700/80 bg-[#0d111a] p-5 sm:p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-display text-xl font-bold text-slate-100">
            {t(language, 'levelSelection')}
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

        <div className="custom-scroll grid grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {LEVELS_DATA.map((lvl) => {
            const unlocked = lvl.index <= progress.unlockedLevelIndex;
            const cleared = progress.completedLevels.includes(lvl.index);

            return (
              <div
                key={lvl.id}
                className={`flex flex-col overflow-hidden rounded-lg border transition ${
                  unlocked
                    ? 'border-slate-700/80 bg-slate-900/75'
                    : 'border-slate-800/70 bg-slate-950/60 opacity-65'
                }`}
              >
                <div className="relative h-32 w-full bg-slate-900">
                  <img
                    src={lvl.bgImagePath}
                    alt={language === 'id' ? lvl.nameId : lvl.nameEn}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs">
                    <span className="font-mono-num text-slate-200">
                      0{lvl.index + 1} · {t(language, 'recommendedLv')} {lvl.recommendedLevel}
                    </span>
                    {cleared && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        {t(language, 'completed')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-100">
                      {language === 'id' ? lvl.nameId : lvl.nameEn}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {language === 'id' ? lvl.subtitleId : lvl.subtitleEn}
                    </p>
                    <p className="mt-2 text-xs text-rose-300/90">
                      Boss: {language === 'id' ? lvl.boss.nameId : lvl.boss.nameEn}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onStartLevel(lvl.index)}
                    className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition whitespace-nowrap ${
                      unlocked
                        ? 'bg-rose-600 text-white hover:bg-rose-500 active:scale-95'
                        : 'cursor-not-allowed bg-slate-800 text-slate-500'
                    }`}
                  >
                    {unlocked ? <Play className="h-3.5 w-3.5 fill-current" /> : <Lock className="h-3.5 w-3.5" />}
                    {unlocked ? t(language, 'play') : t(language, 'locked')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
