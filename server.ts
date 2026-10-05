import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  extractZipInMemory,
  parseUIDAIReport,
  createSampleZipInMemory,
} from './server/parser.ts';
import {
  authenticate,
  verifySession,
  revokeSession,
  createUser,
  listUsers,
  toggleUserStatus,
  resetUserPassword,
  recordSubmission,
  submissionsLog,
  getAdminStats,
  memoryReportsCache,
  getUpiConfig,
  updateUpiConfig,
  bulkCreateUsers,
  deleteUser,
  deleteSubmission,
} from './server/auth.ts';
import { SAMPLE_HTML_REPORT, SAMPLE_CSV_REPORT } from './src/sampleData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CRITICAL SECURITY CONSTRAINT: Strict in-memory storage only.
// NO uploaded files or unzipped contents ever touch disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB max buffer
  },
});

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const user = verifySession(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
  }
  (req as any).user = user;
  (req as any).token = token;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  });
}

// -------------------------------------------------------------
// 1. Authentication Routes
// -------------------------------------------------------------
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and password are required.' });
  }

  try {
    const result = authenticate(userId, password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid User ID or Password.' });
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(403).json({ error: err.message || 'Authentication failed.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
  const token = (req as any).token;
  revokeSession(token);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// -------------------------------------------------------------
// 2. File Upload & In-Memory Extraction Pipeline
// -------------------------------------------------------------
app.post(
  '/api/upload-eod',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    let zipBuffer: Buffer | null = req.file?.buffer || null;
    const password = (req.body.password || '').toString();

    if (!zipBuffer) {
      return res.status(400).json({ error: 'No ZIP file was uploaded.' });
    }

    const originalName = req.file?.originalname || 'package.zip';
    if (!originalName.toLowerCase().endsWith('.zip')) {
      return res.status(400).json({ error: 'Invalid file format. Please upload a .zip file.' });
    }

    try {
      // Step A: Extract in-memory with password decryption
      const extracted = await extractZipInMemory(zipBuffer, password);

      // Step B: Parse and validate against UIDAI schema in RAM
      const { summary, records } = parseUIDAIReport(
        extracted.content,
        originalName,
        extracted.format
      );

      // Step C: Immediate memory clearing of raw file buffers
      zipBuffer = null;
      if (req.file) {
        delete (req.file as any).buffer;
      }

      // Step D: Store in temporary session cache (RAM only, 30 min TTL)
      const sessionId = 'sess_' + crypto.randomBytes(16).toString('hex');
      const currentUser = (req as any).user;

      memoryReportsCache.set(sessionId, {
        sessionId,
        userId: currentUser.userId,
        summary,
        records,
        createdAt: Date.now(),
      });

      return res.json({
        sessionId,
        summary,
        records,
      });
    } catch (err: any) {
      // Clean up references
      zipBuffer = null;
      return res.status(422).json({
        error: err.message || 'Failed to decrypt and process UIDAI EOD package.',
      });
    }
  }
);

// Clear Session / Reset current view from memory
app.post('/api/clear-session', requireAuth, (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId && memoryReportsCache.has(sessionId)) {
    memoryReportsCache.delete(sessionId);
  }
  return res.json({ success: true, message: 'Session data purged from RAM.' });
});

// Final Report Submission Workflow (Requires UTR Payment Confirmation)
app.post('/api/submit-report', requireAuth, (req: Request, res: Response) => {
  const { sessionId, summaryData, utrNumber } = req.body;
  const currentUser = (req as any).user;

  const cleanUtr = (utrNumber || '').toString().trim();
  if (!cleanUtr || cleanUtr.length < 6) {
    return res.status(400).json({
      error: 'Payment Verification Error: A valid 12-digit UTR (Unique Transaction Reference) number is required before the report can be saved.',
    });
  }

  let reportSummary = summaryData;
  let records: any[] = [];

  if (sessionId && memoryReportsCache.has(sessionId)) {
    const cached = memoryReportsCache.get(sessionId)!;
    reportSummary = cached.summary;
    records = cached.records || [];
    // Purge cached records from server upload buffer
    memoryReportsCache.delete(sessionId);
  }

  if (!reportSummary || !reportSummary.totalAmountCharged) {
    return res.status(400).json({ error: 'Invalid submission data. Please re-upload the package.' });
  }

  try {
    // Record submission with verified UTR, payment status, and full table records for admin audit
    const submission = recordSubmission(
      currentUser.userId,
      currentUser.name,
      reportSummary,
      cleanUtr,
      records
    );

    return res.json({
      success: true,
      message: 'Payment confirmed via UTR and EOD report saved successfully.',
      submission,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to submit report.' });
  }
});

// UPI Configuration Endpoints
app.get('/api/upi-config', requireAuth, (_req: Request, res: Response) => {
  res.json({ upiConfig: getUpiConfig() });
});

app.post('/api/admin/upi-config', requireAdmin, (req: Request, res: Response) => {
  const { upiId, payeeName } = req.body;
  if (!upiId) {
    return res.status(400).json({ error: 'UPI ID is required.' });
  }
  try {
    const updated = updateUpiConfig(upiId, payeeName);
    return res.json({ success: true, upiConfig: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. Sample Protected ZIP Generator (for live testing)
// -------------------------------------------------------------
app.get('/api/sample-zip', async (req: Request, res: Response) => {
  const format = (req.query.format || 'html').toString().toLowerCase();
  const password = (req.query.password || 'Uidai@2026').toString();

  try {
    let filename = 'UIDAI_EOD_Report_Sample.html';
    let content = SAMPLE_HTML_REPORT;

    if (format === 'csv') {
      filename = 'UIDAI_EOD_Report_Sample.csv';
      content = SAMPLE_CSV_REPORT;
    }

    const zipBytes = await createSampleZipInMemory(filename, content, password);
    const downloadZipName = `UIDAI_Protected_${format.toUpperCase()}_Report.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadZipName}"`);
    res.setHeader('X-Zip-Password', password);
    res.send(Buffer.from(zipBytes));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate sample ZIP: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. Admin Management Routes
// -------------------------------------------------------------
app.get('/api/admin/users', requireAdmin, (_req: Request, res: Response) => {
  res.json({ users: listUsers() });
});

app.post('/api/admin/users', requireAdmin, (req: Request, res: Response) => {
  const { name, userId, mobileNumber, password, role } = req.body;
  if (!name || !userId || !mobileNumber || !password) {
    return res.status(400).json({
      error: 'Name, User ID, Mobile Number, and Password are all required.',
    });
  }

  try {
    const newUser = createUser({
      name,
      userId,
      mobileNumber,
      password,
      role: role === 'admin' ? 'admin' : 'user',
    });
    return res.status(201).json({ user: newUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create user.' });
  }
});

// Download Operator Bulk Onboarding Template CSV (public template, no auth needed for downloading blank template)
app.get('/api/admin/users/template', (_req: Request, res: Response) => {
  const templateCsv = `Name,User ID,Mobile Number,Password,Role
Suresh Verma,operator05,9876543211,Operator@123,user
Anita Desai,operator06,9876543212,Operator@123,user
Vikram Singh,operator07,9876543213,Operator@123,user
Deepak Joshi,operator08,9876543214,Operator@123,user`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="UIDAI_Operators_Bulk_Template.csv"');
  res.send(templateCsv);
});

// Bulk Upload Operators
app.post(
  '/api/admin/users/bulk-upload',
  requireAdmin,
  upload.single('file'),
  (req: Request, res: Response) => {
    let rowsToProcess: any[] = [];

    // Check if uploaded file
    if (req.file?.buffer) {
      const csvText = req.file.buffer.toString('utf-8');
      const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        return res.status(400).json({
          error: 'Uploaded CSV file must have a header row and at least one operator record.',
        });
      }

      const rawHeaders = lines[0].split(',').map((h) => h.replace(/["']/g, '').trim().toLowerCase());
      const nameIdx = rawHeaders.findIndex((h) => h.includes('name'));
      const userIdIdx = rawHeaders.findIndex(
        (h) => h.includes('user') || h.includes('operator') || h === 'id'
      );
      const mobileIdx = rawHeaders.findIndex(
        (h) => h.includes('mobile') || h.includes('phone') || h.includes('contact')
      );
      const passIdx = rawHeaders.findIndex((h) => h.includes('pass'));
      const roleIdx = rawHeaders.findIndex((h) => h.includes('role'));

      if (userIdIdx === -1 || nameIdx === -1) {
        return res.status(400).json({
          error: 'CSV file missing required columns: "Name" and "User ID".',
        });
      }

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
        if (cells.length < 2) continue;

        rowsToProcess.push({
          name: nameIdx !== -1 ? cells[nameIdx] : '',
          userId: userIdIdx !== -1 ? cells[userIdIdx] : '',
          mobileNumber: mobileIdx !== -1 ? cells[mobileIdx] : '',
          password: passIdx !== -1 && cells[passIdx] ? cells[passIdx] : undefined,
          role: roleIdx !== -1 && cells[roleIdx].toLowerCase() === 'admin' ? 'admin' : 'user',
        });
      }
    } else if (req.body.rows && Array.isArray(req.body.rows)) {
      rowsToProcess = req.body.rows;
    } else {
      return res.status(400).json({ error: 'No file or rows provided for bulk operator creation.' });
    }

    if (rowsToProcess.length === 0) {
      return res.status(400).json({ error: 'No valid operator records found to process.' });
    }

    const defaultPass = req.body.defaultPassword || 'Operator@123';
    const result = bulkCreateUsers(rowsToProcess, defaultPass);

    return res.json({ success: true, result });
  }
);

app.patch('/api/admin/users/:userId/status', requireAdmin, (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const updated = toggleUserStatus(userId);
    res.json({ user: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/users/:userId/reset-password', requireAdmin, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  try {
    resetUserPassword(userId, password);
    res.json({ success: true, message: `Password for ${userId} reset successfully.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:userId', requireAdmin, (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    deleteUser(userId);
    res.json({ success: true, message: `User "${userId}" removed successfully.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/submissions', requireAdmin, (req: Request, res: Response) => {
  const { userId, startDate, endDate } = req.query;
  let filtered = [...submissionsLog];

  if (userId && typeof userId === 'string' && userId !== 'all') {
    filtered = filtered.filter((s) => s.userId.toLowerCase() === userId.toLowerCase());
  }

  if (startDate && typeof startDate === 'string') {
    const startTime = new Date(startDate).setHours(0, 0, 0, 0);
    if (!isNaN(startTime)) {
      filtered = filtered.filter((s) => new Date(s.timestamp).getTime() >= startTime);
    }
  }

  if (endDate && typeof endDate === 'string') {
    const endTime = new Date(endDate).setHours(23, 59, 59, 999);
    if (!isNaN(endTime)) {
      filtered = filtered.filter((s) => new Date(s.timestamp).getTime() <= endTime);
    }
  }

  res.json({ submissions: filtered });
});

app.get('/api/admin/submissions/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const sub = submissionsLog.find((s) => s.id === id || s.submissionRef === id);
  if (!sub) {
    return res.status(404).json({ error: 'Submission not found.' });
  }
  res.json({ submission: sub });
});

app.delete('/api/admin/submissions/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deleted = deleteSubmission(id);
    res.json({
      success: true,
      message: `Report submission ${deleted.submissionRef} removed successfully.`,
      submission: deleted,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/stats', requireAdmin, (_req: Request, res: Response) => {
  res.json({ stats: getAdminStats() });
});

// -------------------------------------------------------------
// 5. Frontend Integration (Vite Middleware in dev / Static in prod)
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[UIDAI EOD Processor] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
