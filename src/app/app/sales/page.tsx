"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Printer, Search, Undo2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import { Receipt } from "@/components/Receipt";

const PAY: Record<string, string> = { cash: "Cash", momo: "Mobile money", card: "Card", credit: "On account", loyalty: "Points" };
const PERIODS: [string, string, number][] = [["today", "Today", 0], ["7", "7 days", 7], ["30", "30 days", 30]];
const startOf = (days: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - days); return d; };
const dayLabel = (iso: string) => {
  const d = new Date(iso); const t = startOf(0);
  if (d >= t) return "Today";
  if (d >= startOf(1)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
};
const refunded = (s: any) => (s.refunds || []).reduce((a: number, r: any) => a + (r.amount || 0), 0);
const payMethods = (s: any) => [...new Set((s.payments || []).map((p: any) => PAY[p.method] || p.method))].join(" + ");

export default function Sales() {
  const { call, branch } = useAuth();
  const [period, setPeriod] = useState("7");
  const [q, setQ] = useState("");
  const [flagged, setFlagged] = useState(false);
  const from = startOf(PERIODS.find((p) => p[0] === period)![2]).toISOString();
  const list = useLoad<any[]>(() => call(`/sales?limit=300&from=${encodeURIComponent(from)}`), [branch?._id, from]);
  const [sale, setSale] = useState<any>(null); const [reason, setReason] = useState(""); const [refunding, setRefunding] = useState(false); const [err, setErr] = useState<string | null>(null);

  const all = list.data || [];
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((s) => (!flagged || s.flags?.length) && (!t || [s.receiptNo, s.customer?.name, s.cashier?.name, ...s.items.map((i: any) => i.name)].some((v) => v?.toLowerCase().includes(t))));
  }, [all, q, flagged]);
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of rows) { const k = dayLabel(s.createdAt); m.set(k, [...(m.get(k) || []), s]); }
    return [...m.entries()];
  }, [rows]);

  const gross = all.reduce((a, s) => a + s.total, 0);
  const refunds = all.reduce((a, s) => a + refunded(s), 0);
  const mix = Object.entries(all.reduce((m: Record<string, number>, s) => { for (const p of s.payments || []) m[p.method] = (m[p.method] || 0) + (p.method === "cash" ? p.amount - (s.changeGiven || 0) : p.amount); return m; }, {})).sort((a, b) => b[1] - a[1]);
  const flaggedCount = all.filter((s) => s.flags?.length).length;

  const open = async (id: string) => { setErr(null); setReason(""); setRefunding(false); setSale(await call(`/sales/${id}`)); };
  const refund = async () => { setErr(null); try { await call(`/sales/${sale._id}/refund`, { body: { reason } }); setSale(null); list.reload(); } catch (e: any) { setErr(e.message); } };

  return (
    <div>
      <PageHeader title="Sales" subtitle={`${branch?.name || ""} · receipts, refunds and offline sales`}
        actions={
          <div className="flex rounded-md border border-slate-300 bg-white p-0.5">
            {PERIODS.map(([v, l]) => <button key={v} onClick={() => setPeriod(v)} className={`rounded px-3 py-1.5 text-sm ${period === v ? "bg-slate-900 font-medium text-white" : "text-slate-600 hover:text-slate-900"}`}>{l}</button>)}
          </div>
        } />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4"><div className="text-xs font-medium text-slate-500">Takings</div><div className="mt-1 text-xl font-semibold tabular-nums">{money(gross - refunds)}</div><div className="mt-0.5 text-xs text-slate-500">after refunds</div></Card>
        <Card className="p-4"><div className="text-xs font-medium text-slate-500">Receipts</div><div className="mt-1 text-xl font-semibold tabular-nums">{all.length}</div><div className="mt-0.5 text-xs text-slate-500">avg {money(all.length ? gross / all.length : 0)}</div></Card>
        <Card className="p-4"><div className="text-xs font-medium text-slate-500">Refunds</div><div className="mt-1 text-xl font-semibold tabular-nums">{money(refunds)}</div><div className="mt-0.5 text-xs text-slate-500">{all.filter((s) => s.refunds?.length).length} receipts</div></Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">Paid by</div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">{mix.map(([m, v], i) => <div key={m} className={["bg-brand-700", "bg-brand-500", "bg-slate-400", "bg-slate-300"][i] || "bg-slate-200"} style={{ width: `${(v / Math.max(1, gross)) * 100}%` }} />)}</div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">{mix.map(([m, v], i) => <span key={m} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${["bg-brand-700", "bg-brand-500", "bg-slate-400", "bg-slate-300"][i] || "bg-slate-200"}`} />{PAY[m] || m} {Math.round((v / Math.max(1, gross)) * 100)}%</span>)}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search receipt, customer, cashier or medicine" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {flaggedCount > 0 && (
            <button onClick={() => setFlagged(!flagged)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${flagged ? "border-red-300 bg-red-50 text-red-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
              <AlertTriangle className="h-3.5 w-3.5" />{flaggedCount} need{flaggedCount === 1 ? "s" : ""} checking
            </button>
          )}
        </div>
        <ErrorNote error={list.error} />
        {list.loading && !list.data ? <Spinner /> : !rows.length ? <p className="py-10 text-center text-sm text-slate-500">No sales match.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500"><th className="px-3 py-2.5 font-medium">Receipt</th><th className="px-3 py-2.5 font-medium">Items</th><th className="px-3 py-2.5 font-medium">Customer</th><th className="px-3 py-2.5 font-medium">Paid by</th><th className="px-3 py-2.5 font-medium">Cashier</th><th className="px-3 py-2.5 text-right font-medium">Total</th></tr></thead>
              {groups.map(([label, list]) => (
                <tbody key={label}>
                  <tr className="bg-slate-50"><td colSpan={5} className="px-3 py-2 text-xs font-medium text-slate-600">{label} <span className="font-normal text-slate-400">· {list.length} sales</span></td><td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-slate-600">{money(list.reduce((a, s) => a + s.total - refunded(s), 0))}</td></tr>
                  {list.map((s) => (
                    <tr key={s._id} onClick={() => open(s._id)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3"><div className="font-mono text-xs text-slate-700">{s.receiptNo}</div><div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{s.channel === "online" && " · Online"}{s.offlineAt && " · Offline"}</div></td>
                      <td className="px-3 py-3 text-slate-800">{s.items[0]?.name}{s.items[0]?.qty > 1 && <span className="text-slate-500"> × {s.items[0].qty}</span>}{s.items.length > 1 && <span className="text-slate-500"> +{s.items.length - 1} more</span>}</td>
                      <td className="px-3 py-3 text-slate-700">{s.customer?.name || <span className="text-slate-400">Walk-in</span>}</td>
                      <td className="px-3 py-3 text-slate-700">{payMethods(s)}</td>
                      <td className="px-3 py-3 text-slate-700">{s.cashier?.name}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <div className={`font-medium tabular-nums ${s.status === "refunded" ? "text-slate-400 line-through" : "text-slate-900"}`}>{money(s.total)}</div>
                        {s.status !== "completed" && <StatusBadge s={s.status} />}
                        {s.flags?.length > 0 && <span className="ml-1"><Badge tone="red">Check</Badge></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!sale} onClose={() => setSale(null)} title={`Receipt ${sale?.receiptNo || ""}`} wide>
        {sale && (
          <div className="grid gap-6 sm:grid-cols-[1fr_280px]">
            <div className="rounded-lg bg-slate-50 p-4"><Receipt sale={sale} branch={sale.branch} /></div>
            <div className="no-print space-y-4 text-sm">
              {sale.flags?.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{sale.flags.map((f: string) => <div key={f} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{f}</div>)}<div className="mt-1 text-xs">Recorded offline. Check the shelf and correct stock with an adjustment if needed.</div></div>}
              <dl className="space-y-2">
                {[["Status", <StatusBadge key="s" s={sale.status} />], ["When", dateTime(sale.createdAt)], ["Branch", sale.branch?.name], ["Cashier", sale.cashier?.name], ["Customer", sale.customer?.name || "Walk-in"], ["Paid by", payMethods(sale)], ...(sale.payments || []).filter((p: any) => p.reference).map((p: any) => ["Reference", p.reference])].map(([k, v], i) => (
                  <div key={i} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right text-slate-900">{v}</dd></div>
                ))}
              </dl>
              {sale.refunds?.length > 0 && (
                <div className="border-t border-slate-200 pt-3">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Refunds</div>
                  {sale.refunds.map((r: any, i: number) => <div key={i} className="py-1"><div className="flex justify-between"><span className="text-slate-800">{r.reason}</span><span className="tabular-nums">-{money(r.amount)}</span></div>{r.at && <div className="text-xs text-slate-500">{dateTime(r.at)}{r.by?.name && ` · ${r.by.name}`}</div>}</div>)}
                </div>
              )}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <Button className="w-full" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Reprint receipt</Button>
                {["completed", "partially_refunded"].includes(sale.status) && (refunding ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <Input autoFocus placeholder="Reason for the refund" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <p className="text-xs text-slate-500">Refunds every item not already returned. Stock goes back to its batch.</p>
                    <div className="flex gap-2"><Button className="flex-1" variant="outline" onClick={() => setRefunding(false)}>Cancel</Button><Button className="flex-1" variant="danger" disabled={!reason.trim()} onClick={refund}>Refund</Button></div>
                  </div>
                ) : <Button className="w-full" variant="ghost" onClick={() => setRefunding(true)}><Undo2 className="h-4 w-4" />Refund…</Button>)}
                <ErrorNote error={err} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
