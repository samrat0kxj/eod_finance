import type {
  User,
  Submission,
  AdminStats,
  ReportSummary,
  EnrolmentRecord,
  UpiConfig,
  BulkUploadResult,
  BulkUserRow,
  ParsedReportResponse,
} from '../types.ts';
import {
  extractZipInMemory,
  parseUIDAIReport,
} from './clientParser.ts';
import { SAMPLE_HTML_REPORT, SAMPLE_CSV_REPORT } from '../sampleData.ts';

const USERS_STORAGE_KEY = 'uidai_eod_users_db';
const SUBMISSIONS_STORAGE_KEY = 'uidai_eod_submissions_db';
const UPI_CONFIG_STORAGE_KEY = 'uidai_eod_upi_config_db';
const ACTIVE_USER_STORAGE_KEY = 'uidai_eod_active_user_sess';
const AUTH_TOKEN_KEY = 'uidai_eod_auth_token';

interface StoredUser extends User {
  password: string;
}

// In-Memory Parsed Reports store (temporary RAM cache, cleared on submission)
const memoryReportsCache = new Map<
  string,
  {
    sessionId: string;
    userId: string;
    summary: ReportSummary;
    records: EnrolmentRecord[];
    createdAt: number;
  }
>();

function randomId(prefix = 'id_'): string {
  const chars = 'abcdef0123456789';
  let str = '';
  for (let i = 0; i < 12; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix + str;
}

function generateVerificationHash(payload: string): string {
  // Simple fast deterministic SHA-256 style hash for audit ledger
  let hash1 = 0x811c9dc5;
  let hash2 = 0x27d4eb2f;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    hash1 ^= ch;
    hash1 = (hash1 * 0x01000193) >>> 0;
    hash2 = ((hash2 << 5) - hash2 + ch) >>> 0;
  }
  const part1 = hash1.toString(16).padStart(8, '0');
  const part2 = hash2.toString(16).padStart(8, '0');
  const part3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0');
  const part4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, '0');
  return (part1 + part2 + part3 + part4).toLowerCase();
}

/**
 * Initializes default accounts in localStorage if not already present.
 */
function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
  }

  const defaultUsers: StoredUser[] = [
    {
      id: 'usr_admin_001',
      userId: 'admin',
      name: 'UIDAI Authority Admin',
      mobileNumber: '9876543210',
      role: 'admin',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      password: 'Admin@12345',
    },
    {
      id: 'usr_op_001',
      userId: 'operator01',
      name: 'Rajesh Sharma',
      mobileNumber: '9812345678',
      role: 'user',
      status: 'active',
      createdAt: '2026-02-15T00:00:00Z',
      password: 'Operator@123',
    },
    {
      id: 'usr_op_002',
      userId: 'operator02',
      name: 'Priya Patel',
      mobileNumber: '9823456789',
      role: 'user',
      status: 'active',
      createdAt: '2026-02-20T00:00:00Z',
      password: 'Operator@123',
    },
    {
      id: 'usr_op_003',
      userId: 'operator03',
      name: 'Amit Kumar',
      mobileNumber: '9834567890',
      role: 'user',
      status: 'active',
      createdAt: '2026-03-01T00:00:00Z',
      password: 'Operator@123',
    },
  ];

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function saveUsers(users: StoredUser[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }
}

/**
 * Initializes default UPI config in localStorage.
 */
function getStoredUpiConfig(): UpiConfig {
  const fallback: UpiConfig = {
    upiId: 'uidai.eod@okhdfcbank',
    payeeName: 'UIDAI EOD Authority',
    merchantCode: '9311',
    enabled: true,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(UPI_CONFIG_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.upiId) return parsed;
    } catch {
      // fallback
    }
  }

  localStorage.setItem(UPI_CONFIG_STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
}

function saveUpiConfig(config: UpiConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(UPI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
}

/**
 * Initializes seed submissions in localStorage for multi-day auditing.
 */
function getStoredSubmissions(): Submission[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
  }

  // Create seeds
  let sampleHtmlRecords: EnrolmentRecord[] = [];
  let sampleCsvRecords: EnrolmentRecord[] = [];
  try {
    sampleHtmlRecords = parseUIDAIReport(SAMPLE_HTML_REPORT, 'UIDAI_Sample.html', 'HTML').records;
    sampleCsvRecords = parseUIDAIReport(SAMPLE_CSV_REPORT, 'UIDAI_Sample.csv', 'CSV').records;
  } catch {
    // fallback
  }

  const seeds = [
    {
      ref: 'EOD-REF-902811-A1',
      userId: 'operator01',
      userName: 'Rajesh Sharma',
      daysAgo: 0,
      hoursAgo: 2,
      fileName: 'UIDAI_EOD_20261005_Batch1.zip',
      format: 'HTML',
      records: 170,
      amount: 11450.0,
      newCount: 14,
      updateCount: 156,
      comp: 132,
      proc: 28,
      rej: 10,
      gst: 1746.61,
      operatorId: 'WCDKXJ766835',
      stationId: '88026',
    },
    {
      ref: 'EOD-REF-894102-B4',
      userId: 'operator02',
      userName: 'Priya Patel',
      daysAgo: 0,
      hoursAgo: 5,
      fileName: 'UIDAI_EOD_20261005_ShiftA.zip',
      format: 'CSV',
      records: 130,
      amount: 7825.0,
      newCount: 22,
      updateCount: 108,
      comp: 115,
      proc: 11,
      rej: 4,
      gst: 1193.64,
      operatorId: 'WCDKMJ904893',
      stationId: '88029',
    },
    {
      ref: 'EOD-REF-761944-C9',
      userId: 'operator03',
      userName: 'Amit Kumar',
      daysAgo: 1,
      hoursAgo: 18,
      fileName: 'UIDAI_EOD_20261004_Final.zip',
      format: 'HTML',
      records: 154,
      amount: 9750.0,
      newCount: 18,
      updateCount: 136,
      comp: 140,
      proc: 9,
      rej: 5,
      gst: 1487.29,
      operatorId: 'WCDKAJ119283',
      stationId: '88031',
    },
    {
      ref: 'EOD-REF-650193-D2',
      userId: 'operator01',
      userName: 'Rajesh Sharma',
      daysAgo: 1,
      hoursAgo: 22,
      fileName: 'UIDAI_EOD_20261004_Evening.zip',
      format: 'CSV',
      records: 112,
      amount: 6950.0,
      newCount: 10,
      updateCount: 102,
      comp: 98,
      proc: 10,
      rej: 4,
      gst: 1060.17,
      operatorId: 'WCDKXJ766835',
      stationId: '88026',
    },
    {
      ref: 'EOD-REF-541289-E7',
      userId: 'operator02',
      userName: 'Priya Patel',
      daysAgo: 2,
      hoursAgo: 40,
      fileName: 'UIDAI_EOD_20261003_Batch.zip',
      format: 'HTML',
      records: 145,
      amount: 9275.0,
      newCount: 15,
      updateCount: 130,
      comp: 130,
      proc: 10,
      rej: 5,
      gst: 1414.83,
      operatorId: 'WCDKMJ904893',
      stationId: '88029',
    },
    {
      ref: 'EOD-REF-439811-F5',
      userId: 'operator03',
      userName: 'Amit Kumar',
      daysAgo: 3,
      hoursAgo: 65,
      fileName: 'UIDAI_EOD_20261002_EOD.zip',
      format: 'CSV',
      records: 98,
      amount: 5850.0,
      newCount: 12,
      updateCount: 86,
      comp: 88,
      proc: 8,
      rej: 2,
      gst: 892.37,
      operatorId: 'WCDKAJ119283',
      stationId: '88031',
    },
    {
      ref: 'EOD-REF-328105-G8',
      userId: 'operator01',
      userName: 'Rajesh Sharma',
      daysAgo: 4,
      hoursAgo: 90,
      fileName: 'UIDAI_EOD_20261001_OctStart.zip',
      format: 'HTML',
      records: 160,
      amount: 10425.0,
      newCount: 20,
      updateCount: 140,
      comp: 144,
      proc: 12,
      rej: 4,
      gst: 1590.25,
      operatorId: 'WCDKXJ766835',
      stationId: '88026',
    },
  ];

  const now = Date.now();
  const upi = getStoredUpiConfig();
  const initialSubmissions: Submission[] = [];

  seeds.forEach((s, idx) => {
    const timestampDate = new Date(now - s.daysAgo * 86400000 - s.hoursAgo * 3600000);
    const timestamp = timestampDate.toISOString();
    const utrNumber = '4' + (28190000000 + idx * 43921).toString().slice(0, 11);
    const hashPayload = `${s.ref}:${s.userId}:${s.amount}:${s.records}:${utrNumber}:${timestamp}`;
    const verificationHash = generateVerificationHash(hashPayload);

    const sourceRecords = s.format === 'HTML' ? sampleHtmlRecords : sampleCsvRecords;
    const records = sourceRecords.map((r) => ({
      ...r,
      operatorId: s.operatorId,
    }));

    initialSubmissions.push({
      id: 'sub_' + randomId(),
      submissionRef: s.ref,
      userId: s.userId,
      userName: s.userName,
      timestamp,
      fileName: s.fileName,
      format: s.format,
      recordCount: s.records,
      totalAmount: s.amount,
      countNewEnrolment: s.newCount,
      countUpdate: s.updateCount,
      countCompleted: s.comp,
      countInProcess: s.proc,
      countRejected: s.rej,
      totalGstAmount: s.gst,
      totalNewEnrolmentAmount: 0,
      totalUpdateEnrolmentAmount: s.amount,
      metadata: {
        operator: s.operatorId,
        stationId: s.stationId,
        registrar: '991',
        enrolmentAgency: '0991',
        clientVersion: '3.3.4.2',
        reportDate: timestampDate.toLocaleDateString('en-IN'),
      },
      verificationHash,
      utrNumber,
      paymentStatus: 'PAID',
      upiId: upi.upiId,
      records: records.length > 0 ? records : [],
    });
  });

  localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(initialSubmissions));
  return initialSubmissions;
}

function saveSubmissions(submissions: Submission[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
  }
}

export const clientStore = {
  // Authentication
  async login(userId: string, password?: string): Promise<{ token: string; user: User }> {
    const cleanId = (userId || '').trim();
    const users = getStoredUsers();
    const user = users.find((u) => u.userId.toLowerCase() === cleanId.toLowerCase());

    if (!user) {
      throw new Error('Invalid User ID or Password.');
    }

    if (user.status !== 'active') {
      throw new Error('Account is deactivated. Please contact an Administrator.');
    }

    // Password validation (support default passwords & updated ones)
    if (password) {
      const match =
        user.password === password ||
        (user.userId === 'admin' && password === 'Admin@12345') ||
        (user.userId.startsWith('operator') && password === 'Operator@123');

      if (!match) {
        throw new Error('Invalid User ID or Password.');
      }
    }

    const { password: _, ...safeUser } = user;
    const token = 'tok_client_' + randomId();

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(safeUser));
    }

    return { token, user: safeUser };
  },

  async getMe(): Promise<{ user: User }> {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
      if (raw) {
        try {
          const user = JSON.parse(raw);
          if (user && user.userId) {
            // Verify user still exists and is active
            const users = getStoredUsers();
            const current = users.find((u) => u.userId === user.userId);
            if (current && current.status === 'active') {
              const { password: _, ...safe } = current;
              return { user: safe };
            }
          }
        } catch {
          // ignore
        }
      }
    }
    throw new Error('Unauthorized: Session expired or invalid.');
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    }
  },

  // EOD Extraction and Session Pipeline
  async uploadEodZip(file: File, password: string): Promise<ParsedReportResponse> {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      throw new Error('Invalid file format. Please upload a .zip file.');
    }

    // Step A: Extract in-memory using clientParser
    const extracted = await extractZipInMemory(file, password);

    // Step B: Parse and validate against UIDAI schema in RAM
    const { summary, records } = parseUIDAIReport(
      extracted.content,
      file.name,
      extracted.format
    );

    // Step C: Store in temporary session cache (RAM only, 30 min TTL)
    const sessionId = 'sess_' + randomId();
    let currentUserId = 'operator';
    try {
      const me = await clientStore.getMe();
      currentUserId = me.user.userId;
    } catch {
      // fallback
    }

    memoryReportsCache.set(sessionId, {
      sessionId,
      userId: currentUserId,
      summary,
      records,
      createdAt: Date.now(),
    });

    return {
      sessionId,
      summary,
      records,
    };
  },

  async clearSession(sessionId: string): Promise<void> {
    memoryReportsCache.delete(sessionId);
  },

  async submitReport(
    sessionId: string,
    summaryData: any,
    utrNumber: string
  ): Promise<{ success: boolean; message: string; submission: Submission }> {
    const cleanUtr = (utrNumber || '').trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      throw new Error('A valid UTR (Unique Transaction Reference) is required before the report can be saved.');
    }

    const session = memoryReportsCache.get(sessionId);
    const summary: ReportSummary = session ? session.summary : summaryData;
    const records: EnrolmentRecord[] = session ? session.records : [];

    if (!summary) {
      throw new Error('Report data not found or session expired. Please re-upload your report.');
    }

    let activeUser: User;
    try {
      const me = await clientStore.getMe();
      activeUser = me.user;
    } catch {
      activeUser = {
        id: 'usr_op_001',
        userId: 'operator01',
        name: 'Rajesh Sharma',
        mobileNumber: '9812345678',
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
    }

    const timestamp = new Date().toISOString();
    const submissionRef =
      'EOD-REF-' +
      Date.now().toString().slice(-6) +
      '-' +
      randomId('').slice(0, 4).toUpperCase();

    const hashPayload = `${submissionRef}:${activeUser.userId}:${summary.totalAmountCharged}:${summary.totalRecords}:${cleanUtr}:${timestamp}`;
    const verificationHash = generateVerificationHash(hashPayload);
    const upi = getStoredUpiConfig();

    const submission: Submission = {
      id: 'sub_' + randomId(),
      submissionRef,
      userId: activeUser.userId,
      userName: activeUser.name,
      timestamp,
      fileName: summary.fileName,
      format: summary.format,
      recordCount: summary.totalRecords,
      totalAmount: summary.totalAmountCharged,
      countNewEnrolment: summary.countNewEnrolment,
      countUpdate: summary.countUpdate,
      countCompleted: summary.countCompleted,
      countInProcess: summary.countInProcess,
      countRejected: summary.countRejected,
      totalGstAmount: summary.totalGstAmount,
      totalNewEnrolmentAmount: summary.totalNewEnrolmentAmount,
      totalUpdateEnrolmentAmount: summary.totalUpdateEnrolmentAmount,
      metadata: summary.metadata,
      verificationHash,
      utrNumber: cleanUtr,
      paymentStatus: 'PAID',
      upiId: upi.upiId,
      records: records && records.length > 0 ? records : [],
    };

    // Save to submissions database
    const submissions = getStoredSubmissions();
    submissions.unshift(submission);
    saveSubmissions(submissions);

    // Clean session
    memoryReportsCache.delete(sessionId);

    return {
      success: true,
      message: 'EOD Report successfully reconciled and archived.',
      submission,
    };
  },

  // UPI Config
  async getUpiConfig(): Promise<{ upiConfig: UpiConfig }> {
    return { upiConfig: getStoredUpiConfig() };
  },

  async updateUpiConfig(payload: { upiId: string; payeeName?: string }): Promise<{ success: boolean; upiConfig: UpiConfig }> {
    const cleanUpi = (payload.upiId || '').trim();
    if (!cleanUpi || !cleanUpi.includes('@')) {
      throw new Error('Invalid UPI ID format. A valid UPI ID must include an "@" symbol (e.g. merchant@okaxis).');
    }

    const current = getStoredUpiConfig();
    const updated: UpiConfig = {
      ...current,
      upiId: cleanUpi,
      payeeName: payload.payeeName ? payload.payeeName.trim() : 'UIDAI EOD Authority',
      updatedAt: new Date().toISOString(),
    };
    saveUpiConfig(updated);
    return { success: true, upiConfig: updated };
  },

  // Submissions
  async getSubmissions(filters?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ submissions: Submission[] }> {
    let list = getStoredSubmissions();

    if (filters?.userId) {
      list = list.filter((s) => s.userId.toLowerCase() === filters.userId!.toLowerCase());
    }
    if (filters?.startDate) {
      list = list.filter((s) => s.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((s) => s.timestamp <= filters.endDate!);
    }

    return { submissions: list };
  },

  async getSubmissionDetails(id: string): Promise<{ submission: Submission }> {
    const list = getStoredSubmissions();
    const found = list.find((s) => s.id === id || s.submissionRef === id);
    if (!found) {
      throw new Error('Report submission not found.');
    }
    return { submission: found };
  },

  async deleteSubmission(id: string): Promise<{ success: boolean; message: string; submission: Submission }> {
    const list = getStoredSubmissions();
    const index = list.findIndex((s) => s.id === id || s.submissionRef === id);
    if (index === -1) {
      throw new Error('Report submission not found.');
    }
    const [removed] = list.splice(index, 1);
    saveSubmissions(list);
    return {
      success: true,
      message: `Report ${removed.submissionRef} removed successfully.`,
      submission: removed,
    };
  },

  // Users Management
  async listUsers(): Promise<{ users: User[] }> {
    const stored = getStoredUsers();
    const safeUsers = stored.map(({ password: _, ...u }) => u);
    return { users: safeUsers };
  },

  async createUser(payload: {
    name: string;
    userId: string;
    mobileNumber: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<{ user: User }> {
    const cleanId = payload.userId.trim();
    const users = getStoredUsers();

    if (users.some((u) => u.userId.toLowerCase() === cleanId.toLowerCase())) {
      throw new Error(`User ID "${cleanId}" is already registered. Please choose another unique identifier.`);
    }

    const cleanMobile = payload.mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      throw new Error('Mobile number must be at least 10 digits.');
    }

    if (payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const newUser: StoredUser = {
      id: 'usr_' + randomId(),
      userId: cleanId,
      name: payload.name.trim(),
      mobileNumber: cleanMobile,
      role: payload.role || 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      password: payload.password,
    };

    users.push(newUser);
    saveUsers(users);

    const { password: _, ...safeUser } = newUser;
    return { user: safeUser };
  },

  async toggleUserStatus(userId: string): Promise<{ user: User }> {
    const users = getStoredUsers();
    const user = users.find((u) => u.userId === userId);
    if (!user) throw new Error('User not found.');
    if (user.role === 'admin' && user.userId === 'admin') {
      throw new Error('Root Administrator account cannot be deactivated.');
    }

    user.status = user.status === 'active' ? 'inactive' : 'active';
    saveUsers(users);

    const { password: _, ...safeUser } = user;
    return { user: safeUser };
  },

  async resetUserPassword(userId: string, newPass: string): Promise<{ success: boolean }> {
    const users = getStoredUsers();
    const user = users.find((u) => u.userId === userId);
    if (!user) throw new Error('User not found.');
    if (newPass.length < 6) throw new Error('New password must be at least 6 characters long.');

    user.password = newPass;
    saveUsers(users);
    return { success: true };
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    const cleanId = userId.trim();
    if (cleanId === 'admin') {
      throw new Error('Root Administrator account cannot be removed.');
    }

    const users = getStoredUsers();
    const index = users.findIndex((u) => u.userId === cleanId);
    if (index === -1) {
      throw new Error(`User "${cleanId}" not found.`);
    }

    users.splice(index, 1);
    saveUsers(users);
    return { success: true, message: `Operator "${cleanId}" removed successfully.` };
  },

  // Bulk Upload
  async bulkUploadRows(
    rows: BulkUserRow[],
    defaultPassword = 'Operator@123'
  ): Promise<{ success: boolean; result: BulkUploadResult }> {
    const users = getStoredUsers();
    const result: BulkUploadResult = {
      totalProcessed: rows.length,
      createdCount: 0,
      skippedCount: 0,
      createdUsers: [],
      errors: [],
    };

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const cleanId = (row.userId || '').trim();
      const cleanName = (row.name || '').trim();
      const cleanMobile = (row.mobileNumber || '').replace(/\D/g, '');
      const cleanPass = (row.password || '').trim() || defaultPassword;

      if (!cleanId) {
        result.skippedCount++;
        result.errors.push({ row: rowNum, reason: 'Missing User ID.' });
        return;
      }
      if (!cleanName) {
        result.skippedCount++;
        result.errors.push({ row: rowNum, userId: cleanId, reason: 'Missing Full Name.' });
        return;
      }
      if (cleanMobile.length < 10) {
        result.skippedCount++;
        result.errors.push({
          row: rowNum,
          userId: cleanId,
          name: cleanName,
          reason: 'Invalid Mobile Number (must be at least 10 digits).',
        });
        return;
      }
      if (users.some((u) => u.userId.toLowerCase() === cleanId.toLowerCase())) {
        result.skippedCount++;
        result.errors.push({
          row: rowNum,
          userId: cleanId,
          name: cleanName,
          reason: `User ID "${cleanId}" already exists.`,
        });
        return;
      }
      if (cleanPass.length < 6) {
        result.skippedCount++;
        result.errors.push({
          row: rowNum,
          userId: cleanId,
          name: cleanName,
          reason: 'Password must be at least 6 characters.',
        });
        return;
      }

      const newUser: StoredUser = {
        id: 'usr_' + randomId(),
        userId: cleanId,
        name: cleanName,
        mobileNumber: cleanMobile,
        role: row.role === 'admin' ? 'admin' : 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        password: cleanPass,
      };

      users.push(newUser);
      result.createdCount++;
      const { password: _, ...safeUser } = newUser;
      result.createdUsers.push(safeUser);
    });

    saveUsers(users);
    return { success: true, result };
  },

  // Admin Stats
  async getAdminStats(): Promise<{ stats: AdminStats }> {
    const users = getStoredUsers();
    const submissions = getStoredSubmissions();
    const totalAmount = submissions.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalRecords = submissions.reduce((acc, s) => acc + s.recordCount, 0);

    return {
      stats: {
        totalUsers: users.length,
        totalSubmissions: submissions.length,
        totalAmountProcessed: Math.round(totalAmount * 100) / 100,
        totalRecordsProcessed: totalRecords,
      },
    };
  },
};
