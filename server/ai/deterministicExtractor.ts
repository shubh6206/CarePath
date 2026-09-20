import {
  BedrockFollowUp,
  BedrockInstruction,
  BedrockMedication,
  BedrockPatient,
  BedrockRecoveryOutput,
  BedrockWarningSign,
  TextractNormalizedOutput,
  TextractPage,
} from '../documentModel';
import { NOT_SPECIFIED, NO_DOCUMENTED_ACTION, inferSymptomKey } from './recoveryOutputSchema';

/**
 * Rule-based, offline extractor used when no LLM provider is available. It is section-aware and only
 * emits text that is printed in the document: nothing is invented when a field is missing.
 */

type SectionKind = 'warnings' | 'followup' | 'medications' | 'diet' | 'activity' | 'history' | 'other';

interface DocLine {
  page: number;
  text: string;
  section: SectionKind;
  heading: string;
  // First content line after a heading, blank line, or page break
  startsBlock: boolean;
}

// Order matters: e.g. "EMERGENCY RED FLAGS & HOSPITAL ESCALATION" must classify as warnings, not history
const SECTION_RULES: Array<[SectionKind, RegExp]> = [
  ['warnings', /red\s+flag|warning|emergency|danger\s+sign|when\s+to\s+(?:call|seek)|seek\s+(?:immediate|medical)|return\s+to\s+(?:the\s+)?(?:hospital|er\b|emergency)/i],
  ['followup', /follow[\s-]*up|appointment|outpatient|clinic\s+visit/i],
  ['medications', /medication|prescription|dosing|\bdrugs?\b/i],
  ['diet', /diet|nutrition|food|eating/i],
  ['activity', /activity|exercise|ambulation|mobility|recovery\s+guideline|wound|incision|bathing|home\s+care|self[\s-]care|restriction/i],
  ['history', /hospital\s+course|history|diagnosis|procedure|operative|vitals|admission|summary/i],
];

const PHONE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const TIME = /\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi;
const DOSE = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|ml|units?|iu)(?![a-z])/i;
const MED_FORM_PREFIX = /^(?:tab(?:let)?|cap(?:sule)?|syp|syrup|inj(?:ection)?|susp(?:ension)?)\.?\s+/i;
const MONTH_DATE =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s*\d{4})?/i;
const LABELLED = /^[-•*]?\s*([A-Za-z][A-Za-z /]{0,28}?)\s*:\s*(.+)$/;
const ITEM_START = /^(?:\d+[.)]|[-•*])\s+/;
const ACTION_VERB = /\b(?:call|contact|go\s+to|proceed|seek|notify|return|report|visit|dial)\b/i;

const MED_ATTRIBUTES: Record<string, 'dose' | 'frequency' | 'timing' | 'duration' | 'instructions'> = {
  dose: 'dose', dosage: 'dose', strength: 'dose',
  frequency: 'frequency', 'how often': 'frequency',
  timing: 'timing', time: 'timing', times: 'timing', when: 'timing',
  duration: 'duration', 'how long': 'duration',
  instructions: 'instructions', directions: 'instructions', precaution: 'instructions',
  precautions: 'instructions', note: 'instructions', notes: 'instructions', route: 'instructions',
};

function classifySection(heading: string): SectionKind {
  return SECTION_RULES.find(([, pattern]) => pattern.test(heading))?.[0] ?? 'other';
}

function isSectionHeading(line: string): boolean {
  if (/^section\s+\d+\b/i.test(line)) return true;
  if (ITEM_START.test(line) || /\.$/.test(line) || line.length > 80) return false;
  const letters = line.replace(/[^A-Za-z]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase();
}

function toDocLines(pages: TextractPage[]): DocLine[] {
  const lines: DocLine[] = [];
  let section: SectionKind = 'other';
  let heading = '';
  for (const page of pages) {
    let startsBlock = true;
    for (const raw of page.text.split(/\r?\n/)) {
      const text = raw.trim();
      if (!text) {
        startsBlock = true;
        continue;
      }
      if (isSectionHeading(text)) {
        heading = text.replace(/:$/, '');
        section = classifySection(text);
        startsBlock = true;
        continue;
      }
      lines.push({ page: page.page_number, text, section, heading, startsBlock });
      startsBlock = false;
    }
  }
  return lines;
}

/** Lines of the given section kind, or unclassified lines when the document has no such section. */
function linesFor(lines: DocLine[], kinds: SectionKind[]): { lines: DocLine[]; sectioned: boolean } {
  const matched = lines.filter((l) => kinds.includes(l.section));
  return matched.length > 0
    ? { lines: matched, sectioned: true }
    : { lines: lines.filter((l) => l.section === 'other'), sectioned: false };
}

/** Splits lines into runs that share a section heading and page. */
function groupBySection(lines: DocLine[]): DocLine[][] {
  const groups: DocLine[][] = [];
  for (const line of lines) {
    const last = groups[groups.length - 1];
    if (last && last[0].heading === line.heading && last[0].page === line.page) last.push(line);
    else groups.push([line]);
  }
  return groups;
}

const stripBullet = (text: string) => text.replace(ITEM_START, '').trim();
const stripTrailing = (text: string) => text.replace(/[\s.:;,-]+$/, '').trim();
const quoteOf = (lines: DocLine[]) => lines.map((l) => l.text).join('\n');

function toDisplayCase(text: string): string {
  if (text !== text.toUpperCase()) return text;
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function toTitleCase(text: string): string {
  if (text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function shortTitle(text: string): string {
  const words = text.split(/\s+/);
  return words.length <= 6 ? stripTrailing(text) : `${words.slice(0, 6).join(' ')}…`;
}

function labelledValue(lines: DocLine[], label: RegExp): string | undefined {
  for (const { text } of lines) {
    const match = text.match(LABELLED);
    if (match && label.test(match[1].trim())) return match[2].trim();
  }
  return undefined;
}

function firstLineUnderHeading(lines: DocLine[], heading: RegExp): string | undefined {
  return lines.find((l) => heading.test(l.heading))?.text;
}

function parseContact(value: string): { name?: string; relationship?: string; phone?: string } {
  const phone = value.match(PHONE)?.[0];
  const name = stripTrailing(value.split(/[(,]/)[0]) || undefined;
  const inParens = value.match(/\(([^)]*)\)/)?.[1] ?? '';
  const relationship = inParens
    .split(',')
    .map((s) => s.trim())
    .find((s) => s && !PHONE.test(s));
  return { name, relationship, phone };
}

function extractPatient(pages: TextractPage[], lines: DocLine[]): BedrockPatient {
  const fullText = pages.map((p) => p.text).join('\n');
  const firstPageLines = (pages[0]?.text ?? '').split(/\r?\n/).map((l) => l.trim());

  const hospitalLine = firstPageLines.find(
    (l) => l.length <= 60 && !l.includes(':') && /\b(?:hospital|healthcare|health\s+system|medical\s+cent(?:er|re)|clinic|infirmary)\b/i.test(l)
  );

  const caregiver = labelledValue(lines, /^(?:primary\s+)?caregiver$/i);
  const emergencyContact = labelledValue(lines, /^emergency\s+contact$/i) ?? caregiver;
  const contact = emergencyContact ? parseContact(emergencyContact) : null;

  const helplineLine = lines.find(
    (l) =>
      PHONE.test(l.text) &&
      /helpline|hotline|duty|nurse|contact|call|clinic|hospital|surgeon|office|desk|line/i.test(l.text) &&
      !/caregiver|emergency\s+contact|next\s+of\s+kin/i.test(l.text)
  );

  const age = Number(
    fullText.match(/\bAge(?:\s*\/\s*(?:Gender|Sex))?\s*:\s*(\d{1,3})/i)?.[1] ??
      fullText.match(/\b(\d{1,3})[\s-]*(?:years?[\s-]*old|yo)\b/i)?.[1]
  );
  const physician = labelledValue(lines, /^(?:attending(?:\s+(?:surgeon|physician|doctor))?|surgeon|physician)$/i);
  const procedure =
    labelledValue(lines, /^(?:operative\s+)?(?:procedure|surgery|operation)(?:\s+performed)?$/i) ??
    firstLineUnderHeading(lines, /procedure|operation|surgery/i);
  const diagnosis =
    labelledValue(lines, /^(?:primary\s+)?(?:clinical\s+)?diagnosis$/i) ?? firstLineUnderHeading(lines, /diagnosis/i);

  return {
    name: labelledValue(lines, /^(?:patient(?:'s)?\s+name|patient|name)$/i) ?? null,
    mrn: fullText.match(/\b(?:MRN|Medical\s+Record\s+(?:Number|No\.?))\s*[:#]?\s*(#?[A-Z0-9][A-Z0-9-]{3,})/i)?.[1] ?? null,
    age: Number.isInteger(age) && age > 0 && age < 130 ? age : null,
    diagnosis: diagnosis ? stripTrailing(diagnosis) : null,
    procedure: procedure ? stripTrailing(procedure) : null,
    discharge_date: labelledValue(lines, /^(?:date\s+of\s+discharge|discharge\s+date)$/i) ?? null,
    attending_physician: physician ? stripTrailing(physician.split(/\.?\s+(?:contact|phone|tel)\b/i)[0]) : null,
    hospital_name: hospitalLine ? toTitleCase(hospitalLine) : null,
    caregiver: caregiver ?? null,
    emergency_contact: contact,
    hospital_helpline: helplineLine?.text.match(PHONE)?.[0] ?? null,
  };
}

function extractMedications(lines: DocLine[]): BedrockMedication[] {
  const { lines: candidates, sectioned } = linesFor(lines, ['medications']);
  const blocks: DocLine[][] = [];

  for (const line of candidates) {
    const labelled = line.text.match(LABELLED);
    const attribute = labelled ? MED_ATTRIBUTES[labelled[1].trim().toLowerCase()] : undefined;
    const current = blocks[blocks.length - 1];

    if (!attribute && DOSE.test(line.text)) {
      blocks.push([line]);
    } else if (current && sectioned && !line.startsBlock && current[0].heading === line.heading) {
      // Dose/frequency sub-lines and continuation text belong to the medication above them
      current.push(line);
    }
  }

  return blocks.slice(0, 10).flatMap((block): BedrockMedication[] => {
    const header = stripBullet(block[0].text).replace(MED_FORM_PREFIX, '');
    const doseMatch = header.match(DOSE);
    const name = doseMatch ? stripTrailing(header.slice(0, doseMatch.index)) : '';
    if (!doseMatch || !name) return [];

    const fields: Partial<Record<'dose' | 'frequency' | 'timing' | 'duration' | 'instructions', string>> = {};
    const notes: string[] = [];
    for (const { text } of block.slice(1)) {
      const labelled = text.match(LABELLED);
      const attribute = labelled ? MED_ATTRIBUTES[labelled[1].trim().toLowerCase()] : undefined;
      if (attribute === 'instructions' || !attribute) notes.push(labelled && attribute ? labelled[2].trim() : stripBullet(text));
      else fields[attribute] ??= labelled![2].trim();
    }

    const remainder = header.slice(doseMatch.index! + doseMatch[0].length).replace(/^[\s,:;-]+/, '').trim();
    const blockText = quoteOf(block);
    const times = blockText.match(TIME);

    return [
      {
        name,
        dose: fields.dose ?? doseMatch[0],
        frequency: fields.frequency ?? (remainder || NOT_SPECIFIED),
        timing: fields.timing ?? (times ? Array.from(new Set(times)).join(', ') : NOT_SPECIFIED),
        duration: fields.duration,
        instructions: notes.join(' '),
        source_page: block[0].page,
        source_section: block[0].heading || 'Discharge Medications',
        original_extracted_text: blockText,
      },
    ];
  });
}

const INSTRUCTION_HINT = /walk|ambulat|exercise|lift|driv|stairs|diet|food|meal|fluid|hydrat|bath|shower|dressing|wound|incision|sleep/i;
const REST_HINT = /bath|shower|dressing|wound|incision|\brest\b|sleep/i;

function extractInstructions(lines: DocLine[]): BedrockInstruction[] {
  const { lines: candidates, sectioned } = linesFor(lines, ['diet', 'activity']);

  return candidates
    .filter((l) => sectioned || INSTRUCTION_HINT.test(l.text))
    .slice(0, 8)
    .map((line) => {
      const labelled = line.text.match(LABELLED);
      const body = labelled ? labelled[2].trim() : stripBullet(line.text);
      const times = line.text.match(TIME);
      return {
        title: labelled ? labelled[1].trim() : shortTitle(body),
        category: line.section === 'diet' ? 'diet' : REST_HINT.test(line.text) ? 'rest' : 'activity',
        timing: times ? times.join(', ') : undefined,
        duration: line.text.match(/\b\d+\s*(?:to|-|–)\s*\d+\s*(?:minutes|mins?)\b|\b\d+\s*(?:minutes|mins?)\b/i)?.[0],
        instructions: body,
        source_page: line.page,
        source_section: line.heading || 'Recovery Guidelines',
        original_extracted_text: line.text,
      };
    });
}

function extractFollowups(lines: DocLine[], physician: string | null): BedrockFollowUp[] {
  const { lines: candidates, sectioned } = linesFor(lines, ['followup']);
  const groups = sectioned
    ? groupBySection(candidates).map((g) => g.slice(0, 6))
    : candidates
        .filter((l) => /follow[\s-]*up|appointment/i.test(l.text) && (MONTH_DATE.test(l.text) || /\bday\s+\d+/i.test(l.text)))
        .map((l) => [l]);

  return groups.slice(0, 2).map((group) => {
    const text = group.map((l) => l.text).join(' ');
    const firstLabel = group[0].text.match(LABELLED)?.[1].trim();
    const doctor = labelledValue(group, /^(?:doctor|physician|surgeon|with)$/i);
    const location = labelledValue(group, /^(?:location|where|clinic|address|venue)$/i);
    const dayNumber = Number(text.match(/\bday\s+(\d+)\b/i)?.[1]);

    return {
      title:
        firstLabel && !/^(?:location|doctor|date|time)$/i.test(firstLabel) ? firstLabel : 'Follow-up appointment',
      date: text.match(MONTH_DATE)?.[0] ?? text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/)?.[0] ?? text.match(/\bday\s+\d+(?:\s+post[\s-]*(?:discharge|op))?/i)?.[0] ?? NOT_SPECIFIED,
      time: text.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/i)?.[0] ?? NOT_SPECIFIED,
      doctor: doctor
        ? stripTrailing(doctor.split(/\.?\s+(?:contact|phone|tel)\b/i)[0])
        : text.match(/\bDr\.\s+[A-Z][\w.-]*(?:\s+[A-Z][\w.-]*)*/)?.[0] ?? physician ?? NOT_SPECIFIED,
      location: location ? stripTrailing(location) : NOT_SPECIFIED,
      day_number: Number.isInteger(dayNumber) && dayNumber > 0 ? dayNumber : null,
      contact_number: text.match(PHONE)?.[0],
      instructions: labelledValue(group, /^(?:instructions|bring|notes?|preparation)$/i),
      source_page: group[0].page,
      source_section: group[0].heading || 'Follow-up',
      original_extracted_text: quoteOf(group),
    };
  });
}

const WARNING_ATTRIBUTE = /^[-•*]?\s*(signs?|symptoms?|documented\s+action|action|what\s+to\s+do|response)\s*:\s*(.+)$/i;

function extractWarningSigns(lines: DocLine[]): BedrockWarningSign[] {
  const { lines: candidates, sectioned } = linesFor(lines, ['warnings']);

  if (!sectioned) {
    // Without a red-flag section, only trust lines that state both a symptom and what to do
    return candidates
      .filter((l) => inferSymptomKey(l.text) && ACTION_VERB.test(l.text))
      .slice(0, 8)
      .map((l) => ({
        condition: stripBullet(l.text),
        trigger_key: inferSymptomKey(l.text),
        severity: /emergency|911|immediately|do not wait|\bER\b/i.test(l.text) ? 'urgent' : 'high',
        documented_action: stripBullet(l.text),
        source_page: l.page,
        source_section: l.heading || 'Warning Signs',
        original_extracted_text: l.text,
      }));
  }

  interface WarningItem {
    lines: DocLine[];
    signs?: string;
    action?: string;
  }
  const items: WarningItem[] = [];
  const intro: DocLine[] = [];

  for (const line of candidates) {
    const current = items[items.length - 1];
    const attribute = line.text.match(WARNING_ATTRIBUTE);
    if (attribute && current) {
      current.lines.push(line);
      if (/^(?:signs?|symptoms?)$/i.test(attribute[1])) current.signs = attribute[2].trim();
      else current.action = attribute[2].trim();
    } else if (ITEM_START.test(line.text)) {
      items.push({ lines: [line] });
    } else if (current && current.lines[0].heading === line.heading) {
      current.lines.push(line);
    } else {
      intro.push(line);
    }
  }

  const introAction = intro.find((l) => ACTION_VERB.test(l.text) && (PHONE.test(l.text) || /emergency|911|\bER\b/i.test(l.text)));

  return items.slice(0, 8).flatMap((item) => {
    const heading = stripTrailing(stripBullet(item.lines[0].text));
    const [conditionPart, inlineAction] = heading.split(/:\s+(.+)/);
    const continuationAction = item.lines.slice(1).find((l) => !WARNING_ATTRIBUTE.test(l.text) && ACTION_VERB.test(l.text));
    const action =
      item.action ??
      (inlineAction && ACTION_VERB.test(inlineAction) ? inlineAction : undefined) ??
      (continuationAction ? stripBullet(continuationAction.text) : undefined) ??
      (introAction ? stripBullet(introAction.text) : undefined);
    const condition = toDisplayCase(stripTrailing(conditionPart));
    if (!condition) return [];

    const triggerKey = inferSymptomKey(`${condition} ${item.signs ?? ''}`);
    return [
      {
        condition,
        trigger_key: triggerKey,
        severity:
          triggerKey === 'breathing' || /emergency|911|immediately|do not wait|\bER\b/i.test(action ?? '')
            ? 'urgent'
            : 'high',
        documented_action: action ?? NO_DOCUMENTED_ACTION,
        source_page: item.lines[0].page,
        source_section: item.lines[0].heading || 'Warning Signs',
        original_extracted_text: quoteOf(item.lines),
      },
    ];
  });
}

export function extractDeterministicPlan(normalizedExtraction: TextractNormalizedOutput): BedrockRecoveryOutput {
  const pages = normalizedExtraction.pages;
  const lines = toDocLines(pages);
  const patient = extractPatient(pages, lines);

  return {
    patient,
    recovery_period_days: 14,
    medications: extractMedications(lines),
    instructions: extractInstructions(lines),
    followups: extractFollowups(lines, patient.attending_physician ?? null),
    warning_signs: extractWarningSigns(lines),
  };
}
