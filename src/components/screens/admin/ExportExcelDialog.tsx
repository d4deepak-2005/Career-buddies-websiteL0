import React, { useMemo, useState } from 'react';
import { Download, X } from 'lucide-react';
import { ModalA11y } from '../../common/ModalA11y';
import { toYmd } from '../../../utils/excelExport';

export interface DateRange {
  from: string;
  to: string;
}

interface ExportExcelDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  matchCount: (range: DateRange) => number;
  onClose: () => void;
  onExport: (range: DateRange) => void;
}

function shiftDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  return toYmd(d);
}

export const ExportExcelDialog: React.FC<ExportExcelDialogProps> = ({
  isOpen,
  title,
  description,
  matchCount,
  onClose,
  onExport,
}) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const range = useMemo(() => ({ from, to }), [from, to]);
  const count = matchCount(range);

  if (!isOpen) return null;

  const applyPreset = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#061b3b]/70 backdrop-blur-sm">
      <ModalA11y label={title} onClose={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (count === 0) return;
          onExport(range);
        }}
        className="bg-white rounded-3xl w-full max-w-md border border-[#cbdaff] shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[#061b3b]">{title}</h3>
            <p className="text-xs text-[#666a76] mt-1">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#666a76] hover:text-[#061b3b] cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'All dates', from: '', to: '' },
            { label: 'Today', from: toYmd(new Date()), to: toYmd(new Date()) },
            { label: 'Last 7 days', from: shiftDays(-6), to: toYmd(new Date()) },
            { label: 'Last 30 days', from: shiftDays(-29), to: toYmd(new Date()) },
            { label: 'This month', from: monthStart(), to: toYmd(new Date()) },
          ].map((preset) => {
            const on = from === preset.from && to === preset.to;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.from, preset.to)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                  on ? 'bg-[#002869] text-white border-[#002869]' : 'bg-[#f9f9ff] text-[#434652] border-[#cbdaff] hover:bg-[#e0e8ff]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-[#061b3b]">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-[#061b3b]">To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b]"
            />
          </label>
        </div>

        <p className="text-xs text-[#434652]">
          {count === 0
            ? 'No rows in this date range.'
            : `${count} row${count === 1 ? '' : 's'} will be exported.`}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#434652] hover:bg-[#f1f3ff] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={count === 0}
            className="px-4 py-2 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel
          </button>
        </div>
      </form>
    </div>
  );
};
