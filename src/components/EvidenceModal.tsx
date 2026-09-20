import React from 'react';
import { EvidenceSource } from '../types';
import { FileText, ExternalLink, X, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

interface EvidenceModalProps {
  evidence: EvidenceSource | null;
  itemTitle?: string;
  onClose: () => void;
  onViewDocumentPage?: (pageNumber: number) => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  evidence,
  itemTitle,
  onClose,
  onViewDocumentPage,
}) => {
  if (!evidence) return null;

  // Anything the server has not confirmed verbatim (including offline data) is shown as unverified
  const isVerified = evidence.citationStatus === 'VERIFIED';
  const page = evidence.sourcePage;

  return (
    <div
      id="evidence-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="evidence-modal-card"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header pull indicator for mobile */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Evidence-Linked Recovery
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  Why this instruction?
                </h3>
              </div>
            </div>
            <button
              id="close-evidence-btn"
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {itemTitle && (
            <div className="mb-4 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs font-medium text-slate-500">Related action</div>
              <div className="text-sm font-semibold text-slate-800">{itemTitle}</div>
            </div>
          )}

          {/* Citation Verification Badge */}
          {isVerified ? (
            <div
              id="citation-verified-badge"
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full"
            >
              ✓ Verified Verbatim from Page {page}
            </div>
          ) : (
            <div
              id="citation-unverified-badge"
              className="mb-3 flex items-start gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-2 rounded-2xl"
            >
              ⚠️ Citation Unverified on Page {page} — Verify with physical paperwork
            </div>
          )}

          {/* Core Evidence Box */}
          <div
            className={`mb-4 rounded-2xl p-4 border ${
              isVerified ? 'bg-teal-50/60 border-teal-100/80' : 'bg-amber-50/60 border-amber-200/80'
            }`}
          >
            <div className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${isVerified ? 'text-teal-900' : 'text-amber-900'}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${isVerified ? 'bg-teal-600' : 'bg-amber-500'}`}></span>
              {isVerified ? `Amazon Textract Verbatim Source (Page ${page}):` : `AI-cited quote (Page ${page}):`}
            </div>
            <blockquote
              className={`text-sm italic font-medium text-slate-900 border-l-3 pl-3 py-1.5 my-2 bg-white/90 rounded-r-lg shadow-2xs leading-relaxed whitespace-pre-line ${
                isVerified ? 'border-teal-600' : 'border-amber-500'
              }`}
            >
              {evidence.originalText ? `"${evidence.originalText}"` : 'No source quote was provided for this item.'}
            </blockquote>
            {!isVerified && (
              <p className="text-[11px] text-amber-800 mt-1">
                {evidence.verificationNote || `Exact wording could not be confirmed on Page ${page}.`}
              </p>
            )}
          </div>

          {/* Safety Verification Chain */}
          <div className="mb-4 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-700 flex items-center gap-1">
              {isVerified ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              )}
              Source Verification Chain
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              Textract OCR (Page {page}) → Bedrock Instruction Match →{' '}
              {isVerified ? 'Verbatim Sentence Anchor' : 'Verbatim match not found'}
            </div>
          </div>

          {/* Source Document Details */}
          <div className="space-y-2 mb-5 text-xs text-slate-600">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Document</span>
              <span className="font-semibold text-slate-800 text-right">{evidence.documentName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Page Citation</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                Page {page}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 font-medium">Section</span>
              <span className="font-medium text-slate-700 text-right max-w-[200px] truncate">{evidence.section}</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-3">
            {onViewDocumentPage && (
              <button
                id="view-original-doc-btn"
                onClick={() => {
                  onViewDocumentPage(evidence.sourcePage);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <span>View Original Document (Page {evidence.sourcePage})</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Zero-Diagnosis Safety Badge */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className={`w-3.5 h-3.5 ${isVerified ? 'text-teal-600' : 'text-amber-600'}`} />
              <span>
                {isVerified
                  ? 'Grounded in hospital paperwork • Quote matched word-for-word'
                  : 'Check this item against your printed discharge paperwork'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
