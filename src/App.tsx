import React, { useState } from 'react';
import {
  TabType,
  EvidenceSource,
  WarningSign,
  CheckInRecord,
  MedicationTask,
  ActivityTask,
  FollowUpAppointment,
  PatientProfile,
  DailyPlan,
} from './types';
import { PhoneFrame } from './components/PhoneFrame';
import { BottomNavigation } from './components/BottomNavigation';
import { HomeTab } from './components/tabs/HomeTab';
import { PlanTab } from './components/tabs/PlanTab';
import { CheckInTab } from './components/tabs/CheckInTab';
import { MoreTab } from './components/tabs/MoreTab';
import { EvidenceModal } from './components/EvidenceModal';
import { SafetyAlertModal } from './components/SafetyAlertModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { AwsArchitectureModal } from './components/AwsArchitectureModal';
import { UploadModal } from './components/UploadModal';
import { DesktopView } from './components/DesktopView';
import { CarePathApi } from './services/api';

const initialPatient: PatientProfile = {
  name: 'Loading Recovery Plan...',
  diagnosis: 'Discharge Summary',
  procedure: 'Post-Op Care',
  dischargeDate: '',
  currentDay: 1,
  totalDays: 14,
  hospitalName: 'CarePath Clinical System',
  attendingPhysician: 'Care Team',
  isDemo: false,
};

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(1);

  // Application Data State
  const [patient, setPatient] = useState<PatientProfile>(initialPatient);
  const [medications, setMedications] = useState<MedicationTask[]>([]);
  const [activities, setActivities] = useState<ActivityTask[]>([]);
  const [warningSigns, setWarningSigns] = useState<WarningSign[]>([]);
  const [followUp, setFollowUp] = useState<FollowUpAppointment | null>(null);
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [documentPages, setDocumentPages] = useState<any[] | undefined>(undefined);
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>(undefined);
  const [documentTitle, setDocumentTitle] = useState<string | undefined>(undefined);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);

  // Load live data from backend API
  const refreshActivePlan = () => {
    CarePathApi.getActiveRecoveryPlan()
      .then((plan) => {
        if (!plan?.patient) return;
        // Replace every field (empty lists included) so a new plan never shows the previous patient's items
        setPatient(plan.patient);
        setActiveDocumentId(plan.documentId);
        setMedications(plan.medications ?? []);
        setActivities(plan.activities ?? []);
        setWarningSigns(plan.warningSigns ?? []);
        setFollowUp(plan.followUp ?? null);
        setDocumentPages(plan.pages?.length ? plan.pages : undefined);
        if (plan.plans?.length) {
          setPlans(plan.plans);
        }
        if (plan?.medications?.[0]?.evidence?.documentName) {
          setDocumentTitle(plan.medications[0].evidence.documentName);
        } else if (plan?.patient?.name) {
          setDocumentTitle(`${plan.patient.name}_Discharge_Summary.pdf`);
        }

        if (typeof plan.patient.currentDay === 'number') {
          setSelectedPlanDay(plan.patient.currentDay);
        }

        // Fetch check-in history scoped strictly to the active document/patient
        CarePathApi.getCheckInHistory(plan.documentId)
          .then((history) => {
            setCheckInHistory(history || []);
          })
          .catch(() => {
            setCheckInHistory([]);
          });
      })
      .catch((err) => {
        console.warn('Using baseline verified recovery data:', err);
      });
  };

  React.useEffect(() => {
    refreshActivePlan();
  }, []);

  // Modals & Overlays
  const [activeEvidence, setActiveEvidence] = useState<{
    evidence: EvidenceSource;
    title: string;
  } | null>(null);

  const [activeSafetyWarning, setActiveSafetyWarning] = useState<WarningSign | null>(null);
  const [docViewerState, setDocViewerState] = useState<{
    isOpen: boolean;
    page: number;
  }>({
    isOpen: false,
    page: 1,
  });

  const [isAwsArchOpen, setIsAwsArchOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Task Toggle Handlers
  const handleToggleMedication = (id: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const handleToggleActivity = (id: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  // Evidence Modal Triggers
  const handleShowEvidence = (evidence: EvidenceSource, title: string) => {
    setActiveEvidence({ evidence, title });
  };

  // Document Viewer Triggers
  const handleOpenDocumentViewer = (pageNumber: number = 1) => {
    setDocViewerState({ isOpen: true, page: pageNumber });
  };

  // Check-In Submission
  const handleCheckInSubmitted = (record: CheckInRecord, matchedWarning: WarningSign | null) => {
    setCheckInHistory((prev) => [record, ...prev]);
    if (matchedWarning) {
      setActiveSafetyWarning(matchedWarning);
    }
  };

  // Trigger Breathing Alert (Hackathon Judging Shortcut)
  const handleTriggerBreathingAlert = () => {
    const breathingWarning = warningSigns.find((w) => w.triggerKey === 'breathing') ?? warningSigns[0];
    if (breathingWarning) {
      setActiveSafetyWarning(breathingWarning);
    }
  };

  // Reset Demo / Active State
  const handleResetDemo = () => {
    refreshActivePlan();
    setCurrentTab('home');
    setActiveSafetyWarning(null);
    setActiveEvidence(null);
  };

  const currentPatientDay = patient.currentDay ?? 2;
  const remainingMedCount = medications.filter((m) => !m.completed).length;
  const remainingActCount = activities.filter((a) => !a.completed).length;
  const totalRemainingTasks = remainingMedCount + remainingActCount;
  const hasCompletedCheckInToday = checkInHistory.some((c) => c.dayNumber === currentPatientDay);

  return (
    <>
      {viewMode === 'desktop' ? (
        <DesktopView
          patient={patient}
          medications={medications}
          activities={activities}
          warningSigns={warningSigns}
          followUp={followUp}
          checkInHistory={checkInHistory}
          selectedPlanDay={selectedPlanDay}
          plans={plans}
          onSelectPlanDay={setSelectedPlanDay}
          onToggleMedication={handleToggleMedication}
          onToggleActivity={handleToggleActivity}
          onShowEvidence={handleShowEvidence}
          onOpenDocumentViewer={handleOpenDocumentViewer}
          onCheckInSubmitted={handleCheckInSubmitted}
          onOpenAwsArch={() => setIsAwsArchOpen(true)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onTriggerBreathingAlert={handleTriggerBreathingAlert}
          onResetDemo={handleResetDemo}
          onSwitchToMobile={() => setViewMode('mobile')}
          documentId={activeDocumentId}
          documentTitle={documentTitle}
        />
      ) : (
        <PhoneFrame
          onOpenAwsArch={() => setIsAwsArchOpen(true)}
          onOpenDocumentViewer={handleOpenDocumentViewer}
          onTriggerBreathingAlert={handleTriggerBreathingAlert}
          onResetDemo={handleResetDemo}
          onOpenUpload={() => setIsUploadOpen(true)}
          onSwitchToDesktop={() => setViewMode('desktop')}
          bottomNav={
            <BottomNavigation
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
              pendingCheckIn={!hasCompletedCheckInToday}
              remainingTasksCount={totalRemainingTasks}
            />
          }
        >
          {/* Dynamic Tab Body */}
          <div className="grow">
            {currentTab === 'home' && (
              <HomeTab
                patient={patient}
                medications={medications}
                activities={activities}
                followUp={followUp}
                warningSigns={warningSigns}
                onToggleMedication={handleToggleMedication}
                onToggleActivity={handleToggleActivity}
                onShowEvidence={handleShowEvidence}
                onNavigateToCheckIn={() => setCurrentTab('checkin')}
                onNavigateToPlan={() => setCurrentTab('plan')}
                onViewDocumentPage={handleOpenDocumentViewer}
                hasCompletedCheckInToday={hasCompletedCheckInToday}
              />
            )}

            {currentTab === 'plan' && (
              <PlanTab
                plans={plans}
                selectedDay={selectedPlanDay}
                onSelectDay={setSelectedPlanDay}
                onShowEvidence={handleShowEvidence}
                onViewDocumentPage={handleOpenDocumentViewer}
              />
            )}

            {currentTab === 'checkin' && (
              <CheckInTab
                onCheckInSubmitted={handleCheckInSubmitted}
                warningSigns={warningSigns}
                checkInHistory={checkInHistory}
                onViewDocumentPage={handleOpenDocumentViewer}
                documentId={activeDocumentId}
                patient={patient}
              />
            )}

            {currentTab === 'more' && (
              <MoreTab
                patient={patient}
                onOpenDocumentViewer={handleOpenDocumentViewer}
                onOpenAwsArch={() => setIsAwsArchOpen(true)}
                onOpenUpload={() => setIsUploadOpen(true)}
                onResetDemo={handleResetDemo}
              />
            )}
          </div>
        </PhoneFrame>
      )}

      {/* Signature CarePath Interaction: "Why this? →" Evidence Modal */}
      {activeEvidence && (
        <EvidenceModal
          evidence={activeEvidence.evidence}
          itemTitle={activeEvidence.title}
          onClose={() => setActiveEvidence(null)}
          onViewDocumentPage={(page) => {
            setActiveEvidence(null);
            handleOpenDocumentViewer(page);
          }}
        />
      )}

      {/* Non-Diagnostic Safety Warning Modal */}
      {activeSafetyWarning && (
        <SafetyAlertModal
          warningSign={activeSafetyWarning}
          onClose={() => setActiveSafetyWarning(null)}
          onViewDocumentPage={(page) => {
            setActiveSafetyWarning(null);
            handleOpenDocumentViewer(page);
          }}
          hospitalHelpline={patient.hospitalHelpline}
        />
      )}

      {/* 5-Page Discharge Document Viewer Modal */}
      {docViewerState.isOpen && (
        <DocumentViewerModal
          initialPage={docViewerState.page}
          pages={documentPages}
          documentTitle={documentTitle}
          hospitalName={patient.hospitalName}
          isDemo={patient.isDemo}
          onClose={() => setDocViewerState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* AWS Architecture & Pipeline Modal (for Hackathon Judges) */}
      {isAwsArchOpen && (
        <AwsArchitectureModal onClose={() => setIsAwsArchOpen(false)} />
      )}

      {/* Upload & Ingestion State Machine Modal */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onProcessingComplete={() => {
            refreshActivePlan();
            setCurrentTab('home');
          }}
        />
      )}
    </>
  );
}
