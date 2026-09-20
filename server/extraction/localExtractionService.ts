import { TextractNormalizedOutput, TextractPage } from '../documentModel';
import { PDFParse } from 'pdf-parse';

export interface LocalExtractionBlock {
  id: string;
  blockType: 'PAGE' | 'LINE' | 'WORD' | 'KEY_VALUE_SET';
  text?: string;
  page: number;
}

export interface LocalTextractCompatibleOutput {
  documentId: string;
  pageCount: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    lines: string[];
    blocks: LocalExtractionBlock[];
  }>;
}

// Deterministic verified 5-page clinical discharge packet for Mrs. Anita Sharma
export const DEMO_SURGICAL_PAGES: TextractPage[] = [
  {
    page_number: 1,
    text: `APEX MEMORIAL HEALTHCARE SYSTEM
Department of General & Laparoscopic Surgery
PATIENT DISCHARGE SUMMARY

Patient Name: Mrs. Anita Sharma
Hospital MRN: #AMH-9921408
Age / Gender: 58 Yrs / Female
Date of Admission: September 15, 2026
Date of Procedure: September 16, 2026 (08:30 AM)
Date of Discharge: September 17, 2026 (14:00 PM)
Attending Surgeon: Dr. Arvind Rao, MS, FACS
Primary Caregiver: Pooja Sharma (Daughter, +1 800 555-0199)

PRIMARY CLINICAL DIAGNOSIS:
Symptomatic Cholelithiasis with recurrent biliary colic.

OPERATIVE PROCEDURE PERFORMED:
Elective Four-Port Laparoscopic Cholecystectomy.
Operative course uneventful. Hemostasis secured. Gallbladder extracted intact via endobag.
Histopathology specimen sent. No subhepatic drain placed.`,
  },
  {
    page_number: 2,
    text: `HOSPITAL COURSE & RECOVERY TIMELINE:
Patient tolerated general anesthesia well. Extubated in OR.
Post-op Day 0: Patient was monitored in recovery for 4 hours. Initiated oral sips of water at 6 hours post-op. Mild trocar site pain controlled with IV analgesics.
Post-op Day 1: Ambulated in corridor. Passed flatus. Bowel sounds present. Oral liquids tolerated without nausea. Converted from IV to oral medications.
Discharge Vitals:
- Blood Pressure: 124/78 mmHg
- Heart Rate: 72 bpm, regular
- SpO2: 98% on room air
- Temperature: 98.4°F (36.9°C)
- Surgical wounds: Clean, dry, sterile micropore dressings intact.`,
  },
  {
    page_number: 3,
    text: `SECTION 3: DISCHARGE MEDICATIONS & DOSING SCHEDULE

1. Tab. Cefuroxime Axetil 500 mg
   - Dose: 500 mg oral tablet
   - Frequency: Twice daily (every 12 hours: 8:00 AM and 8:00 PM)
   - Duration: Complete for exactly 5 days post-discharge
   - Instructions: Administer after meals with water. Do not skip doses.

2. Tab. Paracetamol (Acetaminophen) 650 mg
   - Dose: 650 mg oral tablet
   - Frequency: Three times daily after meals as needed for mild-to-moderate incision pain
   - Timing: 8:00 AM, 1:30 PM, 8:00 PM (or every 6-8 hours)
   - Precaution: Do not exceed 3,000 mg in any 24-hour period.

3. Tab. Pantoprazole 40 mg
   - Dose: 40 mg oral tablet
   - Frequency: Once daily at night 30 minutes before sleep
   - Duration: 14 days for gastroprotection.`,
  },
  {
    page_number: 4,
    text: `SECTION 4: DIETARY INSTRUCTIONS
- Maintain a low-fat, easily digestible diet for the first 10 days.
- Avoid greasy, deep-fried foods, heavy creams, and spicy curries.
- Small, frequent meals are better tolerated than heavy portions.
- Maintain adequate hydration: 1.5 to 2 liters of fluids/water daily.

SECTION 5: PHYSICAL ACTIVITY & RECOVERY GUIDELINES
- Ambulation: Short walks of 5 to 10 minutes, 2 to 3 times daily starting Day 2.
- Lifting restrictions: Strictly avoid lifting items heavier than 5 kg (10 lbs) for 4 weeks.
- Driving: No driving for 7 days or while taking sedating analgesics.
- Bathing: Keep umbilical and abdominal dressings dry for first 48 hours. Sponge bathing recommended.

SECTION 6: OUTPATIENT CLINICAL FOLLOW-UP
- Scheduled Review: Day 10 post-discharge (September 26, 2026 at 10:30 AM).
- Location: Surgical OPD Clinic, Suite 402, Apex Memorial Healthcare.
- Doctor: Dr. Arvind Rao. Contact: +1 (800) 555-0144.`,
  },
  {
    page_number: 5,
    text: `SECTION 7: EMERGENCY RED FLAGS & HOSPITAL ESCALATION PROTOCOL

Patients and caregivers must inspect for the following documented warning signs. If observed, enact the specific documented action below immediately:

1. DIFFICULTY BREATHING / CHEST PAIN:
   - Signs: Shortness of breath, rapid shallow breathing, chest tightness, or pain upon deep inhalation.
   - Documented Action: Call the hospital emergency line immediately (+1 800 555-0199) or proceed to the nearest Emergency Room. Do not wait.

2. PERSISTENT FEVER:
   - Signs: Body temperature greater than 101.0°F (38.3°C) or severe chills/rigors.
   - Documented Action: Contact the surgical post-op duty team within 2 hours at +1 (800) 555-0144.

3. SEVERE OR ESCALATING PAIN:
   - Signs: Abdominal pain that progressively worsens despite prescribed pain medication, or abdominal wall becomes rigid and tender.
   - Documented Action: Call the 24/7 post-op nurse coordinator immediately.

4. WOUND DRAINAGE / JAUNDICE:
   - Signs: Active bleeding soaking dressings, yellowing of eyes/skin, or foul odor from incision sites.
   - Documented Action: Prompt hospital evaluation required within 4 hours.`,
  },
];

export class LocalExtractionService {
  /**
   * Extract text and layout boundaries locally, matching the Amazon Textract output contract.
   * Preserves page numbers, lines, and blocks.
   */
  static async extract(
    documentId: string,
    filename: string,
    fileBuffer?: Buffer
  ): Promise<LocalTextractCompatibleOutput> {
    console.log(`[LocalExtractionService] Processing document '${filename}' (Local Textract-compatible engine)`);

    // In local development, parse arbitrary PDFs or text files; demo pages are used ONLY when no file is provided
    let pages: TextractPage[] = [];
    const hasFile = Boolean(fileBuffer && fileBuffer.length > 0);

    if (fileBuffer && hasFile) {
      // Strategy 1: Check if binary PDF buffer
      const isPdfHeader = fileBuffer.slice(0, 5).toString('ascii').startsWith('%PDF');
      const isPdfExtension = filename.toLowerCase().endsWith('.pdf');

      if (isPdfHeader || isPdfExtension) {
        try {
          const parser = new PDFParse({ data: fileBuffer });
          await (parser as any).load();
          const result = await parser.getText();
          await (parser as any).destroy?.();

          if (result && result.pages && result.pages.length > 0) {
            const extracted = result.pages
              .map((p, idx) => ({
                page_number: p.num || idx + 1,
                text: (p.text || '').replace(/\r\n/g, '\n').trim(),
              }))
              .filter((p) => p.text.length > 0);

            if (extracted.length > 0) {
              pages = extracted;
              console.log(
                `[LocalExtractionService] Successfully extracted ${pages.length} pages from PDF using PDFParse`
              );
            }
          }
        } catch (pdfErr) {
          console.warn(
            '[LocalExtractionService] PDF binary extraction notice, checking text fallbacks:',
            (pdfErr as Error).message
          );
        }
      }

      // Strategy 2: Plain text / structured ASCII. A real PDF with no text layer is not decoded as text.
      if (pages.length === 0 && !isPdfHeader) {
        try {
          const rawString = fileBuffer.toString('utf-8');

          // Check for form feed delimiter (\f is standard page break in generated PDFs/text)
          if (rawString.includes('\f')) {
            const ffParts = rawString.split('\f').map((p) => p.trim()).filter(Boolean);
            if (ffParts.length > 1) {
              pages = ffParts.map((text, idx) => ({
                page_number: idx + 1,
                text,
              }));
            }
          }

          // Check for "Page X of Y" or "PAGE X:" or "--- PAGE X ---"
          if (pages.length === 0) {
            const pageMarkerRegex = /(?:---+|\b)(?:PAGE|Page)\s+(\d+)(?:\s*(?:of|\/)\s*\d+)?(?:\s*[:\-])?(?:---+|\b)/i;
            if (pageMarkerRegex.test(rawString)) {
              const parts = rawString.split(/(?:---+|\b)(?:PAGE|Page)\s+(\d+)(?:\s*(?:of|\/)\s*\d+)?(?:\s*[:\-])?(?:---+|\b)/i);
              if (parts.length >= 3) {
                const parsedPages: TextractPage[] = [];
                for (let i = 1; i < parts.length; i += 2) {
                  const pNum = parseInt(parts[i], 10) || (Math.floor(i / 2) + 1);
                  const pText = (parts[i + 1] || '').trim();
                  if (pText) {
                    parsedPages.push({ page_number: pNum, text: pText });
                  }
                }
                if (parsedPages.length > 0) {
                  pages = parsedPages;
                }
              }
            }
          }

          // Check for Section headers to create logical pages if document is un-paged text
          if (pages.length === 0 && rawString.trim().length > 0) {
            const sectionMatches = rawString.split(/(?=SECTION\s+\d+|Section\s+\d+|CLINICAL DIAGNOSIS|DISCHARGE MEDICATIONS|DIETARY INSTRUCTIONS|EMERGENCY RED FLAGS)/i);
            if (sectionMatches.length >= 3) {
              pages = sectionMatches.map((sec, idx) => ({
                page_number: idx + 1,
                text: sec.trim(),
              })).filter((p) => p.text.length > 0);
            } else {
              // Single page text document
              pages = [{ page_number: 1, text: rawString.trim() }];
            }
          }
        } catch (textErr) {
          console.warn('[LocalExtractionService] Text parsing failed:', textErr);
        }
      }
    }

    if (pages.length === 0) {
      if (hasFile) {
        // Never substitute the demo packet for a patient's own document
        throw new Error(
          `No readable text found in '${filename}'. Scanned or image-only PDFs need Amazon Textract (TEXTRACT_MODE=aws).`
        );
      }
      console.log('[LocalExtractionService] No file provided, using the standard demo packet');
      pages = DEMO_SURGICAL_PAGES;
    }

    const structuredPages = pages.map((p) => {
      const lines = p.text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const blocks: LocalExtractionBlock[] = [
        {
          id: `block-page-${p.page_number}`,
          blockType: 'PAGE',
          page: p.page_number,
        },
        ...lines.map((line, lIdx) => ({
          id: `block-line-${p.page_number}-${lIdx}`,
          blockType: 'LINE' as const,
          text: line,
          page: p.page_number,
        })),
      ];

      return {
        pageNumber: p.page_number,
        text: p.text,
        lines,
        blocks,
      };
    });

    return {
      documentId,
      pageCount: structuredPages.length,
      pages: structuredPages,
    };
  }

  /**
   * Helper to normalize to existing TextractNormalizedOutput
   */
  static toNormalizedOutput(output: LocalTextractCompatibleOutput): TextractNormalizedOutput {
    return {
      document_id: output.documentId,
      pages: output.pages.map((p) => ({
        page_number: p.pageNumber,
        text: p.text,
      })),
    };
  }
}
