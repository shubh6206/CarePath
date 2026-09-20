import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  getAwsStatus,
  checkLocalStackConnectivity,
  getLocalStackEndpoint,
  isAwsCredentialsConfigured,
  isLocalStackMode,
  isTextractEnabled,
} from './server/awsClient';
import { DocumentService } from './server/documentService';
import { CheckInService } from './server/checkInService';
import { NotificationService } from './server/notification/notificationService';
import { getClinicalAIStatus } from './server/ai/clinicalAIService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Multer memory storage for direct file uploads
  const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 },
    storage: multer.memoryStorage(),
  });

  // JSON Body parser for document uploads and check-in records
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // Health & Architecture Status Endpoints
  // ==========================================

  const buildHealthPayload = async () => {
    const isLocalStackUp = await checkLocalStackConnectivity();
    const isLiveAws = isAwsCredentialsConfigured();
    const storageOnAws = !isLocalStackMode();

    return {
      status: 'ok',
      environment: isLiveAws ? 'aws' : 'local',
      timestamp: new Date().toISOString(),
      services: {
        s3: storageOnAws ? 'aws' : isLocalStackUp ? 'connected' : 'local_storage',
        dynamodb: storageOnAws ? 'aws' : isLocalStackUp ? 'connected' : 'local_database',
        // Caregiver alerts publish through LocalStack SNS or the local simulator
        sns: isLocalStackUp ? 'connected' : 'local_notifications',
        clinicalAI: getClinicalAIStatus(),
        extraction: isTextractEnabled() ? 'amazon_textract' : 'local_pdf_parse',
      },
      activeMode: isLiveAws
        ? 'LIVE_AWS_SERVICES'
        : isLocalStackUp
        ? 'LOCALSTACK_EMULATION (S3, DynamoDB, SNS)'
        : 'LOCAL_STANDALONE_PIPELINE (Local extraction, clinical structuring, & in-memory state)',
      localstack: {
        endpoint: getLocalStackEndpoint(),
        connected: isLocalStackUp,
      },
      disclaimer: 'Fictional clinical data · Local processing · Privacy protected',
    };
  };

  // 1. Root /health & /api/health
  app.get('/health', async (req, res) => {
    const payload = await buildHealthPayload();
    res.json(payload);
  });

  app.get('/api/health', async (req, res) => {
    const payload = await buildHealthPayload();
    res.json(payload);
  });

  app.get('/api/health/aws-status', (req, res) => {
    res.json(getAwsStatus());
  });

  // ==========================================
  // Document Ingestion & Pipeline Endpoints
  // ==========================================

  // List all uploaded documents
  app.get('/api/documents', (req, res) => {
    res.json(DocumentService.listDocuments());
  });

  // Activate a specific document plan
  app.post('/api/documents/:id/activate', (req, res) => {
    const success = DocumentService.setActiveDocument(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Document plan not found' });
    }
    res.json({
      success: true,
      activeDocumentId: req.params.id,
      recoveryPlan: DocumentService.getRecoveryPlan(req.params.id),
    });
  });

  // 2. Upload Document & Ingest Pipeline (Supports both multipart/form-data and JSON base64)
  app.post('/api/documents/upload', upload.single('file') as any, async (req: any, res: any) => {
    try {
      let filename = 'discharge_instructions.pdf';
      let buffer: Buffer | undefined;
      let isDemo = false;

      if (req.file) {
        filename = req.file.originalname || filename;
        buffer = req.file.buffer;
        isDemo = req.body?.isDemo === 'true' || req.body?.isDemo === true;
      } else {
        const body = req.body || {};
        filename = body.filename || filename;
        isDemo = Boolean(body.isDemo);

        if (body.fileBase64) {
          const cleanBase64 = body.fileBase64.replace(/^data:[^;]+;base64,/, '');
          buffer = Buffer.from(cleanBase64, 'base64');
        }
      }

      const hasFile = Boolean(buffer && buffer.length > 0);
      if (isDemo && hasFile) {
        return res.status(400).json({
          success: false,
          error: 'isDemo loads the built-in demo packet and cannot be combined with an uploaded file',
        });
      }
      if (!isDemo && !hasFile) {
        return res.status(400).json({ success: false, error: 'No document file was provided' });
      }

      const result = await DocumentService.runEndToEndPipeline(
        filename,
        buffer,
        isDemo
      );

      res.status(200).json({
        success: true,
        document: result.document,
        recoveryPlan: result.recoveryPlan,
      });
    } catch (error) {
      console.error('[API] Document upload error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to process document through pipeline',
      });
    }
  });

  // 3. Document Processing Status
  app.get('/api/documents/:id/status', (req, res) => {
    const doc = DocumentService.getDocumentRecord(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({
      id: doc.id,
      filename: doc.filename,
      status: doc.status,
      updated_at: doc.updated_at,
      page_count: doc.page_count,
    });
  });

  // 4. Document Textract Normalized Pages
  app.get('/api/documents/:id/pages', (req, res) => {
    const pagesOutput = DocumentService.getDocumentPages(req.params.id);
    if (!pagesOutput) {
      const activePlan = DocumentService.getRecoveryPlan(req.params.id) || DocumentService.getRecoveryPlan('active');
      if (activePlan?.pages) {
        return res.json({
          document_id: req.params.id,
          pages: activePlan.pages,
        });
      }
      return res.status(404).json({ error: 'Pages not found' });
    }
    res.json(pagesOutput);
  });

  // 5. Active or Specific Recovery Plan
  app.get('/api/recovery-plan/active', (req, res) => {
    const plan = DocumentService.getRecoveryPlan('active');
    if (!plan) {
      return res.status(404).json({ error: 'No active recovery plan available' });
    }
    res.json(plan);
  });

  app.get('/api/recovery-plan/:id', (req, res) => {
    const plan = DocumentService.getRecoveryPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Recovery plan not found' });
    }
    res.json(plan);
  });

  // ==========================================
  // Check-In & Red-Flag Escalation Endpoints
  // ==========================================

  // 6. Submit Daily Check-In & Deterministic Warning Match
  app.post('/api/check-in', async (req, res) => {
    try {
      const { dayNumber = 2, pain, fever, breathing, notes, documentId } = req.body;

      if (!pain || !fever || !breathing) {
        return res.status(400).json({
          error: 'Missing required check-in fields: pain, fever, breathing',
        });
      }

      const result = await CheckInService.recordCheckIn({
        dayNumber,
        pain,
        fever,
        breathing,
        notes,
        documentId,
      });

      res.status(200).json({
        success: true,
        record: result,
      });
    } catch (error) {
      console.error('[API] Check-in error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to record check-in',
      });
    }
  });

  // 7. Check-In History
  app.get('/api/check-in/history', (req, res) => {
    const docId = (req.query.documentId as string) || undefined;
    res.json(CheckInService.getHistory(docId));
  });

  // 8. Caregiver Alert Logs & Simulator History
  app.get('/api/alerts/history', (req, res) => {
    res.json(NotificationService.getAlertHistory());
  });

  // 9. SNS Notification Trigger Test (uses the active plan's documented warning sign)
  app.post('/api/alerts/sns-test', async (req, res) => {
    try {
      const { day = 2 } = req.body;
      const plan = DocumentService.getRecoveryPlan('active');
      const warningSign =
        plan?.warningSigns?.find((w: any) => w.triggerKey === 'breathing') ?? plan?.warningSigns?.[0];
      if (!warningSign) {
        return res.status(409).json({
          success: false,
          error: 'The active recovery plan has no documented warning signs to test with',
        });
      }

      const result = await CheckInService.sendSnsAlert(
        {
          dayNumber: day,
          pain: 'same',
          fever: 'no',
          breathing: 'difficult',
        },
        warningSign,
        plan.patient?.name,
        plan.patient?.emergencyContact?.phone
      );

      res.json({
        success: true,
        sns: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ==========================================
  // Pre-seed default recovery plan on start
  // ==========================================
  try {
    await DocumentService.runEndToEndPipeline(
      'Mrs_Sharma_PostOp_Cholecystectomy.pdf',
      undefined,
      true
    );
    console.log('[CarePath] Seeded verified demo recovery plan in memory & store');
  } catch (err) {
    console.warn('[CarePath] Seed warning:', err);
  }

  // ==========================================
  // Vite Middleware & Static Serving
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CarePath backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
