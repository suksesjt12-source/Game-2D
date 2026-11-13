import React from 'react';
import { Trash2, X } from 'lucide-react';
import { t } from '../data/i18n';
import { Language, PlayerProgress } from '../types/game';

interface SaveSlotsModalProps {
  language: Language;
  slots: (PlayerProgress | null)[];
  onSelectNewSlot: (slotId: number) => void;
  onLoadSlot: (slotId: number) => void;
  onDeleteSlot: (slotId: number) => void;
  onClose: () => void;
}

export const SaveSlotsModal: React.FC<SaveSlotsModalProps> = ({
  language,
  slots,
  onSelectNewSlot,
  onLoadSlot,
  onDeleteSlot,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700/80 bg-[#0d111a] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-display text-xl font-bold text-slate-100">
            {t(language, 'saveSlotsTitle')}
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

        <div className="space-y-3">
          {[1, 2, 3].map((slotId, idx) => {
            const slot = slots[idx];
            return (
              <div
                key={slotId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4"
              >
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {t(language, 'slotLabel')} #{slotId}
                  </div>
                  {slot ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono-num text-slate-200">
                        {t(language, 'level')} {slot.characterLevel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num text-amber-300">{slot.gold} Ryo</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">
                        {slot.completedLevels.length}/5 {t(language, 'completed')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(slot.savedAt).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-500">{t(language, 'slotEmpty')}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {slot && (
                    <>
                      <button
                        type="button"
                        onClick={() => onLoadSlot(slotId)}
                        className="rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 whitespace-nowrap"
                      >
                        {t(language, 'loadSlot')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSlot(slotId)}
                        className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-rose-500 hover:text-rose-400"
                        aria-label={t(language, 'deleteSlot')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectNewSlot(slotId)}
                    className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-500 whitespace-nowrap"
                  >
                    {t(language, 'startNewSlot')}
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
