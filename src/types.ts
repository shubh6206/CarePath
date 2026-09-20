export type TabType = 'home' | 'plan' | 'checkin' | 'more';

export type CitationStatus = 'VERIFIED' | 'UNVERIFIED';

export interface EvidenceSource {
  documentName?: string;
  sourcePage: number;
  sourceSection?: string;
  section?: string;
  originalText?: string;
  citationStatus?: CitationStatus;
  confidence?: number;
  verificationNote?: string;
}

export interface MedicationTask {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  instructions: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'as_needed';
  timeLabel?: string;
  timing?: string;
  completed: boolean;
  evidence: EvidenceSource;
  duration?: string;
}

export interface ActivityTask {
  id: string;
  title: string;
  category: 'activity' | 'diet' | 'rest';
  instructions: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'all_day';
  timeLabel?: string;
  timing?: string;
  completed: boolean;
  evidence: EvidenceSource;
  duration?: string;
}

export interface FollowUpAppointment {
  id?: string;
  title: string;
  date: string;
  time: string;
  doctor: string;
  location: string;
  dayNumber?: number | null;
  contactNumber?: string;
  instructions?: string;
  notes?: string;
  evidence?: EvidenceSource;
}

export interface WarningSign {
  id: string;
  condition: string;
  documentedAction: string;
  sourcePage: number;
  severity: 'urgent' | 'high';
  triggerKey?: 'breathing' | 'fever' | 'pain_worse';
  evidence?: EvidenceSource;
}

export interface PatientProfile {
  id?: string;
  name: string;
  mrn?: string;
  age?: number | string | null;
  diagnosis: string;
  procedure: string;
  dischargeDate: string;
  currentDay: number;
  totalDays: number;
  hospitalName: string;
  attendingPhysician: string;
  caregiverName?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  hospitalHelpline?: string;
  isDemo?: boolean;
}

export interface DailyPlan {
  dayNumber: number;
  dateLabel: string;
  isToday: boolean;
  isPast: boolean;
  milestoneTitle?: string;
  milestoneDescription?: string;
  medications?: MedicationTask[];
  activities?: ActivityTask[];
  notes?: string;
  tasks?: Array<{
    id: string;
    title: string;
    type: 'medication' | 'activity' | 'appointment';
    timeSlot: string;
    completed: boolean;
    evidence?: EvidenceSource;
  }>;
}

export type PainLevel = 'better' | 'same' | 'worse';
export type FeverStatus = 'no' | 'yes';
export type BreathingStatus = 'normal' | 'difficult';

export interface CheckInRecord {
  id: string;
  dayNumber: number;
  timestamp: string;
  pain: PainLevel;
  fever: FeverStatus;
  breathing: BreathingStatus;
  notes?: string;
  warningMatched?: boolean;
  matchedWarning?: WarningSign | null;
  matchedWarningSign?: WarningSign | null;
  unmatchedSymptoms?: boolean;
  alertDispatched?: boolean;
  documentId?: string;
  snsNotification?: {
    published: boolean;
    messageId?: string;
    topicArn?: string;
    detail: string;
  };
}

export interface DocumentPage {
  pageNumber: number;
  title: string;
  content: string;
  highlights: Array<{
    text: string;
    section?: string;
  }>;
}
