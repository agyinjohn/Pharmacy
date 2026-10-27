export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const safe = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} },
  del(k: string) { try { localStorage.removeItem(k); } catch {} },
};
export { safe as store };

export class ApiError extends Error {
  status: number; details?: any;
  constructor(message: string, status: number, details?: any) { super(message); this.status = status; this.details = details; }
}

type Opts = { method?: string; body?: any; token?: string | null; branch?: string | null; raw?: boolean };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.branch) headers["x-branch-id"] = opts.branch;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { method: opts.method || (opts.body !== undefined ? "POST" : "GET"), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  } catch {
    throw new ApiError("Cannot reach the server. Is the API running?", 0);
  }
  if (opts.raw) return res as any;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

export const money = (n: number | undefined | null) => `GH₵ ${(Number(n) || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dateFmt = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-");
export const dateTime = (d?: string | Date | null) => (d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
export const daysUntil = (d?: string | Date | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);
