import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import type { EnrolmentRecord } from '../types.ts';

interface DataGridProps {
  records: EnrolmentRecord[];
}

export const DataGrid: React.FC<DataGridProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof EnrolmentRecord>('sNo');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.enrolmentNoDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.operatorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.resident.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sNo.toString().includes(searchTerm);

      const matchStatus =
        statusFilter === 'all'
          ? true
          : r.status.toLowerCase().includes(statusFilter.toLowerCase());

      const matchType =
        typeFilter === 'all'
          ? true
          : r.type.toUpperCase() === typeFilter.toUpperCase();

      return matchSearch && matchStatus && matchType;
    });
  }, [records, searchTerm, statusFilter, typeFilter]);

  // Sort records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      const strA = (valA ?? '').toString().toLowerCase();
      const strB = (valB ?? '').toString().toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRecords, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field: keyof EnrolmentRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Banner: Immutability Assurance */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-white tracking-wide uppercase text-[11px]">
            Immutable Data Grid
          </span>
          <span className="text-slate-400 hidden sm:inline">·</span>
          <span className="text-slate-300 hidden sm:inline">
            Direct RAM view of source report. Cell editing strictly disabled to preserve financial integrity.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit Integrity Sealed</span>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search enrolment no, operator..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-transparent focus:outline-none text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="inprocess">InProcess</option>
              <option value="reject">Rejected</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-semibold text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-transparent focus:outline-none text-slate-700 font-medium"
            >
              <option value="all">All Types</option>
              <option value="U">Update (U)</option>
              <option value="N">New Enrolment (N)</option>
              <option value="E">Enrolment (E)</option>
            </select>
          </div>
        </div>

        {/* Rows per page & record counter */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800 font-mono tabular-nums">{sortedRecords.length}</strong> of{' '}
            <strong className="text-slate-800 font-mono tabular-nums">{records.length}</strong> rows
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-300 rounded px-1.5 py-1 text-xs bg-white font-mono"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={1000}>All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse select-text">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 shadow-xs border-b border-slate-300">
            <tr>
              <th
                onClick={() => handleSort('sNo')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>S.No</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('enrolmentNoDate')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1 font-mono">
                  <span>Enrolment No. and Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-center">Type</th>

              <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-center">Mandatory Bio</th>

              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Operator ID</th>

              <th
                onClick={() => handleSort('status')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap font-mono">
                GST Applied (%)
              </th>

              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap font-mono">
                Amt New Enrol (₹)
              </th>

              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap font-mono">
                Amt Update Enrol (₹)
              </th>

              <th
                onClick={() => handleSort('totalAmountCharged')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-200 transition-colors text-right whitespace-nowrap font-mono text-indigo-900 bg-indigo-50/60"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Amount Charged (₹)</span>
                  <ArrowUpDown className="w-3 h-3 text-indigo-500" />
                </div>
              </th>

              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Processing Notes</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-sans">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500 text-xs">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No records match the current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, index) => {
                const isRejected = r.status.toLowerCase().includes('reject');
                const isCompleted = r.status.toLowerCase().includes('complete');
                const isInProcess = r.status.toLowerCase().includes('process');

                return (
                  <tr
                    key={r.sNo + '-' + r.enrolmentNoDate + '-' + index}
                    className="hover:bg-indigo-50/30 transition-colors odd:bg-white even:bg-slate-50/40"
                  >
                    <td className="py-2 px-3 text-slate-500 font-mono tabular-nums">
                      {r.sNo}
                    </td>

                    <td className="py-2 px-3 font-mono font-medium text-slate-900 whitespace-nowrap tracking-tight select-all">
                      {r.enrolmentNoDate}
                    </td>

                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className="font-semibold font-mono text-slate-700">
                        {r.type}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-center whitespace-nowrap text-slate-600">
                      {r.mandatoryBiometric}
                    </td>

                    <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {r.operatorId || '—'}
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isCompleted
                            ? 'text-emerald-700'
                            : isRejected
                            ? 'text-rose-700 font-semibold'
                            : 'text-amber-700'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                        {isInProcess && <Clock className="w-3 h-3 text-amber-600" />}
                        <span>{r.status}</span>
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {r.gstApplied ? r.gstApplied.toFixed(1) : '18.0'}%
                    </td>

                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {r.amountNewEnrolment.toFixed(2)}
                    </td>

                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {r.amountUpdateEnrolment.toFixed(2)}
                    </td>

                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-indigo-50/30 whitespace-nowrap">
                      ₹{r.totalAmountCharged.toFixed(2)}
                    </td>

                    <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-xs" title={r.rejectReason || r.processingState}>
                      {r.rejectReason || r.processingState || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div>
          Page <strong className="text-slate-900 font-mono tabular-nums">{currentPage}</strong> of{' '}
          <strong className="text-slate-900 font-mono tabular-nums">{totalPages}</strong>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="p-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="p-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
