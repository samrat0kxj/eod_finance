import React, { useState } from 'react';
import { Download, FileCode, FileSpreadsheet, Lock, CheckCircle2, ShieldCheck, Key } from 'lucide-react';

interface SampleGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSamplePassword?: (pwd: string) => void;
}

export const SampleGeneratorModal: React.FC<SampleGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSelectSamplePassword,
}) => {
  const [downloadingFormat, setDownloadingFormat] = useState<'html' | 'csv' | null>(null);
  const samplePassword = 'Uidai@2026';

  if (!isOpen) return null;

  const handleDownload = async (format: 'html' | 'csv') => {
    setDownloadingFormat(format);
    try {
      const response = await fetch(`/api/sample-zip?format=${format}&password=${encodeURIComponent(samplePassword)}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `UIDAI_Protected_${format.toUpperCase()}_Report.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (onSelectSamplePassword) {
        onSelectSamplePassword(samplePassword);
      }
    } catch (err: any) {
      alert('Could not download sample ZIP: ' + err.message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Download Test UIDAI Protected Packages
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold"
          >
            ×
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-600 leading-relaxed">
          Test the in-memory extraction pipeline with real password-protected UIDAI EOD status reports.
          Choose either the <strong>HTML status report</strong> or <strong>CSV report</strong>.
        </p>

        {/* Password Notice Card */}
        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <Key className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold block">Archive Unlock Password:</span>
              <span className="font-mono font-bold text-amber-800 tracking-wider text-sm select-all">
                {samplePassword}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(samplePassword);
              if (onSelectSamplePassword) onSelectSamplePassword(samplePassword);
            }}
            className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
          >
            Copy & Fill
          </button>
        </div>

        {/* Options Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1: HTML Report */}
          <div className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>HTML Status Report (.zip)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Standard client EOD report with registrar & agency headers + details view table.
              </p>
            </div>

            <button
              type="button"
              disabled={downloadingFormat === 'html'}
              onClick={() => handleDownload('html')}
              className="mt-3 w-full py-2 px-3 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {downloadingFormat === 'html' ? (
                <span>Generating ZIP...</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download HTML ZIP</span>
                </>
              )}
            </button>
          </div>

          {/* Option 2: CSV Report */}
          <div className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>CSV EOD Report (.zip)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Comma-separated report with TOTAL_AMOUNT_CHARGED, GST, status and reject reasons.
              </p>
            </div>

            <button
              type="button"
              disabled={downloadingFormat === 'csv'}
              onClick={() => handleDownload('csv')}
              className="mt-3 w-full py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {downloadingFormat === 'csv' ? (
                <span>Generating ZIP...</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV ZIP</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Generated strictly in-memory</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
