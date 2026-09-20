import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { CarePathApi } from '../services/api';

interface UploadModalProps {
  onClose: () => void;
  onProcessingComplete: () => void;
}

type PipelineStep =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'structuring'
  | 'validating'
  | 'saving'
  | 'ready'
  | 'error';

export const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onProcessingComplete,
}) => {
  const [step, setStep] = useState<PipelineStep>('idle');
  const [fileName, setFileName] = useState<string>('discharge_instructions.pdf');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ medications: number; days: number; warnings: number } | null>(null);

  const startPipeline = async (name: string, fileBase64?: string, isDemo = true) => {
    setFileName(name);
    setErrorMessage(null);
    setSummary(null);
    setStep('uploading');

    // Step transitions that visually track the pipeline execution
    const timers = [
      setTimeout(() => setStep('extracting'), 400),
      setTimeout(() => setStep('structuring'), 800),
      setTimeout(() => setStep('validating'), 1200),
      setTimeout(() => setStep('saving'), 1500),
    ];

    try {
      const { recoveryPlan } = await CarePathApi.uploadDocument(name, fileBase64, isDemo);
      setSummary({
        medications: recoveryPlan.medications.length,
        days: recoveryPlan.patient.totalDays,
        warnings: recoveryPlan.warningSigns.length,
      });
      setStep('ready');
    } catch (err) {
      if (isDemo) {
        // Offline demo: the app keeps showing its bundled demo data, so transition cleanly to ready
        console.warn('Backend upload notice (running fallback display):', err);
        setStep('ready');
      } else {
        // A patient's own document failed: never present the previous plan as theirs
        setErrorMessage((err as Error).message || 'This document could not be processed.');
        setStep('error');
      }
    } finally {
      timers.forEach(clearTimeout);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      startPipeline(file.name, base64, false);
    };
    reader.readAsDataURL(file);
  };

  const isProcessing = step !== 'idle' && step !== 'ready' && step !== 'error';
  const shownSummary = summary ?? {
    medications: 0,
    days: 14,
    warnings: 0,
  };

  const stepsList = [
    { key: 'uploading', label: 'Document Storage (LocalStack S3 / Storage)', desc: 'Encrypted storage of discharge document packet' },
    { key: 'extracting', label: 'Layout & Text Extraction (Local Textract-compatible)', desc: 'Preserving evidence boundaries and OCR page line blocks' },
    { key: 'structuring', label: 'Clinical Structuring (Local Clinical AI Provider)', desc: 'Zero-diagnosis prompt enforcing verbatim citations' },
    { key: 'validating', label: 'Safety Boundaries & Source Verification', desc: 'Cross-verifying source citations against OCR text' },
    { key: 'saving', label: 'Partitioned State (Local DynamoDB)', desc: 'Persisting recovery timeline and tasks' },
  ];

  const getStepStatus = (itemKey: string) => {
    const order = ['uploading', 'extracting', 'structuring', 'validating', 'saving', 'ready'];
    const currentIndex = order.indexOf(step);
    const targetIndex = order.indexOf(itemKey);

    if (currentIndex > targetIndex) return 'done';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  };

  return (
    <div
      id="upload-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
      onClick={!isProcessing ? onClose : undefined}
    >
      <div
        id="upload-modal-card"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Upload Discharge Instructions
              </h3>
              <p className="text-[11px] text-slate-500">
                Turns hospital paperwork into an actionable timeline
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          {step === 'idle' && (
            <div className="space-y-4">
              {/* Drag & Drop Target with real file input */}
              <label className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 rounded-2xl p-6 text-center transition-all cursor-pointer group block">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white text-teal-700 shadow-xs flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Select or drop discharge PDF
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Upload patient discharge summary or clinical orders
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-white px-3 py-1.5 rounded-xl border border-teal-200/80 shadow-2xs">
                  <span>Browse files</span>
                </div>
              </label>

              {/* Demo Document Option */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
                  Or load sample clinical discharge packet
                </div>
                <button
                  id="load-demo-doc-btn"
                  onClick={() => startPipeline('Sample_PostOp_Discharge_Summary.pdf', undefined, true)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Sample Surgical Discharge Summary
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Multi-page clinical discharge packet · Verified citations
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4 py-2">
              <div className="text-center mb-4">
                <div className="inline-flex p-3 rounded-2xl bg-teal-50 text-teal-700 mb-2">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Processing Discharge Document
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {fileName}
                </p>
              </div>

              {/* Step checklist */}
              <div className="space-y-2.5">
                {stepsList.map((st) => {
                  const status = getStepStatus(st.key);
                  return (
                    <div
                      key={st.key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        status === 'done'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : status === 'active'
                          ? 'bg-teal-50 border-teal-300 text-teal-950 shadow-xs'
                          : 'bg-slate-50/50 border-slate-100 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : status === 'active' ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-ping shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold">{st.label}</div>
                          <div className="text-[10px] text-slate-500">{st.desc}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'ready' && (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Recovery Plan Ready
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Discharge instructions structured with exact source page evidence.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 grid grid-cols-3 gap-2">
                <div>
                  <strong className="block text-slate-900 text-sm">{shownSummary.medications}</strong>
                  <span>Medications</span>
                </div>
                <div>
                  <strong className="block text-slate-900 text-sm">{shownSummary.days} Days</strong>
                  <span>Timeline</span>
                </div>
                <div>
                  <strong className="block text-slate-900 text-sm">{shownSummary.warnings}</strong>
                  <span>Warning Signs</span>
                </div>
              </div>

              <button
                id="view-recovery-dashboard-btn"
                onClick={() => {
                  onProcessingComplete();
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Open Recovery Dashboard
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Document Could Not Be Processed
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">{errorMessage}</p>
                <p className="text-[11px] text-slate-400 mt-2">Your current recovery plan has not changed.</p>
              </div>

              <button
                id="upload-try-again-btn"
                onClick={() => setStep('idle')}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Try Another Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
