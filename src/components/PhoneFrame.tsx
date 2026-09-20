import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Maximize2,
  Cpu,
  FileText,
  AlertTriangle,
  RotateCcw,
  Wifi,
  Battery,
  Signal,
  Upload,
  Monitor,
} from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  bottomNav?: React.ReactNode;
  onOpenAwsArch: () => void;
  onOpenDocumentViewer: (page?: number) => void;
  onTriggerBreathingAlert: () => void;
  onResetDemo: () => void;
  onOpenUpload: () => void;
  onSwitchToDesktop?: () => void;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  bottomNav,
  onOpenAwsArch,
  onOpenDocumentViewer,
  onTriggerBreathingAlert,
  onResetDemo,
  onOpenUpload,
  onSwitchToDesktop,
}) => {
  const [currentTime, setCurrentTime] = useState('9:41');
  const [phoneSize, setPhoneSize] = useState<'standard' | 'large' | 'max'>('large');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    standard: 'w-[420px] max-w-full h-[min(880px,calc(100vh-80px))] min-h-[580px]',
    large: 'w-[460px] max-w-full h-[min(930px,calc(100vh-70px))] min-h-[640px]',
    max: 'w-[510px] max-w-full h-[min(960px,calc(100vh-60px))] min-h-[680px]',
  }[phoneSize];

  return (
    <div
      id="phone-frame-wrapper"
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-950 flex flex-col justify-between items-center select-text"
    >
      {/* Top Desktop Control Bar (Visible on md+ screens) */}
      <header className="w-full max-w-6xl shrink-0 px-4 pt-2.5 pb-2 hidden md:flex items-center justify-between bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-md text-white mt-2 mb-1 mx-auto z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500 text-slate-950 font-extrabold flex items-center justify-center text-xs">
            CP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">
                CarePath
              </span>
              <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                Fixed Mobile Screen
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full hidden lg:inline">
                Demo patient · Fictional data
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Evidence-linked recovery plan generated from hospital discharge paperwork
            </p>
          </div>
        </div>

        {/* Shortcuts for Judging and Testing */}
        <div className="flex items-center gap-2">
          {/* Phone Frame Size Selector */}
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 hidden xl:inline">
              Size:
            </span>
            <button
              onClick={() => setPhoneSize('standard')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                phoneSize === 'standard'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Standard Phone (390px)"
            >
              390px
            </button>
            <button
              onClick={() => setPhoneSize('large')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                phoneSize === 'large'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Large Phone (440px - Default)"
            >
              440px
            </button>
            <button
              onClick={() => setPhoneSize('max')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                phoneSize === 'max'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Extra Large (480px)"
            >
              480px
            </button>
          </div>

          {/* Quick Trigger for Judging Demo: Safety warning */}
          <button
            id="judge-trigger-safety-btn"
            onClick={onTriggerBreathingAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer"
            title="Test Warning Sign Match"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Test Safety Match</span>
          </button>

          {/* AWS Architecture Modal */}
          <button
            id="judge-open-aws-btn"
            onClick={onOpenAwsArch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            title="AWS Cloud Architecture & Ingestion Pipeline"
          >
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden lg:inline">AWS Pipeline</span>
          </button>

          {/* Document Viewer */}
          <button
            id="judge-open-doc-btn"
            onClick={() => onOpenDocumentViewer(1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            title="Inspect Discharge PDF"
          >
            <FileText className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden lg:inline">Original PDF</span>
          </button>

          {/* Upload PDF */}
          <button
            id="judge-open-upload-btn"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            title="Upload Discharge PDF"
          >
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden lg:inline">Upload</span>
          </button>

          {/* Reset Demo */}
          <button
            id="judge-reset-demo-btn"
            onClick={onResetDemo}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Reset Demo State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Viewport Mode Switcher: Desktop Mode */}
          {onSwitchToDesktop && (
            <button
              id="switch-to-desktop-btn"
              onClick={onSwitchToDesktop}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer ml-1"
              title="Open full-screen Desktop Patient Portal"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop Mode</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container: Centers the fixed phone frame and prevents screen scroll */}
      <main className="flex-1 flex items-center justify-center w-full overflow-hidden p-1 md:p-2 pb-2 md:pb-2.5">
        {/* Fixed Mobile Device Frame (Exact realistic smartphone dimensions) */}
        <div
          id="mobile-phone-device"
          className={`shrink-0 ${sizeClasses} bg-[#F4F6F8] text-[#1E293B] rounded-[42px] md:rounded-[46px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-[8px] md:border-[9px] border-slate-800 ring-1 ring-slate-700/60 flex flex-col overflow-hidden relative transition-all duration-200`}
        >
          {/* Simulated Mobile Device Top Header (Camera notch / pill + Status bar) - FIXED SHRINK-0 */}
          <div
            id="phone-status-bar"
            className="shrink-0 bg-[#F4F6F8]/95 backdrop-blur-md px-6 pt-3 pb-2 flex items-center justify-between text-xs font-semibold text-slate-800 select-none z-30 border-b border-slate-200/50"
          >
            {/* Clock */}
            <span className="text-[13px] font-bold tracking-tight">
              {currentTime}
            </span>

            {/* Simulated Dynamic Island / Speaker notch */}
            <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center gap-2 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-slate-900/90 ring-1 ring-slate-700" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
            </div>

            {/* Mobile Status Icons */}
            <div className="flex items-center gap-1.5 text-slate-700">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center gap-0.5">
                <Battery className="w-4 h-4 fill-slate-700" />
              </div>
            </div>
          </div>

          {/* INTERNAL SCROLL AREA: The content scrolls strictly inside the phone screen */}
          <div
            id="phone-internal-scroll-area"
            className="flex-1 overflow-y-auto overscroll-contain relative scroll-smooth"
          >
            {children}
          </div>

          {/* Bottom Navigation Bar - FIXED SHRINK-0 */}
          {bottomNav && (
            <div id="phone-fixed-bottom-nav" className="shrink-0 z-30">
              {bottomNav}
            </div>
          )}

          {/* Simulated Bottom Home Indicator Bar on mobile phone frame */}
          <div className="shrink-0 h-4 bg-white/95 backdrop-blur-xs flex items-center justify-center pointer-events-none z-30 pb-1 border-t border-slate-100">
            <div className="w-32 h-1 bg-slate-900/30 rounded-full" />
          </div>
        </div>
      </main>
    </div>
  );
};
