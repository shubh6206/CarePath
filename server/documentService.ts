import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  DetectDocumentTextCommand,
} from '@aws-sdk/client-textract';
import {
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  getS3,
  getTextract,
  getDynamoDB,
  isAwsCredentialsConfigured,
  isTextractEnabled,
} from './awsClient';
import {
  DocumentRecord,
  TextractNormalizedOutput,
  TextractPage,
  BedrockRecoveryOutput,
  BedrockMedication,
  BedrockInstruction,
  SourceCitation,
} from './documentModel';
import { LocalExtractionService } from './extraction/localExtractionService';
import { getClinicalAIService, LocalClinicalAIProvider } from './ai/clinicalAIService';
import { NOT_SPECIFIED } from './ai/recoveryOutputSchema';

// In-memory document & recovery store (for sub-second lookups, dev mode, and demo mode)
const inMemoryDocuments = new Map<string, DocumentRecord>();
const inMemoryPages = new Map<string, TextractNormalizedOutput>();
const inMemoryPlans = new Map<string, any>();
let activeDocumentId = 'doc-initial-demo';

// Curated timeline milestones for the demo packet only; uploaded documents get milestones they state
const DEMO_MILESTONES: Record<number, string> = {
  2: 'First 48-Hour Wound Rest & Gentle Ambulation',
  3: 'Transition to Regular Soft Diet',
  5: 'Antibiotic Regimen Completion Review',
  7: 'Wound Dressing Assessment & Mobility Check',
  14: 'Completion of Acute Post-Op Protocol',
};

const normalizeForCitation = (text: string) =>
  text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

export class DocumentService {
  /**
   * 1. Initialize Document Record and S3 Storage
   */
  static async createAndUpload(
    filename: string,
    fileBuffer?: Buffer,
    isDemo = false
  ): Promise<DocumentRecord> {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const s3Key = `discharges/${docId}/${filename}`;
    const now = new Date().toISOString();

    const record: DocumentRecord = {
      id: docId,
      filename,
      s3_key: s3Key,
      status: 'UPLOADING',
      created_at: now,
      updated_at: now,
      is_demo: isDemo,
      page_count: 5,
    };

    inMemoryDocuments.set(docId, record);

    // If real AWS S3 is configured and fileBuffer provided, upload to real S3
    if (isAwsCredentialsConfigured() && fileBuffer && process.env.S3_BUCKET_NAME) {
      try {
        const s3 = getS3();
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: 'application/pdf',
            Metadata: {
              documentId: docId,
              originalFilename: filename,
            },
          })
        );
      } catch (err) {
        console.warn('[AWS S3] Upload warning:', (err as Error).message);
      }
    }

    // Update status to UPLOADED
    record.status = 'UPLOADED';
    record.updated_at = new Date().toISOString();
    inMemoryDocuments.set(docId, record);

    return record;
  }

  /**
   * 2. Extract Document Text via Amazon Textract (Preserving page boundaries)
   */
  static async extractTextWithTextract(
    documentId: string,
    fileBuffer?: Buffer
  ): Promise<TextractNormalizedOutput> {
    const record = inMemoryDocuments.get(documentId);
    if (record) {
      record.status = 'EXTRACTING';
      record.updated_at = new Date().toISOString();
    }

    let pages: TextractPage[] = [];

    if (isTextractEnabled() && fileBuffer && !record?.is_demo) {
      try {
        const textract = getTextract();
        const response = await textract.send(
          new DetectDocumentTextCommand({
            Document: {
              Bytes: fileBuffer,
            },
          })
        );

        // Group blocks by page
        const pageMap = new Map<number, string[]>();
        if (response.Blocks) {
          for (const block of response.Blocks) {
            if (block.BlockType === 'LINE' && block.Text) {
              const p = block.Page || 1;
              if (!pageMap.has(p)) pageMap.set(p, []);
              pageMap.get(p)!.push(block.Text);
            }
          }
        }

        if (pageMap.size > 0) {
          pages = Array.from(pageMap.entries()).map(([pNum, lines]) => ({
            page_number: pNum,
            text: lines.join('\n'),
          }));
        }
      } catch (err) {
        console.warn('[AWS Textract] Cloud Textract unavailable, using local parser:', (err as Error).message);
      }
    }

    // If pages not extracted via AWS, use LocalExtractionService for dynamic multi-page PDF extraction
    if (pages.length === 0) {
      const localResult = await LocalExtractionService.extract(
        documentId,
        record?.filename || 'discharge-instructions.pdf',
        fileBuffer
      );
      pages = localResult.pages.map((p) => ({
        page_number: p.pageNumber,
        text: p.text,
      }));
    }

    if (record) {
      record.page_count = pages.length;
    }

    const output: TextractNormalizedOutput = {
      document_id: documentId,
      pages,
    };

    inMemoryPages.set(documentId, output);
    return output;
  }

  /**
   * 3. Structure with the configured clinical AI provider (Amazon Bedrock when BEDROCK_MODE=aws).
   * The verified demo fixture is used only for documents explicitly flagged isDemo.
   */
  static async structureWithBedrock(
    documentId: string,
    textractOutput: TextractNormalizedOutput
  ): Promise<BedrockRecoveryOutput> {
    const record = inMemoryDocuments.get(documentId);
    if (record) {
      record.status = 'STRUCTURING';
      record.updated_at = new Date().toISOString();
    }

    if (record?.is_demo) {
      console.log('[DocumentService] Demo packet requested, using verified demo fixture');
      return LocalClinicalAIProvider.getVerifiedDemoOutput();
    }

    return getClinicalAIService().structureDischargeDocument(textractOutput);
  }

  /**
   * 4. Strict Safety Check & Textract Verbatim Verification
   * A citation is VERIFIED only when its quote appears on the cited page (ignoring case and
   * whitespace). Anything else is flagged UNVERIFIED with the quote left exactly as returned.
   */
  static validateAndVerifyVerbatimQuotes(
    bedrockOutput: BedrockRecoveryOutput,
    textractOutput: TextractNormalizedOutput
  ): BedrockRecoveryOutput {
    const normalizedPages = new Map(
      textractOutput.pages.map((p) => [p.page_number, normalizeForCitation(p.text)])
    );

    const citedItems: SourceCitation[] = [
      ...bedrockOutput.medications,
      ...bedrockOutput.followups,
      ...bedrockOutput.instructions,
      ...bedrockOutput.warning_signs,
    ];

    for (const item of citedItems) {
      const quote = normalizeForCitation(item.original_extracted_text ?? '');
      if (quote && normalizedPages.get(item.source_page)?.includes(quote)) {
        item.citation_status = 'VERIFIED';
        item.confidence = 1.0;
        item.verification_note = undefined;
      } else {
        item.citation_status = 'UNVERIFIED';
        item.confidence = 0.0;
        item.verification_note = `Exact wording could not be confirmed on Page ${item.source_page}.`;
      }
    }

    const unverified = citedItems.filter((item) => item.citation_status === 'UNVERIFIED').length;
    console.log(
      `[DocumentService] Citation check: ${citedItems.length - unverified} verified, ${unverified} unverified`
    );

    return bedrockOutput;
  }

  /**
   * 5. Save to Amazon DynamoDB and complete pipeline
   */
  static async persistRecoveryPlan(
    documentId: string,
    validatedPlan: BedrockRecoveryOutput,
    textractOutput: TextractNormalizedOutput
  ): Promise<any> {
    const record = inMemoryDocuments.get(documentId);
    if (record) {
      record.status = 'SAVED';
      record.updated_at = new Date().toISOString();
    }

    const isDemo = record?.is_demo ?? false;
    const documentName = record?.filename || 'Hospital Discharge Summary & Post-Op Plan';
    const { patient } = validatedPlan;
    const followUp = validatedPlan.followups[0];
    const totalDays = validatedPlan.recovery_period_days || 14;

    const toEvidence = (item: SourceCitation, defaultSection: string) => ({
      documentId,
      documentName,
      sourcePage: item.source_page,
      section: item.source_section || defaultSection,
      originalText: item.original_extracted_text ?? '',
      citationStatus: item.citation_status ?? 'UNVERIFIED',
      confidence: item.confidence ?? 0,
      verificationNote: item.verification_note,
    });

    const toMedicationTask = (m: BedrockMedication, idx: number, id: string, completed: boolean) => ({
      id,
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      timing: m.timing || NOT_SPECIFIED,
      instructions: m.instructions,
      completed,
      pillColor: idx === 0 || idx === 2 ? '#3B82F6' : idx === 1 ? '#F97316' : '#10B981',
      pillShape: (idx === 0 || idx === 2 ? 'capsule' : idx === 1 ? 'oval' : 'round') as any,
      evidence: toEvidence(m, 'Discharge Medications'),
    });

    const toActivityTask = (inst: BedrockInstruction, id: string, completed: boolean) => ({
      id,
      title: inst.title,
      timing: inst.timing || NOT_SPECIFIED,
      duration: inst.duration,
      instructions: inst.instructions,
      completed,
      category: inst.category,
      evidence: toEvidence(inst, 'Recovery Guidelines'),
    });

    const milestoneFor = (dayNumber: number): string | undefined => {
      if (dayNumber === 1) return 'Hospital Discharge & Home Transition';
      if (followUp && followUp.day_number === dayNumber) return followUp.title;
      return isDemo ? DEMO_MILESTONES[dayNumber] : undefined;
    };

    // Calculate dynamic recovery day from discharge date if available
    let dynamicCurrentDay = isDemo ? 2 : 1;
    if (patient.discharge_date && patient.discharge_date !== NOT_SPECIFIED) {
      const parsedDischarge = Date.parse(patient.discharge_date);
      if (!isNaN(parsedDischarge)) {
        const dischargeMidnight = new Date(parsedDischarge);
        dischargeMidnight.setHours(0, 0, 0, 0);
        const nowMidnight = new Date();
        nowMidnight.setHours(0, 0, 0, 0);
        const diffMs = nowMidnight.getTime() - dischargeMidnight.getTime();
        const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        // Day of discharge is Day 1
        const calculatedDay = elapsedDays + 1;
        if (calculatedDay >= 1 && calculatedDay <= totalDays) {
          dynamicCurrentDay = calculatedDay;
        } else if (calculatedDay < 1) {
          dynamicCurrentDay = 1;
        } else {
          dynamicCurrentDay = Math.min(totalDays, calculatedDay);
        }
      }
    }

    // Transform into frontend-ready shape
    const fullRecoveryPayload = {
      documentId,
      patient: {
        id: 'pt-' + documentId,
        name: patient.name || 'Patient Record',
        mrn: patient.mrn || undefined,
        age: patient.age ?? null,
        diagnosis: patient.diagnosis || NOT_SPECIFIED,
        procedure: patient.procedure || NOT_SPECIFIED,
        dischargeDate: patient.discharge_date || NOT_SPECIFIED,
        currentDay: dynamicCurrentDay,
        totalDays,
        hospitalName: patient.hospital_name || NOT_SPECIFIED,
        attendingPhysician: patient.attending_physician || NOT_SPECIFIED,
        caregiverName: patient.caregiver || patient.emergency_contact?.name || NOT_SPECIFIED,
        // Contact numbers only ever come from the document; empty means "not documented"
        emergencyContact: {
          name: patient.emergency_contact?.name || NOT_SPECIFIED,
          relationship: patient.emergency_contact?.relationship || '',
          phone: patient.emergency_contact?.phone || '',
        },
        hospitalHelpline: patient.hospital_helpline || '',
        isDemo,
      },
      // Demo packet starts with the Day 2 morning dose/activity marked done
      medications: validatedPlan.medications.map((m, idx) =>
        toMedicationTask(m, idx, `med-dyn-${idx + 1}`, isDemo && idx === 0)
      ),
      activities: validatedPlan.instructions.map((inst, idx) =>
        toActivityTask(inst, `act-dyn-${idx + 1}`, isDemo && idx === 0)
      ),
      followUp: followUp
        ? {
            id: 'fu-dyn-01',
            title: followUp.title,
            date: followUp.date,
            time: followUp.time,
            doctor: followUp.doctor,
            location: followUp.location,
            contactNumber: followUp.contact_number || patient.hospital_helpline || '',
            notes: followUp.instructions || '',
            dayNumber: followUp.day_number,
            evidence: toEvidence(followUp, 'Outpatient Clinical Follow-up'),
          }
        : null,
      warningSigns: validatedPlan.warning_signs.map((ws, idx) => ({
        id: `warn-dyn-${idx + 1}`,
        condition: ws.condition,
        triggerKey: ws.trigger_key,
        severity: ws.severity,
        documentedAction: ws.documented_action,
        sourcePage: ws.source_page,
        evidence: toEvidence(ws, 'Emergency Red Flags & Escalation'),
      })),
      pages: textractOutput.pages.map((p) => {
        let title = `Discharge Summary — Page ${p.page_number}`;
        const lines = p.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
        for (const line of lines.slice(0, 4)) {
          if (/^(?:SECTION\s+\d+|DEPARTMENT|PATIENT\s+DISCHARGE|PRIMARY\s+CLINICAL|HOSPITAL\s+COURSE|DISCHARGE\s+MEDICATIONS|DIETARY|PHYSICAL\s+ACTIVITY|OUTPATIENT|EMERGENCY\s+RED\s+FLAGS)/i.test(line)) {
            title = line.slice(0, 60);
            break;
          }
        }
        return {
          pageNumber: p.page_number,
          title,
          content: p.text,
          highlights: [],
        };
      }),
      plans: Array.from({ length: totalDays }, (_, i) => {
        const dayNumber = i + 1;
        const isToday = dayNumber === dynamicCurrentDay;
        const isPast = dayNumber < dynamicCurrentDay;

        return {
          dayNumber,
          dateLabel: isToday ? 'Today' : isPast ? (dayNumber === dynamicCurrentDay - 1 ? 'Yesterday' : `Day ${dayNumber}`) : `Day ${dayNumber}`,
          isToday,
          isPast,
          milestoneTitle: milestoneFor(dayNumber),
          medications: validatedPlan.medications.map((m, idx) =>
            toMedicationTask(m, idx, `med-day${dayNumber}-${idx + 1}`, isPast || (isDemo && isToday && idx === 0))
          ),
          activities: validatedPlan.instructions.map((inst, idx) =>
            toActivityTask(inst, `act-day${dayNumber}-${idx + 1}`, isPast)
          ),
          notes:
            isDemo && isToday
              ? 'Focus on resting, taking medications with meals, and light ambulation.'
              : undefined,
        };
      }),
    };

    inMemoryPlans.set(documentId, fullRecoveryPayload);
    inMemoryPlans.set('active', fullRecoveryPayload);
    activeDocumentId = documentId;

    // Save to real DynamoDB table if configured
    if (isAwsCredentialsConfigured() && process.env.DYNAMODB_TABLE_NAME) {
      try {
        const dynamo = getDynamoDB();
        await dynamo.send(
          new PutCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: {
              PK: `DOC#${documentId}`,
              SK: 'METADATA',
              documentId,
              filename: record?.filename,
              status: 'READY',
              patientName: fullRecoveryPayload.patient.name,
              createdAt: record?.created_at,
              updatedAt: new Date().toISOString(),
              payload: fullRecoveryPayload,
            },
          })
        );
      } catch (err) {
        console.warn('[AWS DynamoDB] PutCommand warning:', (err as Error).message);
      }
    }

    if (record) {
      record.status = 'READY';
      record.updated_at = new Date().toISOString();
    }

    return fullRecoveryPayload;
  }

  /**
   * Execute full end-to-end pipeline:
   * S3 -> Textract -> Bedrock -> Validate -> DynamoDB
   */
  static async runEndToEndPipeline(
    filename: string,
    fileBuffer?: Buffer,
    isDemo = false
  ): Promise<any> {
    // 1. Ingestion & S3 Upload
    const record = await this.createAndUpload(filename, fileBuffer, isDemo);

    try {
      // 2. Textract extraction
      const textractOutput = await this.extractTextWithTextract(record.id, fileBuffer);

      // 3. Bedrock structuring
      const bedrockOutput = await this.structureWithBedrock(record.id, textractOutput);

      // 4. JSON Validation & Textract Verbatim Quotation Verification
      record.status = 'VALIDATING';
      record.updated_at = new Date().toISOString();
      const verifiedOutput = this.validateAndVerifyVerbatimQuotes(bedrockOutput, textractOutput);

      // 5. DynamoDB Persistence
      const savedPlan = await this.persistRecoveryPlan(record.id, verifiedOutput, textractOutput);

      return {
        document: record,
        recoveryPlan: savedPlan,
      };
    } catch (err) {
      record.status = 'ERROR';
      record.error = (err as Error).message;
      record.updated_at = new Date().toISOString();
      throw err;
    }
  }

  static getDocumentRecord(documentId: string): DocumentRecord | undefined {
    return inMemoryDocuments.get(documentId);
  }

  static getRecoveryPlan(documentId?: string): any {
    if (documentId && inMemoryPlans.has(documentId)) {
      return inMemoryPlans.get(documentId);
    }
    return inMemoryPlans.get('active') || inMemoryPlans.get(activeDocumentId) || inMemoryPlans.values().next().value;
  }

  static setActiveDocument(documentId: string): boolean {
    if (inMemoryPlans.has(documentId)) {
      inMemoryPlans.set('active', inMemoryPlans.get(documentId));
      activeDocumentId = documentId;
      return true;
    }
    return false;
  }

  static listDocuments(): DocumentRecord[] {
    return Array.from(inMemoryDocuments.values());
  }

  static getDocumentPages(documentId: string): TextractNormalizedOutput | undefined {
    return inMemoryPages.get(documentId);
  }
}
