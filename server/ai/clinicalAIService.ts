import {
  TextractNormalizedOutput,
  BedrockRecoveryOutput,
} from '../documentModel';
import { getBedrock, getBedrockModelIds, isAwsCredentialsConfigured, isBedrockMode } from '../awsClient';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { GoogleGenAI } from '@google/genai';
import { parseRecoveryOutput } from './recoveryOutputSchema';
import { extractDeterministicPlan } from './deterministicExtractor';

export const ZERO_DIAGNOSIS_SYSTEM_PROMPT = `
You are CarePath's Zero-Diagnosis Clinical Structuring Engine.
Your task is to convert raw hospital discharge documents into an actionable, evidence-grounded recovery timeline.

ABSOLUTE CLINICAL SAFETY RULES:
1. NO DIAGNOSIS: You are an administrative assistant, not a doctor. Never diagnose conditions or infer unstated diseases.
2. NO INVENTED ADVICE: Extract ONLY instructions explicitly documented in the text.
3. MANDATORY EVIDENCE LINKAGE: Every medication, recovery task, dietary guideline, follow-up appointment, and warning sign MUST include "original_extracted_text" copied character-for-character from the page named in "source_page". Do not paraphrase, merge text from different places, or fix typos: every quote is automatically checked against that page.
4. PRECISE DOSING: Only output dosage, frequency, and timing if explicitly printed in the discharge text; otherwise use null.
5. EXPLICIT WARNING SIGNS: Documented emergency actions must use the exact hospital telephone numbers or emergency directions printed on the document.
`;

export const RECOVERY_PLAN_JSON_SCHEMA = `{
  "patient": {
    "name": "Full patient name",
    "mrn": "Hospital MRN or record number",
    "age": 45,
    "diagnosis": "Primary diagnosis from document",
    "procedure": "Operative procedure performed",
    "discharge_date": "Discharge date",
    "attending_physician": "Attending doctor/surgeon name",
    "hospital_name": "Hospital or clinic system name",
    "caregiver": "Caregiver name if documented",
    "emergency_contact": { "name": "Name", "relationship": "Relationship", "phone": "Phone" },
    "hospital_helpline": "Hospital phone number printed in the document"
  },
  "recovery_period_days": 14,
  "medications": [
    {
      "name": "Medication name",
      "dose": "e.g. 500 mg",
      "timing": "e.g. 8:00 AM",
      "frequency": "e.g. Twice daily",
      "instructions": "Directions for use",
      "duration": "Duration if stated",
      "source_page": 3,
      "source_section": "Section name",
      "original_extracted_text": "EXACT verbatim quote from source_page"
    }
  ],
  "instructions": [
    {
      "title": "Short title",
      "category": "activity | diet | rest",
      "timing": "Morning / 10:00 AM / etc.",
      "duration": "e.g. 15 mins",
      "instructions": "Documented guideline",
      "source_page": 4,
      "source_section": "Section name",
      "original_extracted_text": "EXACT verbatim quote from source_page"
    }
  ],
  "followups": [
    {
      "title": "Follow-up visit title",
      "date": "Appointment date",
      "time": "Appointment time",
      "doctor": "Doctor name",
      "location": "Clinic location",
      "day_number": 7,
      "contact_number": "Phone printed for this appointment",
      "instructions": "Specific instructions",
      "source_page": 4,
      "source_section": "Section name",
      "original_extracted_text": "EXACT verbatim quote from source_page"
    }
  ],
  "warning_signs": [
    {
      "condition": "Red flag symptom description",
      "trigger_key": "breathing | fever | pain_worse, or null when the sign is about something else",
      "severity": "urgent | high",
      "documented_action": "Exact emergency action / phone number to call",
      "source_page": 5,
      "source_section": "Section name",
      "original_extracted_text": "EXACT verbatim quote from source_page"
    }
  ]
}`;

function buildExtractionPrompt(normalizedExtraction: TextractNormalizedOutput): string {
  const pagesText = normalizedExtraction.pages
    .map((p) => `=== [PAGE ${p.page_number}] ===\n${p.text}`)
    .join('\n\n');

  return `Extract the structured recovery plan from this hospital discharge document.
Return a single JSON object matching this schema, with no markdown or commentary. Use null for anything the document does not state.

${RECOVERY_PLAN_JSON_SCHEMA}

DOCUMENT CONTENT:
${pagesText}`;
}

export interface ClinicalAIService {
  structureDischargeDocument(
    normalizedExtraction: TextractNormalizedOutput
  ): Promise<BedrockRecoveryOutput>;
  getProviderName(): string;
}

/**
 * Local clinical AI provider for local development: Gemini when GEMINI_API_KEY is set,
 * otherwise the deterministic parser. The demo fixture is selected by DocumentService, not here.
 */
export class LocalClinicalAIProvider implements ClinicalAIService {
  getProviderName(): string {
    return 'LocalClinicalAIProvider (Gemini fallback & deterministic clinical parser)';
  }

  async structureDischargeDocument(
    normalizedExtraction: TextractNormalizedOutput
  ): Promise<BedrockRecoveryOutput> {
    console.log('[LocalClinicalAIProvider] Processing discharge document with zero-diagnosis safety pipeline...');

    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('[LocalClinicalAIProvider] Running Gemini 2.5 Flash zero-diagnosis extraction...');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${ZERO_DIAGNOSIS_SYSTEM_PROMPT}\n${buildExtractionPrompt(normalizedExtraction)}`,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const parsed = parseRecoveryOutput(response.text ?? '');
        console.log(
          `[LocalClinicalAIProvider] Gemini extracted plan for ${parsed.patient.name} (${parsed.medications.length} meds, ${parsed.warning_signs.length} warnings)`
        );
        return parsed;
      } catch (geminiErr) {
        console.warn(
          '[LocalClinicalAIProvider] Gemini structuring error, engaging deterministic clinical parser:',
          (geminiErr as Error).message
        );
      }
    }

    console.log('[LocalClinicalAIProvider] Running deterministic clinical parser...');
    return extractDeterministicPlan(normalizedExtraction);
  }

  /**
   * Verified baseline structured output for the official hackathon demo packet (Mrs. Anita Sharma).
   * Only used when a document is explicitly flagged isDemo. Quotes are verbatim from DEMO_SURGICAL_PAGES.
   */
  static getVerifiedDemoOutput(): BedrockRecoveryOutput {
    return {
      patient: {
        name: 'Mrs. Anita Sharma',
        mrn: '#AMH-9921408',
        age: 58,
        procedure: 'Elective Laparoscopic Cholecystectomy',
        discharge_date: 'September 17, 2026',
        attending_physician: 'Dr. Arvind Rao, MS, FACS',
        hospital_name: 'Apex Memorial Healthcare',
        diagnosis: 'Symptomatic Cholelithiasis with recurrent biliary colic',
        caregiver: 'Pooja Sharma (Daughter, +1 800 555-0199)',
        emergency_contact: {
          name: 'Rajesh Sharma',
          relationship: 'Husband',
          phone: '+1 (800) 555-0199',
        },
        hospital_helpline: '+1 (800) 555-0144 (Ext 4)',
      },
      recovery_period_days: 14,
      medications: [
        {
          name: 'Cefuroxime Axetil',
          dose: '500 mg',
          timing: '8:00 AM',
          frequency: 'Twice daily (every 12 hours)',
          instructions: 'Take with a full meal and a glass of water. Complete entire 5-day course.',
          duration: '5 days',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text:
            '1. Tab. Cefuroxime Axetil 500 mg\n- Dose: 500 mg oral tablet\n- Frequency: Twice daily (every 12 hours: 8:00 AM and 8:00 PM)\n- Duration: Complete for exactly 5 days post-discharge\n- Instructions: Administer after meals with water. Do not skip doses.',
        },
        {
          name: 'Paracetamol (Acetaminophen)',
          dose: '650 mg',
          timing: '1:30 PM',
          frequency: 'Three times daily after meals as needed',
          instructions: 'Take as needed for pain. Do not exceed 3,000 mg in any 24-hour period.',
          duration: 'As needed',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text:
            '2. Tab. Paracetamol (Acetaminophen) 650 mg\n- Dose: 650 mg oral tablet\n- Frequency: Three times daily after meals as needed for mild-to-moderate incision pain\n- Timing: 8:00 AM, 1:30 PM, 8:00 PM (or every 6-8 hours)\n- Precaution: Do not exceed 3,000 mg in any 24-hour period.',
        },
        {
          name: 'Pantoprazole',
          dose: '40 mg',
          timing: '9:30 PM',
          frequency: 'Once daily before bedtime',
          instructions: 'Take 30 minutes before bedtime with water for 14 days.',
          duration: '14 days',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text:
            '3. Tab. Pantoprazole 40 mg\n- Dose: 40 mg oral tablet\n- Frequency: Once daily at night 30 minutes before sleep\n- Duration: 14 days for gastroprotection.',
        },
      ],
      instructions: [
        {
          title: 'Gentle Corridor Ambulation',
          category: 'activity',
          timing: '10:00 AM',
          duration: '5 to 10 minutes',
          instructions: 'Short walks of 5 to 10 minutes, 2 to 3 times daily starting Day 2. Avoid stairs unassisted.',
          source_page: 4,
          source_section: 'Section 5: Physical Activity & Recovery Guidelines',
          original_extracted_text: '- Ambulation: Short walks of 5 to 10 minutes, 2 to 3 times daily starting Day 2.',
        },
        {
          title: 'Maintain Hydration & Low-Fat Diet',
          category: 'diet',
          timing: 'Throughout the day',
          instructions: 'Maintain a low-fat, easily digestible diet. Drink 1.5 to 2.0 liters of fluids/water daily.',
          source_page: 4,
          source_section: 'Section 4: Dietary Instructions',
          original_extracted_text: '- Maintain a low-fat, easily digestible diet for the first 10 days.',
        },
        {
          title: 'Incision Dressing Inspection',
          category: 'rest',
          timing: 'Morning',
          instructions: 'Keep umbilical and abdominal dressings dry for first 48 hours. Sponge bathing recommended.',
          source_page: 4,
          source_section: 'Section 5: Physical Activity & Recovery Guidelines',
          original_extracted_text: '- Bathing: Keep umbilical and abdominal dressings dry for first 48 hours. Sponge bathing recommended.',
        },
      ],
      followups: [
        {
          title: 'Post-Op Surgical Review & Wound Check',
          doctor: 'Dr. Arvind Rao, MS, FACS',
          location: 'Surgical OPD Clinic, Suite 402, Apex Memorial Healthcare',
          date: 'September 26, 2026',
          time: '10:30 AM',
          day_number: 10,
          contact_number: '+1 (800) 555-0144',
          instructions: 'Bring surgical discharge summary and list of current medications.',
          source_page: 4,
          source_section: 'Section 6: Outpatient Clinical Follow-up',
          original_extracted_text:
            '- Scheduled Review: Day 10 post-discharge (September 26, 2026 at 10:30 AM).\n- Location: Surgical OPD Clinic, Suite 402, Apex Memorial Healthcare.',
        },
      ],
      warning_signs: [
        {
          condition: 'Difficulty breathing or shortness of breath',
          trigger_key: 'breathing',
          severity: 'urgent',
          documented_action:
            'Call the hospital emergency line immediately (+1 800 555-0199) or proceed to the nearest Emergency Room. Do not wait.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text:
            '- Signs: Shortness of breath, rapid shallow breathing, chest tightness, or pain upon deep inhalation.',
        },
        {
          condition: 'Persistent high fever (>101°F / 38.3°C)',
          trigger_key: 'fever',
          severity: 'high',
          documented_action:
            'Contact the surgical post-op duty team within 2 hours at +1 (800) 555-0144.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text:
            '- Documented Action: Contact the surgical post-op duty team within 2 hours at +1 (800) 555-0144.',
        },
        {
          condition: 'Severe or worsening abdominal pain',
          trigger_key: 'pain_worse',
          severity: 'high',
          documented_action:
            'Call the 24/7 post-op nurse coordinator immediately.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text:
            '- Signs: Abdominal pain that progressively worsens despite prescribed pain medication, or abdominal wall becomes rigid and tender.',
        },
      ],
    };
  }
}

function buildBedrockRequestBody(modelId: string, userPrompt: string) {
  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8192,
    // Claude 3.x takes temperature 0 for repeatable extraction; newer Claude models reject sampling parameters
    ...(/claude-3/.test(modelId) ? { temperature: 0 } : {}),
    system: ZERO_DIAGNOSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  };
}

/**
 * Bedrock Clinical AI Provider for live AWS deployments (AWS SDK v3 InvokeModelCommand).
 * Falls back to the deterministic local parser when credentials are missing or the call fails.
 */
export class BedrockClinicalAIProvider implements ClinicalAIService {
  getProviderName(): string {
    return `BedrockClinicalAIProvider (Amazon Bedrock ${getBedrockModelIds()[0]})`;
  }

  async structureDischargeDocument(
    normalizedExtraction: TextractNormalizedOutput
  ): Promise<BedrockRecoveryOutput> {
    if (!isAwsCredentialsConfigured()) {
      console.warn('[BedrockClinicalAIProvider] AWS credentials not configured, using deterministic local parser');
      return extractDeterministicPlan(normalizedExtraction);
    }

    try {
      return await this.invokeBedrock(normalizedExtraction);
    } catch (err) {
      console.warn(
        '[BedrockClinicalAIProvider] Bedrock structuring failed, using deterministic local parser:',
        (err as Error).message
      );
      return extractDeterministicPlan(normalizedExtraction);
    }
  }

  private async invokeBedrock(normalizedExtraction: TextractNormalizedOutput): Promise<BedrockRecoveryOutput> {
    const userPrompt = buildExtractionPrompt(normalizedExtraction);
    let lastError: unknown;

    for (const modelId of getBedrockModelIds()) {
      let responseBody: { content?: Array<{ type: string; text?: string }>; stop_reason?: string };
      try {
        console.log(`[BedrockClinicalAIProvider] Invoking Amazon Bedrock model: ${modelId}`);
        const response = await getBedrock().send(
          new InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: Buffer.from(JSON.stringify(buildBedrockRequestBody(modelId, userPrompt))),
          })
        );
        responseBody = JSON.parse(new TextDecoder().decode(response.body));
      } catch (err) {
        // Invocation errors (no model access, on-demand not supported, ...) move on to the next model ID
        lastError = err;
        console.warn(`[BedrockClinicalAIProvider] ${modelId} invocation failed: ${(err as Error).message}`);
        continue;
      }

      if (responseBody.stop_reason === 'max_tokens') {
        throw new Error(`Bedrock output from ${modelId} was truncated at max_tokens`);
      }
      const text = (responseBody.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('');
      return parseRecoveryOutput(text);
    }

    throw lastError ?? new Error('No Bedrock model ID configured');
  }
}

/**
 * Factory to retrieve the active ClinicalAIService based on environment configuration.
 */
export function getClinicalAIService(): ClinicalAIService {
  return isBedrockMode() ? new BedrockClinicalAIProvider() : new LocalClinicalAIProvider();
}

export type ClinicalAIStatus = 'bedrock_claude_active' | 'local_gemini_fallback' | 'deterministic_nlp_fixture';

/** Reports what getClinicalAIService() will actually run, for the health endpoints. */
export function getClinicalAIStatus(): ClinicalAIStatus {
  if (isBedrockMode()) {
    return isAwsCredentialsConfigured() ? 'bedrock_claude_active' : 'deterministic_nlp_fixture';
  }
  return process.env.GEMINI_API_KEY ? 'local_gemini_fallback' : 'deterministic_nlp_fixture';
}
