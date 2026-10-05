export type Role = 'admin' | 'user';

export interface User {
  id: string;
  userId: string;
  name: string;
  mobileNumber: string;
  role: Role;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface EnrolmentRecord {
  sNo: number;
  enrolmentNoDate: string;
  appointmentId: string;
  type: string;
  mandatoryBiometric: string;
  isNri: string;
  tinNumber: string;
  operatorId: string;
  reviewerId: string;
  introducer: string;
  proof: string;
  resident: string;
  status: string;
  introducerReviewStatus?: string;
  userReviewStatus?: string;
  gstApplied: number;
  amountNewEnrolment: number;
  amountUpdateEnrolment: number;
  totalAmountCharged: number;
  rejectReason?: string;
  processingState?: string;
  sourceFile?: string;
}

export interface ReportMetadata {
  reportDate?: string;
  registrar?: string;
  enrolmentAgency?: string;
  operator?: string;
  stationId?: string;
  clientVersion?: string;
  dateRange?: string;
}

export interface PackageBreakdownItem {
  packageName: string;
  recordCount: number;
  totalAmount: number;
  format: string;
}

export interface ReportSummary {
  totalRecords: number;
  totalAmountCharged: number;
  totalGstAmount: number;
  totalNewEnrolmentAmount: number;
  totalUpdateEnrolmentAmount: number;
  countNewEnrolment: number;
  countUpdate: number;
  countCompleted: number;
  countInProcess: number;
  countRejected: number;
  fileName: string;
  format: 'HTML' | 'CSV' | string;
  metadata: ReportMetadata;
  extractionTimestamp: string;
  isCombined?: boolean;
  packageBreakdown?: PackageBreakdownItem[];
}

export interface ParsedReportResponse {
  sessionId: string;
  summary: ReportSummary;
  records: EnrolmentRecord[];
}

export interface UpiConfig {
  upiId: string;
  payeeName: string;
  merchantCode?: string;
  enabled: boolean;
  updatedAt: string;
}

export interface Submission {
  id: string;
  submissionRef: string;
  userId: string;
  userName: string;
  timestamp: string;
  fileName: string;
  format: string;
  recordCount: number;
  totalAmount: number;
  countNewEnrolment: number;
  countUpdate: number;
  countCompleted: number;
  countInProcess: number;
  countRejected: number;
  totalGstAmount?: number;
  totalNewEnrolmentAmount?: number;
  totalUpdateEnrolmentAmount?: number;
  metadata?: ReportMetadata;
  verificationHash: string;
  utrNumber: string;
  paymentStatus: 'PAID' | 'PENDING';
  upiId: string;
  records?: EnrolmentRecord[];
}

export interface AdminStats {
  totalUsers: number;
  totalSubmissions: number;
  totalAmountProcessed: number;
  totalRecordsProcessed: number;
}

export interface BulkUserRow {
  name: string;
  userId: string;
  mobileNumber: string;
  password?: string;
  role?: 'admin' | 'user';
}

export interface BulkUploadResult {
  totalProcessed: number;
  createdCount: number;
  skippedCount: number;
  createdUsers: User[];
  errors: Array<{ row: number; userId?: string; name?: string; reason: string }>;
}
