import React, { useState, useEffect } from 'react';
import { DocumentPage } from '../types';
import { FileText, X, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';

interface DocumentViewerModalProps {
  initialPage?: number;
  onClose: () => void;
  pages?: DocumentPage[];
  documentTitle?: string;
  hospitalName?: string;
  isDemo?: boolean;
}

const defaultEmptyPages: DocumentPage[] = [
  {
    pageNumber: 1,
    title: 'Clinical Discharge Paperwork',
    content: 'No extracted page records are currently loaded. Upload a discharge summary to inspect OCR extracted evidence and source records.',
    highlights: [],
  },
];

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  initialPage = 1,
  onClose,
  pages,
  documentTitle,
  hospitalName,
  isDemo = false,
}) => {
  const displayPages = pages && pages.length > 0 ? pages : defaultEmptyPages;
  const pageNumbers = displayPages.map((p) => p.pageNumber);
  const [activePage, setActivePage] = useState<number>(initialPage);

  useEffect(() => {
    if (pageNumbers.includes(initialPage)) {
      setActivePage(initialPage);
    } else if (pageNumbers.length > 0) {
      setActivePage(pageNumbers[0]);
    }
  }, [initialPage, pages]);

  const currentPageData =
    displayPages.find((p) => p.pageNumber === activePage) || displayPages[0];

  const firstPage = pageNumbers[0] ?? 1;
  const lastPage = pageNumbers[pageNumbers.length - 1] ?? 1;

  return (
    <div
      id="document-viewer-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="document-viewer-modal"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Hospital Document Record
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {documentTitle || 'Discharge Instructions'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors hidden sm:inline-flex"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              id="close-doc-viewer-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page Selector Tabs */}
        <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-1 overflow-x-auto shrink-0 no-scrollbar">
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                id={`doc-page-tab-${pageNum}`}
                onClick={() => setActivePage(pageNum)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  activePage === pageNum
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200/70'
                }`}
              >
                Page {pageNum}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>Page {activePage} of {pageNumbers.length}</span>
          </div>
        </div>

        {/* Ingestion Source Banner */}
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between text-[11px] text-amber-900 shrink-0">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{isDemo ? 'Demo patient · Verified discharge record' : 'Uploaded document record'}</span>
          </div>
          <span className="text-[10px] text-amber-700 font-mono">
            {hospitalName || 'Grounding Source for Local Clinical Ingestion'}
          </span>
        </div>

        {/* Document Body (Medical Paper Styling) */}
        <div className="p-5 sm:p-6 overflow-y-auto grow bg-slate-50/50">
          <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xs border border-slate-200/90 font-mono text-xs leading-relaxed text-slate-800">
            <div className="border-b border-slate-200 pb-3 mb-4 text-center">
              <div className="text-[11px] font-bold text-slate-500 tracking-wider">
                ORIGINAL HOSPITAL CLINICAL RECORD
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {currentPageData.title}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {hospitalName ? `${hospitalName} • Verified Ingestion Artifact` : 'Verified Ingestion Artifact'}
              </div>
            </div>

            <pre className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed text-slate-800">
              {currentPageData.content}
            </pre>

            {/* Highlighted Evidence Callout */}
            {currentPageData.highlights.length > 0 && (
              <div className="mt-6 pt-4 border-t-2 border-dashed border-teal-200 bg-teal-50/50 -mx-3 p-4 rounded-xl">
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  Extracted Evidence Targets on Page {activePage}:
                </div>
                <div className="space-y-1.5">
                  {currentPageData.highlights.map((hl, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded-lg border border-teal-100 text-xs text-slate-700 italic flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                      <span>"{hl.text}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              const prevIdx = pageNumbers.indexOf(activePage) - 1;
              if (prevIdx >= 0) setActivePage(pageNumbers[prevIdx]);
            }}
            disabled={activePage === firstPage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-bold text-slate-600">
            Page {activePage} of {displayPages.length}
          </span>

          <button
            onClick={() => {
              const nextIdx = pageNumbers.indexOf(activePage) + 1;
              if (nextIdx < pageNumbers.length) setActivePage(pageNumbers[nextIdx]);
            }}
            disabled={activePage === lastPage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
