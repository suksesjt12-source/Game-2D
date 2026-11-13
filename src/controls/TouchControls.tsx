import React, { useRef, useState } from 'react';
import { Shield, Sparkles, Sword, Wind, Zap, ArrowUp, Heart } from 'lucide-react';
import { t } from '../data/i18n';
import { Language, VirtualInputState } from '../types/game';

interface TouchControlsProps {
  language: Language;
  sensitivity: number;
  skillCooldown: number;
  dashCooldown: number;
  ultimateCharge: number;
  potionsCount: number;
  onInputChange: (patch: Partial<VirtualInputState>) => void;
  onPulseAction: (
    action: 'jumpPressed' | 'attackPressed' | 'dashPressed' | 'skillPressed' | 'ultimatePressed'
  ) => void;
  onUsePotion: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  language,
  sensitivity,
  skillCooldown,
  dashCooldown,
  ultimateCharge,
  potionsCount,
  onInputChange,
  onPulseAction,
  onUsePotion,
}) => {
  const joyRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const maxRadius = 46;

  const updateStick = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });

    const normX = Math.max(-1, Math.min(1, (dx / maxRadius) * sensitivity));
    const normY = Math.max(-1, Math.min(1, (dy / maxRadius) * sensitivity));
    onInputChange({
      moveX: Math.abs(normX) < 0.1 ? 0 : normX,
      moveY: normY,
      sprint: Math.abs(dx / maxRadius) > 0.72,
    });
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onInputChange({ moveX: 0, moveY: 0, sprint: false });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-between px-4 pb-4 sm:px-7 sm:pb-6">
      {/* Left Virtual Analog Joystick */}
      <div
        ref={joyRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          activePointerId.current = e.pointerId;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          resetStick();
        }}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative flex h-32 w-32 touch-none items-center justify-center rounded-full border border-slate-500/35 bg-slate-950/55 backdrop-blur-sm"
        aria-label="Virtual Joystick"
      >
        <div className="absolute inset-3 rounded-full border border-slate-600/30" />
        <div
          className="h-14 w-14 rounded-full border border-rose-400/70 bg-gradient-to-br from-slate-700/90 to-slate-900/95 shadow-lg transition-transform duration-75"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>

      {/* Right Action Cluster */}
      <div className="pointer-events-auto flex items-end gap-3">
        {/* Utility Column: Potion + Guard */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onUsePotion();
            }}
            disabled={potionsCount <= 0}
            className={`relative flex h-12 w-12 items-center justify-center rounded-full border text-xs font-semibold transition active:scale-95 ${
              potionsCount > 0
                ? 'border-emerald-400/55 bg-slate-950/75 text-emerald-300'
                : 'border-slate-700/50 bg-slate-950/45 text-slate-600'
            }`}
          >
            <Heart className="h-4 w-4" />
            <span className="font-mono-num absolute -bottom-1 right-0 rounded bg-slate-900 px-1 text-[10px] text-slate-200 border border-slate-700">
              {potionsCount}
            </span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onInputChange({ guardHeld: true });
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onInputChange({ guardHeld: false });
            }}
            onPointerLeave={() => onInputChange({ guardHeld: false })}
            onPointerCancel={() => onInputChange({ guardHeld: false })}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-sky-400/50 bg-slate-950/75 text-sky-200 active:scale-95 active:bg-sky-900/60"
          >
            <Shield className="h-4 w-4" />
            <span className="text-[10px] font-semibold tracking-wider">{t(language, 'btnGuard')}</span>
          </button>
        </div>

        {/* Special Skills & Dash Arc */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPulseAction('ultimatePressed');
            }}
            className={`relative flex h-14 w-14 flex-col items-center justify-center rounded-full border transition active:scale-95 ${
              ultimateCharge >= 100
                ? 'border-amber-400 bg-rose-950/85 text-amber-300 shadow-[0_0_16px_rgba(244,63,94,0.6)]'
                : 'border-slate-600/50 bg-slate-950/70 text-slate-400'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-mono-num text-[10px] font-bold">
              {ultimateCharge >= 100 ? t(language, 'btnUlt') : `${ultimateCharge}%`}
            </span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPulseAction('skillPressed');
            }}
            className="relative flex h-14 w-14 flex-col items-center justify-center rounded-full border border-rose-400/55 bg-slate-950/75 text-rose-200 active:scale-95"
          >
            <Zap className="h-4 w-4" />
            <span className="font-mono-num text-[10px] font-semibold">
              {skillCooldown > 0.05 ? skillCooldown.toFixed(1) : t(language, 'btnSkill')}
            </span>
          </button>
        </div>

        {/* Dash + Jump + Main Attack */}
        <div className="flex flex-col items-end gap-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onPulseAction('dashPressed');
              }}
              className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-indigo-400/55 bg-slate-950/75 text-indigo-200 active:scale-95"
            >
              <Wind className="h-4 w-4" />
              <span className="font-mono-num text-[10px] font-semibold">
                {dashCooldown > 0.05 ? dashCooldown.toFixed(1) : t(language, 'btnDash')}
              </span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onPulseAction('jumpPressed');
              }}
              className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-slate-400/55 bg-slate-950/75 text-slate-100 active:scale-95"
            >
              <ArrowUp className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{t(language, 'btnJump')}</span>
            </button>
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPulseAction('attackPressed');
            }}
            className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full border-2 border-rose-500/80 bg-gradient-to-br from-rose-700/85 to-rose-950/90 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] active:scale-95"
          >
            <Sword className="h-6 w-6" />
            <span className="text-[11px] font-bold tracking-wider">{t(language, 'btnAttack')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
