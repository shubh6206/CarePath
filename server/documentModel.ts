export type DocumentStatus =
  | 'UPLOADING'
  | 'UPLOADED'
  | 'EXTRACTING'
  | 'STRUCTURING'
  | 'VALIDATING'
  | 'SAVED'
  | 'READY'
  | 'ERROR';

export interface DocumentRecord {
  id: string;
  filename: string;
  s3_key: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  error?: string;
  page_count?: number;
  is_demo?: boolean;
}

export interface TextractPage {
  page_number: number;
  text: string;
}

export interface TextractNormalizedOutput {
  document_id: string;
  pages: TextractPage[];
}

/** Check-in symptoms that can be matched against documented warning signs */
export type SymptomKey = 'breathing' | 'fever' | 'pain_worse';

export type CitationStatus = 'VERIFIED' | 'UNVERIFIED';

/** Evidence fields every extracted item carries back to its source page */
export interface SourceCitation {
  source_page: number;
  source_section?: string;
  original_extracted_text?: string;
  // Set by DocumentService.validateAndVerifyVerbatimQuotes, never by the model
  citation_status?: CitationStatus;
  confidence?: number;
  verification_note?: string;
}

export interface BedrockPatient {
  name: string | null;
  mrn?: string | null;
  age?: number | null;
  diagnosis?: string | null;
  procedure?: string | null;
  discharge_date?: string | null;
  attending_physician?: string | null;
  hospital_name?: string | null;
  caregiver?: string | null;
  emergency_contact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  } | null;
  hospital_helpline?: string | null;
}

export interface BedrockMedication extends SourceCitation {
  name: string;
  dose: string;
  frequency: string;
  timing: string;
  instructions: string;
  duration?: string;
}

export interface BedrockFollowUp extends SourceCitation {
  title: string;
  date: string;
  time: string;
  doctor: string;
  location: string;
  day_number: number | null;
  contact_number?: string;
  instructions?: string;
}

export interface BedrockInstruction extends SourceCitation {
  title: string;
  category: 'activity' | 'diet' | 'rest';
  timing?: string;
  duration?: string;
  instructions: string;
  day_range?: string;
}

export interface BedrockWarningSign extends SourceCitation {
  id?: string;
  condition: string;
  // Absent when the sign doesn't correspond to a check-in question (e.g. jaundice)
  trigger_key?: SymptomKey;
  severity: 'urgent' | 'high';
  documented_action: string;
}

export interface BedrockRecoveryOutput {
  patient: BedrockPatient;
  recovery_period_days: number | null;
  medications: BedrockMedication[];
  followups: BedrockFollowUp[];
  instructions: BedrockInstruction[];
  warning_signs: BedrockWarningSign[];
}

export interface RecoveryPlanRecord {
  document_id: string;
  patient: any;
  medications: any[];
  activities: any[];
  followUp: any;
  warningSigns: any[];
  extracted_pages: any[];
  status: string;
  created_at: string;
  updated_at: string;
}

