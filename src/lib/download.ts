import { API } from "./api";

// Downloads an authenticated API export (CSV or Excel) as a file.
export async function downloadExport(path: string, token: string | null, filename: string, branch?: string | null) {
  const res = await fetch(`${API}${path}`, { headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(branch && { "x-branch-id": branch }) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Export failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
