import {
  PatientProfile,
  MedicationTask,
  ActivityTask,
  FollowUpAppointment,
  WarningSign,
  DocumentPage,
  CheckInRecord,
} from '../types';

export interface AwsStatusResponse {
  isConfigured: boolean;
  demoMode: boolean;
  region: string;
  s3Bucket: string;
  dynamoTable: string;
  bedrockModel: string;
  snsTopicConfigured: boolean;
  services: {
    s3: boolean;
    textract: boolean;
    bedrock: boolean;
    dynamodb: boolean;
    sns: boolean;
  };
}

export interface DocumentStatusResponse {
  id: string;
  filename: string;
  status:
    | 'UPLOADING'
    | 'UPLOADED'
    | 'EXTRACTING'
    | 'STRUCTURING'
    | 'VALIDATING'
    | 'SAVED'
    | 'READY'
    | 'ERROR';
  updated_at: string;
  page_count?: number;
}

export interface RecoveryPlanResponse {
  documentId: string;
  patient: PatientProfile & { isDemo?: boolean };
  medications: MedicationTask[];
  activities: ActivityTask[];
  followUp: FollowUpAppointment | null;
  warningSigns: WarningSign[];
  pages: DocumentPage[];
  plans?: any[];
}

export interface CheckInSubmissionPayload {
  dayNumber: number;
  pain: 'better' | 'same' | 'worse';
  fever: 'no' | 'yes';
  breathing: 'normal' | 'difficult';
  notes?: string;
  documentId?: string;
}

/** Shown when a reported symptom has no documented warning sign in the active plan. */
export const UNMATCHED_SYMPTOM_NOTICE =
  "Check-in recorded. Your discharge paperwork doesn't list a warning sign for the symptom you reported, so no caregiver alert was sent. If you're concerned, contact your care team.";

export interface CheckInResponse {
  success: boolean;
  record: CheckInRecord & {
    snsNotification?: {
      published: boolean;
      messageId?: string;
      topicArn?: string;
      detail: string;
    };
  };
}

export const CarePathApi = {
  async getAwsStatus(): Promise<AwsStatusResponse> {
    const res = await fetch('/api/health/aws-status');
    if (!res.ok) throw new Error('Failed to fetch AWS status');
    return res.json();
  },

  async listDocuments(): Promise<DocumentStatusResponse[]> {
    const res = await fetch('/api/documents');
    if (!res.ok) return [];
    return res.json();
  },

  async activateDocument(documentId: string): Promise<any> {
    const res = await fetch(`/api/documents/${documentId}/activate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to activate document');
    return res.json();
  },

  async uploadDocument(
    filename: string,
    fileBase64?: string,
    isDemo = false
  ): Promise<{ success: boolean; document: DocumentStatusResponse; recoveryPlan: RecoveryPlanResponse }> {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileBase64, isDemo }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to upload document');
    }
    return res.json();
  },

  async getDocumentStatus(id: string): Promise<DocumentStatusResponse> {
    const res = await fetch(`/api/documents/${id}/status`);
    if (!res.ok) throw new Error('Failed to fetch document status');
    return res.json();
  },

  async getActiveRecoveryPlan(): Promise<RecoveryPlanResponse> {
    const res = await fetch('/api/recovery-plan/active');
    if (!res.ok) throw new Error('Failed to fetch active recovery plan');
    return res.json();
  },

  async getDocumentPages(id: string): Promise<{ document_id: string; pages: DocumentPage[] }> {
    const res = await fetch(`/api/documents/${id}/pages`);
    if (!res.ok) throw new Error('Failed to fetch document pages');
    return res.json();
  },

  async submitCheckIn(payload: CheckInSubmissionPayload): Promise<CheckInResponse> {
    const res = await fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Check-in failed' }));
      throw new Error(err.error || 'Failed to submit check-in');
    }
    return res.json();
  },

  async getCheckInHistory(documentId?: string): Promise<CheckInRecord[]> {
    const url = documentId
      ? `/api/check-in/history?documentId=${encodeURIComponent(documentId)}`
      : '/api/check-in/history';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch check-in history');
    return res.json();
  },

  async triggerSnsTest(
    symptom = 'Difficulty breathing',
    day = 2
  ): Promise<{ success: boolean; sns: any }> {
    const res = await fetch('/api/alerts/sns-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptom, day }),
    });
    if (!res.ok) throw new Error('Failed to trigger SNS test');
    return res.json();
  },

  async getAlertsHistory(): Promise<any[]> {
    const res = await fetch('/api/alerts/history');
    if (!res.ok) return [];
    return res.json();
  },

  async getHealth(): Promise<any> {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },
};
