import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Users,
  Copy,
  Check,
  Key,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileText
} from 'lucide-react';
import type { BulkUploadResult, BulkUserRow } from '../types.ts';
import { api, getStoredToken } from '../lib/api.ts';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: BulkUploadResult) => void;
}

type InputMode = 'file' | 'paste';

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<InputMode>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedCsv, setPastedCsv] = useState('');
  const [defaultPassword, setDefaultPassword] = useState('Operator@123');
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState<BulkUserRow[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // CSV Text Parser helper
  const parseCsvText = (text: string): BulkUserRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    // Check header
    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes('name') ||
      firstLine.includes('user') ||
      firstLine.includes('id') ||
      firstLine.includes('mobile');

    let startIndex = 0;
    let nameIdx = 0;
    let userIdIdx = 1;
    let mobileIdx = 2;
    let passIdx = 3;
    let roleIdx = 4;

    if (hasHeader) {
      startIndex = 1;
      const headers = lines[0]
        .split(',')
        .map((h) => h.replace(/["']/g, '').trim().toLowerCase());

      const fName = headers.findIndex((h) => h.includes('name'));
      const fUser = headers.findIndex(
        (h) => h.includes('user') || h.includes('operator') || h === 'id'
      );
      const fMobile = headers.findIndex(
        (h) => h.includes('mobile') || h.includes('phone') || h.includes('contact')
      );
      const fPass = headers.findIndex((h) => h.includes('pass'));
      const fRole = headers.findIndex((h) => h.includes('role'));

      if (fName !== -1) nameIdx = fName;
      if (fUser !== -1) userIdIdx = fUser;
      if (fMobile !== -1) mobileIdx = fMobile;
      if (fPass !== -1) passIdx = fPass;
      if (fRole !== -1) roleIdx = fRole;
    }

    const rows: BulkUserRow[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
      if (parts.length < 2) continue;

      const name = parts[nameIdx] || '';
      const userId = parts[userIdIdx] || '';
      const mobileNumber = parts[mobileIdx] || '';
      const password = parts[passIdx] ? parts[passIdx] : undefined;
      const role =
        parts[roleIdx] && parts[roleIdx].toLowerCase() === 'admin' ? 'admin' : 'user';

      if (name || userId) {
        rows.push({ name, userId, mobileNumber, password, role });
      }
    }

    return rows;
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setGeneralError(null);
    setParsingError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        setParsingError('Please upload a valid .csv file.');
        return;
      }
      setSelectedFile(file);
      const text = await file.text();
      const parsed = parseCsvText(text);
      setPreviewRows(parsed);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneralError(null);
    setParsingError(null);

    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        setParsingError('Please upload a valid .csv file.');
        return;
      }
      setSelectedFile(file);
      const text = await file.text();
      const parsed = parseCsvText(text);
      setPreviewRows(parsed);
    }
  };

  const handlePasteChange = (val: string) => {
    setPastedCsv(val);
    setGeneralError(null);
    setParsingError(null);
    if (val.trim()) {
      const parsed = parseCsvText(val);
      setPreviewRows(parsed);
    } else {
      setPreviewRows([]);
    }
  };

  const handleDownloadTemplate = () => {
    const templateCsv = `Name,User ID,Mobile Number,Password,Role\nSuresh Verma,operator05,9876543211,Operator@123,user\nAnita Desai,operator06,9876543212,Operator@123,user\nVikram Singh,operator07,9876543213,Operator@123,user\nDeepak Joshi,operator08,9876543214,Operator@123,user\n`;
    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'UIDAI_Operators_Bulk_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleProcessUpload = async () => {
    setGeneralError(null);
    setUploading(true);

    try {
      let res: { success: boolean; result: BulkUploadResult };

      if (mode === 'file' && selectedFile) {
        res = await api.bulkUploadUsers(selectedFile, defaultPassword);
      } else if (mode === 'paste' && previewRows.length > 0) {
        res = await api.bulkUploadRows(previewRows, defaultPassword);
      } else {
        setGeneralError('Please upload a CSV file or paste valid operator records.');
        setUploading(false);
        return;
      }

      setUploadResult(res.result);
      onSuccess(res.result);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to process bulk operator upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleResetModal = () => {
    setSelectedFile(null);
    setPastedCsv('');
    setPreviewRows([]);
    setUploadResult(null);
    setGeneralError(null);
    setParsingError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-5 sm:p-7 flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bulk Onboard Enrolment Operators
              </h3>
              <p className="text-xs text-slate-500">
                Quickly register multiple operators via CSV upload or copy-paste
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              title="Download standardized CSV template"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 ml-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Global Errors */}
        {(generalError || parsingError) && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span>{generalError || parsingError}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="mt-4 overflow-y-auto grow space-y-4 pr-1">
          {!uploadResult ? (
            <>
              {/* Input Mode Selector */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  className={`w-1/2 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    mode === 'file'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  <span>Upload CSV File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`w-1/2 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    mode === 'paste'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Paste CSV / Excel Data</span>
                </button>
              </div>

              {/* Mode 1: File Drop Zone */}
              {mode === 'file' && (
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : selectedFile
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center">
                        <FileSpreadsheet className="w-9 h-9 text-emerald-600 mb-2" />
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {selectedFile.name}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB · {previewRows.length} operators detected
                        </span>
                        <span className="text-[11px] text-indigo-600 font-semibold mt-2 underline">
                          Click to select a different file
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="w-9 h-9 text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700">
                          Click to upload or drag & drop operator CSV file
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">
                          Accepts .csv with columns: Name, User ID, Mobile Number, Password, Role
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Paste CSV */}
              {mode === 'paste' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Paste CSV Records (Comma Separated)
                  </label>
                  <textarea
                    rows={5}
                    placeholder={`Name,User ID,Mobile Number,Password,Role\nSuresh Verma,operator05,9876543211,Operator@123,user\nAnita Desai,operator06,9876543212,Operator@123,user`}
                    value={pastedCsv}
                    onChange={(e) => handlePasteChange(e.target.value)}
                    className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400">
                    Directly paste rows copied from Google Sheets or Excel. Header row is automatically detected.
                  </p>
                </div>
              )}

              {/* Default Password Setting */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Default Account Password</span>
                  <span className="text-slate-500 text-[11px]">
                    Applied if a record's password column is blank
                  </span>
                </div>
                <div className="w-full sm:w-56">
                  <input
                    type="text"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    placeholder="e.g. Operator@123"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Live Preview Grid of Parsed Rows */}
              {previewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider">
                      Preview Rows to Onboard ({previewRows.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Verify identifiers before submitting
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 font-semibold">#</th>
                          <th className="py-2 px-3 font-semibold">Name</th>
                          <th className="py-2 px-3 font-semibold font-mono">User ID</th>
                          <th className="py-2 px-3 font-semibold">Mobile</th>
                          <th className="py-2 px-3 font-semibold">Role</th>
                          <th className="py-2 px-3 font-semibold">Password</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {previewRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-slate-900">
                              {r.name || <span className="text-rose-500 italic">Missing</span>}
                            </td>
                            <td className="py-1.5 px-3 font-mono font-semibold text-indigo-700">
                              {r.userId || <span className="text-rose-500 italic">Missing</span>}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 font-mono">
                              {r.mobileNumber || <span className="text-rose-500 italic">Missing</span>}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 uppercase text-[11px]">
                              {r.role || 'user'}
                            </td>
                            <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">
                              {r.password ? 'Custom' : defaultPassword}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Result Screen */
            <div className="space-y-4">
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 uppercase font-semibold block">
                    Processed
                  </span>
                  <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                    {uploadResult.totalProcessed}
                  </span>
                </div>

                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[11px] text-emerald-700 uppercase font-semibold block">
                    Created
                  </span>
                  <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block">
                    {uploadResult.createdCount}
                  </span>
                </div>

                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-center">
                  <span className="text-[11px] text-amber-700 uppercase font-semibold block">
                    Skipped / Errors
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-800 mt-1 block">
                    {uploadResult.skippedCount}
                  </span>
                </div>
              </div>

              {/* Created Users List */}
              {uploadResult.createdUsers.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                    Successfully Onboarded Operators ({uploadResult.createdUsers.length})
                  </span>
                  <div className="max-h-40 overflow-y-auto border border-emerald-200 rounded-xl bg-emerald-50/30 p-3 space-y-1 text-xs">
                    {uploadResult.createdUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between py-1 border-b border-emerald-100 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-900">{u.name}</span>
                          <span className="font-mono text-indigo-700 text-[11px]">({u.userId})</span>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px]">{u.mobileNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped / Error Rows List */}
              {uploadResult.errors.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block mb-2">
                    Skipped Rows / Reasons ({uploadResult.errors.length})
                  </span>
                  <div className="max-h-40 overflow-y-auto border border-rose-200 rounded-xl bg-rose-50/50 p-3 space-y-1.5 text-xs">
                    {uploadResult.errors.map((err, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-rose-900">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold">Row {err.row}: </span>
                          {err.userId && <span className="font-mono font-medium">[{err.userId}] </span>}
                          <span>{err.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          {!uploadResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProcessUpload}
                disabled={uploading || previewRows.length === 0}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Onboarding Operators...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Onboard {previewRows.length} Operators</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetModal}
                className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload Another Batch</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Done / Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
