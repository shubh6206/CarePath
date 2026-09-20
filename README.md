# CarePath — Evidence-Linked Healthcare Recovery Architecture (Local Edition)

> **AWS Student Hackathon Vertical Slice**  
> **Clinical Concept:** Patient-Facing Mobile Recovery App & Caregiver Alert System  
> **Safety Boundary:** Zero-Diagnosis Administrative Assistant with Verifiable Document Grounding

---

## A. Repository Assessment

CarePath is an evidence-grounded post-operative recovery companion that transforms complex hospital discharge packets into daily tasks, medication schedules, and red-flag warning triggers.

### Architectural Priorities:
1. **Local Development First:** 100% executable on a local workstation using LocalStack and local AI fixtures without requiring an AWS account, AWS credentials, CloudShell, or cloud billing.
2. **AWS SDK v3 Native:** All service calls (S3, DynamoDB, SNS) are structured with standard `@aws-sdk/client-*` v3 clients and commands (`PutObjectCommand`, `PutCommand`, `PublishCommand`), allowing direct promotion to live AWS cloud services by setting environment variables.
3. **Clinical Safety & Evidence Grounding:** No diagnoses are performed. Every medication dose, timeline task, and red flag is strictly cited back to an explicit source page (Pages 1–5) in the original discharge paperwork.
4. **Resilient Dual-Mode Execution:** If LocalStack is running, the app connects to `http://localhost:4566`. If LocalStack is not started, the application falls back gracefully to a verified in-memory recovery store and local alert simulator without crashing.

---

## B. Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                       CAREPATH LOCAL ARCHITECTURE                              |
+-------------------------------------------------------------------------------+

  [ Patient Discharge PDF ]
             |
             v
+-----------------------------+
|    Amazon S3 / LocalStack   |  <-- Bucket: carepath-documents
|     (Storage Layer)         |      Key: discharges/{docId}/discharge_summary.pdf
+-----------------------------+
             |
             v
+-----------------------------+
| Local Textract-Compatible   |  <-- Preserves exact page boundaries (Pages 1–5)
|      Extraction Layer       |      Normalized LINE blocks & source text
+-----------------------------+
             |
             v
+-----------------------------+
|   Clinical AI Abstraction   |  <-- Zero-Diagnosis System Prompt
| (LocalClinicalAIProvider)   |      Emits verified medications, activities, follow-ups,
|                             |      and red-flag warning signs with verbatim quotes
+-----------------------------+
             |
             v
+-----------------------------+
|  Partitioned DynamoDB       |  <-- Tables: carepath-patients, carepath-documents,
|   (LocalStack / Memory)     |              carepath-tasks, carepath-checkins
+-----------------------------+
             |
             +------------------------------+
             |                              |
             v                              v
+---------------------------+  +-------------------------------------------------+
| Mobile-First Patient UI   |  | Amazon SNS / LocalStack Caregiver Escalation    |
| - Daily Recovery Timeline |  | - Topic: carepath-caregiver-alerts              |
| - Med Tracker & "Why This"|  | - Evaluates Day 2 check-in symptoms against     |
| - Verbatim Source Viewer  |  |   Page 5 documented criteria                    |
| - Architecture Inspector  |  | - Logs to Local Alert Simulator with disclaimer |
+---------------------------+  +-------------------------------------------------+
```

---

## C. Files Modified
- `package.json`: Added `local:init`, `local:status`, `local:seed`, `local:reset` scripts; added AWS SDK v3 client libraries.
- `server.ts`: Added `/health` and `/api/health` reporting honest service connectivity; connected `/api/alerts/history`; pre-seeded recovery plan.
- `server/awsClient.ts`: Added client factories (`createS3Client`, `createDynamoClient`, `createSNSClient`) supporting dynamic `LOCALSTACK_ENDPOINT`, health ping caching, and fallback status.
- `server/checkInService.ts`: Connected symptom matching to `NotificationService` and `StorageService`.
- `src/services/api.ts`: Added `getHealth()` and `getAlertsHistory()`.
- `src/components/AwsArchitectureModal.tsx`: Updated with clear distinction between Local Implementation and Future AWS Deployment, plus a live Caregiver Alert Simulator panel.
- `src/components/UploadModal.tsx`: Updated step labels to reflect honest local pipeline processing.

---

## D. Files Created
- `docker-compose.yml`: Defines LocalStack container with `s3`, `dynamodb`, and `sns` on port 4566.
- `scripts/init-localstack.sh`: Container initialization script to provision S3 bucket, DynamoDB tables, and SNS topic on startup.
- `.env.local`: Local environment configuration with dummy credentials and localhost endpoints.
- `.env.example`: Template documenting local development flags and optional AWS production variables.
- `server/extraction/localExtractionService.ts`: Local Textract-compatible OCR/parsing service preserving 5-page boundaries.
- `server/ai/clinicalAIService.ts`: `ClinicalAIService` interface with `LocalClinicalAIProvider` and `BedrockClinicalAIProvider`.
- `server/ai/recoveryOutputSchema.ts`: Strips markdown fences from model output and validates it against `BedrockRecoveryOutput`.
- `server/ai/deterministicExtractor.ts`: Section-aware offline parser for uploaded documents (only emits text printed in the document).
- `server/storage/storageService.ts`: Partitioned multi-table DynamoDB and S3 storage layer with in-memory fallback.
- `server/notification/notificationService.ts`: LocalStack SNS publisher and Caregiver Alert Simulator with console logging.
- `server/scripts/initLocal.ts`: TypeScript script to provision LocalStack resources.
- `server/scripts/statusLocal.ts`: TypeScript script to inspect LocalStack health and list resources.
- `server/scripts/seedLocal.ts`: Seeds sample patient data and tasks into LocalStack.
- `server/scripts/resetLocal.ts`: Resets and purges local resources.

---

## E. Implementation Overview

### 1. Storage Layer (LocalStack S3)
- S3 Bucket: `carepath-documents`
- Uploaded PDFs or sample discharge packets are assigned a unique document ID (`doc-...`) and stored under `discharges/{docId}/{filename}`.

### 2. Local Textract-Compatible Extraction Layer
- Emulates Amazon Textract's page and line block hierarchy without calling remote APIs.
- Preserves Page 1 (Patient Header & Admission), Page 2 (Hospital Course), Page 3 (Medications), Page 4 (Diet & Follow-Up), and Page 5 (Red Flags).

### 3. Clinical AI Service Abstraction
- Interface: `ClinicalAIService`
- Implements `LocalClinicalAIProvider` (section-aware deterministic parser, with the verified demo fixture used only for `isDemo` uploads) and `BedrockClinicalAIProvider` (invokes Claude 3.5 Sonnet v2 on Amazon Bedrock when `BEDROCK_MODE=aws` and credentials exist, validating the JSON and falling back to the deterministic parser on failure).
- Every citation is checked against its source page and marked `VERIFIED` or `UNVERIFIED`; unverified quotes are shown with a warning, never silently replaced.
- Enforces strict zero-diagnosis rules: no invented dosages, no unsolicited medical opinions.

### 4. Database Layer (DynamoDB Local / LocalStack)
- Tables:
  - `carepath-patients` (PK: `patientId`)
  - `carepath-documents` (PK: `documentId`)
  - `carepath-tasks` (PK: `PK`, SK: `SK`)
  - `carepath-checkins` (PK: `PK`, SK: `SK`)

### 5. Notification Layer & Alert Simulator
- Topic: `carepath-caregiver-alerts`
- When a patient logs "Breathing: Difficult", "Fever: Yes", or "Pain: Worse", the service matches Page 5 criteria, publishes an event to SNS, and logs to the console:
  `🚨 [LOCAL DEMO — NO REAL SMS SENT] Caregiver Alert published to carepath-caregiver-alerts`

---

## F. Commands to Install and Run

### Option 1: Local Development with LocalStack (Docker)
```bash
# 1. Start LocalStack (S3, DynamoDB, SNS)
docker compose up -d

# 2. Initialize local AWS resources
npm run local:init

# 3. Seed demo patient data (Anita Sharma, Laparoscopic Cholecystectomy)
npm run local:seed

# 4. Check infrastructure status
npm run local:status

# 5. Start the web application
npm run dev
```

### Option 2: Local Development without Docker (Zero-Dependency Fallback)
```bash
# No Docker needed — the server automatically activates resilient local fallback
npm run dev
```

Access the application in your browser at: `http://localhost:3000`

---

## G. End-to-End Test Procedure

1. **Verify Health Endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```
   *Expected Response:*
   ```json
   {
     "status": "ok",
     "environment": "local",
     "services": {
       "s3": "connected" (or "local_storage", "aws"),
       "dynamodb": "connected" (or "local_database", "aws"),
       "sns": "connected" (or "local_notifications"),
       "clinicalAI": "deterministic_nlp_fixture" (or "bedrock_claude_active", "local_gemini_fallback"),
       "extraction": "local_pdf_parse" (or "amazon_textract")
     }
   }
   ```

2. **Verify Active Recovery Plan:**
   ```bash
   curl http://localhost:3000/api/recovery-plan/active
   ```
   Confirms 3 medications, daily ambulation tasks, Day 10 follow-up, and Page 5 warning signs with evidence quotes.

3. **Trigger Red-Flag Caregiver Escalation:**
   ```bash
   curl -X POST http://localhost:3000/api/check-in \
     -H "Content-Type: application/json" \
     -d '{"dayNumber": 2, "pain": "same", "fever": "no", "breathing": "difficult"}'
   ```
   *Result:* Triggers Page 5 documented action ("Call the hospital emergency line immediately (+1 800 555-0199)"), dispatches SNS event, and logs to the alert simulator.

4. **View Alert Simulator History:**
   ```bash
   curl http://localhost:3000/api/alerts/history
   ```

5. **Test via Mobile UI:**
   - Open `http://localhost:3000`.
   - Tap **"Check-In"** tab on the phone screen.
   - Select **"Difficult / Short of breath"** and submit.
   - Observe the emergency red-flag overlay with documented hospital contact information.
   - Click **"AWS Pipeline"** in the top bar to inspect the pipeline logs and recent SNS dispatches.

---

## H. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `LocalStack Gateway Connectivity: OFFLINE` | Docker container not started | Run `docker compose up -d`. The app will work normally in fallback mode even if LocalStack is stopped. |
| `ResourceInUseException` during `local:init` | Tables already created | Normal behavior; tables are idempotent. Run `npm run local:reset` if a fresh state is desired. |
| Port 3000 in use | Another dev instance running | Stop background processes or restart container. |
| Browser console shows WebSocket error | HMR disabled by design | Expected in AI Studio sandboxed container; preview reloads automatically. |

---

## I. Final Architecture Explanation for AWS Student Hackathon Judges

> *"Judges, CarePath addresses a critical vulnerability in post-operative healthcare: 1 in 5 patients suffers preventable adverse events after discharge because paper discharge packets are overwhelming and clinical instructions are easily lost.*
> 
> *Our architecture solves this by treating AWS as an active clinical extraction pipeline:*
> 1. *Discharge packets are ingested into **Amazon S3** with server-side encryption.*
> 2. ***Amazon Textract** extracts multi-column text and tables while strictly preserving physical page boundaries.*
> 3. ***Amazon Bedrock** uses a specialized **Zero-Diagnosis Clinical Prompt** to map recovery tasks, dosages, and emergency escalation paths. Crucially, every single item in the patient's timeline links directly back to verbatim source text on a specific page.*
> 4. *All recovery timelines and daily check-in histories are persisted in **Amazon DynamoDB**.*
> 5. *When a daily check-in identifies an escalating symptom, deterministic rules match against the documented Page 5 red flags and trigger **Amazon SNS** to alert designated family caregivers immediately.*
> 
> *For our development phase, we implemented this entire vertical slice using **AWS SDK v3** and **LocalStack**, ensuring 100% cloud architectural fidelity with zero cloud billing overhead."*
