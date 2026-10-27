"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { money } from "@/lib/api";
import { Badge, Card, ErrorNote, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";

export default function Dashboard() {
  const { call, branches, org, user } = useAuth();
  const [sel, setSel] = useState("all");
  const { data, error, loading } = useLoad(() => call(`/reports/dashboard?branch=${sel}`, { branch: null }), [sel]);

  const series = data?.series || [];
  const max = niceMax(Math.max(1, ...series.map((s: any) => s.total)));
  const periodTotal = series.reduce((a: number, s: any) => a + s.total, 0);
  const topMax = Math.max(1, ...(data?.topProducts || []).map((p: any) => p.revenue));
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div>
      <PageHeader title={`${hello}, ${user?.name?.split(" ")[0] || ""}`} subtitle={`${org?.name || ""} · ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · ${sel === "all" ? "all branches" : branches.find((b) => b._id === sel)?.name || ""}`}
        actions={branches.length > 1 && (
          <Select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Branch filter">
            <option value="all">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
        )} />
      <ErrorNote error={error} />
      {loading && !data ? <Spinner /> : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kpi href="/app/sales" label="Sales today" value={money(data.totals.todaySales)} sub={`${data.totals.todayCount} transactions`} />
            <Kpi href="/app/inventory" label="Low stock" value={data.totals.lowStock} sub="at or under reorder level" alert={data.totals.lowStock > 0} />
            <Kpi href="/app/inventory" label="Expiring in 90 days" value={data.totals.nearExpiry} sub="batches to sell or return" alert={data.totals.nearExpiry > 0} />
            <Kpi href="/app/orders" label="Online orders" value={data.totals.openOrders} sub="open" alert={data.totals.openOrders > 0} />
            <Kpi href="/app/prescriptions" label="Prescriptions" value={data.totals.pendingRx} sub="waiting for a pharmacist" alert={data.totals.pendingRx > 0} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">Sales, last 14 days</h2>
                <div className="text-sm text-slate-500"><b className="font-semibold text-slate-900 tabular-nums">{money(periodTotal)}</b> · avg {money(periodTotal / Math.max(1, series.length))} a day</div>
              </div>
              <div className="mt-5 flex h-52 gap-3">
                <div className="flex flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-slate-400">{[max, max / 2, 0].map((v) => <span key={v}>{short(v)}</span>)}</div>
                <div className="relative flex flex-1 items-end gap-1.5" role="img" aria-label="Daily sales bar chart">
                  <div className="pointer-events-none absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">{[0, 1, 2].map((i) => <div key={i} className="border-t border-dashed border-slate-200" />)}</div>
                  {series.map((s: any, i: number) => {
                    const last = i === series.length - 1;
                    return (
                      <div key={s.date} className="group relative flex h-full flex-1 flex-col items-center gap-1">
                        <div className="flex w-full flex-1 items-end">
                          <div className={`w-full rounded-t ${last ? "bg-brand-700" : "bg-slate-300 group-hover:bg-slate-400"}`} style={{ height: `${Math.max(2, (s.total / max) * 100)}%` }} />
                        </div>
                        <div className={`h-4 text-[10px] ${last ? "font-medium text-slate-700" : "text-slate-400"}`}>{last ? "Today" : Number(s.date.slice(8))}</div>
                        <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">{new Date(s.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: {money(s.total)}</div>
                      </div>
                    );
                  })}
                  {!series.length && <div className="m-auto text-sm text-slate-500">No sales yet</div>}
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-semibold">Best sellers</h2>
              <p className="text-xs text-slate-500">Revenue, last 14 days</p>
              <ol className="mt-4 space-y-3">
                {data.topProducts.map((p: any) => (
                  <li key={p.name} className="text-sm">
                    <div className="flex items-baseline justify-between gap-3"><span className="truncate text-slate-800">{p.name}</span><span className="shrink-0 tabular-nums text-slate-600">{money(p.revenue)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-600/70" style={{ width: `${(p.revenue / topMax) * 100}%` }} /></div>
                  </li>
                ))}
                {!data.topProducts.length && <li className="text-sm text-slate-500">No sales yet</li>}
              </ol>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Branches</h2>
            <Table head={["Branch", "Sales today", "Low stock", "Near expiry", "Expired", "Open orders", "Stock value", "Licence"]} right={[1, 2, 3, 4, 5, 6]}>
              {data.perBranch.map((b: any) => (
                <tr key={b.branch._id}>
                  <Td><div className="font-medium text-slate-900">{b.branch.name}</div><div className="text-xs text-slate-400">{b.branch.code}</div></Td>
                  <Td className="whitespace-nowrap text-right font-medium tabular-nums">{money(b.todaySales)}</Td>
                  <Td className={`text-right tabular-nums ${b.lowStock ? "text-amber-700" : "text-slate-400"}`}>{b.lowStock}</Td>
                  <Td className={`text-right tabular-nums ${b.nearExpiryBatches ? "text-amber-700" : "text-slate-400"}`}>{b.nearExpiryBatches}</Td>
                  <Td className={`text-right tabular-nums ${b.expiredBatches ? "font-medium text-red-700" : "text-slate-400"}`}>{b.expiredBatches}</Td>
                  <Td className={`text-right tabular-nums ${b.openOrders ? "" : "text-slate-400"}`}>{b.openOrders}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">{money(b.stockValue)}</Td>
                  <Td>{b.licenceDays === null ? "-" : b.licenceDays < 0 ? <Badge tone="red">Expired</Badge> : b.licenceDays <= 60 ? <Badge tone="amber"><AlertTriangle className="mr-1 h-3 w-3" />{b.licenceDays} days left</Badge> : <span className="text-slate-500">Valid</span>}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}

// Rounds the chart's top value up to a tidy number (e.g. 18,420 -> 20,000).
function niceMax(v: number) { const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / (p / 2)) * (p / 2); }
const short = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(Math.round(v)));

function Kpi({ href, label, value, sub, alert }: { href: string; label: string; value: React.ReactNode; sub: string; alert?: boolean }) {
  return (
    <Link href={href} className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span className="flex items-center gap-1.5">{alert && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}{label}</span><ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-slate-500" /></div>
      <div className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{sub}</div>
    </Link>
  );
}
