import React, { useState } from 'react';
import {
  PatientProfile,
  MedicationTask,
  ActivityTask,
  FollowUpAppointment,
  EvidenceSource,
  WarningSign,
} from '../../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  ChevronRight,
  Pill,
  Footprints,
  Utensils,
  Moon,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface HomeTabProps {
  patient: PatientProfile;
  medications: MedicationTask[];
  activities: ActivityTask[];
  followUp: FollowUpAppointment | null;
  warningSigns: WarningSign[];
  onToggleMedication: (id: string) => void;
  onToggleActivity: (id: string) => void;
  onShowEvidence: (evidence: EvidenceSource, title: string) => void;
  onNavigateToCheckIn: () => void;
  onNavigateToPlan: () => void;
  onViewDocumentPage: (pageNumber: number) => void;
  hasCompletedCheckInToday: boolean;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  patient,
  medications,
  activities,
  followUp,
  warningSigns,
  onToggleMedication,
  onToggleActivity,
  onShowEvidence,
  onNavigateToCheckIn,
  onNavigateToPlan,
  onViewDocumentPage,
  hasCompletedCheckInToday,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'medication' | 'activity' | 'diet'>('all');

  // Calculate task counts
  const totalTasks = medications.length + activities.length;
  const completedTasks =
    medications.filter((m) => m.completed).length +
    activities.filter((a) => a.completed).length;
  const remainingTasks = totalTasks - completedTasks;
  const progressPercent = Math.round((completedTasks / (totalTasks || 1)) * 100);

  // Next upcoming medication (first uncompleted)
  const nextMedication = medications.find((m) => !m.completed);

  return (
    <div id="home-tab-view" className="space-y-4 pb-20 pt-1 px-4 sm:px-5 animate-fade-in">
      {/* Patient Greeting & Status Header */}
      <div className="pt-2 space-y-2">
        {/* Dynamic Patient & Procedure Context Banner */}
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold truncate max-w-[200px]">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">{patient.isDemo ? 'Demo patient · Fictional data' : 'Active Patient'}</span>
          </div>
          <span className="text-[10px] font-mono text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md truncate max-w-[170px]">
            {patient.procedure || 'Post-Op Care'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-teal-800 tracking-wide">
              {patient.hospitalName} • Post-Op
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Good morning, {patient.name.split(' ')[0]}
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Day {patient.currentDay} of your recovery timeline
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-100">
              <ShieldCheck className="w-3 h-3 text-teal-600" />
              Verified Plan
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              Discharged {patient.dischargeDate.split(',')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Samsung Health Inspired: Recovery Progress Card */}
      <div
        id="recovery-progress-card"
        className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 transition-shadow hover:shadow-md"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Recovery Progress
          </span>
          <button
            onClick={onNavigateToPlan}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-0.5"
          >
            <span>Timeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {patient.currentDay}
              </span>
              <span className="text-base font-semibold text-slate-400">
                / {patient.totalDays} days
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {remainingTasks === 0
                ? 'All tasks completed for today!'
                : `${remainingTasks} task${remainingTasks === 1 ? '' : 's'} remaining today`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-teal-700">
              {progressPercent}%
            </span>
            <div className="text-[10px] text-slate-400 font-medium">Daily adherence</div>
          </div>
        </div>

        {/* Large Progress Bar */}
        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 mb-3">
          <div
            className="bg-gradient-to-r from-teal-600 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(8, progressPercent)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-600" />
            <span className="text-slate-600">
              Completed: <strong className="text-slate-800">{completedTasks}</strong> of {totalTasks}
            </span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Target: 14-day protocol</span>
          </div>
        </div>
      </div>

      {/* Daily Check-In Prompt Card (If not yet completed or status alert) */}
      <div
        id="checkin-cta-card"
        onClick={onNavigateToCheckIn}
        className={`rounded-3xl p-4.5 border transition-all cursor-pointer ${
          hasCompletedCheckInToday
            ? 'bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-50'
            : 'bg-amber-50/70 border-amber-200 hover:bg-amber-50 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                hasCompletedCheckInToday
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {hasCompletedCheckInToday ? (
                <Check className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {hasCompletedCheckInToday ? 'Today’s Check-in Complete' : 'Daily Health Check-in'}
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {hasCompletedCheckInToday ? 'Responses on file' : 'How are you feeling today?'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {hasCompletedCheckInToday
                  ? 'Tap to review or update your check-in'
                  : 'Check pain, fever, and breathing for safety'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <span
              className={`inline-flex items-center justify-center gap-1 text-xs font-bold px-3 py-2 rounded-xl ${
                hasCompletedCheckInToday
                  ? 'bg-white text-emerald-800 border border-emerald-200'
                  : 'bg-amber-600 text-white shadow-xs'
              }`}
            >
              <span>{hasCompletedCheckInToday ? 'View' : 'Start'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* UPCOMING HIGHLIGHT: Next Medication */}
      {nextMedication && (
        <div
          id="next-medication-banner"
          className="bg-white rounded-3xl p-4.5 border border-slate-200/90 shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Next Scheduled Dose
              </span>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {nextMedication.timing}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 leading-tight">
                  {nextMedication.name}
                </h4>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  {nextMedication.dose} • {nextMedication.instructions}
                </p>
                {/* Evidence Link Trigger */}
                <button
                  id={`why-this-next-med-${nextMedication.id}`}
                  onClick={() => onShowEvidence(nextMedication.evidence, nextMedication.name)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 mt-2 bg-teal-50/80 hover:bg-teal-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                  <span>Why this? →</span>
                </button>
              </div>
            </div>

            <button
              id={`mark-next-med-taken-${nextMedication.id}`}
              onClick={() => onToggleMedication(nextMedication.id)}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all"
            >
              Take Dose
            </button>
          </div>
        </div>
      )}

      {/* TODAY'S PLAN SECTION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Today's Schedule
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {medications.length + activities.length} items
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'medication', label: 'Medications' },
            { id: 'activity', label: 'Activities' },
            { id: 'diet', label: 'Diet & Rest' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task Cards List */}
        <div className="space-y-2.5">
          {/* Medications */}
          {(activeFilter === 'all' || activeFilter === 'medication') &&
            medications.map((med) => (
              <div
                key={med.id}
                id={`task-card-${med.id}`}
                className={`bg-white rounded-2xl p-4 border transition-all ${
                  med.completed
                    ? 'border-emerald-200/80 bg-slate-50/60'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggleMedication(med.id)}
                      className="mt-0.5 text-teal-700 hover:text-teal-800 transition-transform active:scale-95 cursor-pointer"
                      aria-label={med.completed ? 'Mark as pending' : 'Mark as completed'}
                    >
                      {med.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 hover:text-teal-600" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">
                          {med.timing}
                        </span>
                        {med.completed && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                      <h4
                        className={`text-sm font-bold text-slate-900 leading-snug mt-0.5 ${
                          med.completed ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {med.name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {med.dose} • {med.instructions}
                      </p>

                      {/* Evidence Link Trigger: "Why this? →" */}
                      <button
                        id={`why-this-med-${med.id}`}
                        onClick={() => onShowEvidence(med.evidence, med.name)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 mt-2 bg-teal-50/70 hover:bg-teal-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3 text-teal-600" />
                        <span>Why this? →</span>
                      </button>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-300">
                    <Pill className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}

          {/* Activities & Diet */}
          {(activeFilter === 'all' || activeFilter === 'activity' || activeFilter === 'diet') &&
            activities
              .filter((act) =>
                activeFilter === 'activity'
                  ? act.category === 'activity'
                  : activeFilter === 'diet'
                  ? act.category === 'diet' || act.category === 'rest'
                  : true
              )
              .map((act) => {
                const Icon =
                  act.category === 'activity'
                    ? Footprints
                    : act.category === 'diet'
                    ? Utensils
                    : Moon;

                return (
                  <div
                    key={act.id}
                    id={`activity-card-${act.id}`}
                    className={`bg-white rounded-2xl p-4 border transition-all ${
                      act.completed
                        ? 'border-emerald-200/80 bg-slate-50/60'
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleActivity(act.id)}
                          className="mt-0.5 text-teal-700 hover:text-teal-800 transition-transform active:scale-95 cursor-pointer"
                          aria-label={act.completed ? 'Mark pending' : 'Mark done'}
                        >
                          {act.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400 hover:text-teal-600" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">
                              {act.timing}
                            </span>
                            {act.duration && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {act.duration}
                              </span>
                            )}
                          </div>
                          <h4
                            className={`text-sm font-bold text-slate-900 leading-snug mt-0.5 ${
                              act.completed ? 'line-through text-slate-500' : ''
                            }`}
                          >
                            {act.title}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {act.instructions}
                          </p>

                          <button
                            id={`why-this-act-${act.id}`}
                            onClick={() => onShowEvidence(act.evidence, act.title)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 mt-2 bg-teal-50/70 hover:bg-teal-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                          >
                            <HelpCircle className="w-3 h-3 text-teal-600" />
                            <span>Why this? →</span>
                          </button>
                        </div>
                      </div>

                      <div className="shrink-0 text-slate-300">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* UPCOMING CLINIC FOLLOW-UP */}
      <div
        id="upcoming-followup-card"
        className="bg-white rounded-3xl p-4.5 border border-slate-200/80 shadow-xs"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Upcoming Surgical Follow-Up
            </span>
          </div>
          {followUp && (
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
              {followUp.date.split('(')[0]}
            </span>
          )}
        </div>

        {followUp ? (
          <>
            <h4 className="text-sm font-bold text-slate-900">
              {followUp.title}
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              {followUp.doctor} • {followUp.location}
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              {followUp.evidence ? (
                <>
                  <button
                    onClick={() => onShowEvidence(followUp.evidence!, followUp.title)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                  >
                    <span>Why this appointment? →</span>
                  </button>
                  <button
                    onClick={() => onViewDocumentPage(followUp.evidence!.sourcePage)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    View page {followUp.evidence.sourcePage}
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-400">Documented Appointment</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            No follow-up appointment was found in your discharge paperwork.
          </p>
        )}
      </div>

      {/* WATCH FOR: Documented Warning Signs Glance */}
      <div
        id="watch-for-warning-signs-card"
        className="bg-slate-50 rounded-3xl p-4 border border-slate-200/80 text-xs"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-amber-700 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Documented Warning Signs to Watch For</span>
          </div>
          {warningSigns.length > 0 && (
            <button
              onClick={() => onViewDocumentPage(warningSigns[0].sourcePage || 1)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
            >
              Page {warningSigns[0].sourcePage || 1}
            </button>
          )}
        </div>

        <ul className="space-y-1.5 text-slate-600">
          {warningSigns.map((warn) => (
            <li key={warn.id} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span>
                <strong className="text-slate-800">{warn.condition.split('or')[0]}:</strong>{' '}
                {warn.documentedAction}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
