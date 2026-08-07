import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── API Base URL ──────────────────────────────────────────────────────────────
// CORE_API_URL → Cloud-deployable CRUD backend (auth, tracker, appointments, etc.)
// Set EXPO_PUBLIC_CORE_URL in your .env to point at your deployed backend.
//
// NOTE: The local AI microservice (RAG + Ollama) has been decoupled from this
// build. AI chat functions below return a stub response. Reconnect them when
// the AI service is available by replacing the stub bodies with aiFetch calls.

const getDevHostIp = (): string => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.developer?.tool ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).experienceUrl;
  if (hostUri) {
    const ip = hostUri.split(':')[0].replace(/.*:\/\//, '');
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return '10.109.98.12'; // hotspot IP fallback — update as needed
};

const getCoreUrl = (): string => {
  const envUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_CORE_URL;
  return envUrl || 'http://localhost:8000';
};

export const CORE_API_URL: string = getCoreUrl();

export type UserRole = 'mother' | 'partner' | 'family' | 'doctor';

// ── Auth Service (hits CORE backend) ─────────────────────────────────────────

export const AuthService = {
  async signup(email: string, password: string, role: UserRole = 'mother') {
    let res;
    try {
      res = await fetch(`${CORE_API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
      });
    } catch (err) {
      if (Platform.OS === 'android') {
        const devIp = getDevHostIp();
        try {
          res = await fetch(`http://${devIp}:8000/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
          });
        } catch (wifiErr) {
          if (!Constants.isDevice) {
            res = await fetch(`http://10.0.2.2:8000/auth/signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
            });
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
      throw new Error(err.detail || 'Signup failed');
    }
    return res.json();
  },

  async login(email: string, password: string) {
    const details: Record<string, string> = {
      username: email.trim().toLowerCase(),
      password,
    };
    const formBody = Object.keys(details)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(details[k]))
      .join('&');

    let res;
    try {
      res = await fetch(`${CORE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: formBody,
      });
    } catch (primaryErr) {
      if (Platform.OS === 'android') {
        const devIp = getDevHostIp();
        try {
          res = await fetch(`http://${devIp}:8000/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: formBody,
          });
        } catch (wifiErr) {
          if (!Constants.isDevice) {
            res = await fetch(`http://10.0.2.2:8000/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
              body: formBody,
            });
          } else {
            throw wifiErr;
          }
        }
      } else {
        throw primaryErr;
      }
    }

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
    const res = await fetch(`${CORE_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
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

// ── AI Chat Methods ───────────────────────────────────────────────────────────
//
// The local AI microservice (RAG + Ollama, port 8001) is decoupled from this
// build. These stubs keep TypeScript happy and give users a clear message.
// To reconnect: implement aiFetch here and replace the stub bodies.

const AI_UNAVAILABLE =
  'The AI service is not available in this build. It will be reconnected in a future update.';

/**
 * Maternal AI Buddy — stub (ai_service decoupled).
 */
export async function sendAiBuddyMessage(_message: string): Promise<string> {
  throw new Error(AI_UNAVAILABLE);
}

/**
 * Father Portal AI — stub (ai_service decoupled).
 */
export async function sendFatherPortalMessage(_message: string): Promise<string> {
  throw new Error(AI_UNAVAILABLE);
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
 * Medical Report Analyzer — stub (ai_service decoupled).
 */
export async function analyzeMedicalReport(
  _reportText: string | null,
  _file: { uri: string; name: string; type: string } | File | null = null
): Promise<ReportAnalysisResult> {
  throw new Error(AI_UNAVAILABLE);
}
