import { DocumentService } from './documentService';
import { StorageService } from './storage/storageService';
import { NotificationService } from './notification/notificationService';
import { SymptomKey } from './documentModel';
import { inferSymptomKey, isSymptomKey } from './ai/recoveryOutputSchema';

export interface CheckInSubmission {
  dayNumber: number;
  pain: 'better' | 'same' | 'worse';
  fever: 'no' | 'yes';
  breathing: 'normal' | 'difficult';
  notes?: string;
  documentId?: string;
}

export interface CheckInRecordResponse {
  id: string;
  timestamp: string;
  dayNumber: number;
  pain: 'better' | 'same' | 'worse';
  fever: 'no' | 'yes';
  breathing: 'normal' | 'difficult';
  notes?: string;
  warningMatched: boolean;
  matchedWarningSign?: any;
  // Reported symptoms the active plan has no documented warning sign for
  unmatchedSymptoms?: SymptomKey[];
  snsNotification?: {
    published: boolean;
    messageId?: string;
    topicArn?: string;
    detail: string;
    isRealSms: false;
  };
}

const inMemoryCheckIns = new Map<string, CheckInRecordResponse[]>();

// Evaluation order when several symptoms are reported at once
const SYMPTOM_PRIORITY: SymptomKey[] = ['breathing', 'fever', 'pain_worse'];

function reportedSymptoms(submission: CheckInSubmission): SymptomKey[] {
  const reported: Record<SymptomKey, boolean> = {
    breathing: submission.breathing === 'difficult',
    fever: submission.fever === 'yes',
    pain_worse: submission.pain === 'worse',
  };
  return SYMPTOM_PRIORITY.filter((symptom) => reported[symptom]);
}

function warningSymptom(warning: any): SymptomKey | undefined {
  return isSymptomKey(warning.triggerKey)
    ? warning.triggerKey
    : inferSymptomKey(`${warning.condition ?? ''} ${warning.evidence?.originalText ?? ''}`);
}

export class CheckInService {
  /**
   * Deterministic matching of reported symptoms against the active plan's documented warning signs.
   * Nothing is matched when the paperwork documents no warning sign for a symptom.
   */
  static evaluateWarningSigns(
    submission: CheckInSubmission,
    warningSigns: any[]
  ): { matchedWarning: any | null; unmatchedSymptoms: SymptomKey[] } {
    const matches: any[] = [];
    const unmatchedSymptoms: SymptomKey[] = [];

    for (const symptom of reportedSymptoms(submission)) {
      const documented = warningSigns.filter((w) => warningSymptom(w) === symptom);
      if (documented.length > 0) matches.push(...documented);
      else unmatchedSymptoms.push(symptom);
    }

    return {
      matchedWarning: matches.find((w) => w.severity === 'urgent') ?? matches[0] ?? null,
      unmatchedSymptoms,
    };
  }

  /**
   * Dispatch SNS Alert to Caregiver using NotificationService
   */
  static async sendSnsAlert(
    submission: CheckInSubmission,
    matchedWarning: any,
    patientName = 'Patient',
    caregiverPhone?: string
  ): Promise<{ published: boolean; messageId?: string; topicArn?: string; detail: string; isRealSms: false }> {
    const alertResult = await NotificationService.publishCaregiverAlert({
      patientName,
      caregiverPhone: caregiverPhone || 'caregiver contact not documented',
      dayNumber: submission.dayNumber,
      symptom: matchedWarning.condition,
      severity: matchedWarning.severity || 'high',
      documentedAction: matchedWarning.documentedAction,
      sourcePage: matchedWarning.sourcePage,
    });

    return {
      published: alertResult.published,
      messageId: alertResult.messageId,
      topicArn: alertResult.topicArn,
      detail: alertResult.detail,
      isRealSms: false,
    };
  }

  /**
   * Record Check-In, Match Warnings & Dispatch SNS
   */
  static async recordCheckIn(
    submission: CheckInSubmission
  ): Promise<CheckInRecordResponse> {
    const activePlan = DocumentService.getRecoveryPlan(
      submission.documentId || 'active'
    );
    const targetDocId = activePlan?.documentId || submission.documentId || 'active';
    const warningSigns = activePlan?.warningSigns || [];
    const { matchedWarning, unmatchedSymptoms } = this.evaluateWarningSigns(submission, warningSigns);

    const now = new Date();
    const formattedTime = `Today, ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    let snsResult;
    if (matchedWarning) {
      snsResult = await this.sendSnsAlert(
        submission,
        matchedWarning,
        activePlan?.patient?.name || 'Patient',
        activePlan?.patient?.emergencyContact?.phone
      );
    }

    const checkInRecord: CheckInRecordResponse = {
      id: `checkin-${Date.now()}`,
      timestamp: formattedTime,
      dayNumber: submission.dayNumber,
      pain: submission.pain,
      fever: submission.fever,
      breathing: submission.breathing,
      notes: submission.notes,
      warningMatched: Boolean(matchedWarning),
      matchedWarningSign: matchedWarning || undefined,
      unmatchedSymptoms: unmatchedSymptoms.length > 0 ? unmatchedSymptoms : undefined,
      snsNotification: snsResult,
    };

    if (!inMemoryCheckIns.has(targetDocId)) {
      inMemoryCheckIns.set(targetDocId, this.getHistory(targetDocId));
    }
    inMemoryCheckIns.get(targetDocId)!.unshift(checkInRecord);

    // Persist check-in using StorageService (LocalStack DynamoDB or local memory fallback)
    await StorageService.saveCheckIn(checkInRecord);

    return checkInRecord;
  }

  static getHistory(documentId?: string): CheckInRecordResponse[] {
    const activePlan = DocumentService.getRecoveryPlan(documentId);
    const targetDocId = activePlan?.documentId || documentId || 'active';
    const list = inMemoryCheckIns.get(targetDocId);
    if (list && list.length > 0) return list;

    const initialRecord: CheckInRecordResponse = {
      id: `checkin-init-${targetDocId}`,
      timestamp: 'Day 1 Post-Op, 8:30 PM',
      dayNumber: 1,
      pain: 'same',
      fever: 'no',
      breathing: 'normal',
      notes: 'Discharged from hospital, resting comfortably.',
      warningMatched: false,
    };
    inMemoryCheckIns.set(targetDocId, [initialRecord]);
    return inMemoryCheckIns.get(targetDocId)!;
  }
}
