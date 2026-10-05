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
  Clock,
  XCircle,
  Shield,
  Download,
  Building,
  Radio,
  FileText,
  HelpCircle,
  AlertTriangle
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
  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zipPassword, setZipPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Invalid file type: Please upload a password-protected .zip archive.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Invalid file type: Please upload a password-protected .zip archive.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadAndProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a password-protected .zip file.');
      return;
    }

    if (!zipPassword.trim()) {
      setError('Password is required to unlock this encrypted .zip file.');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgressStage('Streaming to in-memory buffer...');

    try {
      setTimeout(() => setUploadProgressStage('Decrypting ZIP contents in RAM...'), 400);
      setTimeout(() => setUploadProgressStage('Validating UIDAI EOD Schema & Computing Totals...'), 900);

      const response = await api.uploadEodZip(selectedFile, zipPassword.trim());

      setParsedData(response);
      onReportLoadedChange?.(true);
    } catch (err: any) {
      setError(err.message || 'Failed to extract and process the package.');
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
    setSelectedFile(null);
    setZipPassword('');
    setError(null);
    setSubmissionReceipt(null);
    setShowPaymentModal(false);
    onReportLoadedChange?.(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      // Immediately clear parsed data from client memory state
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
            Decrypt password-protected financial packages in RAM, reconcile total collections, and audit enrolment data.
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
      {/* VIEW A: FILE UPLOAD & EXTRACTION PIPELINE (When no report loaded) */}
      {/* ------------------------------------------------------------- */}
      {!parsedData && !submissionReceipt && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Box */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              <span>Upload Password-Protected EOD Package</span>
            </h2>

            <form onSubmit={handleUploadAndProcess} className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready to decrypt
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium underline mt-1"
                    >
                      Remove and choose different file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      Drag & drop password-protected <span className="font-mono text-indigo-600">.zip</span> file here
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Accepts standard UIDAI EOD status report archives containing either an HTML or CSV status report.
                    </p>
                    <span className="inline-block px-3 py-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-md shadow-2xs mt-2">
                      Browse Files
                    </span>
                  </div>
                )}
              </div>

              {/* Password Input Field */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label
                  htmlFor="zip-password"
                  className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5"
                >
                  Archive Decryption Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4 text-indigo-600" />
                  </div>
                  <input
                    id="zip-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password to unlock ZIP (e.g. Uidai@2026 for sample)"
                    value={zipPassword}
                    onChange={(e) => setZipPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Required to decrypt the encrypted file stream in RAM.</span>
                  <button
                    type="button"
                    onClick={() => setZipPassword('Uidai@2026')}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Use Sample Password (Uidai@2026)
                  </button>
                </div>
              </div>

              {/* Submit / Extract Button */}
              <button
                type="submit"
                disabled={uploading || !selectedFile || !zipPassword.trim()}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{uploadProgressStage || 'Processing in Memory...'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Decrypt & Reconcile in RAM</span>
                  </>
                )}
              </button>
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
                    <strong>Zero-Disk Storage:</strong> No ZIP files or extracted reports are saved to server hard disk.
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
                    <strong>Immediate Eviction:</strong> Buffers are cleared immediately upon aggregation and submission.
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
                <span>Need a test file?</span>
              </h3>
              <p className="text-xs text-indigo-900 leading-relaxed">
                Download a pre-encrypted sample UIDAI EOD package containing realistic enrolment records.
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
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. TOTAL AMOUNT CHARGED (Prominently displayed mathematical aggregation) */}
            <div className="bg-indigo-600 text-white p-5 rounded-xl shadow-md border border-indigo-500">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                <span>TOTAL AMOUNT CHARGED</span>
                <IndianRupee className="w-4 h-4 text-indigo-200" />
              </div>
              <div className="mt-2 text-3xl font-extrabold font-mono tabular-nums text-white">
                ₹{parsedData.summary.totalAmountCharged.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-[11px] text-indigo-200">
                Exact mathematical sum across all {parsedData.summary.totalRecords} rows
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
                <span>Updates: <strong className="font-mono text-slate-700">{parsedData.summary.countUpdate}</strong></span>
                <span>·</span>
                <span>New: <strong className="font-mono text-slate-700">{parsedData.summary.countNewEnrolment}</strong></span>
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
                  {parsedData.summary.countCompleted} <span className="text-[10px] text-slate-400 font-sans font-normal">Comp</span>
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-amber-600" title="InProcess">
                  {parsedData.summary.countInProcess} <span className="text-[10px] text-slate-400 font-sans font-normal">Proc</span>
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-rose-600" title="Rejected">
                  {parsedData.summary.countRejected} <span className="text-[10px] text-slate-400 font-sans font-normal">Rej</span>
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Completed · InProcess · Rejected
              </div>
            </div>

            {/* 4. GST & Package Info */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Tax & Format</span>
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900">
                ₹{parsedData.summary.totalGstAmount.toFixed(2)} <span className="text-xs font-normal text-slate-500">GST Applied</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate" title={parsedData.summary.fileName}>
                Format: <strong className="uppercase">{parsedData.summary.format}</strong> · {parsedData.summary.fileName}
              </div>
            </div>
          </div>

          {/* Metadata Card (if present in HTML report) */}
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
                    <span className="font-mono font-semibold text-slate-800">{parsedData.summary.metadata.operator}</span>
                  </div>
                )}
                {parsedData.summary.metadata.stationId && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Station ID</span>
                    <span className="font-mono font-semibold text-slate-800">{parsedData.summary.metadata.stationId}</span>
                  </div>
                )}
                {parsedData.summary.metadata.registrar && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Registrar</span>
                    <span className="font-mono font-semibold text-slate-800">{parsedData.summary.metadata.registrar}</span>
                  </div>
                )}
                {parsedData.summary.metadata.enrolmentAgency && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Agency</span>
                    <span className="font-mono font-semibold text-slate-800">{parsedData.summary.metadata.enrolmentAgency}</span>
                  </div>
                )}
                {parsedData.summary.metadata.clientVersion && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Client Version</span>
                    <span className="font-mono font-semibold text-slate-800">{parsedData.summary.metadata.clientVersion}</span>
                  </div>
                )}
                {parsedData.summary.metadata.dateRange && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Date Range</span>
                    <span className="font-semibold text-slate-800">{parsedData.summary.metadata.dateRange}</span>
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
              Verified mathematical total: <strong className="text-slate-900 font-mono">₹{parsedData.summary.totalAmountCharged.toFixed(2)}</strong> ({parsedData.records.length} records)
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
                <span>Submit Report</span>
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
          setZipPassword(pwd);
          setShowSampleModal(false);
        }}
      />
    </div>
  );
};
