import React, { useState } from 'react';
import {
  PainLevel,
  FeverStatus,
  BreathingStatus,
  WarningSign,
  CheckInRecord,
  PatientProfile,
} from '../../types';
import {
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown,
  Bell,
} from 'lucide-react';
import { CarePathApi, UNMATCHED_SYMPTOM_NOTICE } from '../../services/api';

interface CheckInTabProps {
  onCheckInSubmitted: (record: CheckInRecord, matchedWarning: WarningSign | null) => void;
  warningSigns: WarningSign[];
  checkInHistory: CheckInRecord[];
  onViewDocumentPage: (pageNumber: number) => void;
  documentId?: string;
  patient?: PatientProfile;
}

export const CheckInTab: React.FC<CheckInTabProps> = ({
  onCheckInSubmitted,
  warningSigns,
  checkInHistory,
  onViewDocumentPage,
  documentId,
  patient,
}) => {
  const [pain, setPain] = useState<PainLevel>('same');
  const [fever, setFever] = useState<FeverStatus>('no');
  const [breathing, setBreathing] = useState<BreathingStatus>('normal');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<string | null>(null);
  const [snsFeedback, setSnsFeedback] = useState<string | null>(null);
  const [symptomNotice, setSymptomNotice] = useState<string | null>(null);

  const currentDay = patient?.currentDay ?? 2;
  const isDemo = patient?.isDemo ?? true;
  const patientName = patient?.name || 'Patient';
  const procedureName = patient?.procedure || 'Post-Op Recovery';

  // Dynamic warning signs matching and citations derived from active document rules
  const feverWarning = warningSigns.find((w) => w.triggerKey === 'fever');
  const breathingWarning = warningSigns.find((w) => w.triggerKey === 'breathing');
  const painWarning = warningSigns.find((w) => w.triggerKey === 'pain_worse');

  // Grounding reference page dynamically derived from active document rules
  const primaryWarningPage =
    warningSigns.find((w) => typeof w.sourcePage === 'number')?.sourcePage ?? 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSymptomNotice(null);

    // Offline fallback only: when the server responds, its evaluation of the active plan is authoritative
    let matchedWarning: WarningSign | null = null;
    if (breathing === 'difficult') {
      matchedWarning = breathingWarning || warningSigns.find((w) => w.triggerKey === 'breathing') || null;
    } else if (fever === 'yes') {
      matchedWarning = feverWarning || warningSigns.find((w) => w.triggerKey === 'fever') || null;
    } else if (pain === 'worse') {
      matchedWarning = painWarning || warningSigns.find((w) => w.triggerKey === 'pain_worse') || null;
    }

    try {
      const res = await CarePathApi.submitCheckIn({
        dayNumber: currentDay,
        pain,
        fever,
        breathing,
        notes: notes.trim() || undefined,
        documentId,
      });

      const rec = res.record;
      onCheckInSubmitted(rec, rec.matchedWarningSign ?? null);

      if (rec.warningMatched && rec.snsNotification) {
        setSnsFeedback(
          `Amazon SNS alert published to caregiver • MsgID: ${rec.snsNotification.messageId || 'sns-dispatch-ok'}`
        );
      } else if (rec.unmatchedSymptoms) {
        setSymptomNotice(UNMATCHED_SYMPTOM_NOTICE);
      } else {
        setSubmittedFeedback('Check-in recorded — Recovery progressing normally.');
        setTimeout(() => setSubmittedFeedback(null), 4000);
      }
    } catch (err) {
      // Offline fallback
      const record: CheckInRecord = {
        id: `checkin-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dayNumber: currentDay,
        pain,
        fever,
        breathing,
        notes: notes.trim() || undefined,
        warningMatched: !!matchedWarning,
        matchedWarningSign: matchedWarning || undefined,
      };
      onCheckInSubmitted(record, matchedWarning);
      if (!matchedWarning) {
        setSubmittedFeedback('Check-in recorded — Recovery progressing normally.');
        setTimeout(() => setSubmittedFeedback(null), 4000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="checkin-tab-view" className="space-y-4 pb-20 pt-1 px-4 sm:px-5 animate-fade-in">
      {/* Header */}
      <div className="pt-2">
        {/* Patient & Day Context Banner */}
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl px-3 py-1.5 mb-2 flex items-center justify-between text-[11px] text-amber-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold truncate max-w-[220px]">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">{patientName} • {isDemo ? 'Demo patient' : 'Active Patient'}</span>
          </div>
          <span className="text-[10px] font-mono text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md shrink-0">
            Day {currentDay} Post-Op
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-teal-800 tracking-wide">
              Daily Health Status
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              How are you feeling?
            </h1>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Simple 30-second check-in. Monitored against your discharge safety instructions.
        </p>
      </div>

      {submittedFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{submittedFeedback}</span>
        </div>
      )}

      {snsFeedback && (
        <div className="bg-rose-50 border border-rose-200 text-rose-950 px-4 py-3 rounded-2xl flex items-start gap-2.5 text-xs animate-fade-in">
          <Bell className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Safety Warning Triggered & Dispatched</div>
            <div className="text-[11px] text-rose-800 mt-0.5">{snsFeedback}</div>
          </div>
        </div>
      )}

      {symptomNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 px-4 py-3 rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{symptomNotice}</span>
        </div>
      )}

      {/* Main Check-In Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Pain Control */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-bold text-slate-900">
                Surgical Incision & Pain Level
              </label>
              {painWarning && (
                <div className="text-[11px] text-slate-400">
                  Monitored per Page {painWarning.sourcePage || primaryWarningPage} safety rules
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">Compared to yesterday</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'better' as PainLevel, label: 'Better', emoji: '🟢', sub: 'Improving' },
              { value: 'same' as PainLevel, label: 'Same', emoji: '🟡', sub: 'Manageable' },
              { value: 'worse' as PainLevel, label: 'Worse', emoji: '🔴', sub: 'Escalating' },
            ].map((option) => {
              const isSelected = pain === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  id={`pain-btn-${option.value}`}
                  onClick={() => setPain(option.value)}
                  className={`py-3.5 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? option.value === 'worse'
                        ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-bold ring-2 ring-amber-400/30'
                        : 'border-teal-600 bg-teal-50/80 text-teal-900 font-bold ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg mb-1">{option.emoji}</span>
                  <span className="text-xs font-bold">{option.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{option.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Fever Status */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-bold text-slate-900">
                Fever or Chills
              </label>
              <div className="text-[11px] text-slate-400">
                {feverWarning
                  ? `Safety Rule: ${feverWarning.condition} (Page ${feverWarning.sourcePage})`
                  : 'Safety Rule: Fever, high temperature or chills per discharge instructions'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'no' as FeverStatus, label: 'No Fever', sub: 'Normal body temperature' },
              { value: 'yes' as FeverStatus, label: 'Yes, Fever / Chills', sub: feverWarning ? 'Triggers safety alert' : 'Documented warning sign' },
            ].map((option) => {
              const isSelected = fever === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  id={`fever-btn-${option.value}`}
                  onClick={() => setFever(option.value)}
                  className={`py-3 px-3 rounded-2xl border flex flex-col items-start transition-all cursor-pointer ${
                    isSelected
                      ? option.value === 'yes'
                        ? 'border-rose-500 bg-rose-50/80 text-rose-950 font-bold ring-2 ring-rose-400/20'
                        : 'border-teal-600 bg-teal-50/80 text-teal-900 font-bold ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">{option.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{option.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Breathing Status */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-bold text-slate-900">
                Breathing & Chest Comfort
              </label>
              <div className="text-[11px] text-slate-400">
                {breathingWarning
                  ? `Safety Rule: ${breathingWarning.condition} (Page ${breathingWarning.sourcePage})`
                  : `Post-procedure recovery safety check (${procedureName})`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'normal' as BreathingStatus, label: 'Normal Breathing', sub: 'Comfortable & easy' },
              { value: 'difficult' as BreathingStatus, label: 'Difficult / Shortness', sub: breathingWarning ? 'Critical alert trigger' : 'Emergency warning sign' },
            ].map((option) => {
              const isSelected = breathing === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  id={`breathing-btn-${option.value}`}
                  onClick={() => setBreathing(option.value)}
                  className={`py-3 px-3 rounded-2xl border flex flex-col items-start transition-all cursor-pointer ${
                    isSelected
                      ? option.value === 'difficult'
                        ? 'border-rose-600 bg-rose-50/90 text-rose-950 font-bold ring-2 ring-rose-500/30'
                        : 'border-teal-600 bg-teal-50/80 text-teal-900 font-bold ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">{option.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{option.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Optional Caregiver Notes */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <label className="text-sm font-bold text-slate-900 block mb-1">
            Notes for Today (Optional)
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Appetite, walking comfort, or questions for next doctor visit.
          </p>
          <textarea
            id="checkin-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Walked 10 minutes after lunch; drank 1.5 liters of water."
            rows={2}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-hidden resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          id="submit-checkin-btn"
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          {isSubmitting ? 'Evaluating Safety Criteria...' : 'Save Daily Check-In'}
        </button>
      </form>

      {/* Safety Grounding Footer */}
      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 flex items-start gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <span>CarePath safety engine matches responses against</span>{' '}
          <button
            onClick={() => onViewDocumentPage(primaryWarningPage)}
            className="text-teal-700 font-bold hover:underline cursor-pointer"
          >
            Page {primaryWarningPage} Emergency Protocol
          </button>
          . No automated diagnosis is ever generated.
        </div>
      </div>

      {/* Check-In History */}
      {checkInHistory.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Check-In History
            </h3>
            <span className="text-xs text-slate-400">
              {checkInHistory.length} recorded
            </span>
          </div>

          <div className="space-y-2.5">
            {checkInHistory.map((rec) => (
              <div
                key={rec.id}
                className={`p-3 rounded-2xl border text-xs ${
                  rec.warningMatched
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-slate-50 border-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">
                    Day {rec.dayNumber} Check-In
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {rec.timestamp}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span>Pain: <strong>{rec.pain}</strong></span>
                  <span>Fever: <strong>{rec.fever}</strong></span>
                  <span>Breathing: <strong>{rec.breathing}</strong></span>
                </div>
                {rec.warningMatched && rec.matchedWarningSign && (
                  <div className="mt-1.5 pt-1.5 border-t border-amber-200 text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Matched: {rec.matchedWarningSign.condition}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
