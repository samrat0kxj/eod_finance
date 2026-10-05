import type {
  User,
  ParsedReportResponse,
  Submission,
  AdminStats,
  UpiConfig,
  BulkUploadResult,
  BulkUserRow,
} from '../types.ts';
import { clientStore } from './clientStore.ts';

const TOKEN_KEY = 'uidai_eod_auth_token';
const NETLIFY_MODE_KEY = 'uidai_netlify_client_mode';

let inMemoryClientMode = false;

export function isClientModeActive(): boolean {
  if (inMemoryClientMode) return true;
  if (typeof window !== 'undefined') {
    return localStorage.getItem(NETLIFY_MODE_KEY) === 'true';
  }
  return false;
}

export function setClientModeActive(active: boolean) {
  inMemoryClientMode = active;
  if (typeof window !== 'undefined') {
    if (active) {
      localStorage.setItem(NETLIFY_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(NETLIFY_MODE_KEY);
    }
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function parseCsvText(text: string): BulkUserRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

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
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';

  // If endpoint is 404 Not Found (e.g. Netlify static hosting) or SPA fallback served HTML
  if (response.status === 404 || contentType.includes('text/html')) {
    setClientModeActive(true);
    throw new Error('STATUS_404_NETLIFY_FALLBACK');
  }

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  async login(userId: string, password: string): Promise<{ token: string; user: User }> {
    if (isClientModeActive()) {
      return clientStore.login(userId, password);
    }

    try {
      const res = await request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      setStoredToken(res.token);
      return res;
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch') ||
        msg.includes('network')
      ) {
        setClientModeActive(true);
        return clientStore.login(userId, password);
      }
      throw err;
    }
  },

  async getMe(): Promise<{ user: User }> {
    if (isClientModeActive()) {
      return clientStore.getMe();
    }

    try {
      return await request<{ user: User }>('/api/auth/me');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.getMe();
      }
      throw err;
    }
  },

  async logout(): Promise<void> {
    try {
      if (!isClientModeActive()) {
        await request('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // ignore
    } finally {
      await clientStore.logout();
      setStoredToken(null);
    }
  },

  // EOD Processing (Single UC, Single ECMP, or Dual UC+ECMP Package)
  async uploadEodZip(
    fileUc?: File | null,
    passwordUc?: string,
    fileEcmp?: File | null,
    passwordEcmp?: string
  ): Promise<ParsedReportResponse> {
    if (isClientModeActive()) {
      return clientStore.uploadEodZip(fileUc, passwordUc, fileEcmp, passwordEcmp);
    }

    try {
      const formData = new FormData();
      if (fileUc) {
        formData.append('uc', fileUc);
        formData.append('passwordUc', passwordUc || '');
        formData.append('file', fileUc); // fallback
        formData.append('password', passwordUc || '');
      }
      if (fileEcmp) {
        formData.append('ecmp', fileEcmp);
        formData.append('passwordEcmp', passwordEcmp || '');
        if (!fileUc) {
          formData.append('file', fileEcmp); // fallback if only ECMP
          formData.append('password', passwordEcmp || '');
        } else {
          formData.append('file2', fileEcmp); // fallback if both
          formData.append('password2', passwordEcmp || '');
        }
      }

      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/upload-eod', {
        method: 'POST',
        headers,
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.status === 404 || contentType.includes('text/html')) {
        setClientModeActive(true);
        return clientStore.uploadEodZip(fileUc, passwordUc, fileEcmp, passwordEcmp);
      }

      if (!response.ok) {
        let errorMsg = `Upload failed with status ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.error) {
            errorMsg = errJson.error;
          }
        } catch {
          // fallback
        }
        throw new Error(errorMsg);
      }

      return response.json() as Promise<ParsedReportResponse>;
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.uploadEodZip(fileUc, passwordUc, fileEcmp, passwordEcmp);
      }
      throw err;
    }
  },

  async clearSession(sessionId: string): Promise<void> {
    if (isClientModeActive()) {
      return clientStore.clearSession(sessionId);
    }

    try {
      await request('/api/clear-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err: any) {
      if (isClientModeActive()) {
        return clientStore.clearSession(sessionId);
      }
      throw err;
    }
  },

  async submitReport(
    sessionId: string,
    summaryData: any,
    utrNumber: string
  ): Promise<{ success: boolean; message: string; submission: Submission }> {
    if (isClientModeActive()) {
      return clientStore.submitReport(sessionId, summaryData, utrNumber);
    }

    try {
      return await request('/api/submit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, summaryData, utrNumber }),
      });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.submitReport(sessionId, summaryData, utrNumber);
      }
      throw err;
    }
  },

  async getUpiConfig(): Promise<{ upiConfig: UpiConfig }> {
    if (isClientModeActive()) {
      return clientStore.getUpiConfig();
    }

    try {
      return await request('/api/upi-config');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.getUpiConfig();
      }
      throw err;
    }
  },

  async updateUpiConfig(payload: {
    upiId: string;
    payeeName?: string;
  }): Promise<{ success: boolean; upiConfig: UpiConfig }> {
    if (isClientModeActive()) {
      return clientStore.updateUpiConfig(payload);
    }

    try {
      return await request('/api/admin/upi-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.updateUpiConfig(payload);
      }
      throw err;
    }
  },

  async getSubmissionDetails(id: string): Promise<{ submission: Submission }> {
    if (isClientModeActive()) {
      return clientStore.getSubmissionDetails(id);
    }

    try {
      return await request(`/api/admin/submissions/${encodeURIComponent(id)}`);
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.getSubmissionDetails(id);
      }
      throw err;
    }
  },

  // Admin APIs
  async listUsers(): Promise<{ users: User[] }> {
    if (isClientModeActive()) {
      return clientStore.listUsers();
    }

    try {
      return await request('/api/admin/users');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.listUsers();
      }
      throw err;
    }
  },

  async createUser(payload: {
    name: string;
    userId: string;
    mobileNumber: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<{ user: User }> {
    if (isClientModeActive()) {
      return clientStore.createUser(payload);
    }

    try {
      return await request('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.createUser(payload);
      }
      throw err;
    }
  },

  async toggleUserStatus(userId: string): Promise<{ user: User }> {
    if (isClientModeActive()) {
      return clientStore.toggleUserStatus(userId);
    }

    try {
      return await request(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
      });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.toggleUserStatus(userId);
      }
      throw err;
    }
  },

  async resetUserPassword(userId: string, password: string): Promise<{ success: boolean }> {
    if (isClientModeActive()) {
      return clientStore.resetUserPassword(userId, password);
    }

    try {
      return await request(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.resetUserPassword(userId, password);
      }
      throw err;
    }
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    if (isClientModeActive()) {
      return clientStore.deleteUser(userId);
    }

    try {
      return await request(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.deleteUser(userId);
      }
      throw err;
    }
  },

  async getSubmissions(filters?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ submissions: Submission[] }> {
    if (isClientModeActive()) {
      return clientStore.getSubmissions(filters);
    }

    try {
      const params = new URLSearchParams();
      if (filters?.userId) params.set('userId', filters.userId);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      const q = params.toString() ? `?${params.toString()}` : '';
      return await request(`/api/admin/submissions${q}`);
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.getSubmissions(filters);
      }
      throw err;
    }
  },

  async deleteSubmission(id: string): Promise<{ success: boolean; message: string; submission: Submission }> {
    if (isClientModeActive()) {
      return clientStore.deleteSubmission(id);
    }

    try {
      return await request(`/api/admin/submissions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.deleteSubmission(id);
      }
      throw err;
    }
  },

  async getAdminStats(): Promise<{ stats: AdminStats }> {
    if (isClientModeActive()) {
      return clientStore.getAdminStats();
    }

    try {
      return await request('/api/admin/stats');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.getAdminStats();
      }
      throw err;
    }
  },

  async bulkUploadUsers(file: File, defaultPassword = 'Operator@123'): Promise<{ success: boolean; result: BulkUploadResult }> {
    if (isClientModeActive()) {
      const text = await file.text();
      const rows = parseCsvText(text);
      return clientStore.bulkUploadRows(rows, defaultPassword);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('defaultPassword', defaultPassword);

      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/users/bulk-upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.status === 404 || contentType.includes('text/html')) {
        setClientModeActive(true);
        const text = await file.text();
        const rows = parseCsvText(text);
        return clientStore.bulkUploadRows(rows, defaultPassword);
      }

      if (!response.ok) {
        let errorMsg = `Bulk upload failed (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.error) {
            errorMsg = errJson.error;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      return response.json();
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        const text = await file.text();
        const rows = parseCsvText(text);
        return clientStore.bulkUploadRows(rows, defaultPassword);
      }
      throw err;
    }
  },

  async bulkUploadRows(
    rows: BulkUserRow[],
    defaultPassword = 'Operator@123'
  ): Promise<{ success: boolean; result: BulkUploadResult }> {
    if (isClientModeActive()) {
      return clientStore.bulkUploadRows(rows, defaultPassword);
    }

    try {
      return await request('/api/admin/users/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, defaultPassword }),
      });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('status_404_netlify_fallback') ||
        msg.includes('404') ||
        msg.includes('failed to fetch')
      ) {
        setClientModeActive(true);
        return clientStore.bulkUploadRows(rows, defaultPassword);
      }
      throw err;
    }
  },
};
