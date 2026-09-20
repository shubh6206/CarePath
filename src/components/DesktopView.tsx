import React, { useState } from 'react';
import {
  PatientProfile,
  MedicationTask,
  ActivityTask,
  FollowUpAppointment,
  EvidenceSource,
  WarningSign,
  CheckInRecord,
  DailyPlan,
  PainLevel,
  FeverStatus,
  BreathingStatus,
} from '../types';
import {
  Pill,
  Footprints,
  Utensils,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  FileText,
  Cpu,
  RotateCcw,
  Upload,
  Phone,
  HeartPulse,
  Activity,
  User,
  MapPin,
  Sparkles,
  ChevronRight,
  Bell,
  Smartphone,
  Check,
} from 'lucide-react';
import { CarePathApi, UNMATCHED_SYMPTOM_NOTICE } from '../services/api';

interface DesktopViewProps {
  patient: PatientProfile;
  medications: MedicationTask[];
  activities: ActivityTask[];
  warningSigns: WarningSign[];
  followUp: FollowUpAppointment | null;
  checkInHistory: CheckInRecord[];
  selectedPlanDay: number;
  plans: DailyPlan[];
  onSelectPlanDay: (day: number) => void;
  onToggleMedication: (id: string) => void;
  onToggleActivity: (id: string) => void;
  onShowEvidence: (evidence: EvidenceSource, title: string) => void;
  onOpenDocumentViewer: (pageNumber?: number) => void;
  onCheckInSubmitted: (record: CheckInRecord, matchedWarning: WarningSign | null) => void;
  onOpenAwsArch: () => void;
  onOpenUpload: () => void;
  onTriggerBreathingAlert: () => void;
  onResetDemo: () => void;
  onSwitchToMobile: () => void;
  documentId?: string;
  documentTitle?: string;
}

export const DesktopView: React.FC<DesktopViewProps> = ({
  patient,
  medications,
  activities,
  warningSigns,
  followUp,
  checkInHistory,
  selectedPlanDay,
  plans,
  onSelectPlanDay,
  onToggleMedication,
  onToggleActivity,
  onShowEvidence,
  onOpenDocumentViewer,
  onCheckInSubmitted,
  onOpenAwsArch,
  onOpenUpload,
  onTriggerBreathingAlert,
  onResetDemo,
  onSwitchToMobile,
  documentId,
  documentTitle,
}) => {
  // Check-In form state inside Desktop dashboard
  const [pain, setPain] = useState<PainLevel>('same');
  const [fever, setFever] = useState<FeverStatus>('no');
  const [breathing, setBreathing] = useState<BreathingStatus>('normal');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [symptomNotice, setSymptomNotice] = useState<string | null>(null);

  // Active filter for today's tasks
  const [taskFilter, setTaskFilter] = useState<'all' | 'medication' | 'activity'>('all');

  const totalTasks = medications.length + activities.length;
  const completedTasks =
    medications.filter((m) => m.completed).length +
    activities.filter((a) => a.completed).length;
  const progressPercent = Math.round((completedTasks / (totalTasks || 1)) * 100);

  const currentDay = patient?.currentDay ?? 1;
  const isDemo = patient?.isDemo ?? false;
  const feverWarning = warningSigns.find((w) => w.triggerKey === 'fever');
  const breathingWarning = warningSigns.find((w) => w.triggerKey === 'breathing');
  const painWarning = warningSigns.find((w) => w.triggerKey === 'pain_worse');
  const primaryWarningPage =
    warningSigns.find((w) => typeof w.sourcePage === 'number')?.sourcePage ?? 1;

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSymptomNotice(null);

    // Offline fallback only: when the server responds, its evaluation is authoritative
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

      if (rec.warningMatched) {
        setCheckInSuccess('Safety warning triggered — Caregiver notified via SNS.');
        setTimeout(() => setCheckInSuccess(null), 5000);
      } else if (rec.unmatchedSymptoms) {
        setSymptomNotice(UNMATCHED_SYMPTOM_NOTICE);
      } else {
        setCheckInSuccess('Daily check-in recorded successfully!');
        setTimeout(() => setCheckInSuccess(null), 5000);
      }
    } catch (err) {
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
      setCheckInSuccess('Daily check-in recorded (Offline mode).');
      setTimeout(() => setCheckInSuccess(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDayPlan = plans.find((p) => p.dayNumber === selectedPlanDay) || plans[1];

  return (
    <div id="desktop-portal-root" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Header & Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Clinical Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 font-extrabold flex items-center justify-center text-sm shadow-sm">
              CP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">CarePath</span>
                <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                  Desktop Patient Portal
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full hidden sm:inline">
                  Demo patient · Fictional clinical data
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {patient.hospitalName} • Post-Operative Clinical Recovery Protocol
              </p>
            </div>
          </div>

          {/* Quick Actions & View Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Judging Shortcut: Test Safety Match */}
            <button
              id="desktop-test-safety-btn"
              onClick={onTriggerBreathingAlert}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer"
              title="Test Red-Flag Caregiver Escalation"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Test Safety Match</span>
            </button>

            {/* AWS Architecture Modal */}
            <button
              id="desktop-aws-pipeline-btn"
              onClick={onOpenAwsArch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">AWS Architecture</span>
            </button>

            {/* Original PDF Viewer */}
            <button
              id="desktop-view-pdf-btn"
              onClick={() => onOpenDocumentViewer(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden md:inline">Original PDF</span>
            </button>

            {/* Upload Discharge Summary */}
            <button
              id="desktop-upload-btn"
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">Upload PDF</span>
            </button>

            {/* Reset Demo */}
            <button
              id="desktop-reset-btn"
              onClick={onResetDemo}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer"
              title="Reset Demo State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Viewport Mode Switcher: Switch to Mobile Frame */}
            <button
              id="desktop-switch-mobile-btn"
              onClick={onSwitchToMobile}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer ml-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile App View</span>
            </button>
          </div>
        </div>
      </header>

      {/* Patient Header Banner */}
      <div className="bg-slate-800/60 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-lg shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">{patient.name}</h1>
                {patient.mrn && (
                  <span className="text-xs font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">
                    MRN: {patient.mrn}
                  </span>
                )}
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Plan
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {patient.procedure} • Discharged {patient.dischargeDate} • Attending: {patient.attendingPhysician}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-700/60 text-xs">
            <div className="px-3 border-r border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Current Day</div>
              <div className="text-base font-extrabold text-white">Day {currentDay} <span className="text-slate-500 text-xs font-normal">/ {patient.totalDays || 14}</span></div>
            </div>
            <div className="px-3 border-r border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Adherence</div>
              <div className="text-base font-extrabold text-teal-400">{progressPercent}%</div>
            </div>
            <div className="px-3">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Tasks Left</div>
              <div className="text-base font-extrabold text-amber-400">{totalTasks - completedTasks} <span className="text-slate-500 text-xs font-normal">of {totalTasks}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Grid */}
      <main className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 grow">
        {/* Left Column (8 cols on lg): Protocol, Timeline, Tasks, Followup */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recovery Timeline 14-Day Selector */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-bold text-white tracking-tight">
                  14-Day Post-Operative Recovery Timeline
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Click any day to view clinical stage
              </span>
            </div>

            {/* Horizontal Day Pill Scroller */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
              {plans.map((p) => {
                const isSelected = p.dayNumber === selectedPlanDay;
                const isToday = p.dayNumber === 2;

                return (
                  <button
                    key={p.dayNumber}
                    onClick={() => onSelectPlanDay(p.dayNumber)}
                    className={`shrink-0 px-3.5 py-2 rounded-2xl flex flex-col items-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500 text-slate-950 font-extrabold shadow-md'
                        : isToday
                        ? 'bg-slate-700 text-white font-bold border border-teal-500/50'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-800'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono tracking-wider">
                      {isToday ? 'Today' : `Day ${p.dayNumber}`}
                    </span>
                    <span className="text-xs mt-0.5">
                      {p.dayNumber === 1 ? 'Rest' : p.dayNumber === 2 ? 'Walk' : p.dayNumber === 10 ? 'Review' : `D${p.dayNumber}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Clinical Focus Callout */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-start justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm">
                    Day {currentDayPlan.dayNumber}: {currentDayPlan.milestoneTitle || currentDayPlan.dateLabel}
                  </span>
                  {currentDayPlan.dayNumber === 2 && (
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold">
                      Current Post-Op Day
                    </span>
                  )}
                </div>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  {currentDayPlan.notes || 'Post-operative recovery protocol and medication management.'}
                </p>
              </div>
              <button
                onClick={() => onOpenDocumentViewer(currentDayPlan.dayNumber >= 5 ? 4 : 3)}
                className="text-teal-400 hover:text-teal-300 font-semibold text-xs flex items-center gap-1 shrink-0 pt-0.5 cursor-pointer"
              >
                <span>View Source</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Today's Protocol: Medications & Activities */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Day {currentDay} Recovery Tasks</span>
                  <span className="text-xs font-mono font-bold bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full">
                    {completedTasks} of {totalTasks} Done
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Extracted and grounded from discharge paperwork Sections 3, 4, and 5.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    taskFilter === 'all'
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Tasks ({totalTasks})
                </button>
                <button
                  onClick={() => setTaskFilter('medication')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    taskFilter === 'medication'
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Medications ({medications.length})
                </button>
                <button
                  onClick={() => setTaskFilter('activity')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    taskFilter === 'activity'
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Care & Activity ({activities.length})
                </button>
              </div>
            </div>

            {/* Task Cards List */}
            <div className="space-y-3">
              {/* Medications */}
              {(taskFilter === 'all' || taskFilter === 'medication') && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-teal-400" />
                    <span>Prescribed Discharge Medications (Section 3)</span>
                  </div>

                  {medications.map((med) => (
                    <div
                      key={med.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        med.completed
                          ? 'bg-slate-900/40 border-slate-800 opacity-75'
                          : 'bg-slate-900/90 border-slate-700 hover:border-slate-600 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 grow">
                        <button
                          onClick={() => onToggleMedication(med.id)}
                          className={`mt-1 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            med.completed
                              ? 'bg-teal-500 border-teal-500 text-slate-950 font-bold'
                              : 'border-slate-600 hover:border-teal-400'
                          }`}
                        >
                          {med.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-bold ${
                                med.completed ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {med.name}
                            </span>
                            <span className="text-xs font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded-md">
                              {med.dose}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {med.timing}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {med.instructions}
                          </p>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Frequency: {med.frequency}
                          </div>
                        </div>
                      </div>

                      {/* Evidence Link */}
                      <button
                        onClick={() => onShowEvidence(med.evidence, med.name)}
                        className="text-xs text-teal-400 hover:text-teal-300 font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                        title="View Verbatim Citation from Discharge Paperwork"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Why this? (Pg {med.evidence.sourcePage})</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Activities & Guidelines */}
              {(taskFilter === 'all' || taskFilter === 'activity') && (
                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Footprints className="w-3.5 h-3.5 text-teal-400" />
                    <span>Physical Recovery & Incision Care (Section 4 & 5)</span>
                  </div>

                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        act.completed
                          ? 'bg-slate-900/40 border-slate-800 opacity-75'
                          : 'bg-slate-900/90 border-slate-700 hover:border-slate-600 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 grow">
                        <button
                          onClick={() => onToggleActivity(act.id)}
                          className={`mt-1 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            act.completed
                              ? 'bg-teal-500 border-teal-500 text-slate-950 font-bold'
                              : 'border-slate-600 hover:border-teal-400'
                          }`}
                        >
                          {act.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                act.completed ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {act.title}
                            </span>
                            {act.duration && (
                              <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                                {act.duration}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {act.instructions}
                          </p>
                        </div>
                      </div>

                      {/* Evidence Link */}
                      <button
                        onClick={() => onShowEvidence(act.evidence, act.title)}
                        className="text-xs text-teal-400 hover:text-teal-300 font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                        title="View Verbatim Citation"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Why this? (Pg {act.evidence.sourcePage})</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Follow-Up Appointment Card */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase font-mono tracking-wider text-teal-400 font-bold">
                  Scheduled Outpatient Clinical Follow-Up
                </span>
                {followUp ? (
                  <>
                    <h3 className="text-sm font-extrabold text-white tracking-tight mt-0.5">
                      {followUp.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                      <span><strong>Date:</strong> {followUp.date} at {followUp.time}</span>
                      <span>•</span>
                      <span><strong>Physician:</strong> {followUp.doctor}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{followUp.location}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    No follow-up appointment was found in the discharge paperwork.
                  </p>
                )}
              </div>
            </div>

            {followUp?.evidence && (
              <button
                onClick={() => onOpenDocumentViewer(followUp.evidence?.sourcePage)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                View Follow-Up Document (Pg {followUp.evidence.sourcePage})
              </button>
            )}
          </div>
        </div>

        {/* Right Column (4 cols on lg): Interactive Daily Check-in & Red Flags */}
        <div className="lg:col-span-4 space-y-6">
          {/* Daily Health Check-In Widget */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-bold text-white tracking-tight">
                  Daily Health Check-In (Day {currentDay})
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Non-Diagnostic Safety</span>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-3.5">
              {/* 1. Pain assessment */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  1. How is your surgical incision & pain compared to yesterday?
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['better', 'same', 'worse'] as PainLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPain(lvl)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        pain === lvl
                          ? lvl === 'worse'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'bg-teal-500 text-slate-950 font-extrabold shadow-xs'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Fever assessment */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  2. Do you have a fever{feverWarning ? ` (${feverWarning.condition})` : ' or chills'}?
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['no', 'yes'] as FeverStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFever(st)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        fever === st
                          ? st === 'yes'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'bg-teal-500 text-slate-950 font-extrabold shadow-xs'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {st === 'no' ? 'No fever' : feverWarning ? 'Fever / Chills' : 'Yes, fever / chills'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Breathing assessment */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  3. Are you experiencing any breathing difficulties{breathingWarning ? ` (${breathingWarning.condition})` : ''}?
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['normal', 'difficult'] as BreathingStatus[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBreathing(b)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        breathing === b
                          ? b === 'difficult'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'bg-teal-500 text-slate-950 font-extrabold shadow-xs'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {b === 'normal' ? 'Normal / Easy' : 'Difficult / Short of breath'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Optional notes / symptoms
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. slight nausea after breakfast..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-400"
                />
              </div>

              {checkInSuccess && (
                <div className="p-2.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{checkInSuccess}</span>
                </div>
              )}

              {symptomNotice && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{symptomNotice}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isSubmitting ? 'Recording Check-In...' : 'Submit Daily Check-In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Red Flag Warning Signs Reference */}
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Emergency Red Flags (Page {primaryWarningPage})
                </span>
              </div>
              <button
                onClick={() => onOpenDocumentViewer(primaryWarningPage)}
                className="text-[11px] text-rose-300 hover:text-white font-semibold underline cursor-pointer"
              >
                View Page {primaryWarningPage}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If any of these conditions occur, contact the emergency contacts or proceed to hospital as documented:
            </p>

            <div className="space-y-2">
              {warningSigns.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/20 text-xs space-y-1"
                >
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{w.condition}</span>
                    {w.sourcePage && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Pg {w.sourcePage})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    <strong>Action:</strong> {w.documentedAction}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-400">24/7 Emergency Line:</span>
              <span className="font-mono font-bold text-rose-400">{patient.hospitalHelpline}</span>
            </div>
          </div>

          {/* Discharge Paperwork Box */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-bold text-white tracking-tight">
                Discharge Summary & Evidence
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              CarePath extracts every dose, timeline event, and escalation rule directly from the signed hospital summary.
            </p>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-white truncate max-w-[200px]">
                  {documentTitle || (patient.name ? `${patient.name.replace(/[^a-zA-Z0-9]/g, '_')}_Discharge.pdf` : 'Discharge_Summary.pdf')}
                </div>
                <div className="text-[11px] text-slate-400">
                  {patient.hospitalName}
                </div>
              </div>
              <button
                onClick={() => onOpenDocumentViewer(1)}
                className="px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 cursor-pointer"
              >
                Inspect
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
