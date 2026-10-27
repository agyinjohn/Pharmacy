"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { money } from "@/lib/api";
import { Badge, Card, ErrorNote, PageHeader, Select, Spinner, Stat, Table, Td } from "@/components/ui";

export default function Dashboard() {
  const { call, branches, org } = useAuth();
  const [sel, setSel] = useState("all");
  const { data, error, loading } = useLoad(() => call(`/reports/dashboard?branch=${sel}`, { branch: null }), [sel]);

  const max = Math.max(1, ...(data?.series || []).map((s: any) => s.total));
  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`${org?.name || ""} - today across ${sel === "all" ? "all your branches" : "one branch"}`}
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
            <Stat label="Sales today" value={money(data.totals.todaySales)} sub={`${data.totals.todayCount} transactions`} />
            <Stat label="Low stock" value={data.totals.lowStock} tone={data.totals.lowStock ? "amber" : undefined} sub="products at or under reorder level" />
            <Stat label="Expiring ≤ 90 days" value={data.totals.nearExpiry} tone={data.totals.nearExpiry ? "red" : undefined} sub="batches" />
            <Stat label="Open online orders" value={data.totals.openOrders} sub={<Link href="/app/orders" className="text-brand-700 hover:underline">View orders</Link>} />
            <Stat label="Rx awaiting pharmacist" value={data.totals.pendingRx} tone={data.totals.pendingRx ? "amber" : undefined} sub={<Link href="/app/prescriptions" className="text-brand-700 hover:underline">Review</Link>} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="font-semibold">Sales, last 14 days</h2>
              <div className="mt-4 flex h-48 items-end gap-2" role="img" aria-label="Daily sales bar chart">
                {data.series.map((s: any) => (
                  <div key={s.date} className="group flex h-full flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div title={`${s.date}: ${money(s.total)}`} className="w-full rounded-sm bg-slate-300 transition group-hover:bg-brand-700" style={{ height: `${Math.max(3, (s.total / max) * 100)}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400">{s.date.slice(8)}</div>
                  </div>
                ))}
                {!data.series.length && <div className="m-auto text-sm text-slate-500">No sales yet</div>}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-semibold">Top products (14 days)</h2>
              <ol className="mt-4 space-y-3">
                {data.topProducts.map((p: any, i: number) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800">{i + 1}</span><span className="truncate">{p.name}</span></span>
                    <span className="shrink-0 tabular-nums text-slate-600">{money(p.revenue)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Branches</h2>
            <Table head={["Branch", "Sales today", "Low stock", "Near expiry", "Expired", "Open orders", "Stock value", "Licence"]}>
              {data.perBranch.map((b: any) => (
                <tr key={b.branch._id}>
                  <Td className="font-medium">{b.branch.name} <span className="text-xs text-slate-400">{b.branch.code}</span></Td>
                  <Td className="tabular-nums">{money(b.todaySales)}</Td>
                  <Td>{b.lowStock ? <Badge tone="amber">{b.lowStock}</Badge> : "0"}</Td>
                  <Td>{b.nearExpiryBatches ? <Badge tone="red">{b.nearExpiryBatches}</Badge> : "0"}</Td>
                  <Td>{b.expiredBatches ? <Badge tone="red">{b.expiredBatches}</Badge> : "0"}</Td>
                  <Td>{b.openOrders}</Td>
                  <Td className="tabular-nums">{money(b.stockValue)}</Td>
                  <Td>{b.licenceDays === null ? "-" : b.licenceDays < 0 ? <Badge tone="red">Expired</Badge> : b.licenceDays <= 60 ? <Badge tone="amber"><AlertTriangle className="mr-1 h-3 w-3" />{b.licenceDays}d left</Badge> : <Badge tone="green">Valid</Badge>}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
