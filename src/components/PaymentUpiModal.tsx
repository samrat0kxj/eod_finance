import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  IndianRupee,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Lock,
  ArrowRight,
  Info,
  Smartphone,
  Sparkles
} from 'lucide-react';
import type { ReportSummary, UpiConfig, User } from '../types.ts';
import { api } from '../lib/api.ts';

interface PaymentUpiModalProps {
  summary: ReportSummary;
  user: User;
  onSuccessSubmit: (utr: string) => Promise<void>;
  onClose: () => void;
  submitting: boolean;
  submissionError: string | null;
}

export const PaymentUpiModal: React.FC<PaymentUpiModalProps> = ({
  summary,
  user,
  onSuccessSubmit,
  onClose,
  submitting,
  submissionError,
}) => {
  const [upiConfig, setUpiConfig] = useState<UpiConfig>({
    upiId: 'uidai.eod@okhdfcbank',
    payeeName: 'UIDAI EOD Authority',
    enabled: true,
    updatedAt: '',
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState<string | null>(null);

  // Fetch receiver UPI details from server
  useEffect(() => {
    const fetchUpi = async () => {
      try {
        const res = await api.getUpiConfig();
        if (res.upiConfig) {
          setUpiConfig(res.upiConfig);
        }
      } catch {
        // fallback to default
      }
    };
    fetchUpi();
  }, []);

  // Generate Google Pay compatible standard UPI payment URL and QR Code
  useEffect(() => {
    const amountStr = summary.totalAmountCharged.toFixed(2);
    const cleanUpi = upiConfig.upiId || 'uidai.eod@okhdfcbank';
    const cleanPayee = upiConfig.payeeName || 'UIDAI EOD Authority';
    const txnNote = `EOD Settlement ${user.userId}`;

    // Standard NPCI UPI URI Specification (Native Google Pay / PhonePe / Paytm / BHIM)
    const upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(
      cleanPayee
    )}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(txnNote)}`;

    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Failed to generate UPI QR:', err));
  }, [upiConfig, summary.totalAmountCharged, user.userId]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleQuickDemoUtr = () => {
    // Generate realistic 12-digit Indian banking UTR for instant demo testing
    const demoUtr = '4' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
    setUtrNumber(demoUtr);
    setUtrError(null);
  };

  const handleSubmitWithUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = utrNumber.trim();
    if (!clean) {
      setUtrError('Please enter the 12-digit UTR / UPI reference number from your payment app.');
      return;
    }
    if (clean.length < 6) {
      setUtrError('UTR number must be at least 6 characters (typically 12 digits for UPI payments).');
      return;
    }

    setUtrError(null);
    await onSuccessSubmit(clean);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Google Pay / UPI Settlement
              </h3>
              <p className="text-xs text-slate-500">
                Pay EOD collection and submit UTR to save report
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
          >
            ×
          </button>
        </div>

        {/* Global Errors */}
        {(submissionError || utrError) && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block">Submission Required</span>
              <span>{submissionError || utrError}</span>
            </div>
          </div>
        )}

        {/* Amount to Pay Banner */}
        <div className="mt-4 p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
              Total Amount to Pay
            </span>
            <span className="text-xs text-indigo-700">
              Across {summary.totalRecords} verified enrolment records
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-indigo-700 tabular-nums">
            ₹{summary.totalAmountCharged.toFixed(2)}
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="mt-4 text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-slate-200">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Google Pay Supported UPI QR Code"
                className="w-44 h-44 sm:w-48 sm:h-48 mx-auto object-contain"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          {/* Supported Apps Badges */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-600">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>Supported: Google Pay · PhonePe · Paytm · BHIM UPI</span>
          </div>

          {/* UPI ID Copy Field */}
          <div className="mt-3 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
            <span className="text-slate-500 text-[11px]">UPI ID:</span>
            <span className="font-mono font-bold text-slate-800 select-all">
              {upiConfig.upiId}
            </span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="text-indigo-600 hover:text-indigo-800 transition-colors p-1"
              title="Copy UPI ID"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            Payee: {upiConfig.payeeName}
          </div>
        </div>

        {/* Form: UTR Verification Input */}
        <form onSubmit={handleSubmitWithUtr} className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="utr-input"
                className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1"
              >
                <span>Enter Payment UTR / Ref Number</span>
                <span className="text-rose-500">*</span>
              </label>

              <button
                type="button"
                onClick={handleQuickDemoUtr}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Quick Fill Test UTR</span>
              </button>
            </div>

            <div className="relative">
              <input
                id="utr-input"
                type="text"
                required
                maxLength={24}
                placeholder="e.g. 428190348123 (12-digit UPI reference)"
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value.replace(/\s+/g, ''));
                  setUtrError(null);
                }}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono tracking-wider border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              Find this 12-digit number under transaction details in Google Pay / UPI app after successful payment.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !utrNumber.trim()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying & Saving...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify UTR & Save Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
