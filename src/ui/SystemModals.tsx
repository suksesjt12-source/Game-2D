import React from 'react';
import { X } from 'lucide-react';
import { t } from '../data/i18n';
import {
  FPSLimit,
  GameSettings,
  GraphicsQuality,
  Language,
  LevelClearSummary,
  ResolutionScale,
} from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const lang = settings.language;

  const setPatch = (patch: Partial<GameSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto custom-scroll rounded-xl border border-slate-700/80 bg-[#0d111a] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-display text-xl font-bold text-slate-100">
            {t(lang, 'settings')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-rose-500 hover:text-white"
            aria-label={t(lang, 'close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Volume Sliders */}
          {(
            [
              ['masterVolume', settings.masterVolume],
              ['musicVolume', settings.musicVolume],
              ['sfxVolume', settings.sfxVolume],
            ] as const
          ).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-slate-300">{t(lang, key)}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={val}
                  onChange={(e) => setPatch({ [key]: parseFloat(e.target.value) })}
                  className="w-36 accent-rose-500"
                />
                <span className="font-mono-num w-10 text-right text-xs text-slate-300">
                  {Math.round(val * 100)}%
                </span>
              </div>
            </div>
          ))}

          {/* Sensitivity */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-slate-300">{t(lang, 'sensitivity')}</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.1}
                value={settings.controlSensitivity}
                onChange={(e) =>
                  setPatch({ controlSensitivity: parseFloat(e.target.value) })
                }
                className="w-36 accent-rose-500"
              />
              <span className="font-mono-num w-10 text-right text-xs text-slate-300">
                {settings.controlSensitivity.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <span className="text-slate-300">{t(lang, 'graphicsQuality')}</span>
            <div className="flex rounded-lg bg-slate-900 p-1">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setPatch({ graphicsQuality: q })}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    settings.graphicsQuality === q
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t(
                    lang,
                    q === 'low' ? 'qualityLow' : q === 'medium' ? 'qualityMedium' : 'qualityHigh'
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* FPS Limit */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-300">{t(lang, 'fpsLimit')}</span>
            <div className="flex rounded-lg bg-slate-900 p-1">
              {([60, 30] as FPSLimit[]).map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => setPatch({ fpsLimit: fps })}
                  className={`font-mono-num rounded-md px-3.5 py-1 text-xs font-semibold transition ${
                    settings.fpsLimit === fps
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-300">{t(lang, 'resolution')}</span>
            <div className="flex rounded-lg bg-slate-900 p-1">
              {(
                [
                  ['native', 'resNative'],
                  ['balanced', 'resBalanced'],
                  ['performance', 'resPerformance'],
                ] as [ResolutionScale, string][]
              ).map(([res, lbl]) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setPatch({ resolution: res })}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    settings.resolution === res
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t(lang, lbl)}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-300">{t(lang, 'language')}</span>
            <div className="flex rounded-lg bg-slate-900 p-1">
              {(['id', 'en'] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setPatch({ language: l })}
                  className={`rounded-md px-3.5 py-1 text-xs font-semibold transition ${
                    settings.language === l
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {l === 'id' ? 'Indonesia' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CreditsModal: React.FC<{ language: Language; onClose: () => void }> = ({
  language,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-xl border border-slate-700/80 bg-[#0d111a] p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="font-display text-xl font-bold text-slate-100">
          {t(language, 'credits')}
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
      <div className="space-y-3 text-sm text-slate-300">
        <div>
          <div className="text-xs text-rose-400">{t(language, 'creditsRole1')}</div>
          <div className="font-semibold text-slate-100">Shadow Blade Interactive</div>
        </div>
        <div>
          <div className="text-xs text-rose-400">{t(language, 'creditsRole2')}</div>
          <div className="font-semibold text-slate-100">Phaser 3 Arcade Physics & Hitstop Core</div>
        </div>
        <div>
          <div className="text-xs text-rose-400">{t(language, 'creditsRole3')}</div>
          <div className="font-semibold text-slate-100">Dark Fantasy Anime Studio</div>
        </div>
        <div>
          <div className="text-xs text-rose-400">{t(language, 'creditsRole4')}</div>
          <div className="font-semibold text-slate-100">Web Audio Procedural Pentatonic Engine</div>
        </div>
        <p className="pt-2 text-xs text-slate-400">{t(language, 'creditsTech')}</p>
      </div>
    </div>
  </div>
);

interface PauseModalProps {
  language: Language;
  saveFeedback: string | null;
  onResume: () => void;
  onRestart: () => void;
  onManualSave: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  language,
  saveFeedback,
  onResume,
  onRestart,
  onManualSave,
  onOpenSettings,
  onMainMenu,
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-xl border border-slate-700/80 bg-[#0d111a] p-6 shadow-2xl">
      <h2 className="font-display mb-5 text-center text-2xl font-bold tracking-wider text-slate-100">
        {t(language, 'gameTitle')}
      </h2>
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onResume}
          className="w-full rounded-lg bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-500"
        >
          {t(language, 'resume')}
        </button>
        <button
          type="button"
          onClick={onManualSave}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-sm font-semibold text-slate-100 hover:border-amber-400"
        >
          {t(language, 'saveGame')}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-sm font-semibold text-slate-100 hover:border-rose-500"
        >
          {t(language, 'restart')}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-sm font-semibold text-slate-100 hover:border-rose-500"
        >
          {t(language, 'settings')}
        </button>
        <button
          type="button"
          onClick={onMainMenu}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 text-sm font-medium text-slate-400 hover:text-white"
        >
          {t(language, 'mainMenu')}
        </button>
      </div>
      {saveFeedback && (
        <p className="mt-3 text-center text-xs font-medium text-emerald-400">{saveFeedback}</p>
      )}
    </div>
  </div>
);

interface LevelCompleteModalProps {
  language: Language;
  summary: LevelClearSummary;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onMainMenu: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  language,
  summary,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onMainMenu,
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-xl border border-amber-500/45 bg-[#0d111a] p-6 shadow-2xl">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-widest text-amber-400">
          {summary.levelName}
        </p>
        <h2 className="font-display mt-1 text-2xl font-bold text-slate-100">
          {t(language, 'victoryTitle')}
        </h2>
        <div className="font-display mt-3 inline-block text-4xl font-extrabold text-amber-300">
          {t(language, 'rank')} {summary.rank}
        </div>
      </div>

      <div className="my-5 divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/60 px-4 text-sm">
        <div className="flex justify-between py-2.5">
          <span className="text-slate-400">{t(language, 'clearTime')}</span>
          <span className="font-mono-num text-slate-100">{summary.timeSeconds}s</span>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-400">{t(language, 'enemiesSlain')}</span>
          <span className="font-mono-num text-slate-100">{summary.kills}</span>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-400">{t(language, 'maxCombo')}</span>
          <span className="font-mono-num text-amber-300">{summary.maxCombo}x</span>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-400">{t(language, 'secretsFound')}</span>
          <span className="font-mono-num text-teal-300">{summary.secretsFound}</span>
        </div>
        <div className="flex justify-between py-2.5 font-bold">
          <span className="text-slate-300">Reward</span>
          <span className="font-mono-num text-amber-300">
            +{summary.rewardGold} Ryo · +{summary.rewardXp} XP
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {hasNextLevel && (
          <button
            type="button"
            onClick={onNextLevel}
            className="w-full rounded-lg bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-500"
          >
            {t(language, 'victoryNext')}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onReplay}
            className="rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-sm font-semibold text-slate-200 hover:border-rose-500"
          >
            {t(language, 'victoryReplay')}
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-sm font-semibold text-slate-200 hover:border-rose-500"
          >
            {t(language, 'mainMenu')}
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface GameOverModalProps {
  language: Language;
  onRespawn: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  language,
  onRespawn,
  onRestart,
  onMainMenu,
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-xl border border-rose-500/45 bg-[#0d111a] p-6 text-center shadow-2xl">
      <h2 className="font-display text-2xl font-bold text-rose-400">
        {t(language, 'defeatTitle')}
      </h2>
      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={onRespawn}
          className="w-full rounded-lg bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-500"
        >
          {t(language, 'defeatRespawn')}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-sm font-semibold text-slate-200 hover:border-rose-500"
        >
          {t(language, 'defeatRestart')}
        </button>
        <button
          type="button"
          onClick={onMainMenu}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 text-sm text-slate-400 hover:text-white"
        >
          {t(language, 'mainMenu')}
        </button>
      </div>
    </div>
  </div>
);
