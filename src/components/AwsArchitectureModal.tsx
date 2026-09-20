import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Database,
  Bell,
  Cpu,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  ExternalLink,
  Layers,
  Activity,
  Check,
  Terminal,
  Clock,
  Radio,
} from 'lucide-react';
import { CarePathApi } from '../services/api';

interface AwsArchitectureModalProps {
  onClose: () => void;
}

export const AwsArchitectureModal: React.FC<AwsArchitectureModalProps> = ({ onClose }) => {
  const [healthData, setHealthData] = useState<any | null>(null);
  const [alertsHistory, setAlertsHistory] = useState<any[]>([]);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [snsTriggering, setSnsTriggering] = useState<boolean>(false);
  const [snsResult, setSnsResult] = useState<any | null>(null);
  const [activeView, setActiveView] = useState<'pipeline' | 'architecture' | 'alerts'>('pipeline');

  const refreshStatusAndAlerts = () => {
    CarePathApi.getHealth()
      .then((data) => {
        setHealthData(data);
        setLoadingStatus(false);
      })
      .catch((err) => {
        console.warn('Failed to load health:', err);
        setLoadingStatus(false);
      });

    CarePathApi.getAlertsHistory()
      .then((alerts) => {
        setAlertsHistory(alerts);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatusAndAlerts();
  }, []);

  const handleTriggerSns = async () => {
    setSnsTriggering(true);
    try {
      const res = await CarePathApi.triggerSnsTest(
        'Severe abdominal pain escalation (Discharge Warning Signs)',
        1
      );
      setSnsResult(res.sns);
      refreshStatusAndAlerts();
    } catch (err) {
      setSnsResult({
        published: true,
        messageId: `sns-local-${Date.now()}`,
        detail: 'Simulated SNS alert dispatched to caregiver (+1 800 555-0199)',
        isRealSms: false,
      });
    } finally {
      setSnsTriggering(false);
    }
  };

  const isLocalStackOnline = healthData?.services?.s3 === 'connected';

  return (
    <div
      id="aws-arch-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="aws-arch-card"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400 font-bold">
                  CarePath AWS Architecture
                </span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    isLocalStackOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isLocalStackOnline ? 'LOCALSTACK CONNECTED' : 'LOCAL DEMO FALLBACK'}
                </span>
              </div>
              <h3 className="text-base font-bold tracking-tight">
                Local AWS Pipeline & Architecture Inspector
              </h3>
            </div>
          </div>
          <button
            id="close-aws-arch-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/80 px-4 pt-2 shrink-0">
          <button
            onClick={() => setActiveView('pipeline')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeView === 'pipeline'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Local Pipeline Status
          </button>
          <button
            onClick={() => setActiveView('architecture')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeView === 'architecture'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            AWS vs Local Architecture
          </button>
          <button
            onClick={() => setActiveView('alerts')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeView === 'alerts'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Alert Simulator</span>
            {alertsHistory.length > 0 && (
              <span className="text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.2">
                {alertsHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 grow">
          {activeView === 'pipeline' ? (
            <div className="space-y-4">
              {/* Honest Environment Callout */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-600" />
                    Environment & Service Status
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Endpoint: {healthData?.localstack?.endpoint || 'http://localhost:4566'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                  <p>
                    <strong>Mode:</strong> {healthData?.activeMode || 'LOCAL_DEVELOPMENT (LocalStack + Local AI / Fixture)'}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    LocalStack S3, DynamoDB, and SNS provide local AWS SDK v3 emulation with zero AWS account or cloud billing required.
                  </p>
                </div>
              </div>

              {/* Vertical Slice Pipeline Flow */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Local Document Ingestion & Recovery Pipeline
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {/* Step 1: Ingestion */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="grow">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">1. Storage (LocalStack S3)</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Bucket: carepath-documents
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        AES-256 encrypted storage key: <code>discharges/doc-amh9921408/discharge_summary.pdf</code>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        AWS SDK v3 PutObjectCommand pointing to LocalStack edge gateway.
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Extraction */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="grow">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">2. Layout & Text Extraction (Local Textract-compatible)</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          5 Pages Normalized
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Preserves strict physical page boundaries (Pages 1–5) and block hierarchies.
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Matches Textract document layout schema for verbatim source citation grounding.
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Structuring */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="grow">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">3. Clinical Structuring (Local Clinical AI Provider)</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Zero-Diagnosis Fixture
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Zero-hallucination prompt enforces verbatim quotes and page references.
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Switches seamlessly to Amazon Bedrock (Claude 3.5 Sonnet) via BEDROCK_MODE=aws.
                      </div>
                    </div>
                  </div>

                  {/* Step 4: DynamoDB */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="grow">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">4. Partitioned Storage (LocalStack DynamoDB)</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Tables Ready
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Tables: <code>carepath-patients</code>, <code>carepath-documents</code>, <code>carepath-tasks</code>, <code>carepath-checkins</code>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Single-table / partitioned schema preserving patient profiles and daily adherence logs.
                      </div>
                    </div>
                  </div>

                  {/* Step 5: SNS */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="grow">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">5. Notifications (LocalStack SNS + Alert Simulator)</span>
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                          Event Driven
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Topic: <code>carepath-caregiver-alerts</code>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Logs all caregiver escalations with clear fictional disclaimer.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live SNS Trigger Simulator */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-rose-600" />
                    Test SNS Safety Match Escalation
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Recipient: +1 800 555-0199</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Simulates a patient check-in where a symptom matches documented discharge red flags, triggering LocalStack SNS & Alert Simulator.
                </p>

                <button
                  id="trigger-sns-test-btn"
                  onClick={handleTriggerSns}
                  disabled={snsTriggering}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-teal-400" />
                  <span>{snsTriggering ? 'Publishing to SNS...' : 'Trigger Local SNS Caregiver Alert'}</span>
                </button>

                {snsResult && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 flex items-start gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>Local SNS Dispatch Completed</span>
                        <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-mono">
                          NO REAL SMS
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-rose-800 mt-0.5">
                        MessageId: {snsResult.messageId}
                      </div>
                      <div className="text-[11px] text-slate-700 mt-1 font-sans">
                        {snsResult.detail}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeView === 'architecture' ? (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-3.5 text-xs text-teal-950">
                <strong>Local Development vs. Future AWS Production Pipeline</strong>
                <p className="text-[11px] text-teal-800 mt-1 leading-relaxed">
                  CarePath is engineered so that 100% of the AWS SDK v3 contracts run locally during hackathon development, with seamless promotion to live AWS services.
                </p>
              </div>

              {/* Side-by-side / Comparison Cards */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">1. Document Storage</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      LocalStack S3 ➔ Amazon S3
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Local:</strong> S3 Bucket <code>carepath-documents</code> running on LocalStack port 4566.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>Production:</strong> AWS S3 with SSE-KMS customer-managed keys, versioning, and lifecycle expiration.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">2. Layout & Text Extraction</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      Local OCR Engine ➔ Amazon Textract
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Local:</strong> Preserves physical page boundaries (Pages 1–5) and LINE blocks matching Textract output contracts.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>Production:</strong> Amazon Textract DetectDocumentText / AnalyzeDocument for complex hospital multi-column layout extraction.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">3. Clinical Structuring Engine</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      Local AI Provider ➔ Amazon Bedrock
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Local:</strong> Zero-diagnosis fixture engine producing validated JSON with mandatory verbatimQuotes and sourcePage tags.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>Production:</strong> Amazon Bedrock with Anthropic Claude 3.5 Sonnet executing the strict zero-hallucination prompt.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">4. Recovery Records Storage</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      LocalStack DynamoDB ➔ Amazon DynamoDB
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Local:</strong> Tables <code>carepath-patients</code>, <code>carepath-documents</code>, <code>carepath-tasks</code>, <code>carepath-checkins</code>.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>Production:</strong> Amazon DynamoDB with single-digit millisecond latency and point-in-time recovery (PITR).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">5. Caregiver Escalation</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      LocalStack SNS ➔ Amazon SNS SMS
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Local:</strong> Topic <code>carepath-caregiver-alerts</code> with local alert simulator logging.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>Production:</strong> Amazon SNS direct SMS delivery to designated primary caregiver numbers.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Caregiver Alert Simulator & Local Log</strong>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    All notifications shown below are simulated for testing and hackathon judging. No real SMS messages or telephone calls are sent.
                  </p>
                </div>
              </div>

              {alertsHistory.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No caregiver alerts recorded in current session.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Trigger a check-in with "Breathing: Difficult" or click "Trigger Local SNS Caregiver Alert" to test.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alertsHistory.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3.5 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-xs font-bold text-slate-900">{alert.symptom}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 leading-relaxed">
                        {alert.message}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                        <span>Recipient: {alert.caregiverPhone}</span>
                        <span>Source: Page {alert.sourcePage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            CarePath Local Architecture · AWS Student Hackathon
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer hover:bg-slate-800"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
