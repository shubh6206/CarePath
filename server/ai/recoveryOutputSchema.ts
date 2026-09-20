import {
  BedrockRecoveryOutput,
  BedrockInstruction,
  SourceCitation,
  SymptomKey,
} from '../documentModel';

export const NOT_SPECIFIED = 'Not specified';
export const NO_DOCUMENTED_ACTION =
  'No specific action is documented for this warning sign in the discharge paperwork.';

const SYMPTOM_KEYS: readonly SymptomKey[] = ['breathing', 'fever', 'pain_worse'];

const SYMPTOM_PATTERNS: Array<[SymptomKey, RegExp]> = [
  ['breathing', /short(?:ness)?\s+of\s+breath|difficult(?:y)?\s+breathing|trouble\s+breathing|breathless|dyspn(?:o)?ea|chest\s+(?:pain|tightness)/i],
  ['fever', /fever|temperature\s+(?:above|over|greater|higher|of\s+more)|chills|rigors/i],
  [
    'pain_worse',
    /(?:severe|worsen\w*|escalat\w*|increas\w*|uncontrolled)\s+(?:\w+\s+){0,2}pain|pain\s+(?:\w+\s+){0,3}(?:worsens?|escalates?|increases?|not\s+(?:relieved|controlled))/i,
  ],
];

export class RecoveryOutputValidationError extends Error {}

export function isSymptomKey(value: unknown): value is SymptomKey {
  return typeof value === 'string' && (SYMPTOM_KEYS as readonly string[]).includes(value);
}

/** Maps free-text warning sign wording to the check-in symptom it describes, if any. */
export function inferSymptomKey(text: string): SymptomKey | undefined {
  return SYMPTOM_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}

/**
 * Pulls the JSON object out of raw model text, tolerating ```json fences and surrounding prose.
 */
export function extractJsonObject(rawText: string): unknown {
  const text = rawText.replace(/```(?:json)?/gi, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new RecoveryOutputValidationError('Model output did not contain a JSON object');
  }
  return JSON.parse(text.slice(start, end + 1));
}

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function optionalString(value: unknown): string | undefined {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && !/^(null|n\/a)$/i.test(trimmed) ? trimmed : undefined;
}

function requiredString(item: JsonObject, key: string, path: string): string {
  const value = optionalString(item[key]);
  if (!value) throw new RecoveryOutputValidationError(`${path}.${key} must be a non-empty string`);
  return value;
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

function objectList(root: JsonObject, key: string): JsonObject[] {
  const value = root[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new RecoveryOutputValidationError(`${key} must be an array`);
  return value.map((item, i) => {
    if (!isObject(item)) throw new RecoveryOutputValidationError(`${key}[${i}] must be an object`);
    return item;
  });
}

function citation(item: JsonObject, path: string): SourceCitation {
  const page = positiveInt(item.source_page);
  if (page === null) throw new RecoveryOutputValidationError(`${path}.source_page must be a positive integer`);
  return {
    source_page: page,
    source_section: optionalString(item.source_section),
    // Kept exactly as returned; verification decides whether it is really verbatim
    original_extracted_text: typeof item.original_extracted_text === 'string' ? item.original_extracted_text : undefined,
  };
}

function instructionCategory(value: unknown): BedrockInstruction['category'] {
  return value === 'diet' || value === 'rest' ? value : 'activity';
}

/**
 * Validates untrusted model JSON against BedrockRecoveryOutput. Throws RecoveryOutputValidationError
 * on structural problems so callers can fall back to the deterministic parser.
 */
export function validateRecoveryOutput(raw: unknown): BedrockRecoveryOutput {
  if (!isObject(raw)) throw new RecoveryOutputValidationError('Model output must be a JSON object');
  if (raw.patient !== undefined && raw.patient !== null && !isObject(raw.patient)) {
    throw new RecoveryOutputValidationError('patient must be an object');
  }
  const patient = isObject(raw.patient) ? raw.patient : {};
  const contact = isObject(patient.emergency_contact) ? patient.emergency_contact : null;
  const age = positiveInt(patient.age);

  const output: BedrockRecoveryOutput = {
    patient: {
      name: optionalString(patient.name) ?? null,
      mrn: optionalString(patient.mrn) ?? null,
      age: age !== null && age < 130 ? age : null,
      diagnosis: optionalString(patient.diagnosis) ?? null,
      procedure: optionalString(patient.procedure) ?? null,
      discharge_date: optionalString(patient.discharge_date) ?? null,
      attending_physician: optionalString(patient.attending_physician) ?? null,
      hospital_name: optionalString(patient.hospital_name) ?? null,
      caregiver: optionalString(patient.caregiver) ?? null,
      emergency_contact: contact
        ? {
            name: optionalString(contact.name),
            relationship: optionalString(contact.relationship),
            phone: optionalString(contact.phone),
          }
        : null,
      hospital_helpline: optionalString(patient.hospital_helpline) ?? null,
    },
    recovery_period_days: positiveInt(raw.recovery_period_days),
    medications: objectList(raw, 'medications').map((m, i) => ({
      name: requiredString(m, 'name', `medications[${i}]`),
      dose: optionalString(m.dose) ?? NOT_SPECIFIED,
      frequency: optionalString(m.frequency) ?? NOT_SPECIFIED,
      timing: optionalString(m.timing) ?? NOT_SPECIFIED,
      instructions: optionalString(m.instructions) ?? '',
      duration: optionalString(m.duration),
      ...citation(m, `medications[${i}]`),
    })),
    followups: objectList(raw, 'followups').map((f, i) => ({
      title: requiredString(f, 'title', `followups[${i}]`),
      date: optionalString(f.date) ?? NOT_SPECIFIED,
      time: optionalString(f.time) ?? NOT_SPECIFIED,
      doctor: optionalString(f.doctor) ?? NOT_SPECIFIED,
      location: optionalString(f.location) ?? NOT_SPECIFIED,
      day_number: positiveInt(f.day_number),
      contact_number: optionalString(f.contact_number),
      instructions: optionalString(f.instructions),
      ...citation(f, `followups[${i}]`),
    })),
    instructions: objectList(raw, 'instructions').map((inst, i) => {
      const text = optionalString(inst.instructions) ?? optionalString(inst.title);
      if (!text) throw new RecoveryOutputValidationError(`instructions[${i}] needs a title or instructions`);
      return {
        title: optionalString(inst.title) ?? text,
        category: instructionCategory(inst.category),
        timing: optionalString(inst.timing),
        duration: optionalString(inst.duration),
        instructions: text,
        ...citation(inst, `instructions[${i}]`),
      };
    }),
    warning_signs: objectList(raw, 'warning_signs').map((w, i) => {
      const condition = requiredString(w, 'condition', `warning_signs[${i}]`);
      const cited = citation(w, `warning_signs[${i}]`);
      return {
        condition,
        trigger_key: isSymptomKey(w.trigger_key)
          ? w.trigger_key
          : inferSymptomKey(`${condition} ${cited.original_extracted_text ?? ''}`),
        severity: w.severity === 'urgent' ? 'urgent' : 'high',
        documented_action: optionalString(w.documented_action) ?? NO_DOCUMENTED_ACTION,
        ...cited,
      };
    }),
  };

  const itemCount =
    output.medications.length + output.followups.length + output.instructions.length + output.warning_signs.length;
  if (itemCount === 0) throw new RecoveryOutputValidationError('Model output contained no recovery plan items');

  return output;
}

/** Parses raw model text (fenced or not) and validates it. */
export function parseRecoveryOutput(rawText: string): BedrockRecoveryOutput {
  return validateRecoveryOutput(extractJsonObject(rawText));
}
