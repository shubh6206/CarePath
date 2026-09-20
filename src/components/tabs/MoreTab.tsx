import React from 'react';
import { PatientProfile } from '../../types';
import {
  FileText,
  Phone,
  ShieldCheck,
  Bell,
  Cpu,
  RefreshCw,
  Upload,
  ChevronRight,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface MoreTabProps {
  patient: PatientProfile;
  onOpenDocumentViewer: (pageNumber?: number) => void;
  onOpenAwsArch: () => void;
  onOpenUpload: () => void;
  onResetDemo: () => void;
}

export const MoreTab: React.FC<MoreTabProps> = ({
  patient,
  onOpenDocumentViewer,
  onOpenAwsArch,
  onOpenUpload,
  onResetDemo,
}) => {
  // Call buttons only appear for numbers printed in the patient's paperwork
  const helplineDigits = patient.hospitalHelpline?.replace(/[^0-9+]/g, '');
  const emergencyDigits = patient.emergencyContact?.phone?.replace(/[^0-9+]/g, '');

  return (
    <div id="more-tab-view" className="space-y-4 pb-20 pt-1 px-4 sm:px-5 animate-fade-in">
      {/* Header */}
      <div className="pt-2">
        {/* Dynamic Patient & Facility Context Banner */}
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl px-3 py-1.5 mb-2 flex items-center justify-between text-[11px] text-amber-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold truncate max-w-[200px]">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">{patient.isDemo ? 'Demo patient · Fictional data' : 'Active Patient'}</span>
          </div>
          <span className="text-[10px] font-mono text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md truncate max-w-[170px]">
            {patient.hospitalName || 'Clinical Record'}
          </span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          More
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Caregiver records, clinical evidence, contacts, and safety settings.
        </p>
      </div>

      {/* 1. Recovery Summary Profile */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Recovery Summary
          </span>
          {patient.mrn && (
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
              MRN: {patient.mrn}
            </span>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Patient</span>
            <span className="font-bold text-slate-900">
              {patient.name}
              {patient.age ? ` (${patient.age} yrs)` : ''}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Procedure</span>
            <span className="font-semibold text-slate-800 text-right">{patient.procedure}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Surgeon</span>
            <span className="font-semibold text-slate-800">{patient.attendingPhysician}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Hospital</span>
            <span className="font-semibold text-slate-800">{patient.hospitalName}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-500">Caregiver</span>
            <span className="font-semibold text-slate-800">{patient.caregiverName}</span>
          </div>
        </div>
      </div>

      {/* 2. Discharge Document Record */}
      <button
        id="open-discharge-doc-more-btn"
        onClick={() => onOpenDocumentViewer(1)}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              Discharge Document Record
            </div>
            <div className="text-xs text-slate-500">
              Discharge paperwork & exact page citations
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </button>

      {/* 3. Emergency Contacts */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          Emergency & Hospital Contacts
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-bold text-slate-900">Hospital Helpline</div>
              <div className="text-slate-500">{patient.hospitalHelpline || 'Not documented'}</div>
            </div>
            {helplineDigits && (
              <a
                href={`tel:${helplineDigits}`}
                className="px-3 py-1.5 rounded-xl bg-teal-700 text-white font-bold text-[11px]"
              >
                Call
              </a>
            )}
          </div>

          {patient.emergencyContact && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <div className="font-bold text-slate-900">
                  Emergency Contact{patient.emergencyContact.relationship ? ` (${patient.emergencyContact.relationship})` : ''}
                </div>
                <div className="text-slate-500">
                  {patient.emergencyContact.name} ({patient.emergencyContact.phone || 'phone not documented'})
                </div>
              </div>
              {emergencyDigits && (
                <a
                  href={`tel:${emergencyDigits}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-bold text-[11px]"
                >
                  Call
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Notifications & Caregiver Alerts */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-slate-400" />
            Caregiver Notifications
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          SMS alerts are automatically dispatched to the verified caregiver endpoint if check-in symptoms match any documented discharge warning sign.
        </p>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
          <span className="text-slate-500">Caregiver Phone</span>
          <span className="font-mono font-bold text-slate-800">+1 800 555-0199</span>
        </div>
      </div>

      {/* 5. Clinical Safety & Privacy Boundary */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          Clinical Safety & Privacy Protocol
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          CarePath is <strong>strictly non-diagnostic</strong> and does not generate medical opinions or alter prescriptions. All recovery schedules, task intervals, and warning criteria are directly extracted from hospital discharge paperwork with verifiable page citations.
        </p>
      </div>

      {/* 6. Upload New Packet Option */}
      <button
        id="upload-new-doc-more-btn"
        onClick={onOpenUpload}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              Upload New Discharge Packet
            </div>
            <div className="text-xs text-slate-500">
              Process a fresh hospital PDF through the AWS ingestion pipeline
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </button>

      {/* 7. Judge & Developer Review Drawer Link */}
      <div className="pt-2">
        <button
          id="open-aws-arch-more-btn"
          onClick={onOpenAwsArch}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>How CarePath Works (AWS Pipeline for Judges)</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Inspect real S3, Textract, Bedrock, DynamoDB & SNS status
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* 8. Reset Demo State */}
      <div className="pt-1 text-center">
        <button
          id="reset-demo-more-btn"
          onClick={onResetDemo}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium py-2 px-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Recovery State to Defaults</span>
        </button>
      </div>

      {/* About CarePath Branding */}
      <div className="text-center pt-2 pb-6 text-slate-400 text-[11px] space-y-1">
        <div className="font-bold text-slate-600">CarePath • Evidence-Linked Recovery</div>
        <div>"Turn discharge instructions into a recovery plan families can actually follow."</div>
        <div>AWS Hackathon Vertical Slice • React + Node.js + AWS SDK v3</div>
      </div>
    </div>
  );
};
