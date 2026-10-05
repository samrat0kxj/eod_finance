import type { User, ParsedReportResponse, Submission, AdminStats, UpiConfig, BulkUploadResult, BulkUserRow } from '../types.ts';

const TOKEN_KEY = 'uidai_eod_auth_token';

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
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  // EOD Processing
  async uploadEodZip(file: File, password: string): Promise<ParsedReportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

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
  },

  async clearSession(sessionId: string): Promise<void> {
    await request('/api/clear-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  },

  async submitReport(
    sessionId: string,
    summaryData: any,
    utrNumber: string
  ): Promise<{ success: boolean; message: string; submission: Submission }> {
    return request('/api/submit-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, summaryData, utrNumber }),
    });
  },

  async getUpiConfig(): Promise<{ upiConfig: UpiConfig }> {
    return request('/api/upi-config');
  },

  async updateUpiConfig(payload: { upiId: string; payeeName?: string }): Promise<{ success: boolean; upiConfig: UpiConfig }> {
    return request('/api/admin/upi-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getSubmissionDetails(id: string): Promise<{ submission: Submission }> {
    return request(`/api/admin/submissions/${encodeURIComponent(id)}`);
  },

  // Admin APIs
  async listUsers(): Promise<{ users: User[] }> {
    return request('/api/admin/users');
  },

  async createUser(payload: {
    name: string;
    userId: string;
    mobileNumber: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<{ user: User }> {
    return request('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async toggleUserStatus(userId: string): Promise<{ user: User }> {
    return request(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
    });
  },

  async resetUserPassword(userId: string, password: string): Promise<{ success: boolean }> {
    return request(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  async getSubmissions(filters?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ submissions: Submission[] }> {
    const params = new URLSearchParams();
    if (filters?.userId) params.set('userId', filters.userId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const q = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/admin/submissions${q}`);
  },

  async deleteSubmission(id: string): Promise<{ success: boolean; message: string; submission: Submission }> {
    return request(`/api/admin/submissions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async getAdminStats(): Promise<{ stats: AdminStats }> {
    return request('/api/admin/stats');
  },

  async bulkUploadUsers(file: File, defaultPassword = 'Operator@123'): Promise<{ success: boolean; result: BulkUploadResult }> {
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
  },

  async bulkUploadRows(rows: BulkUserRow[], defaultPassword = 'Operator@123'): Promise<{ success: boolean; result: BulkUploadResult }> {
    return request('/api/admin/users/bulk-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, defaultPassword }),
    });
  },
};
