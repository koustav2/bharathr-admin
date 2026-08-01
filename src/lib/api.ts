'use client';

// Thin client for the BharatHR API. Every JSON response uses the envelope
// { success, message, data?, error?{code} }. 401 → clear session → /login.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://api.bharatherbs.in/api/v2';

export type ApiUser = {
  id: string;
  email: string;
  role: 'EMPLOYEE' | 'HR_ADMIN' | 'IT_ADMIN' | 'SUPER_ADMIN';
  mustChangePassword?: boolean;
  employeeId?: string | null;
  empCode?: string | null;
  name?: string | null;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const session = {
  get token(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bhr_token');
  },
  get user(): ApiUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('bhr_user');
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  },
  save(token: string, user: ApiUser) {
    localStorage.setItem('bhr_token', token);
    localStorage.setItem('bhr_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('bhr_token');
    localStorage.removeItem('bhr_user');
  },
  get isStaff() {
    const r = this.user?.role;
    return r === 'HR_ADMIN' || r === 'SUPER_ADMIN';
  },
  get isAnyAdmin() {
    const r = this.user?.role;
    return r === 'HR_ADMIN' || r === 'IT_ADMIN' || r === 'SUPER_ADMIN';
  },
};

function onUnauthorized() {
  session.clear();
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login/';
  }
}

/** JSON request; returns the envelope's `data`. Throws ApiError otherwise. */
export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && session.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && auth) onUnauthorized();

  let env: any = null;
  try {
    env = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok || env?.success === false) {
    throw new ApiError(res.status, env?.message || `Request failed (${res.status})`, env?.error?.code);
  }
  return env?.data as T;
}

/** Multipart request (uploads). `fields` become text parts; `file` a binary part. */
export async function apiUpload<T>(
  path: string,
  fields: Record<string, string | undefined>,
  file?: { part: string; blob: Blob; filename: string },
): Promise<T> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== '') fd.append(k, v);
  if (file) fd.append(file.part, file.blob, file.filename);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: session.token ? { Authorization: `Bearer ${session.token}` } : undefined,
    body: fd,
  });
  if (res.status === 401) onUnauthorized();
  const env: any = await res.json().catch(() => null);
  if (!res.ok || env?.success === false) {
    throw new ApiError(res.status, env?.message || `Upload failed (${res.status})`, env?.error?.code);
  }
  return env?.data as T;
}

/** Binary GET (PDFs, CSVs, images). Returns an object URL + suggested filename. */
export async function apiBlob(path: string): Promise<{ url: string; blob: Blob }> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: session.token ? { Authorization: `Bearer ${session.token}` } : undefined,
  });
  if (res.status === 401) onUnauthorized();
  if (!res.ok) {
    const env: any = await res.json().catch(() => null);
    throw new ApiError(res.status, env?.message || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), blob };
}

/** Download a binary endpoint as a file. */
export async function downloadFile(path: string, filename: string) {
  const { url } = await apiBlob(path);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Open a binary endpoint in a new tab (PDF preview, images). */
export async function openFile(path: string) {
  const { url } = await apiBlob(path);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const fmt = {
  date(s?: string | null): string {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return s;
    }
  },
  dateTime(s?: string | null): string {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return s;
    }
  },
  time(s?: string | null): string {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return s;
    }
  },
  money(v?: number | null): string {
    if (v === null || v === undefined) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);
  },
  monthName(m: number): string {
    return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1] || String(m);
  },
};
