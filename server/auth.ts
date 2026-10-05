import crypto from 'crypto';
import type { User, Submission, AdminStats, ReportSummary, EnrolmentRecord, UpiConfig } from '../src/types.ts';
import { parseUIDAIReport } from './parser.ts';
import { SAMPLE_CSV_REPORT, SAMPLE_HTML_REPORT } from '../src/sampleData.ts';

// Pre-configured users for testing and production readiness
interface UserRecord extends User {
  passwordHash: string;
  salt: string;
}

// In-Memory UPI Configuration (Receiver Merchant UPI details)
export let currentUpiConfig: UpiConfig = {
  upiId: 'uidai.eod@okhdfcbank',
  payeeName: 'UIDAI EOD Authority',
  merchantCode: '9311',
  enabled: true,
  updatedAt: new Date().toISOString(),
};

export function getUpiConfig(): UpiConfig {
  return currentUpiConfig;
}

export function updateUpiConfig(upiId: string, payeeName: string): UpiConfig {
  if (!upiId || !upiId.includes('@')) {
    throw new Error('Invalid UPI ID format. A valid UPI ID must include an "@" symbol (e.g. merchant@okaxis).');
  }

  currentUpiConfig = {
    ...currentUpiConfig,
    upiId: upiId.trim(),
    payeeName: payeeName ? payeeName.trim() : 'UIDAI EOD Authority',
    updatedAt: new Date().toISOString(),
  };

  return currentUpiConfig;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// In-Memory store for users
const usersStore = new Map<string, UserRecord>();

// Initialize default Admin & Users
function initDefaultUsers() {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const adminUser: UserRecord = {
    id: 'usr_admin_001',
    userId: 'admin',
    name: 'UIDAI Authority Admin',
    mobileNumber: '9876543210',
    role: 'admin',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    salt: adminSalt,
    passwordHash: hashPassword('Admin@12345', adminSalt),
  };
  usersStore.set(adminUser.userId, adminUser);

  const operatorSalt = crypto.randomBytes(16).toString('hex');
  const operatorUser: UserRecord = {
    id: 'usr_op_001',
    userId: 'operator01',
    name: 'Rajesh Sharma',
    mobileNumber: '9812345678',
    role: 'user',
    status: 'active',
    createdAt: new Date('2026-02-15T00:00:00Z').toISOString(),
    salt: operatorSalt,
    passwordHash: hashPassword('Operator@123', operatorSalt),
  };
  usersStore.set(operatorUser.userId, operatorUser);

  const op2Salt = crypto.randomBytes(16).toString('hex');
  const operatorUser2: UserRecord = {
    id: 'usr_op_002',
    userId: 'operator02',
    name: 'Priya Patel',
    mobileNumber: '9823456789',
    role: 'user',
    status: 'active',
    createdAt: new Date('2026-02-20T00:00:00Z').toISOString(),
    salt: op2Salt,
    passwordHash: hashPassword('Operator@123', op2Salt),
  };
  usersStore.set(operatorUser2.userId, operatorUser2);

  const op3Salt = crypto.randomBytes(16).toString('hex');
  const operatorUser3: UserRecord = {
    id: 'usr_op_003',
    userId: 'operator03',
    name: 'Amit Kumar',
    mobileNumber: '9834567890',
    role: 'user',
    status: 'active',
    createdAt: new Date('2026-03-01T00:00:00Z').toISOString(),
    salt: op3Salt,
    passwordHash: hashPassword('Operator@123', op3Salt),
  };
  usersStore.set(operatorUser3.userId, operatorUser3);
}

initDefaultUsers();

// In-Memory active token sessions
interface SessionData {
  userId: string;
  role: 'admin' | 'user';
  name: string;
  createdAt: number;
}
const activeSessions = new Map<string, SessionData>();

// In-Memory Parsed Reports store (RAM ONLY, expires after 30 min, cleared immediately on submit or reset)
export interface StoredParsedSession {
  sessionId: string;
  userId: string;
  summary: ReportSummary;
  records: EnrolmentRecord[];
  createdAt: number;
}
export const memoryReportsCache = new Map<string, StoredParsedSession>();

// In-Memory Submissions History (metadata only, zero file content)
export const submissionsLog: Submission[] = [];

// Cleanup stale sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  // Clean memory reports older than 30 minutes
  for (const [key, val] of memoryReportsCache.entries()) {
    if (now - val.createdAt > 30 * 60 * 1000) {
      memoryReportsCache.delete(key);
    }
  }
  // Clean inactive auth tokens older than 24 hours
  for (const [token, sess] of activeSessions.entries()) {
    if (now - sess.createdAt > 24 * 60 * 60 * 1000) {
      activeSessions.delete(token);
    }
  }
}, 10 * 60 * 1000);

export function authenticate(userId: string, password?: string): { token: string; user: User } | null {
  const user = usersStore.get(userId.trim());
  if (!user) return null;
  if (user.status !== 'active') {
    throw new Error('Account is deactivated. Please contact an Administrator.');
  }

  if (password) {
    const computed = hashPassword(password, user.salt);
    if (computed !== user.passwordHash) {
      return null;
    }
  }

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  activeSessions.set(token, {
    userId: user.userId,
    role: user.role,
    name: user.name,
    createdAt: Date.now(),
  });

  const { passwordHash: _, salt: __, ...safeUser } = user;
  return { token, user: safeUser };
}

export function verifySession(token: string): User | null {
  if (!token) return null;
  const sess = activeSessions.get(token);
  if (!sess) return null;
  const user = usersStore.get(sess.userId);
  if (!user || user.status !== 'active') return null;

  const { passwordHash: _, salt: __, ...safeUser } = user;
  return safeUser;
}

export function revokeSession(token: string) {
  activeSessions.delete(token);
}

export function createUser(params: {
  name: string;
  userId: string;
  mobileNumber: string;
  password: string;
  role?: 'admin' | 'user';
}): User {
  const cleanId = params.userId.trim();
  if (usersStore.has(cleanId)) {
    throw new Error(`User ID "${cleanId}" is already registered. Please choose another unique identifier.`);
  }

  // Mobile number validation (10 digits standard)
  const cleanMobile = params.mobileNumber.replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    throw new Error('Mobile number must be at least 10 digits.');
  }

  if (params.password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const newUser: UserRecord = {
    id: 'usr_' + crypto.randomBytes(6).toString('hex'),
    userId: cleanId,
    name: params.name.trim(),
    mobileNumber: cleanMobile,
    role: params.role || 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
    salt,
    passwordHash: hashPassword(params.password, salt),
  };

  usersStore.set(cleanId, newUser);
  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  return safeUser;
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

export function bulkCreateUsers(
  rows: BulkUserRow[],
  defaultPassword = 'Operator@123'
): BulkUploadResult {
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
    if (usersStore.has(cleanId)) {
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

    try {
      const newUser = createUser({
        name: cleanName,
        userId: cleanId,
        mobileNumber: cleanMobile,
        password: cleanPass,
        role: row.role === 'admin' ? 'admin' : 'user',
      });
      result.createdCount++;
      result.createdUsers.push(newUser);
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push({
        row: rowNum,
        userId: cleanId,
        name: cleanName,
        reason: err.message || 'Creation error.',
      });
    }
  });

  return result;
}

export function listUsers(): User[] {
  return Array.from(usersStore.values()).map(({ passwordHash: _, salt: __, ...u }) => u);
}

export function toggleUserStatus(userId: string): User {
  const user = usersStore.get(userId);
  if (!user) throw new Error('User not found.');
  if (user.role === 'admin' && user.userId === 'admin') {
    throw new Error('Root Administrator account cannot be deactivated.');
  }
  user.status = user.status === 'active' ? 'inactive' : 'active';
  const { passwordHash: _, salt: __, ...safeUser } = user;
  return safeUser;
}

export function resetUserPassword(userId: string, newPass: string): boolean {
  const user = usersStore.get(userId);
  if (!user) throw new Error('User not found.');
  if (newPass.length < 6) throw new Error('New password must be at least 6 characters long.');
  const newSalt = crypto.randomBytes(16).toString('hex');
  user.salt = newSalt;
  user.passwordHash = hashPassword(newPass, newSalt);
  return true;
}

export function deleteUser(userId: string): boolean {
  const cleanId = userId.trim();
  const user = usersStore.get(cleanId);
  if (!user) throw new Error(`User "${cleanId}" not found.`);
  if (user.role === 'admin' && user.userId === 'admin') {
    throw new Error('Root Administrator account cannot be removed.');
  }

  // Revoke active sessions for this user
  for (const [token, sess] of activeSessions.entries()) {
    if (sess.userId === cleanId) {
      activeSessions.delete(token);
    }
  }

  return usersStore.delete(cleanId);
}

export function deleteSubmission(idOrRef: string): Submission {
  const index = submissionsLog.findIndex(
    (s) => s.id === idOrRef || s.submissionRef === idOrRef
  );
  if (index === -1) {
    throw new Error('Report submission not found.');
  }

  const [removed] = submissionsLog.splice(index, 1);
  return removed;
}

export function recordSubmission(
  userId: string,
  userName: string,
  summary: ReportSummary,
  utrNumber: string,
  records?: EnrolmentRecord[]
): Submission {
  const cleanUtr = (utrNumber || '').trim();
  if (!cleanUtr || cleanUtr.length < 6) {
    throw new Error('A valid UTR (Unique Transaction Reference) is required before the report can be saved.');
  }

  const timestamp = new Date().toISOString();
  const submissionRef =
    'EOD-REF-' +
    Date.now().toString().slice(-6) +
    '-' +
    crypto.randomBytes(2).toString('hex').toUpperCase();

  // Generate SHA-256 verification hash for audit integrity
  const hashPayload = `${submissionRef}:${userId}:${summary.totalAmountCharged}:${summary.totalRecords}:${cleanUtr}:${timestamp}`;
  const verificationHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  const submission: Submission = {
    id: 'sub_' + crypto.randomBytes(8).toString('hex'),
    submissionRef,
    userId,
    userName,
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
    upiId: currentUpiConfig.upiId,
    records: records && records.length > 0 ? records : [],
  };

  submissionsLog.unshift(submission);
  return submission;
}

// Seed realistic multi-day submissions for initial admin auditing
function initSampleSubmissions() {
  const seeds: Array<{
    ref: string;
    userId: string;
    userName: string;
    daysAgo: number;
    hoursAgo: number;
    fileName: string;
    format: string;
    records: number;
    amount: number;
    newCount: number;
    updateCount: number;
    comp: number;
    proc: number;
    rej: number;
    gst: number;
    operatorId: string;
    stationId: string;
  }> = [
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
  let sampleHtmlRecords: EnrolmentRecord[] = [];
  let sampleCsvRecords: EnrolmentRecord[] = [];
  try {
    sampleHtmlRecords = parseUIDAIReport(SAMPLE_HTML_REPORT, 'UIDAI_Sample.html', 'HTML').records;
    sampleCsvRecords = parseUIDAIReport(SAMPLE_CSV_REPORT, 'UIDAI_Sample.csv', 'CSV').records;
  } catch {
    // fallback if parser error
  }

  for (let idx = 0; idx < seeds.length; idx++) {
    const s = seeds[idx];
    const timestampDate = new Date(now - s.daysAgo * 86400000 - s.hoursAgo * 3600000);
    const timestamp = timestampDate.toISOString();
    const utrNumber = '4' + (28190000000 + idx * 43921).toString().slice(0, 11);
    const hashPayload = `${s.ref}:${s.userId}:${s.amount}:${s.records}:${utrNumber}:${timestamp}`;
    const verificationHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const sourceRecords = s.format === 'HTML' ? sampleHtmlRecords : sampleCsvRecords;
    const records = sourceRecords.map((r, i) => ({
      ...r,
      operatorId: s.operatorId,
    }));

    submissionsLog.push({
      id: 'sub_' + crypto.randomBytes(6).toString('hex'),
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
      upiId: currentUpiConfig.upiId,
      records: records.length > 0 ? records : [],
    });
  }
}

initSampleSubmissions();

export function getAdminStats(): AdminStats {
  const totalAmount = submissionsLog.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalRecords = submissionsLog.reduce((acc, s) => acc + s.recordCount, 0);

  return {
    totalUsers: usersStore.size,
    totalSubmissions: submissionsLog.length,
    totalAmountProcessed: Math.round(totalAmount * 100) / 100,
    totalRecordsProcessed: totalRecords,
  };
}
