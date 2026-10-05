import React from 'react';
import {
  CheckCircle,
  ShieldCheck,
  Printer,
  RotateCcw,
  IndianRupee,
  FileCheck,
  Calendar,
  User,
  Hash,
  Copy
} from 'lucide-react';
import type { Submission } from '../types.ts';

interface SubmissionSuccessModalProps {
  submission: Submission;
  onReset: () => void;
}

export const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  submission,
  onReset,
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyRefId = () => {
    navigator.clipboard.writeText(submission.submissionRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200 print:shadow-none print:border-none print:p-0">
        {/* Success Icon & Header */}
        <div className="text-center pb-6 border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-3">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            EOD Financial Reconciliation Complete
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Package verified, mathematically aggregated, and locked in audit log. All in-memory report variables have been purged.
          </p>
        </div>

        {/* Official Receipt Card */}
        <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Audit Receipt
              </span>
            </div>
            <button
              type="button"
              onClick={copyRefId}
              className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-mono transition-colors"
            >
              <span>{copied ? 'Copied!' : 'Copy Reference'}</span>
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Submission Reference</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{submission.submissionRef}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Date & Time</span>
              <span className="font-medium text-slate-800">
                {new Date(submission.timestamp).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Submitted By</span>
              <span className="font-medium text-slate-900">{submission.userName}</span>
              <span className="text-slate-400 font-mono text-[10px] block">ID: {submission.userId}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Payment UTR / Ref Number</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block text-xs">
                {submission.utrNumber || 'Verified Payment'}
              </span>
              <span className="text-emerald-600 font-semibold text-[10px] block mt-0.5">
                ● UPI Payment Confirmed
              </span>
            </div>
          </div>

          {/* Amount Highlight */}
          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                Total Reconciled Amount
              </span>
              <div className="text-[11px] text-indigo-600 mt-0.5">
                Calculated across {submission.recordCount} verified records
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-indigo-700">
              ₹{submission.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Record Breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase">Completed</span>
              <span className="font-bold text-emerald-700 font-mono text-sm tabular-nums">
                {submission.countCompleted}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase">In Process</span>
              <span className="font-bold text-amber-700 font-mono text-sm tabular-nums">
                {submission.countInProcess}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase">Rejected</span>
              <span className="font-bold text-rose-700 font-mono text-sm tabular-nums">
                {submission.countRejected}
              </span>
            </div>
          </div>

          {/* Cryptographic Seal */}
          <div className="pt-2 text-[10px] text-slate-400 font-mono break-all border-t border-slate-200">
            <div className="flex items-center gap-1 text-slate-500 font-semibold mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SHA-256 Audit Seal:</span>
            </div>
            <span>{submission.verificationHash}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Receipt</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Process New Package</span>
          </button>
        </div>
      </div>
    </div>
  );
};
