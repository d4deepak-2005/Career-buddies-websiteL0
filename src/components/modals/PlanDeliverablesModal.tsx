import React from 'react';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { PlanItem } from '../../types';
import { ModalA11y } from '../common/ModalA11y';

interface PlanDeliverablesModalProps {
  plan: PlanItem | null;
  alreadyEnrolled?: boolean;
  onClose: () => void;
  onEnroll: (plan: PlanItem) => void;
}

export function PlanDeliverablesModal({
  plan,
  alreadyEnrolled = false,
  onClose,
  onEnroll,
}: PlanDeliverablesModalProps) {
  if (!plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <ModalA11y label={`${plan.name} plan details`} onClose={onClose} />
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-[#e0e8ff] max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-[#002869] text-white flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {plan.badge && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold">
                  {plan.badge}
                </span>
              )}
              {plan.isRecommended && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#79fd8d] text-[#002869] text-[11px] font-black">
                  Recommended
                </span>
              )}
            </div>
            {plan.tagline && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#79fd8d]">
                {plan.tagline}
              </p>
            )}
            <h3 className="text-xl font-black font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
              {plan.name}
            </h3>
            <p className="text-sm text-[#dae2ff] mt-2">
              {plan.priceINR}
              {plan.period ? <span className="text-xs text-[#dae2ff]/80"> · {plan.period}</span> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex flex-col gap-5">
          {plan.description && (
            <p className="text-sm text-[#434652] leading-relaxed">{plan.description}</p>
          )}

          {(plan.sessionsCount || plan.supportType || plan.bestFor) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plan.sessionsCount && (
                <div className="rounded-2xl bg-[#f9f9ff] border border-[#e0e8ff] p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#666a76]">Sessions</p>
                  <p className="text-xs font-bold text-[#061b3b] mt-1">{plan.sessionsCount}</p>
                </div>
              )}
              {plan.supportType && (
                <div className="rounded-2xl bg-[#f9f9ff] border border-[#e0e8ff] p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#666a76]">Support</p>
                  <p className="text-xs font-bold text-[#061b3b] mt-1">{plan.supportType}</p>
                </div>
              )}
              {plan.bestFor && (
                <div className="rounded-2xl bg-[#f9f9ff] border border-[#e0e8ff] p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#666a76]">Best for</p>
                  <p className="text-xs font-bold text-[#061b3b] mt-1">{plan.bestFor}</p>
                </div>
              )}
            </div>
          )}

          {plan.customPricingNote && (
            <p className="text-xs text-[#434652] leading-relaxed bg-[#f9f9ff] border border-[#e0e8ff] rounded-2xl p-3.5">
              {plan.customPricingNote}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#666a76]">
              Included Deliverables
            </p>
            {(plan.features || []).map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-2xl border border-[#e0e8ff] bg-[#f9f9ff] p-3.5">
                <CheckCircle2 className="w-4 h-4 text-[#006e29] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#061b3b]">{feat.title}</p>
                  {feat.detail && (
                    <p className="text-xs text-[#434652] leading-relaxed mt-1">{feat.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e0e8ff] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#f0f5ff] hover:bg-[#e1edff] border border-[#cbdaff] text-[#002869] text-xs font-bold cursor-pointer"
          >
            Close
          </button>
          {alreadyEnrolled ? (
            <span className="px-4 py-2.5 rounded-xl bg-[#e8f8ee] text-[#00531d] text-xs font-black">
              Already enrolled
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onEnroll(plan)}
              className="px-4 py-2.5 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {plan.isCustomPricing || !plan.onlinePayment || !parseFloat(String(plan.priceINR || '').replace(/[^0-9.]/g, ''))
                  ? 'Contact advisor'
                  : 'Enroll Now'}
              </span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
