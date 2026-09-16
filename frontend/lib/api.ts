const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_KEY = 'offpay_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

const ERROR_MESSAGES: Record<string, string> = {
  incorrect_pin: 'Incorrect PIN.',
  cannot_pay_self: "You can't pay yourself.",
  unknown_receiver: "That user doesn't exist.",
  invalid_request: 'Please check the form and try again.',
};

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const fetcher = (path: string) =>
  fetch(`${API_URL}${path}`, { headers: authHeaders() }).then((res) => {
    if (res.status === 401) clearToken();
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  });

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('Session expired — please log in again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(ERROR_MESSAGES[data.error] ?? data.error ?? `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

export interface UserProfile {
  username: string;
  vpa: string;
  displayName: string;
  balance: string;
  createdAt: string;
}

interface AuthResponse {
  token: string;
  expiresIn: string;
  user: UserProfile;
}

export async function login(username: string, password: string): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error === 'invalid_credentials' ? 'Incorrect username or password.' : 'Login failed.');
  setToken((data as AuthResponse).token);
  return (data as AuthResponse).user;
}

export async function signup(
  username: string,
  displayName: string,
  password: string,
  pin: string,
): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, displayName, password, pin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error === 'username_taken' ? 'That username is already taken.' : 'Sign up failed.');
  }
  setToken((data as AuthResponse).token);
  return (data as AuthResponse).user;
}

export interface Contact {
  vpa: string;
  displayName: string;
}

export interface Transaction {
  id: number;
  packetHash: string;
  senderVpa: string;
  receiverVpa: string;
  amount: string;
  signedAt: string;
  settledAt: string;
  bridgeNodeId: string;
  hopCount: number;
  status: 'SETTLED' | 'REJECTED';
}

export interface DeviceState {
  deviceId: string;
  hasInternet: boolean;
  packetCount: number;
  packetIds: string[];
}

export interface MeshState {
  devices: DeviceState[];
  idempotencyCacheSize: number;
}
