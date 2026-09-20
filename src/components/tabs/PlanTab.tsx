import React, { useState } from 'react';
import { DailyPlan, EvidenceSource } from '../../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Pill,
  Footprints,
  FileText,
  ChevronRight,
  ShieldCheck,
  Award,
  AlertCircle,
} from 'lucide-react';

interface PlanTabProps {
  plans: DailyPlan[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onShowEvidence: (evidence: EvidenceSource, title: string) => void;
  onViewDocumentPage: (pageNumber: number) => void;
}

export const PlanTab: React.FC<PlanTabProps> = ({
  plans,
  selectedDay,
  onSelectDay,
  onShowEvidence,
  onViewDocumentPage,
}) => {
  const currentActivePlan =
    plans.find((p) => p.dayNumber === selectedDay) ||
    plans.find((p) => p.isToday) ||
    plans[0];
  const todayPlan = plans.find((p) => p.isToday) || plans[0];
  const activeDayNumber = todayPlan?.dayNumber ?? selectedDay ?? 1;
  const totalDays = plans.length || 14;
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'week1' | 'week2'>('all');

  const filteredPlans = plans.filter((p) => {
    if (timelineFilter === 'week1') return p.dayNumber <= 7;
    if (timelineFilter === 'week2') return p.dayNumber > 7;
    return true;
  });

  return (
    <div id="plan-tab-view" className="space-y-4 pb-20 pt-1 px-4 sm:px-5 animate-fade-in">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-teal-800 tracking-wide">
              {totalDays}-Day Post-Op Protocol
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Recovery Plan
            </h1>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full">
            Day {activeDayNumber} Active
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Evidence-linked clinical milestones generated from discharge instructions.
        </p>
      </div>

      {/* Week Filter Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => setTimelineFilter('all')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            timelineFilter === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All {totalDays} Days
        </button>
        <button
          onClick={() => setTimelineFilter('week1')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            timelineFilter === 'week1'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Week 1 (Days 1–7)
        </button>
        <button
          onClick={() => setTimelineFilter('week2')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            timelineFilter === 'week2'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Week 2 (Days 8–14)
        </button>
      </div>

      {/* Selected Day Detail Card */}
      <div
        id="selected-day-detail-card"
        className="bg-white rounded-3xl p-5 border border-teal-200/80 shadow-sm relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
                {currentActivePlan.isToday
                  ? '● Today'
                  : currentActivePlan.isPast
                  ? '✓ Completed'
                  : '○ Scheduled'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {currentActivePlan.dateLabel}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Day {currentActivePlan.dayNumber}: {currentActivePlan.milestoneTitle}
            </h2>
          </div>
        </div>

        {currentActivePlan.notes && (
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4 leading-relaxed">
            {currentActivePlan.notes}
          </p>
        )}

        {/* Day's Action Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="font-bold text-slate-700 flex items-center justify-between">
            <span>Key Focus Areas for Day {currentActivePlan?.dayNumber}</span>
            <span className="text-[11px] font-medium text-teal-700">
              {currentActivePlan?.medications?.length ?? 0} meds • {currentActivePlan?.activities?.length ?? 0} routines
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {(currentActivePlan?.medications ?? []).slice(0, 2).map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">{med.name}</span>
                  <span className="text-slate-400">({med.dose})</span>
                </div>
                <button
                  onClick={() => onShowEvidence(med.evidence, med.name)}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                >
                  Why this? →
                </button>
              </div>
            ))}

            {(currentActivePlan?.activities ?? []).slice(0, 2).map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">{act.title}</span>
                </div>
                <button
                  onClick={() => onShowEvidence(act.evidence, act.title)}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                >
                  Why this? →
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Source: Discharge Instructions (Pages 3, 4 & 5)
            </span>
            <button
              onClick={() => onViewDocumentPage(4)}
              className="text-teal-700 font-semibold hover:underline"
            >
              Inspect Source
            </button>
          </div>
        </div>
      </div>

      {/* Complete Vertical Timeline (The Samsung Health Style Recovery Journey) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Complete Recovery Progression
        </h3>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {filteredPlans.map((plan) => {
            const isSelected = plan.dayNumber === selectedDay;
            const isToday = plan.isToday;
            const isPast = plan.isPast;

            return (
              <div
                key={plan.dayNumber}
                id={`timeline-node-day-${plan.dayNumber}`}
                onClick={() => onSelectDay(plan.dayNumber)}
                className={`relative cursor-pointer group transition-all p-3 rounded-2xl ${
                  isSelected
                    ? 'bg-teal-50/70 border border-teal-200/90 shadow-xs'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                {/* Node Icon on Timeline Axis */}
                <div
                  className={`absolute -left-[27px] top-4 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isToday
                      ? 'bg-teal-600 ring-4 ring-teal-100 text-white'
                      : isPast
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white border-2 border-slate-300 group-hover:border-teal-500'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isToday ? (
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-teal-500" />
                  )}
                </div>

                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Day {plan.dayNumber}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Discharged
                      </span>
                    )}
                    {plan.dayNumber === 10 && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        Clinic Visit
                      </span>
                    )}
                    {plan.dayNumber === 14 && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        Full Clearance
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {plan.dateLabel}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-700 mt-1">
                  {plan.milestoneTitle}
                </div>

                {/* Tasks Snapshot for this day */}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Pill className="w-3 h-3 text-slate-400" />
                    {plan.medications?.length ?? 0} meds
                  </span>
                  <span className="flex items-center gap-1">
                    <Footprints className="w-3 h-3 text-slate-400" />
                    {plan.activities?.length ?? 0} activities
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Check-in
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
