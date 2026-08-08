import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── API Base URLs ─────────────────────────────────────────────────────────────
// CORE_API_URL  → Cloud-deployable CRUD backend (auth, tracker, and more)
// AI_API_URL    → Local-only AI microservice (RAG + Ollama, port 8001)

const getDevHostIp = (): string => {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.developer?.tool || (Constants as any).manifest?.debuggerHost || (Constants as any).experienceUrl;
  if (hostUri) {
    const ip = hostUri.split(':')[0].replace(/.*:\/\//, '');
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return '10.109.98.12'; // Current hotspot IP fallback
};

const getBaseUrl = (defaultPort: number) => {
  const envUrl = defaultPort === 8000 
    ? (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_CORE_URL)
    : (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AI_URL);

  if (envUrl) return envUrl;

  // On physical devices / Expo Go, localhost refers to the mobile phone itself.
  // Dynamically resolve dev machine IP address from Expo hostUri.
  if (Platform.OS !== 'web') {
    const devIp = getDevHostIp();
    if (devIp && devIp !== 'localhost' && devIp !== '127.0.0.1') {
      return `http://${devIp}:${defaultPort}`;
    }
  }

  return `http://localhost:${defaultPort}`;
};

export const CORE_API_URL: string = getBaseUrl(8000);
export const AI_API_URL: string = getBaseUrl(8001);

export type UserRole = 'mother' | 'partner' | 'family' | 'doctor';

// Helper for fetching core backend with IP fallbacks
async function coreFetchRaw(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${CORE_API_URL}${path}`;
  try {
    return await fetch(url, options);
  } catch (primaryErr) {
    const devIp = getDevHostIp();
    if (devIp && devIp !== 'localhost') {
      try {
        return await fetch(`http://${devIp}:8000${path}`, options);
      } catch (wifiErr) {}
    }
    if (Platform.OS === 'android' && !Constants.isDevice) {
      try {
        return await fetch(`http://10.0.2.2:8000${path}`, options);
      } catch (emuErr) {}
    }
    throw new Error('Cannot reach backend server. Please verify core_backend is running on port 8000.');
  }
}

export const AuthService = {
  async signup(email: string, password: string, role: UserRole = 'mother') {
    const res = await coreFetchRaw('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Signup failed');
    }
    return res.json();
  },

  async login(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    const details: Record<string, string> = {
      username: cleanEmail,
      password,
    };
    const formBody = Object.keys(details)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(details[k]))
      .join('&');

    const res = await coreFetchRaw('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: formBody,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    if (data?.access_token) {
      await AsyncStorage.setItem('access_token', data.access_token);
      return data;
    }
    throw new Error('No access token returned by the server');
  },

  async logout() {
    await AsyncStorage.removeItem('access_token');
  },

  async getToken() {
    return AsyncStorage.getItem('access_token');
  },

  async getMe() {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) return null;
    try {
      const res = await coreFetchRaw('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    } catch (e) {
      return null;
    }
  },
};

// ── Native XHR Helper for Multipart FormData Uploads ──────────────────────────
// Bypasses Expo 57 JS fetch (convertFormDataAsync) which throws Unsupported FormDataPart implementation on native mobile
function uploadFormDataWithXHR(url: string, formData: FormData, token?: string | null): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (token) {
      token = token.replace(/^["']|["']$/g, '');
      if (token !== 'null' && token !== 'undefined') {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `Request failed with status ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Request failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network request failed. Please check your connection to the server.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Request timed out. Please try again.'));
    };

    xhr.timeout = 120000;
    xhr.send(formData as any);
  });
}

// ── Core API fetch (auth, tracker, etc.) ──────────────────────────────────────

export async function apiFetch(path: string, options: RequestInit = {}) {
  let token = await AsyncStorage.getItem('access_token');
  if (token) token = token.replace(/^["']|["']$/g, '');

  const isFormData = options.body instanceof FormData || (options.body && options.body.constructor && options.body.constructor.name === 'FormData');
  
  if (isFormData && Platform.OS !== 'web') {
    return uploadFormDataWithXHR(`${CORE_API_URL}${path}`, options.body as FormData, token);
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${CORE_API_URL}${path}`, { ...options, headers });
  } catch (err) {
    if (Platform.OS === 'android') {
      const devIp = getDevHostIp();
      try {
        const wifiUrl = `http://${devIp}:8000${path}`;
        res = await fetch(wifiUrl, { ...options, headers });
      } catch (wifiErr) {
        if (!Constants.isDevice) {
          const emulatorUrl = `http://10.0.2.2:8000${path}`;
          res = await fetch(emulatorUrl, { ...options, headers });
        } else {
          throw wifiErr;
        }
      }
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── AI Microservice fetch (no auth required — local service) ──────────────────

async function aiFetch(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData || (options.body && options.body.constructor && options.body.constructor.name === 'FormData');

  if (isFormData && Platform.OS !== 'web') {
    return uploadFormDataWithXHR(`${AI_API_URL}${path}`, options.body as FormData);
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

  let res;
  try {
    res = await fetch(`${AI_API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (Platform.OS === 'android') {
      const devIp = getDevHostIp();
      try {
        const wifiUrl = `http://${devIp}:8001${path}`;
        res = await fetch(wifiUrl, { ...options, headers, signal: controller.signal });
      } catch (wifiErr) {
        if (!Constants.isDevice) {
          const emulatorUrl = `http://10.0.2.2:8001${path}`;
          res = await fetch(emulatorUrl, { ...options, headers, signal: controller.signal });
        } else {
          throw wifiErr;
        }
      }
    } else {
      throw err;
    }
  }
  clearTimeout(timeoutId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `AI service error: ${res.status}`);
  }
  return res.json();
}

// ── AI Chat Methods ───────────────────────────────────────────────────────────

/**
 * Maternal AI Buddy — hits POST /api/v1/chat/maternal on local ai_service (port 8001).
 */
export async function sendAiBuddyMessage(message: string): Promise<string> {
  const data = await aiFetch('/api/v1/chat/maternal', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return data.response as string;
}

/**
 * Father Portal AI — hits POST /api/v1/chat/father on local ai_service (port 8001).
 */
export async function sendFatherPortalMessage(message: string): Promise<string> {
  const data = await aiFetch('/api/v1/chat/father', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return data.response as string;
}

// ── Report Analyzer Types & Method ──────────────────────────────────────────

export interface KeyIndicator {
  name: string;
  value: string;
  status: 'normal' | 'low' | 'high';
  explanation: string;
}

export interface JargonTerm {
  term: string;
  meaning: string;
}

export interface ReportAnalysisResult {
  summary: string;
  key_indicators: KeyIndicator[];
  jargon_buster: JargonTerm[];
  action_steps: string[];
  warning_flags: string[];
}

/**
 * Analyzes medical report text, image, or PDF — hits POST /api/v1/chat/analyze-report on local ai_service (port 8001).
 */
export async function analyzeMedicalReport(
  reportText: string | null,
  file: { uri: string; name: string; type: string } | File | null = null
): Promise<ReportAnalysisResult> {
  const formData = new FormData();
  if (reportText) {
    formData.append('report_text', reportText);
  }
  if (file) {
    if (Platform.OS === 'web') {
      formData.append('file', file as any);
    } else {
      // In React Native, the file object in FormData MUST have exactly 'uri', 'name', and 'type'
      // properties, AND the value appended to FormData must be cast as 'any' so the native bundler
      // recognizes it as a native Blob/File part instead of converting it to a string.
      const fileToUpload = {
        uri: (file as any).uri,
        name: (file as any).name || 'report.pdf',
        type: (file as any).type || 'application/pdf',
      };
      formData.append('file', fileToUpload as any);
    }
  }

  return aiFetch('/api/v1/chat/analyze-report', {
    method: 'POST',
    body: formData,
  });
}

// ── Health Record Types & Service ───────────────────────────────────────────

export interface HealthRecordItem {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category: string;
  status: 'verified' | 'pending' | 'under_review' | 'flagged';
  role_visibility: 'user' | 'hospital' | 'investigator' | 'admin';
  patient_name?: string;
  gestational_week?: number;
  risk_level?: string;
  doctor_notes?: string;
  recommendations?: string[];
  lab_values?: Record<string, any>;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  created_at?: string;
}

export interface HealthRecordsResponse {
  records: HealthRecordItem[];
  total_count: number;
  visible_count: number;
  active_role: string;
}

export const HealthRecordService = {
  async getRecords(role: string = 'user', statusFilter?: string): Promise<HealthRecordsResponse> {
    let path = `/health-records?role=${encodeURIComponent(role)}`;
    if (statusFilter && statusFilter !== 'all') {
      path += `&status_filter=${encodeURIComponent(statusFilter)}`;
    }
    return apiFetch(path);
  },

  async createRecord(recordData: Partial<HealthRecordItem>): Promise<HealthRecordItem> {
    return apiFetch('/health-records', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  },

  async attachEvidence(recordId: number, attachment_url: string, attachment_name?: string, attachment_type?: string): Promise<HealthRecordItem> {
    return apiFetch(`/health-records/${recordId}/attachment`, {
      method: 'PUT',
      body: JSON.stringify({ attachment_url, attachment_name, attachment_type }),
    });
  },

  getExportUrl(recordId: number, format: 'html' | 'pdf' | 'csv' = 'html'): string {
    return `${CORE_API_URL}/health-records/${recordId}/export?format=${format}`;
  }
};

