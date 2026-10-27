"use client";
import { useState } from "react";
import { RefreshCw, WifiOff, X } from "lucide-react";
import { useOffline } from "@/lib/offlineContext";
import { removeQueued } from "@/lib/offline";
import { dateTime } from "@/lib/api";
import { Badge, Button, Modal } from "./ui";

const KIND: Record<string, string> = { sale: "Sale", receipt: "Goods received", dispense: "Dispensing" };

// Shows connectivity and what is waiting to sync, on every staff screen.
export default function OfflineBanner() {
  const { online, queue, syncing, syncNow, refresh, lastResult } = useOffline();
  const [open, setOpen] = useState(false); const [hideResult, setHideResult] = useState<string | null>(null);
  const waiting = queue.filter((q) => q.status === "pending").length;
  const rejected = queue.filter((q) => q.status === "rejected").length;
  return (
    <>
      {(!online || queue.length > 0) && (
        <div className={`no-print mb-4 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm ${!online ? "border-amber-300 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}>
          {!online ? <WifiOff className="h-4 w-4" /> : <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />}
          <span>{!online ? "Offline: sales, goods received and dispensing of verified prescriptions are saved on this device and sent when the connection returns." : "Work done offline is waiting to sync."} {queue.length > 0 && <b>{waiting} waiting{rejected ? `, ${rejected} need attention` : ""}.</b>}</span>
          {queue.length > 0 && <Button size="sm" variant="outline" onClick={() => setOpen(true)}>View</Button>}
          {online && waiting > 0 && <Button size="sm" variant="outline" loading={syncing} onClick={syncNow}>Sync now</Button>}
        </div>
      )}
      {lastResult && hideResult !== lastResult && (
        <div className="no-print mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><span>{lastResult}</span><button aria-label="Dismiss" onClick={() => setHideResult(lastResult)}><X className="h-4 w-4" /></button></div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Offline work on this device" wide>
        <div className="divide-y divide-slate-100 text-sm">
          {queue.map((q) => (
            <div key={q.clientId} className="flex items-center justify-between gap-3 py-2">
              <div><div className="font-medium">{KIND[q.kind]} · {q.label}</div><div className="text-xs text-slate-500">{dateTime(q.createdAt)}</div>{q.error && <div className="text-xs text-red-700">{q.error}</div>}</div>
              <div className="flex items-center gap-2"><Badge tone={q.status === "pending" ? "amber" : "red"}>{q.status === "pending" ? "waiting" : "rejected"}</Badge>{q.status === "rejected" && <Button size="sm" variant="outline" onClick={async () => { await removeQueued(q.clientId); refresh(); }}>Dismiss</Button>}</div>
            </div>
          ))}
          {!queue.length && <p className="py-4 text-center text-slate-500">Nothing waiting.</p>}
        </div>
        <p className="mt-3 text-xs text-slate-500">Rejected items were not recorded by the server; record them manually (ask your manager), then dismiss. Stock shortfalls and possible duplicate prescription fills are accepted and flagged for review.</p>
      </Modal>
    </>
  );
}
