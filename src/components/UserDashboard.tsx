import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Lock,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  FileCheck2,
  RotateCcw,
  Send,
  IndianRupee,
  Layers,
  CheckCircle2,
  Shield,
  Download,
  Building,
  FileText,
  HelpCircle,
  Layers2,
  Trash2,
  Sparkles
} from 'lucide-react';
import type { User, ParsedReportResponse, Submission } from '../types.ts';
import { api } from '../lib/api.ts';
import { DataGrid } from './DataGrid.tsx';
import { SubmissionSuccessModal } from './SubmissionSuccessModal.tsx';
import { SampleGeneratorModal } from './SampleGeneratorModal.tsx';
import { PaymentUpiModal } from './PaymentUpiModal.tsx';

interface UserDashboardProps {
  user: User;
  onReportLoadedChange?: (loaded: boolean) => void;
  resetTrigger?: number;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  onReportLoadedChange,
}) => {
  // UC Package State
  const [selectedFileUc, setSelectedFileUc] = useState<File | null>(null);
  const [zipPasswordUc, setZipPasswordUc] = useState('');
  const [showPasswordUc, setShowPasswordUc] = useState(false);
  const [isDraggingUc, setIsDraggingUc] = useState(false);
  const fileInputRefUc = useRef<HTMLInputElement>(null);

  // ECMP Package State
  const [selectedFileEcmp, setSelectedFileEcmp] = useState<File | null>(null);
  const [zipPasswordEcmp, setZipPasswordEcmp] = useState('');
  const [showPasswordEcmp, setShowPasswordEcmp] = useState(false);
  const [isDraggingEcmp, setIsDraggingEcmp] = useState(false);
  const fileInputRefEcmp = useRef<HTMLInputElement>(null);

  // Processing & Feedback State
  const [uploading, setUploading] = useState(false);
  const [uploadProgressStage, setUploadProgressStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Parsed Report Data State
  const [parsedData, setParsedData] = useState<ParsedReportResponse | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<Submission | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Sample Modal State
  const [showSampleModal, setShowSampleModal] = useState(false);

  // Drop & Select handlers for UC
  const handleFileDropUc = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingUc(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Invalid file format: UC must be a password-protected .zip file.');
        return;
      }
      setSelectedFileUc(file);
    }
  };

  const handleFileSelectUc = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Invalid file format: UC must be a password-protected .zip file.');
        return;
      }
      setSelectedFileUc(file);
    }
  };

  // Drop & Select handlers for ECMP
  const handleFileDropEcmp = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingEcmp(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Invalid file format: ECMP must be a password-protected .zip file.');
        return;
      }
      setSelectedFileEcmp(file);
    }
  };

  const handleFileSelectEcmp = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Invalid file format: ECMP must be a password-protected .zip file.');
        return;
      }
      setSelectedFileEcmp(file);
    }
  };

  const handleUploadAndProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasUc = Boolean(selectedFileUc);
    const hasEcmp = Boolean(selectedFileEcmp);

    if (!hasUc && !hasEcmp) {
      setError('Please select at least one password-protected .zip package (UC or ECMP).');
      return;
    }

    if (hasUc && !zipPasswordUc.trim()) {
      setError('Password is required to unlock the UC archive.');
      return;
    }

    if (hasEcmp && !zipPasswordEcmp.trim()) {
      setError('Password is required to unlock the ECMP archive.');
      return;
    }

    setUploading(true);

    if (hasUc && hasEcmp) {
      setUploadProgressStage('Streaming UC & ECMP encrypted archives into volatile RAM buffer...');
      setTimeout(() => setUploadProgressStage('Decrypting UC Package in RAM with UC Password...'), 300);
      setTimeout(() => setUploadProgressStage('Decrypting ECMP Package in RAM with ECMP Password...'), 700);
      setTimeout(
        () => setUploadProgressStage('Combining UC & ECMP Enrolment Ledgers & Computing Total Payable Amount...'),
        1100
      );
    } else if (hasUc) {
      setUploadProgressStage('Streaming UC encrypted archive into volatile RAM buffer...');
      setTimeout(() => setUploadProgressStage('Decrypting UC Package in RAM with UC Password...'), 300);
      setTimeout(() => setUploadProgressStage('Parsing Enrolment Ledger & Computing Total Payable Amount...'), 700);
    } else {
      setUploadProgressStage('Streaming ECMP encrypted archive into volatile RAM buffer...');
      setTimeout(() => setUploadProgressStage('Decrypting ECMP Package in RAM with ECMP Password...'), 300);
      setTimeout(() => setUploadProgressStage('Parsing Enrolment Ledger & Computing Total Payable Amount...'), 700);
    }

    try {
      const response = await api.uploadEodZip(
        selectedFileUc,
        zipPasswordUc.trim(),
        selectedFileEcmp,
        zipPasswordEcmp.trim()
      );

      setParsedData(response);
      onReportLoadedChange?.(true);
    } catch (err: any) {
      setError(err.message || 'Failed to extract and reconcile package(s).');
      setParsedData(null);
      onReportLoadedChange?.(false);
    } finally {
      setUploading(false);
      setUploadProgressStage('');
    }
  };

  // Re-upload / Reset View: Clears current view from client and server RAM
  const handleReset = async () => {
    if (parsedData?.sessionId) {
      try {
        await api.clearSession(parsedData.sessionId);
      } catch {
        // ignore
      }
    }
    setParsedData(null);
    setSelectedFileUc(null);
    setZipPasswordUc('');
    setSelectedFileEcmp(null);
    setZipPasswordEcmp('');
    setError(null);
    setSubmissionReceipt(null);
    setShowPaymentModal(false);
    onReportLoadedChange?.(false);
    if (fileInputRefUc.current) fileInputRefUc.current.value = '';
    if (fileInputRefEcmp.current) fileInputRefEcmp.current.value = '';
  };

  // Final Report Submission with UTR Verification
  const handleSubmitReport = async (utrNumber: string) => {
    if (!parsedData) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitReport(parsedData.sessionId, parsedData.summary, utrNumber);
      setSubmissionReceipt(res.submission);
      setShowPaymentModal(false);
      setParsedData(null);
      onReportLoadedChange?.(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report with UTR.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Status Strip */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              EOD Enrolment Package Processor
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Station Operator Mode
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload <strong>UC</strong>, <strong>ECMP</strong>, or <strong>both</strong> archives in RAM. Uploading both is optional — users can upload just one (UC or ECMP) or combine both to compute the Total Payable Amount.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!parsedData && (
            <button
              type="button"
              onClick={() => setShowSampleModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Get Sample Protected ZIP</span>
            </button>
          )}

          {parsedData && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Re-upload / Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Final Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-rose-900">Processing Error</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-800 font-bold text-sm ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW A: UPLOAD PACKAGES (UC, ECMP, OR BOTH) */}
      {/* ------------------------------------------------------------- */}
      {!parsedData && !submissionReceipt && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Box */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
            {/* Header */}
            <div className="pb-4 mb-5 border-b border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Layers2 className="w-4 h-4 text-indigo-600" />
                  <span>Upload EOD Packages (UC & ECMP)</span>
                </h2>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Upload 1 or both packages
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Uploading both is not mandatory: you can upload only <strong>UC</strong>, only <strong>ECMP</strong>, or combine both archives. The system will decrypt in RAM and calculate the Total Payable Amount.
              </p>
            </div>

            <form onSubmit={handleUploadAndProcess} className="space-y-6">
              {/* UC PACKAGE SLOT */}
              <div className="p-4 sm:p-5 bg-indigo-50/40 border border-indigo-200/80 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-600 text-white tracking-wide">
                      UC
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      UC Package (.zip)
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      Optional if ECMP uploaded
                    </span>
                  </div>
                  {selectedFileUc && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFileUc(null);
                        setZipPasswordUc('');
                        if (fileInputRefUc.current) fileInputRefUc.current.value = '';
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Dropzone UC */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingUc(true);
                  }}
                  onDragLeave={() => setIsDraggingUc(false)}
                  onDrop={handleFileDropUc}
                  onClick={() => fileInputRefUc.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDraggingUc
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : selectedFileUc
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-slate-300 hover:border-indigo-300 bg-white'
                  }`}
                >
                  <input
                    ref={fileInputRefUc}
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelectUc}
                    className="hidden"
                  />

                  {selectedFileUc ? (
                    <div className="space-y-1">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {selectedFileUc.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {(selectedFileUc.size / 1024).toFixed(1)} KB · Ready to decrypt
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-800">
                        Choose or drop <span className="font-mono text-indigo-600 font-bold">UC</span> (.zip) file here
                      </div>
                      <p className="text-[11px] text-slate-400">
                        UIDAI Update Client status report archive (HTML or CSV)
                      </p>
                    </div>
                  )}
                </div>

                {/* Password Input UC */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="zip-password-uc"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Password for UC {selectedFileUc ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal lowercase">(optional)</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4 text-indigo-600" />
                    </div>
                    <input
                      id="zip-password-uc"
                      type={showPasswordUc ? 'text' : 'password'}
                      placeholder={selectedFileUc ? "Password to unlock UC ZIP (e.g. Uidai@2026)" : "Enter UC password when UC ZIP is chosen"}
                      value={zipPasswordUc}
                      onChange={(e) => setZipPasswordUc(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordUc(!showPasswordUc)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPasswordUc ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-end text-[11px]">
                    <button
                      type="button"
                      onClick={() => setZipPasswordUc('Uidai@2026')}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Use Sample Password (Uidai@2026)
                    </button>
                  </div>
                </div>
              </div>

              {/* ECMP PACKAGE SLOT */}
              <div className="p-4 sm:p-5 bg-emerald-50/40 border border-emerald-200/80 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-700 text-white tracking-wide">
                      ECMP
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      ECMP Package (.zip)
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      Optional if UC uploaded
                    </span>
                  </div>
                  {selectedFileEcmp && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFileEcmp(null);
                        setZipPasswordEcmp('');
                        if (fileInputRefEcmp.current) fileInputRefEcmp.current.value = '';
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Dropzone ECMP */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingEcmp(true);
                  }}
                  onDragLeave={() => setIsDraggingEcmp(false)}
                  onDrop={handleFileDropEcmp}
                  onClick={() => fileInputRefEcmp.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDraggingEcmp
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : selectedFileEcmp
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-slate-300 hover:border-emerald-300 bg-white'
                  }`}
                >
                  <input
                    ref={fileInputRefEcmp}
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelectEcmp}
                    className="hidden"
                  />

                  {selectedFileEcmp ? (
                    <div className="space-y-1">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {selectedFileEcmp.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {(selectedFileEcmp.size / 1024).toFixed(1)} KB · Ready to decrypt
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-800">
                        Choose or drop <span className="font-mono text-emerald-700 font-bold">ECMP</span> (.zip) file here
                      </div>
                      <p className="text-[11px] text-slate-400">
                        UIDAI Enrolment Client Multi Platform status report archive (HTML or CSV)
                      </p>
                    </div>
                  )}
                </div>

                {/* Password Input ECMP */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="zip-password-ecmp"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Password for ECMP {selectedFileEcmp ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal lowercase">(optional)</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4 text-emerald-700" />
                    </div>
                    <input
                      id="zip-password-ecmp"
                      type={showPasswordEcmp ? 'text' : 'password'}
                      placeholder={selectedFileEcmp ? "Password to unlock ECMP ZIP (e.g. Uidai@2026)" : "Enter ECMP password when ECMP ZIP is chosen"}
                      value={zipPasswordEcmp}
                      onChange={(e) => setZipPasswordEcmp(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordEcmp(!showPasswordEcmp)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPasswordEcmp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-end text-[11px]">
                    <button
                      type="button"
                      onClick={() => setZipPasswordEcmp('Uidai@2026')}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold"
                    >
                      Use Sample Password (Uidai@2026)
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit / Extract Button */}
              {(() => {
                const hasUc = Boolean(selectedFileUc);
                const hasEcmp = Boolean(selectedFileEcmp);
                const ucReady = hasUc && Boolean(zipPasswordUc.trim());
                const ecmpReady = hasEcmp && Boolean(zipPasswordEcmp.trim());
                const canSubmit = (ucReady && ecmpReady) || (ucReady && !hasEcmp) || (ecmpReady && !hasUc);

                let buttonLabel = 'Upload UC, ECMP, or Both Packages to Calculate Total';
                if (hasUc && hasEcmp) {
                  buttonLabel = 'Decrypt & Combine UC + ECMP Packages (Calculate Total Payable)';
                } else if (hasUc) {
                  buttonLabel = 'Decrypt UC Package (Calculate Total Payable)';
                } else if (hasEcmp) {
                  buttonLabel = 'Decrypt ECMP Package (Calculate Total Payable)';
                }

                return (
                  <button
                    type="submit"
                    disabled={uploading || !canSubmit}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{uploadProgressStage || 'Processing in Memory...'}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>{buttonLabel}</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </form>
          </div>

          {/* Side Info & Security Constraints Box */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 pb-3 border-b border-slate-100">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Security & Compliance</span>
              </div>
              <ul className="mt-3 space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero-Disk Storage:</strong> No ZIP files or extracted reports are saved to disk.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>RAM-Only Decryption:</strong> Encrypted zip bytes are decrypted strictly in volatile RAM memory buffers.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Flexible Reconciliation:</strong> Upload only UC, only ECMP, or combine both archives. The total payable amount is computed automatically.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Audit Immutability:</strong> Read-only presentation guarantees zero manual alterations.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-indigo-50/60 rounded-xl border border-indigo-100 p-5">
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-indigo-700" />
                <span>Need test archives?</span>
              </h3>
              <p className="text-xs text-indigo-900 leading-relaxed">
                Download pre-encrypted sample UIDAI EOD packages containing realistic HTML or CSV enrolment records for testing.
              </p>
              <button
                type="button"
                onClick={() => setShowSampleModal(true)}
                className="mt-3 w-full py-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open Sample Archive Generator</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW B: RECONCILED REPORT DATA (When report is parsed) */}
      {/* ------------------------------------------------------------- */}
      {parsedData && (
        <div className="space-y-6">
          {/* Dual/Single Package Consolidation Banner */}
          <div className="bg-linear-to-r from-indigo-900 via-indigo-800 to-emerald-900 text-white p-5 rounded-2xl shadow-md border border-indigo-700/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Layers2 className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    {parsedData.summary.isCombined ? 'UC & ECMP Reconciliation Active' : 'EOD Package Reconciliation Active'}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {parsedData.summary.isCombined
                      ? '2 Archives Combined (UC + ECMP)'
                      : `1 Archive Processed (${parsedData.summary.packageBreakdown?.[0]?.packageName?.includes('ECMP') ? 'ECMP' : 'UC'})`}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {parsedData.summary.isCombined
                    ? 'Consolidated Enrolment & Financial Ledger'
                    : 'Enrolment & Financial Ledger'}
                </h2>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {parsedData.summary.isCombined
                    ? 'Both UC and ECMP archives decrypted in RAM and merged into a single payable ledger.'
                    : 'Encrypted archive decrypted in RAM with complete audit verification and payable calculation.'}
                </p>
              </div>
            </div>

            {/* Total Payable Amount Pill */}
            <div className="bg-white/10 backdrop-blur-xs px-5 py-3 rounded-xl border border-white/20 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                Total Payable Amount
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
                ₹{parsedData.summary.totalAmountCharged.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* UC & ECMP Breakdown Cards (Dual Package) */}
          {parsedData.summary.packageBreakdown && parsedData.summary.packageBreakdown.length === 2 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>UC & ECMP Source Breakdown</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 font-semibold">
                  Source Ledgers Reconciled
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                {/* UC Card */}
                <div className="md:col-span-3 p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 uppercase tracking-wide">
                      <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-600 text-white">
                        UC
                      </span>
                      <span>UC Package</span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      {parsedData.summary.packageBreakdown[0].format}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-mono font-medium text-slate-800 truncate" title={parsedData.summary.packageBreakdown[0].packageName}>
                    {parsedData.summary.packageBreakdown[0].packageName}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-indigo-200/60">
                    <span className="text-xs text-slate-600">
                      {parsedData.summary.packageBreakdown[0].recordCount} records
                    </span>
                    <span className="text-base font-mono font-bold text-indigo-950 tabular-nums">
                      ₹{parsedData.summary.packageBreakdown[0].totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Plus sign */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-base shadow-2xs">
                    +
                  </span>
                </div>

                {/* ECMP Card */}
                <div className="md:col-span-3 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-700 text-white">
                        ECMP
                      </span>
                      <span>ECMP Package</span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      {parsedData.summary.packageBreakdown[1].format}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-mono font-medium text-slate-800 truncate" title={parsedData.summary.packageBreakdown[1].packageName}>
                    {parsedData.summary.packageBreakdown[1].packageName}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-emerald-200/60">
                    <span className="text-xs text-slate-600">
                      {parsedData.summary.packageBreakdown[1].recordCount} records
                    </span>
                    <span className="text-base font-mono font-bold text-emerald-950 tabular-nums">
                      ₹{parsedData.summary.packageBreakdown[1].totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Single Package Breakdown Card */}
          {parsedData.summary.packageBreakdown && parsedData.summary.packageBreakdown.length === 1 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Package Source Details</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 font-semibold">
                  Archive Reconciled
                </span>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] text-white ${
                        parsedData.summary.packageBreakdown[0].packageName.includes('ECMP')
                          ? 'bg-emerald-700'
                          : 'bg-indigo-600'
                      }`}
                    >
                      {parsedData.summary.packageBreakdown[0].packageName.includes('ECMP') ? 'ECMP' : 'UC'}
                    </span>
                    <span>{parsedData.summary.packageBreakdown[0].packageName}</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                    {parsedData.summary.packageBreakdown[0].format}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-600">
                    {parsedData.summary.packageBreakdown[0].recordCount} records
                  </span>
                  <span className="text-base font-mono font-bold text-slate-900 tabular-nums">
                    ₹{parsedData.summary.packageBreakdown[0].totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. TOTAL PAYABLE AMOUNT */}
            <div className="bg-indigo-600 text-white p-5 rounded-xl shadow-md border border-indigo-500">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                <span>TOTAL PAYABLE AMOUNT</span>
                <IndianRupee className="w-4 h-4 text-indigo-200" />
              </div>
              <div className="mt-2 text-3xl font-extrabold font-mono tabular-nums text-white">
                ₹{parsedData.summary.totalAmountCharged.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-[11px] text-indigo-200">
                {parsedData.summary.isCombined
                  ? `Combined payable total across ${parsedData.summary.totalRecords} records from UC and ECMP`
                  : `Payable total across ${parsedData.summary.totalRecords} records`}
              </div>
            </div>

            {/* 2. Total Records & Type Split */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Total Transactions</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {parsedData.summary.totalRecords}
              </div>
              <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                <span>
                  Updates: <strong className="font-mono text-slate-700">{parsedData.summary.countUpdate}</strong>
                </span>
                <span>·</span>
                <span>
                  New: <strong className="font-mono text-slate-700">{parsedData.summary.countNewEnrolment}</strong>
                </span>
              </div>
            </div>

            {/* 3. Status Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Status Breakdown</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-xl font-bold font-mono tabular-nums text-emerald-600" title="Completed">
                  {parsedData.summary.countCompleted}{' '}
                  <span className="text-[10px] text-slate-400 font-sans font-normal">Comp</span>
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-amber-600" title="InProcess">
                  {parsedData.summary.countInProcess}{' '}
                  <span className="text-[10px] text-slate-400 font-sans font-normal">Proc</span>
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-rose-600" title="Rejected">
                  {parsedData.summary.countRejected}{' '}
                  <span className="text-[10px] text-slate-400 font-sans font-normal">Rej</span>
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Completed · InProcess · Rejected
              </div>
            </div>

            {/* 4. GST & Format */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Tax & Format</span>
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900">
                ₹{parsedData.summary.totalGstAmount.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">GST Applied</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate" title={parsedData.summary.fileName}>
                Format: <strong className="uppercase">{parsedData.summary.format}</strong>
              </div>
            </div>
          </div>

          {/* Metadata Card (if present) */}
          {parsedData.summary.metadata && Object.keys(parsedData.summary.metadata).length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                <span>Station & Enrolment Client Metadata</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                {parsedData.summary.metadata.operator && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Operator ID</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {parsedData.summary.metadata.operator}
                    </span>
                  </div>
                )}
                {parsedData.summary.metadata.stationId && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Station ID</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {parsedData.summary.metadata.stationId}
                    </span>
                  </div>
                )}
                {parsedData.summary.metadata.registrar && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Registrar</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {parsedData.summary.metadata.registrar}
                    </span>
                  </div>
                )}
                {parsedData.summary.metadata.enrolmentAgency && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Agency</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {parsedData.summary.metadata.enrolmentAgency}
                    </span>
                  </div>
                )}
                {parsedData.summary.metadata.clientVersion && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Client Version</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {parsedData.summary.metadata.clientVersion}
                    </span>
                  </div>
                )}
                {parsedData.summary.metadata.reportDate && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Report Date</span>
                    <span className="font-semibold text-slate-800">
                      {parsedData.summary.metadata.reportDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Responsive Immutable Data Grid */}
          <DataGrid records={parsedData.records} />

          {/* Bottom Action Footer */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="text-xs text-slate-500">
              Total Payable: <strong className="text-slate-900 font-mono text-sm">₹{parsedData.summary.totalAmountCharged.toFixed(2)}</strong> across {parsedData.records.length} records (UC + ECMP)
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-upload / Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Pay ₹{parsedData.summary.totalAmountCharged.toFixed(2)} & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Pay / UPI Payment & UTR Submission Modal */}
      {showPaymentModal && parsedData && (
        <PaymentUpiModal
          summary={parsedData.summary}
          user={user}
          onSuccessSubmit={handleSubmitReport}
          onClose={() => setShowPaymentModal(false)}
          submitting={submitting}
          submissionError={error}
        />
      )}

      {/* Submission Success Modal (Receipt) */}
      {submissionReceipt && (
        <SubmissionSuccessModal
          submission={submissionReceipt}
          onReset={handleReset}
        />
      )}

      {/* Sample Archive Generator Modal */}
      <SampleGeneratorModal
        isOpen={showSampleModal}
        onClose={() => setShowSampleModal(false)}
        onSelectSamplePassword={(pwd) => {
          setZipPasswordUc(pwd);
          setZipPasswordEcmp(pwd);
          setShowSampleModal(false);
        }}
      />
    </div>
  );
};
