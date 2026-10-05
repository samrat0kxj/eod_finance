import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  FileCheck2,
  IndianRupee,
  Database,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  KeyRound,
  Calendar,
  Phone,
  Hash,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  Eye,
  FileText,
  Printer,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building,
  UserCheck,
  ArrowUpDown,
  SlidersHorizontal,
  Clock,
  QrCode,
  Settings,
  Save,
  Check,
  Smartphone,
  CreditCard,
  UploadCloud,
  Trash2
} from 'lucide-react';
import type { User, Submission, AdminStats, UpiConfig, EnrolmentRecord, BulkUploadResult } from '../types.ts';
import { api } from '../lib/api.ts';
import { DataGrid } from './DataGrid.tsx';
import { BulkUploadModal } from './BulkUploadModal.tsx';

type AuditViewMode = 'date-wise' | 'user-wise' | 'all-list';

export const AdminDashboard: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'reports' | 'matrix' | 'users' | 'upi'>('reports');
  const [auditViewMode, setAuditViewMode] = useState<AuditViewMode>('date-wise');

  const [users, setUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // UPI Receiver Configuration
  const [upiConfig, setUpiConfig] = useState<UpiConfig>({
    upiId: 'uidai.eod@okhdfcbank',
    payeeName: 'UIDAI EOD Authority',
    enabled: true,
    updatedAt: '',
  });
  const [editUpiId, setEditUpiId] = useState('uidai.eod@okhdfcbank');
  const [editPayeeName, setEditPayeeName] = useState('UIDAI EOD Authority');
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiPreviewQr, setUpiPreviewQr] = useState<string>('');

  // Filters for Submitted Reports
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Submission for Detailed Inspection Modal
  const [inspectedSubmission, setInspectedSubmission] = useState<Submission | null>(null);
  const [inspectionTab, setInspectionTab] = useState<'table' | 'overview'>('table');

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [operatorSearchQuery, setOperatorSearchQuery] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset Password Modal state
  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resettingPass, setResettingPass] = useState(false);

  // Delete Confirmation States
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteSubmissionTarget, setDeleteSubmissionTarget] = useState<Submission | null>(null);
  const [deletingSubmission, setDeletingSubmission] = useState(false);

  // Expanded dates/users in grouped views
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, sRes, stRes, upiRes] = await Promise.all([
        api.listUsers(),
        api.getSubmissions(),
        api.getAdminStats(),
        api.getUpiConfig(),
      ]);
      setUsers(uRes.users);
      setSubmissions(sRes.submissions);
      setStats(stRes.stats);
      if (upiRes.upiConfig) {
        setUpiConfig(upiRes.upiConfig);
        setEditUpiId(upiRes.upiConfig.upiId);
        setEditPayeeName(upiRes.upiConfig.payeeName);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate UPI preview QR code for admin
  useEffect(() => {
    const upiUri = `upi://pay?pa=${encodeURIComponent(editUpiId || 'uidai.eod@okhdfcbank')}&pn=${encodeURIComponent(
      editPayeeName || 'UIDAI EOD Authority'
    )}&am=100.00&cu=INR&tn=AdminTestPreview`;

    QRCode.toDataURL(upiUri, {
      width: 180,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setUpiPreviewQr(url))
      .catch((err) => console.error(err));
  }, [editUpiId, editPayeeName]);

  const handleSaveUpiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUpiId || !editUpiId.includes('@')) {
      setError('Please provide a valid UPI ID containing "@" (e.g. merchant@okbank).');
      return;
    }

    setSavingUpi(true);
    setError(null);
    try {
      const res = await api.updateUpiConfig({
        upiId: editUpiId.trim(),
        payeeName: editPayeeName.trim(),
      });
      setUpiConfig(res.upiConfig);
      setSuccessMsg(`Receiver UPI ID updated to "${res.upiConfig.upiId}". Operators will now pay directly to this ID.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update UPI settings.');
    } finally {
      setSavingUpi(false);
    }
  };

  // Handle Preset Date changes
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now.getTime() - 86400000);
      const yestStr = yest.toISOString().split('T')[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'last7') {
      const sevenDays = new Date(now.getTime() - 7 * 86400000);
      setStartDate(sevenDays.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last30') {
      const thirtyDays = new Date(now.getTime() - 30 * 86400000);
      setStartDate(thirtyDays.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter Submissions based on Date, User, and Search
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // 1. User Filter
      if (selectedUserFilter !== 'all' && sub.userId.toLowerCase() !== selectedUserFilter.toLowerCase()) {
        return false;
      }

      // 2. Date Filter
      const subTime = new Date(sub.timestamp).getTime();
      if (startDate) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (subTime < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (subTime > end) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = sub.submissionRef.toLowerCase().includes(q);
        const matchUser = sub.userName.toLowerCase().includes(q) || sub.userId.toLowerCase().includes(q);
        const matchUtr = (sub.utrNumber || '').toLowerCase().includes(q);
        const matchFile = sub.fileName.toLowerCase().includes(q);
        const matchStation = sub.metadata?.stationId?.toLowerCase().includes(q) || false;
        const matchOp = sub.metadata?.operator?.toLowerCase().includes(q) || false;
        if (!matchRef && !matchUser && !matchUtr && !matchFile && !matchStation && !matchOp) {
          return false;
        }
      }

      return true;
    });
  }, [submissions, selectedUserFilter, startDate, endDate, searchQuery]);

  // Aggregate Metrics for currently filtered submissions
  const filteredMetrics = useMemo(() => {
    const totalAmount = filteredSubmissions.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalRecords = filteredSubmissions.reduce((sum, s) => sum + s.recordCount, 0);
    const totalNew = filteredSubmissions.reduce((sum, s) => sum + s.countNewEnrolment, 0);
    const totalUpdate = filteredSubmissions.reduce((sum, s) => sum + s.countUpdate, 0);
    const totalCompleted = filteredSubmissions.reduce((sum, s) => sum + s.countCompleted, 0);
    const totalRejected = filteredSubmissions.reduce((sum, s) => sum + s.countRejected, 0);
    const uniqueUsers = new Set(filteredSubmissions.map((s) => s.userId)).size;

    return {
      count: filteredSubmissions.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalRecords,
      totalNew,
      totalUpdate,
      totalCompleted,
      totalRejected,
      uniqueUsers,
    };
  }, [filteredSubmissions]);

  // Date-Wise Breakdown
  const dateWiseGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        dateKey: string;
        displayDate: string;
        submissions: Submission[];
        totalAmount: number;
        totalRecords: number;
        userCount: number;
      }
    > = {};

    filteredSubmissions.forEach((sub) => {
      const d = new Date(sub.timestamp);
      const dateKey = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          displayDate,
          submissions: [],
          totalAmount: 0,
          totalRecords: 0,
          userCount: 0,
        };
      }

      groups[dateKey].submissions.push(sub);
      groups[dateKey].totalAmount += sub.totalAmount;
      groups[dateKey].totalRecords += sub.recordCount;
    });

    Object.values(groups).forEach((g) => {
      g.userCount = new Set(g.submissions.map((s) => s.userId)).size;
      g.totalAmount = Math.round(g.totalAmount * 100) / 100;
    });

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredSubmissions]);

  // User-Wise Breakdown
  const userWiseGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        userId: string;
        userName: string;
        submissions: Submission[];
        totalAmount: number;
        totalRecords: number;
        completedCount: number;
        rejectedCount: number;
        lastSubmission: string;
      }
    > = {};

    filteredSubmissions.forEach((sub) => {
      const uId = sub.userId;
      if (!groups[uId]) {
        groups[uId] = {
          userId: uId,
          userName: sub.userName,
          submissions: [],
          totalAmount: 0,
          totalRecords: 0,
          completedCount: 0,
          rejectedCount: 0,
          lastSubmission: sub.timestamp,
        };
      }

      groups[uId].submissions.push(sub);
      groups[uId].totalAmount += sub.totalAmount;
      groups[uId].totalRecords += sub.recordCount;
      groups[uId].completedCount += sub.countCompleted;
      groups[uId].rejectedCount += sub.countRejected;

      if (new Date(sub.timestamp) > new Date(groups[uId].lastSubmission)) {
        groups[uId].lastSubmission = sub.timestamp;
      }
    });

    Object.values(groups).forEach((g) => {
      g.totalAmount = Math.round(g.totalAmount * 100) / 100;
    });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredSubmissions]);

  // Date x User Matrix
  const matrixData = useMemo(() => {
    const dates = Array.from(new Set(filteredSubmissions.map((s) => s.timestamp.split('T')[0]))).sort().reverse();
    const userIds = Array.from(new Set(filteredSubmissions.map((s) => s.userId)));

    const matrix: Record<string, Record<string, { amount: number; count: number }>> = {};
    dates.forEach((d) => {
      matrix[d] = {};
      userIds.forEach((u) => {
        matrix[d][u] = { amount: 0, count: 0 };
      });
    });

    filteredSubmissions.forEach((s) => {
      const d = s.timestamp.split('T')[0];
      const u = s.userId;
      if (matrix[d] && matrix[d][u]) {
        matrix[d][u].amount += s.totalAmount;
        matrix[d][u].count += s.recordCount;
      }
    });

    return { dates, userIds, matrix };
  }, [filteredSubmissions]);

  // Export full audit ledger to CSV
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) return;

    const headers = [
      'Submission Ref',
      'Date & Time',
      'User ID',
      'User Name',
      'Payment UTR',
      'Source File',
      'Format',
      'Total Amount (INR)',
      'Total Records',
      'New Enrolments',
      'Updates',
      'Completed',
      'InProcess',
      'Rejected',
      'GST Amount',
      'Verification Hash',
    ];

    const rows = filteredSubmissions.map((s) => [
      `"${s.submissionRef}"`,
      `"${new Date(s.timestamp).toLocaleString('en-IN')}"`,
      `"${s.userId}"`,
      `"${s.userName}"`,
      `"${s.utrNumber || ''}"`,
      `"${s.fileName}"`,
      `"${s.format}"`,
      s.totalAmount.toFixed(2),
      s.recordCount,
      s.countNewEnrolment,
      s.countUpdate,
      s.countCompleted,
      s.countInProcess,
      s.countRejected,
      (s.totalGstAmount || 0).toFixed(2),
      `"${s.verificationHash}"`,
    ]);

    const csvText = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UIDAI_Audit_Submissions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export single inspected report as raw CSV
  const handleExportInspectedReportCSV = (sub: Submission) => {
    if (!sub.records || sub.records.length === 0) {
      alert('No record rows stored for this submission.');
      return;
    }

    const headers = [
      'SLNO',
      'ENROLMENT_NO_DATE',
      'APPOINTMENT_ID',
      'TYPE',
      'MANDATORY_BIO_METRIC_UPDATE_ONLY',
      'IS_NRI',
      'TIN_NO',
      'OPERATOR_ID',
      'STATUS',
      'GST_AMOUNT',
      'AMOUNT_CHARGED_FOR_NEW_ENROLMENT',
      'AMOUNT_CHARGED_FOR_UPDATE_ENROLMENT',
      'TOTAL_AMOUNT_CHARGED',
      'PROCESSING_STATE_DESCRIPTION',
      'REJECT_REASON_DESCRIPTION'
    ];

    const rows = sub.records.map((r) => [
      r.sNo,
      `"${r.enrolmentNoDate}"`,
      `"${r.appointmentId || ''}"`,
      `"${r.type}"`,
      `"${r.mandatoryBiometric}"`,
      `"${r.isNri}"`,
      `"${r.tinNumber || ''}"`,
      `"${r.operatorId}"`,
      `"${r.status}"`,
      r.gstApplied,
      r.amountNewEnrolment,
      r.amountUpdateEnrolment,
      r.totalAmountCharged,
      `"${r.processingState || ''}"`,
      `"${r.rejectReason || ''}"`,
    ]);

    const csvText = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sub.submissionRef}_${sub.fileName.replace(/\.zip$/i, '')}_Data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newUserName.trim() || !newUserId.trim() || !newUserMobile.trim() || !newUserPassword) {
      setCreateError('All fields (Name, User ID, Mobile Number, Password) are required.');
      return;
    }

    setCreatingUser(true);
    try {
      await api.createUser({
        name: newUserName.trim(),
        userId: newUserId.trim(),
        mobileNumber: newUserMobile.trim(),
        password: newUserPassword,
        role: newUserRole,
      });

      setSuccessMsg(`User account "${newUserId}" created successfully.`);
      setShowCreateModal(false);
      setNewUserName('');
      setNewUserId('');
      setNewUserMobile('');
      setNewUserPassword('');
      setNewUserRole('user');
      await fetchData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user account.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.toggleUserStatus(userId);
      setSuccessMsg(`Status updated for User ID "${userId}".`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle user status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUserId || newPasswordVal.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setResettingPass(true);
    try {
      await api.resetUserPassword(resetModalUserId, newPasswordVal);
      setSuccessMsg(`Password for user "${resetModalUserId}" reset successfully.`);
      setResetModalUserId(null);
      setNewPasswordVal('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setResettingPass(false);
    }
  };

  const toggleDateExpand = (dateKey: string) => {
    setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleBulkSuccess = async (result: BulkUploadResult) => {
    await fetchData();
    setSuccessMsg(
      `Bulk onboarding complete: ${result.createdCount} operator(s) registered successfully.${
        result.skippedCount > 0 ? ` (${result.skippedCount} skipped/failed)` : ''
      }`
    );
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeletingUser(true);
    try {
      await api.deleteUser(deleteUserTarget.userId);
      setSuccessMsg(`Operator account "${deleteUserTarget.name}" (${deleteUserTarget.userId}) removed successfully.`);
      setDeleteUserTarget(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove user account.');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleConfirmDeleteSubmission = async () => {
    if (!deleteSubmissionTarget) return;
    setDeletingSubmission(true);
    try {
      await api.deleteSubmission(deleteSubmissionTarget.id);
      setSuccessMsg(`Report submission "${deleteSubmissionTarget.submissionRef}" removed successfully.`);
      if (inspectedSubmission?.id === deleteSubmissionTarget.id) {
        setInspectedSubmission(null);
      }
      setDeleteSubmissionTarget(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove report submission.');
    } finally {
      setDeletingSubmission(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!operatorSearchQuery.trim()) return users;
    const q = operatorSearchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q) ||
        u.mobileNumber.includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, operatorSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Admin Financial Reconciliation Console
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
              Auditor Level
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Check reports date-wise & user-wise, configure settlement UPI ID, and inspect full CSV data grids.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab('upi')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 shadow-2xs ${
              activeMainTab === 'upi'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Configure UPI Receiver</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Bulk Upload Operators</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Operator</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start justify-between text-xs text-rose-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start justify-between text-xs text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">×</button>
        </div>
      )}

      {/* High-Level All-Time Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Reconciled Financials
            </span>
            <IndianRupee className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-600 tabular-nums">
            ₹{stats ? stats.totalAmountProcessed.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Filtered: ₹{filteredMetrics.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Reports Reconciled
            </span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats ? stats.totalSubmissions : submissions.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {filteredMetrics.count} reports in active scope
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enrolment Transactions
            </span>
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats ? stats.totalRecordsProcessed.toLocaleString('en-IN') : '0'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {filteredMetrics.totalRecords.toLocaleString('en-IN')} packets filtered
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active UPI Receiver
            </span>
            <QrCode className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-sm font-bold font-mono text-slate-900 truncate" title={upiConfig.upiId}>
            {upiConfig.upiId}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">
            Google Pay QR Active
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveMainTab('reports')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeMainTab === 'reports'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Check Submitted Reports</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 font-mono">
              {filteredSubmissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('matrix')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeMainTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Date × User Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('upi')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeMainTab === 'upi'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>UPI & Google Pay Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('users')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeMainTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Operator Accounts ({users.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: SUBMITTED REPORTS AUDIT (Date-wise & User-wise)         */}
      {/* ============================================================= */}
      {activeMainTab === 'reports' && (
        <div className="space-y-5">
          {/* Filter & Control Bar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAuditViewMode('date-wise')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    auditViewMode === 'date-wise'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Date-Wise View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuditViewMode('user-wise')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    auditViewMode === 'user-wise'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>User-Wise View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuditViewMode('all-list')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    auditViewMode === 'all-list'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ledger List</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredSubmissions.length === 0}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                title="Download CSV report of current filtered submissions"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Audit CSV</span>
              </button>
            </div>

            {/* Filter Inputs Grid: Date, User, Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Filter by User / Operator
                </label>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  <option value="all">All Users ({users.length})</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.userId}>
                      {u.name} ({u.userId}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Date Range Preset
                </label>
                <select
                  value={datePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today (Oct 5)</option>
                  <option value="yesterday">Yesterday (Oct 4)</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30">Last 30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  From / To Custom Date
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="w-1/2 px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400">→</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="w-1/2 px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Search Report / UTR / Package
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Ref ID, UTR number, operator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Summary Strip */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span>Active Scope:</span>
                <span className="font-semibold text-slate-800">
                  {selectedUserFilter === 'all' ? 'All Users' : `User: ${selectedUserFilter}`}
                </span>
                <span>·</span>
                <span className="font-semibold text-slate-800">
                  {startDate && endDate ? `${startDate} to ${endDate}` : 'All Recorded Dates'}
                </span>
                <span>·</span>
                <span>Found <strong className="text-slate-900 font-mono">{filteredSubmissions.length}</strong> reports</span>
              </div>

              {(selectedUserFilter !== 'all' || startDate || endDate || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserFilter('all');
                    setDatePreset('all');
                    setStartDate('');
                    setEndDate('');
                    setSearchQuery('');
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold underline"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* VIEW 1: DATE-WISE BREAKDOWN */}
          {auditViewMode === 'date-wise' && (
            <div className="space-y-4">
              {dateWiseGroups.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                  No submissions found matching the selected date and user filter.
                </div>
              ) : (
                dateWiseGroups.map((group) => {
                  const isExpanded = expandedDates[group.dateKey] !== false;
                  return (
                    <div
                      key={group.dateKey}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                    >
                      {/* Date Group Header */}
                      <div
                        onClick={() => toggleDateExpand(group.dateKey)}
                        className="p-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <button type="button" className="text-slate-500">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-700" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-700" />
                            )}
                          </button>
                          <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>{group.displayDate}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                                {group.dateKey}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {group.submissions.length} submission{group.submissions.length > 1 ? 's' : ''} by {group.userCount} operator{group.userCount > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block uppercase font-sans">
                              Day Collections
                            </span>
                            <span className="font-bold text-indigo-700 text-sm tabular-nums">
                              ₹{group.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="text-right hidden sm:block">
                            <span className="text-slate-400 text-[10px] block uppercase font-sans">
                              Packets
                            </span>
                            <span className="font-semibold text-slate-800 tabular-nums">
                              {group.totalRecords}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Submissions in this Date */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px]">
                                <th className="py-2.5 px-4 font-semibold font-mono">Reference ID</th>
                                <th className="py-2.5 px-4 font-semibold">Operator</th>
                                <th className="py-2.5 px-4 font-semibold">Payment UTR</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Packets</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Total Charged</th>
                                <th className="py-2.5 px-4 font-semibold">Submission Time</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.submissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-4 font-mono font-semibold text-indigo-700">
                                    {sub.submissionRef}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <div className="font-medium text-slate-900">{sub.userName}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">{sub.userId}</div>
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700">
                                    <span className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                                      UTR: {sub.utrNumber || 'Verified'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800">
                                    {sub.recordCount}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                                    ₹{sub.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-500 text-[11px] font-mono">
                                    {new Date(sub.timestamp).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInspectedSubmission(sub);
                                        setInspectionTab('table');
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors inline-flex items-center gap-1"
                                      title="Inspect full report CSV table"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Inspect CSV</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteSubmissionTarget(sub)}
                                      className="px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors inline-flex items-center gap-1"
                                      title={`Remove submission ${sub.submissionRef}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Remove</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: USER-WISE BREAKDOWN */}
          {auditViewMode === 'user-wise' && (
            <div className="space-y-4">
              {userWiseGroups.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                  No submissions found for the selected user criteria.
                </div>
              ) : (
                userWiseGroups.map((group) => {
                  const isExpanded = expandedUsers[group.userId] !== false;
                  return (
                    <div
                      key={group.userId}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                    >
                      {/* User Header */}
                      <div
                        onClick={() => toggleUserExpand(group.userId)}
                        className="p-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 select-none"
                      >
                        <div className="flex items-center gap-3">
                          <button type="button" className="text-slate-500">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-700" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-700" />
                            )}
                          </button>
                          <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>{group.userName}</span>
                              <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {group.userId}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {group.submissions.length} reports submitted · Last: {new Date(group.lastSubmission).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 text-xs font-mono">
                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block uppercase font-sans">
                              Total Reconciled
                            </span>
                            <span className="font-bold text-indigo-700 text-sm tabular-nums">
                              ₹{group.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="text-right hidden sm:block">
                            <span className="text-slate-400 text-[10px] block uppercase font-sans">
                              Total Packets
                            </span>
                            <span className="font-semibold text-slate-800 tabular-nums">
                              {group.totalRecords}
                            </span>
                          </div>

                          <div className="text-right hidden md:block">
                            <span className="text-slate-400 text-[10px] block uppercase font-sans">
                              Completed / Rej
                            </span>
                            <span className="text-slate-700 tabular-nums">
                              <span className="text-emerald-600 font-semibold">{group.completedCount}</span> / <span className="text-rose-600 font-semibold">{group.rejectedCount}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Submissions of this User */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px]">
                                <th className="py-2.5 px-4 font-semibold font-mono">Reference ID</th>
                                <th className="py-2.5 px-4 font-semibold">Payment UTR</th>
                                <th className="py-2.5 px-4 font-semibold">Submission Date</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Packets</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Total Charged</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.submissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-4 font-mono font-semibold text-indigo-700">
                                    {sub.submissionRef}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-[11px]">
                                    <span className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                                      UTR: {sub.utrNumber || 'Verified'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-600">
                                    {new Date(sub.timestamp).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800">
                                    {sub.recordCount}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                                    ₹{sub.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInspectedSubmission(sub);
                                        setInspectionTab('table');
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors inline-flex items-center gap-1"
                                      title="Inspect full report CSV table"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Inspect CSV</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteSubmissionTarget(sub)}
                                      className="px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors inline-flex items-center gap-1"
                                      title={`Remove submission ${sub.submissionRef}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Remove</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 3: FULL LEDGER LIST */}
          {auditViewMode === 'all-list' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-4 font-semibold font-mono">Reference ID</th>
                      <th className="py-3 px-4 font-semibold">Operator</th>
                      <th className="py-3 px-4 font-semibold">Payment UTR</th>
                      <th className="py-3 px-4 font-semibold">Date & Time</th>
                      <th className="py-3 px-4 font-semibold text-right">Packets</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Charged</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                          No submissions match the current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                            {s.submissionRef}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{s.userName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {s.userId}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <span className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                              {s.utrNumber || 'Verified'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {new Date(s.timestamp).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                            {s.recordCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-indigo-700">
                            ₹{s.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectedSubmission(s);
                                setInspectionTab('table');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect CSV</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteSubmissionTarget(s)}
                              className="px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors inline-flex items-center gap-1"
                              title={`Remove submission ${s.submissionRef}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Remove</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: DATE x USER CROSS-TABULATION MATRIX                    */}
      {/* ============================================================= */}
      {activeMainTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Operator × Date Financial Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Cross-tabulation of total collections and packet counts by date and operator.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  {matrixData.userIds.map((uId) => {
                    const uObj = users.find((u) => u.userId === uId);
                    return (
                      <th key={uId} className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">
                        <div>{uObj?.name || uId}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">{uId}</div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-4 font-bold text-right text-indigo-900 bg-indigo-50/50">
                    Daily Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.dates.map((date) => {
                  let dayTotalAmt = 0;
                  let dayTotalCount = 0;

                  return (
                    <tr key={date} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-800 whitespace-nowrap font-mono">
                        {new Date(date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>

                      {matrixData.userIds.map((uId) => {
                        const cell = matrixData.matrix[date]?.[uId] || { amount: 0, count: 0 };
                        dayTotalAmt += cell.amount;
                        dayTotalCount += cell.count;

                        return (
                          <td key={uId} className="py-2.5 px-4 text-right font-mono tabular-nums">
                            {cell.amount > 0 ? (
                              <div>
                                <span className="font-semibold text-slate-900">
                                  ₹{cell.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {cell.count} pkts
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-indigo-700 bg-indigo-50/40 whitespace-nowrap">
                        <div>₹{dayTotalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <span className="text-[10px] text-indigo-400 font-normal">{dayTotalCount} total pkts</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: UPI RECEIVER SETTINGS                                  */}
      {/* ============================================================= */}
      {activeMainTab === 'upi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Receiver UPI ID & Google Pay Configuration
                </h2>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                Active Receiver
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Configure the merchant/settlement UPI ID where operators will pay their EOD collections.
              The system automatically renders a Google Pay & PhonePe compatible dynamic payment QR code with the exact calculated amount pre-filled.
            </p>

            <form onSubmit={handleSaveUpiConfig} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Receiver UPI ID (VPA) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. uidai.eod@okhdfcbank or 9876543210@paytm"
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Must include bank suffix (e.g. @okhdfcbank, @okaxis, @ybl, @paytm, @upi)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payee / Authority Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. UIDAI EOD Authority"
                  value={editPayeeName}
                  onChange={(e) => setEditPayeeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Displayed on the operator's Google Pay screen during payment confirmation.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingUpi}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingUpi ? 'Saving Changes...' : 'Save UPI Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live QR Preview Box */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-center flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Live Google Pay QR Preview
              </span>
              <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-slate-200 my-2">
                {upiPreviewQr ? (
                  <img src={upiPreviewQr} alt="Preview QR" className="w-36 h-36 mx-auto object-contain" />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                    Generating...
                  </div>
                )}
              </div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-2 select-all">
                {editUpiId}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {editPayeeName}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Universal NPCI UPI standard</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: OPERATOR ACCOUNTS MANAGEMENT                           */}
      {/* ============================================================= */}
      {activeMainTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Enrolment Operator Accounts Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage registered station operators, reset passwords, or onboard batches via CSV
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Bulk Upload Operators</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add New Operator</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search operators by name, user ID, or phone..."
                value={operatorSearchQuery}
                onChange={(e) => setOperatorSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="text-[11px] text-slate-500 whitespace-nowrap">
              Showing <strong>{filteredUsers.length}</strong> of {users.length} accounts
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">User Details</th>
                  <th className="py-3 px-4 font-semibold font-mono">User ID</th>
                  <th className="py-3 px-4 font-semibold">Mobile Number</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No operator accounts match your search query "{operatorSearchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">{u.name}</td>
                      <td className="py-3 px-4 font-mono text-indigo-700 font-semibold">{u.userId}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{u.mobileNumber}</td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-700 uppercase">{u.role}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            u.status === 'active' ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserFilter(u.userId);
                            setActiveMainTab('reports');
                            setAuditViewMode('user-wise');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded"
                          title="View all submissions by this user"
                        >
                          View Reports
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetModalUserId(u.userId);
                            setNewPasswordVal('');
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded"
                        >
                          Reset Pass
                        </button>
                        {u.userId !== 'admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u.userId)}
                              className={`px-2 py-1 text-[11px] font-medium rounded ${
                                u.status === 'active' ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteUserTarget(u)}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded inline-flex items-center gap-1"
                              title={`Remove operator account ${u.userId}`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: SUBMISSION FULL CSV & DATA GRID AUDIT INSPECTION       */}
      {/* ============================================================= */}
      {inspectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[92vh] flex flex-col p-5 sm:p-7 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Report Inspection: {inspectedSubmission.submissionRef}
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-300">
                      PAID (UTR: {inspectedSubmission.utrNumber})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Operator: {inspectedSubmission.userName} ({inspectedSubmission.userId}) · {new Date(inspectedSubmission.timestamp).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportInspectedReportCSV(inspectedSubmission)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                  title="Export this report's raw records as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteSubmissionTarget(inspectedSubmission)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Remove this report"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Remove Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectedSubmission(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 ml-1"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Segmented Switcher inside Inspector: Data Table View vs Overview */}
            <div className="pt-3 pb-2 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectionTab('table')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    inspectionTab === 'table'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Full Table View (CSV Grid) ({inspectedSubmission.records?.length || inspectedSubmission.recordCount} rows)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectionTab('overview')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    inspectionTab === 'overview'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Payment & Audit Metadata</span>
                </button>
              </div>

              <div className="text-xs font-mono font-bold text-indigo-700">
                Total Reconciled: ₹{inspectedSubmission.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="mt-3 overflow-y-auto grow space-y-4 pr-1">
              {inspectionTab === 'table' ? (
                <div>
                  {inspectedSubmission.records && inspectedSubmission.records.length > 0 ? (
                    <DataGrid records={inspectedSubmission.records} />
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      Record table rows are stored in RAM. Total records: {inspectedSubmission.recordCount}.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Payment Verification Card */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Payment Verified & Reconciled</span>
                      </div>
                      <div className="mt-1 text-xs text-emerald-800">
                        Paid to UPI ID: <strong className="font-mono">{inspectedSubmission.upiId || upiConfig.upiId}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-emerald-700 block uppercase">UTR Reference Number</span>
                      <span className="text-base font-bold font-mono text-emerald-950 tracking-wider">
                        {inspectedSubmission.utrNumber}
                      </span>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Source Package</span>
                      <span className="font-medium text-slate-900 truncate block">{inspectedSubmission.fileName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Format</span>
                      <span className="font-bold uppercase font-mono text-slate-800">{inspectedSubmission.format}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Total Packets</span>
                      <span className="font-mono font-bold text-slate-900">{inspectedSubmission.recordCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">GST Amount</span>
                      <span className="font-mono font-semibold text-slate-800">₹{(inspectedSubmission.totalGstAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Packet Counts */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-[10px] text-slate-400 block uppercase">Updates</span>
                      <span className="font-bold text-slate-900 font-mono text-sm tabular-nums">
                        {inspectedSubmission.countUpdate}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-[10px] text-slate-400 block uppercase">New Enrolments</span>
                      <span className="font-bold text-slate-900 font-mono text-sm tabular-nums">
                        {inspectedSubmission.countNewEnrolment}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-[10px] text-slate-400 block uppercase">Completed</span>
                      <span className="font-bold text-emerald-700 font-mono text-sm tabular-nums">
                        {inspectedSubmission.countCompleted}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-[10px] text-slate-400 block uppercase">In Process</span>
                      <span className="font-bold text-amber-700 font-mono text-sm tabular-nums">
                        {inspectedSubmission.countInProcess}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-[10px] text-slate-400 block uppercase">Rejected</span>
                      <span className="font-bold text-rose-700 font-mono text-sm tabular-nums">
                        {inspectedSubmission.countRejected}
                      </span>
                    </div>
                  </div>

                  {/* Hash */}
                  <div className="p-3 bg-slate-100 rounded-lg font-mono text-[10px] text-slate-500 break-all">
                    <span className="font-semibold block text-slate-700 mb-0.5">Cryptographic Audit Seal (SHA-256):</span>
                    <span>{inspectedSubmission.verificationHash}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                Audit integrity sealed · In-memory data store verified
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteSubmissionTarget(inspectedSubmission)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedSubmission(null)}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CREATE USER ACCOUNT                                    */}
      {/* ============================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Create Operator Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User ID (Unique Identifier) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. operator04"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-0.5 text-[11px] text-slate-400">
                  User will use strictly this User ID to log in.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newUserMobile}
                  onChange={(e) => setNewUserMobile(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role Assignment
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="user">Standard User / Enrolment Operator</option>
                  <option value="admin">Administrator (Full Rights)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: RESET PASSWORD                                         */}
      {/* ============================================================= */}
      {resetModalUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Reset Password for {resetModalUserId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUserId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 chars)"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalUserId(null)}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPass}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  {resettingPass ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: REMOVE USER CONFIRMATION                                */}
      {/* ============================================================= */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remove Operator Account</h3>
                <p className="text-xs text-slate-500">Confirm permanent account deletion</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Full Name:</span>
                <span className="font-bold text-slate-900 font-sans">{deleteUserTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">User ID:</span>
                <span className="font-bold text-indigo-700">{deleteUserTarget.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Mobile Number:</span>
                <span className="text-slate-700">{deleteUserTarget.mobileNumber}</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this operator account? Active sessions for this user will be revoked immediately and they will no longer be able to log in.
            </p>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deletingUser}
                onClick={() => setDeleteUserTarget(null)}
                className="px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleConfirmDeleteUser}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                {deletingUser ? 'Removing...' : 'Confirm Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: REMOVE REPORT CONFIRMATION                              */}
      {/* ============================================================= */}
      {deleteSubmissionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remove Report Submission</h3>
                <p className="text-xs text-slate-500">Confirm audit record removal</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Reference ID:</span>
                <span className="font-bold text-indigo-700">{deleteSubmissionTarget.submissionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Operator:</span>
                <span className="font-bold text-slate-900 font-sans">
                  {deleteSubmissionTarget.userName} ({deleteSubmissionTarget.userId})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Payment UTR:</span>
                <span className="text-emerald-700 font-semibold">{deleteSubmissionTarget.utrNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Total Amount:</span>
                <span className="font-bold text-slate-900">
                  ₹{deleteSubmissionTarget.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({deleteSubmissionTarget.recordCount} records)
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this report? This will delete the submitted report, its tabular records, and adjust all audit statistics.
            </p>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deletingSubmission}
                onClick={() => setDeleteSubmissionTarget(null)}
                className="px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingSubmission}
                onClick={handleConfirmDeleteSubmission}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                {deletingSubmission ? 'Removing...' : 'Confirm Remove Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Onboard Operators Modal */}
      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={handleBulkSuccess}
      />
    </div>
  );
};
