import React from 'react';
import { WarningSign } from '../types';
import { AlertTriangle, FileText, Phone, X, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';

interface SafetyAlertModalProps {
  warningSign: WarningSign | null;
  onClose: () => void;
  onViewDocumentPage?: (pageNumber: number) => void;
  hospitalHelpline?: string;
}

export const SafetyAlertModal: React.FC<SafetyAlertModalProps> = ({
  warningSign,
  onClose,
  onViewDocumentPage,
  hospitalHelpline,
}) => {
  if (!warningSign) return null;

  const isUrgent = warningSign.severity === 'urgent';

  return (
    <div
      id="safety-alert-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="safety-alert-card"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-rose-500/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-rose-50 p-5 border-b border-rose-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                Safety Protocol Alert
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1 leading-tight">
                Documented Warning Sign Matched
              </h3>
            </div>
          </div>
          <button
            id="close-safety-alert-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-rose-100/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
              Matched Safety Rule
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">
              {warningSign.condition}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Documented Action Required:
            </div>
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl leading-relaxed text-xs">
              {warningSign.documentedAction}
            </div>
          </div>

          {/* Source Citation */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-[11px]">
                Cited from <strong className="text-slate-800">Page {warningSign.sourcePage}</strong> of your discharge papers
              </span>
            </div>
            {onViewDocumentPage && (
              <button
                id="view-safety-source-btn"
                onClick={() => onViewDocumentPage(warningSign.sourcePage)}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 shrink-0 ml-2"
              >
                <span>View Page</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Helpline Callout */}
          {hospitalHelpline && (
            <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-900">
                <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                    Clinical Helpline
                  </div>
                  <div className="font-mono font-bold text-xs">{hospitalHelpline}</div>
                </div>
              </div>
              <a
                href={`tel:${hospitalHelpline.replace(/[^0-9+]/g, '')}`}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Call
              </a>
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-tight">
            Non-diagnostic safety match. CarePath does not diagnose conditions. Please consult your physician or emergency services if in acute distress.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
