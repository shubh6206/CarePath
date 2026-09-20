# CarePath — Project Status Report

**Event:** AWS Student Hackathon
**Report date:** 19 September 2026
**Repository:** `aws_hackton/CarePath` (15 commits, all on 19 Sep 2026)
**Codebase size:** ~8,450 lines of TypeScript/TSX (≈3,450 backend, ≈5,000 frontend)

---

## 1. Theme

**Healthcare: safer recovery after a patient leaves hospital, built on AWS.**

About 1 in 5 patients has a preventable adverse event after discharge. A common reason is that the discharge packet (several pages of medications, activity limits, follow-ups and warning signs) is hard to follow at home.

CarePath is a **mobile-first recovery companion**. It reads the hospital discharge packet and turns it into:

- a daily recovery timeline and to-do list
- a medication schedule
- follow-up appointment reminders
- red-flag warning signs that **alert a family caregiver** when the patient reports a matching symptom

Two principles run through the whole design:

1. **Zero diagnosis.** CarePath acts as an administrative assistant, not a doctor. It never diagnoses, never invents dosages, and never gives medical opinions of its own.
2. **Evidence grounding.** Every medication, task and warning shown to the patient links back to a **verbatim quote on a specific page** of the original discharge paperwork. The patient can tap "Why this?" to see the source.

---

## 2. What we have achieved so far

### 2.1 End-to-end working pipeline (runs locally, no AWS account required)

```
Discharge PDF ──▶ S3 (storage) ──▶ Text extraction (page-preserving)
     ──▶ Clinical AI structuring (zero-diagnosis prompt)
     ──▶ Quote verification against source page
     ──▶ DynamoDB (plan, tasks, check-ins)
     ──▶ Patient UI  +  SNS caregiver alert on red-flag check-in
```

| Stage | Status | Details |
| :--- | :--- | :--- |
| **Document upload** | ✅ Done | `POST /api/documents/upload` (multer, 50 MB limit). Files stored under `discharges/{docId}/…` in S3, with an in-memory fallback. |
| **Text extraction** | ✅ Done (local) | `LocalExtractionService` parses real PDFs with `pdf-parse` and keeps page boundaries. It also handles plain text using form-feeds, "Page X of Y" markers or section headings. Its output matches the Amazon Textract format, so live Textract can replace it later. |
| **Clinical AI structuring** | ✅ Done (3 providers) | A shared `ClinicalAIService` interface with a zero-diagnosis system prompt. Providers: (a) a **verified demo fixture**, (b) **Gemini 2.5 Flash** when `GEMINI_API_KEY` is set, (c) a **regex-based deterministic fallback**, plus a **Bedrock provider** that is written but not yet exercised. |
| **Evidence verification** | ✅ Done | `validateAndVerifyVerbatimQuotes` checks that each quote the AI returns appears on the cited page. If it does not, the quote is replaced with the closest real sentence from that page. |
| **Persistence** | ✅ Done | Four DynamoDB tables (`patients`, `documents`, `tasks`, `checkins`) using AWS SDK v3. Supports multiple documents, and any uploaded document can be made the active plan. |
| **Daily check-in and red-flag matching** | ✅ Done | Pain, fever and breathing answers are matched with fixed rules against the documented Page 5 warning signs. |
| **Caregiver alerts** | ✅ Done (simulated) | Publishes to the SNS topic `carepath-caregiver-alerts`. Alerts are also logged to a local "Alert Simulator" with a clear *NO REAL SMS SENT* disclaimer. Alert history is available through the API. |
| **Health / status reporting** | ✅ Done | `/health` and `/api/health/aws-status` report the true mode of each service: LocalStack, local fallback, or live AWS. |

### 2.2 Infrastructure and developer experience

- **LocalStack** via `docker-compose.yml` (S3, DynamoDB, SNS on port 4566). An init script creates the versioned bucket, the four tables and the SNS topic with a mock subscriber.
- **npm scripts:** `local:init`, `local:seed`, `local:status`, `local:reset`.
- **Two ways to run:** with Docker and LocalStack, or with `npm run dev` alone. Without Docker every service falls back to memory, so the app never crashes.
- **Promotion to live AWS by configuration only.** The `*_MODE` variables in `.env.example` switch each service to live AWS once real credentials are present.

### 2.3 Frontend (React 19 + Vite + Tailwind + Motion)

- **Mobile view** inside a realistic phone frame with four tabs:
  - **Home:** today's medications and activities, next follow-up
  - **Plan:** 14-day recovery timeline
  - **Check-In:** daily symptom form, which triggers the emergency overlay
  - **More:** resources and contacts
- **Desktop clinical portal** (`DesktopView`), a full-width view with buttons to test red-flag escalation and reset the demo.
- **Modals:**
  - Evidence / "Why this?" citation viewer
  - Document viewer showing the source pages
  - Safety alert overlay with the hospital's documented phone numbers
  - Upload flow with pipeline step labels
  - **AWS Architecture inspector** with live pipeline logs and recent SNS dispatches (built for judges)
- A typed API client (`src/services/api.ts`) with an offline fallback to mock data.

### 2.4 Demo scenario

The seeded patient is **Mrs. Anita Sharma** (laparoscopic cholecystectomy, Apex Memorial Healthcare). The seed data includes:

- 3 medications
- daily walking tasks
- a Day 10 follow-up on 26 Sep 2026
- 3 red flags: breathing, fever, worsening pain

Submitting a Day 2 check-in with "breathing: difficult" runs the whole escalation flow.

---

## 3. What we are planning to do

### 3.1 Planned (from the project's own roadmap: "Milestone 4 — Live AWS")

| # | Item | What it involves |
| :- | :--- | :--- |
| 1 | **Switch storage to live S3 and DynamoDB** | Set `STORAGE_MODE=aws`, create the real resources, and turn on S3 server-side encryption (the pitch mentions it, but the code does not set it yet). |
| 2 | **Use Amazon Textract** | Set `TEXTRACT_MODE=aws`. The Textract client and call path already exist in `documentService.ts`, and the local extractor already produces the same output format. |
| 3 | **Use Amazon Bedrock for structuring** | Set `BEDROCK_MODE=aws`. `BedrockClinicalAIProvider` is implemented but has only been written, not run. |
| 4 | **Send real caregiver notifications** | Set `NOTIFICATION_MODE=aws` and subscribe real phone numbers or emails to the SNS topic. |
| 5 | **Pitch to the judges** | The judge narrative is already in the README (§I): S3 → Textract → Bedrock → DynamoDB → SNS. |

### 3.2 Recommended next steps (gaps found during this review)

**Must fix before the demo**

- **Install dependencies and verify the build.** `node_modules` is missing from the folder, so `npm run lint` and `npm run build` have not been checked here.
- **Update the Bedrock model.** The default `anthropic.claude-3-5-sonnet-20240620-v1:0` is an older model. Move to a current Claude model on Bedrock and test the JSON output against the `BedrockRecoveryOutput` schema.
- **Document `GEMINI_API_KEY`.** The code uses it, but `.env.example` does not list it.
- **Clean up leftover template metadata.** `package.json` is still named `react-example`, `metadata.json` refers to AI Studio / Gemini, and the README mentions a `.env.local` file that is not in the repo. The pitch is AWS-first (Bedrock), so decide whether Gemini stays as the local fallback and present it consistently.

**Should do**

- **Make the plan less hard-coded.** The demo fixture is chosen by matching the text "Anita Sharma". Red-flag matching only covers three fixed triggers, and it falls back to hard-coded phone numbers when a document has no Page 5 warnings. To support other discharge packets, warnings need to be driven by what was actually extracted.
- **Treat unverified quotes more strictly.** When a quote cannot be found verbatim, the current code silently swaps in the "closest" sentence. It would be safer to flag the item as unverified in the UI than to show a different sentence as if it were the evidence.
- **Add authentication and privacy controls.** There is currently no login, per-patient access control or audit trail. This matters for any real health data (HIPAA-style concerns).
- **Add automated tests.** There are none yet. The first ones should cover extraction page boundaries, quote verification and red-flag matching.

**Nice to have**

- Infrastructure as code (CDK or SAM) for the live AWS deployment.
- Scheduled medication reminders (for example EventBridge Scheduler → SNS).
- A caregiver-facing view and multi-language support.

---

## 4. Summary

CarePath already has a **complete, demo-ready vertical slice**. A discharge document goes through upload, extraction, zero-diagnosis structuring, quote verification, storage, the patient's daily plan and caregiver alerts, and every output links back to its source page. All of it runs locally on AWS SDK v3 with LocalStack and falls back safely when services are offline.

The main remaining work is to **switch each service to live AWS** (S3, Textract, Bedrock, SNS) and **move beyond the single seeded patient**. For the second, red-flag rules and quote checking need to be driven by the extracted document rather than the demo fixture.
