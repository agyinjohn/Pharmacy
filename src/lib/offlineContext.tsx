"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";
import { useAuth } from "./auth";
import { listQueue, queueOp, removeQueued, saveCatalog, saveRxSnapshot, type QueuedOp } from "./offline";

type Ctx = { online: boolean; setOffline: () => void; queue: QueuedOp[]; syncing: boolean; syncNow: () => Promise<void>; refresh: () => Promise<void>; lastResult: string | null };
const OfflineCtx = createContext<Ctx>({ online: true, setOffline: () => {}, queue: [], syncing: false, syncNow: async () => {}, refresh: async () => {}, lastResult: null });
export const useOffline = () => useContext(OfflineCtx);

// Tracks connectivity for the whole staff app, keeps offline snapshots fresh and syncs the queue.
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { call, branch, user, org, can } = useAuth();
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedOp[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => { if (branch) setQueue(await listQueue(branch._id).catch(() => [])); }, [branch]);

  const snapshot = useCallback(async () => {
    if (!branch || !user) return;
    try { if (can("cashier", "pharmacist", "branch_manager", "technician")) { const c = await call("/pos/catalog"); await saveCatalog(branch._id, c.at, c.products); } } catch {}
    try { if (user.role === "pharmacist" && org) { const r = await call("/offline/rx-snapshot"); await saveRxSnapshot(org._id, r.at, r.prescriptions); } } catch {}
  }, [branch, user, org, call, can]);

  const syncNow = useCallback(async () => {
    if (!branch || busy.current) return;
    busy.current = true; // claim before any await so two triggers (online event, timer) cannot both send
    const pending = (await listQueue(branch._id).catch(() => [])).filter((q) => q.status === "pending");
    if (!pending.length) { busy.current = false; return; }
    setSyncing(true);
    try {
      const r = await call("/offline/sync", { body: { ops: pending.map(({ clientId, kind, createdAt, payload }) => ({ clientId, kind, createdAt, payload })) } });
      let flagged = 0;
      for (const res of r.results) {
        if (res.ok) { await removeQueued(res.clientId); if (res.flags?.length) flagged += 1; }
        else { const q = pending.find((x) => x.clientId === res.clientId)!; await queueOp({ ...q, status: "rejected", error: res.error }); }
      }
      const ok = r.results.filter((x: any) => x.ok).length;
      setLastResult(`${ok} offline item(s) synced${flagged ? `, ${flagged} flagged for review on the Sales page` : ""}.`);
      setOnline(true); snapshot();
    } catch (e: any) { if (e instanceof ApiError && e.status === 0) setOnline(false); }
    finally { busy.current = false; setSyncing(false); refresh(); }
  }, [branch, call, snapshot, refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); syncNow(); }; const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [syncNow]);

  useEffect(() => {
    if (!branch) return;
    refresh();
    if (navigator.onLine) { snapshot(); syncNow(); }
    const t = setInterval(() => { if (navigator.onLine) { snapshot(); syncNow(); } }, 120000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?._id]);

  return <OfflineCtx.Provider value={{ online, setOffline: () => setOnline(false), queue, syncing, syncNow, refresh, lastResult }}>{children}</OfflineCtx.Provider>;
}
