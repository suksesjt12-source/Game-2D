import React from 'react';
import { Pause } from 'lucide-react';
import { TouchControls } from '../controls/TouchControls';
import { t } from '../data/i18n';
import { HudSnapshot, Language, VirtualInputState } from '../types/game';

interface GameHUDProps {
  hud: HudSnapshot;
  language: Language;
  sensitivity: number;
  onPause: () => void;
  onInputChange: (patch: Partial<VirtualInputState>) => void;
  onPulseAction: (
    action: 'jumpPressed' | 'attackPressed' | 'dashPressed' | 'skillPressed' | 'ultimatePressed'
  ) => void;
  onUsePotion: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  language,
  sensitivity,
  onPause,
  onInputChange,
  onPulseAction,
  onUsePotion,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const kiPct = Math.max(0, Math.min(100, (hud.energy / Math.max(1, hud.maxEnergy)) * 100));
  const xpPct = Math.max(0, Math.min(100, (hud.xp / Math.max(1, hud.xpToNext)) * 100));
  const bossPct = Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100));

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-4 px-4 pt-3 sm:px-6 sm:pt-4">
        {/* Left: Shinobi Status */}
        <div className="w-60 sm:w-72 rounded-lg border border-slate-700/60 bg-slate-950/75 px-3.5 py-2.5 backdrop-blur-sm">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-300">
            <span className="font-display font-bold tracking-wide text-slate-100">
              {t(language, 'level')} {hud.level}
            </span>
            <span className="font-mono-num text-amber-300">{hud.gold} Ryo</span>
          </div>

          {/* HP Bar */}
          <div className="mb-1.5">
            <div className="mb-0.5 flex justify-between text-[11px] font-medium text-slate-300">
              <span>{t(language, 'hp')}</span>
              <span className="font-mono-num text-slate-100">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-sm bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-150"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Shadow Ki Bar */}
          <div className="mb-1.5">
            <div className="mb-0.5 flex justify-between text-[11px] font-medium text-slate-300">
              <span>{t(language, 'energy')}</span>
              <span className="font-mono-num text-sky-300">
                {hud.energy}/{hud.maxEnergy}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-100"
                style={{ width: `${kiPct}%` }}
              />
            </div>
          </div>

          {/* XP Hairline + Realm Name */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="truncate">{hud.levelName}</span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-amber-400" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>

        {/* Center: Boss Health Bar */}
        {hud.bossActive && (
          <div className="flex-1 max-w-md rounded-lg border border-rose-500/45 bg-slate-950/85 px-4 py-2.5 backdrop-blur-sm">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <div className="truncate">
                <span className="font-display text-sm font-bold text-rose-100">{hud.bossName}</span>
                <span className="ml-2 text-xs text-slate-400">{hud.bossTitle}</span>
              </div>
              {hud.bossPhase === 2 && (
                <span className="text-[11px] font-bold tracking-wider text-amber-400 whitespace-nowrap">
                  {t(language, 'phase2')}
                </span>
              )}
            </div>
            <div className="h-3 w-full overflow-hidden rounded-sm bg-slate-900 border border-slate-700/70">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.bossPhase === 2
                    ? 'bg-gradient-to-r from-red-700 via-rose-500 to-amber-500'
                    : 'bg-gradient-to-r from-rose-700 to-rose-400'
                }`}
                style={{ width: `${bossPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-end font-mono-num text-[11px] text-slate-300">
              {hud.bossHp} / {hud.bossMaxHp}
            </div>
          </div>
        )}

        {/* Right: Combo, FPS & Pause */}
        <div className="flex items-start gap-3">
          {hud.combo > 1 && (
            <div className="rounded-lg border border-amber-500/45 bg-slate-950/80 px-3 py-1.5 text-right backdrop-blur-sm">
              <div className="font-mono-num text-xl font-bold leading-none text-amber-300">
                {hud.combo}x
              </div>
              <div className="text-[10px] font-semibold tracking-widest text-rose-300">
                {t(language, 'combo')}
              </div>
              <div className="mt-1 h-1 w-16 overflow-hidden rounded bg-slate-800">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${hud.comboTimerRatio * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="hidden md:flex items-center rounded-md border border-slate-700/60 bg-slate-950/70 px-2.5 py-1.5 font-mono-num text-xs text-slate-300">
            {hud.fps} FPS
          </div>

          <button
            type="button"
            onClick={onPause}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border border-slate-600/70 bg-slate-950/80 text-slate-100 transition hover:border-rose-500/70 hover:bg-slate-900 active:scale-95"
            aria-label="Pause Game"
          >
            <Pause className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Center Announcement Banner */}
      {hud.bannerText && (
        <div className="mx-auto mt-3 rounded-lg border border-amber-400/40 bg-slate-950/85 px-6 py-2 text-center shadow-xl backdrop-blur-md">
          <div className="font-display text-base sm:text-xl font-bold tracking-wider text-amber-200">
            {hud.bannerText}
          </div>
        </div>
      )}

      {/* Subtle Keyboard Hint Bar (Desktop only, bottom center) */}
      <div className="pointer-events-none hidden lg:flex justify-center pb-2">
        <div className="rounded-md bg-slate-950/65 px-3 py-1 text-[11px] text-slate-400 backdrop-blur-sm">
          {t(language, 'controlsHint')}
        </div>
      </div>

      {/* Android / Touch Controls */}
      <TouchControls
        language={language}
        sensitivity={sensitivity}
        skillCooldown={hud.skillCooldown}
        dashCooldown={hud.dashCooldown}
        ultimateCharge={hud.ultimateCharge}
        potionsCount={hud.potionsCount}
        onInputChange={onInputChange}
        onPulseAction={onPulseAction}
        onUsePotion={onUsePotion}
      />
    </div>
  );
};
