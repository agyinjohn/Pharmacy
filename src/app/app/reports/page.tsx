"use client";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { downloadExport } from "@/lib/download";
import { dateFmt, dateTime, money } from "@/lib/api";
import { Button, Card, ErrorNote, Input, PageHeader, Select, Spinner, Tabs } from "@/components/ui";

// [key, name, uses the date range, what it answers]
type Rep = [string, string, boolean, string];
const GROUPS: [string, Rep[]][] = [
  ["Sales", [
    ["sales?by=day", "By day", true, "Takings day by day, after discounts and tax."],
    ["sales?by=product", "By product", true, "Which medicines bring in the most money."],
    ["sales?by=category", "By category", true, "Revenue split across categories."],
    ["sales?by=cashier", "By cashier", true, "Sales per staff member, for shift checks."],
    ["sales?by=branch", "By branch", true, "How each branch is doing."],
  ]],
  ["Stock", [
    ["stock", "Stock on hand", false, "Every batch on the shelf with its value and age."],
    ["expiry", "Expiring in 90 days", false, "Batches to sell first, return or write off."],
    ["purchases", "Purchases", false, "Purchase orders and what they cost."],
    ["supplier-balances", "Supplier balances", false, "What you owe each supplier."],
  ]],
  ["Money", [
    ["margin", "Profit by product", true, "Revenue against cost for each medicine."],
    ["tax", "Tax summary", true, "Monthly net sales, discounts and tax for filing."],
    ["payment-reconciliation", "Online payments", true, "Online payments to match against the provider."],
  ]],
  ["Pharmacy and online", [
    ["dispensing", "Dispensing", true, "Prescriptions received, verified and dispensed."],
    ["insurance-claims", "Insurance claims", true, "Scheme claims to submit, after co-pay."],
    ["orders", "Online orders", true, "Order times from placing to delivery."],
  ]],
];
const ALL = GROUPS.flatMap(([, r]) => r);
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const PRESETS: [string, number][] = [["7 days", 7], ["30 days", 30], ["90 days", 90]];
const MONEY = /^(subtotal|total|revenue|cost|margin|tax|discount|discounts|net_sales|gross|value|value_at_risk|balance_due|credit_limit|claim_amount|dispensed_value|copay|collected|refunded|paid|pending|awaiting_cod|net_expected_from_provider)$/;
const COUNT = /^(sales|qty|orders)$/;
const short = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(Math.round(v)));

export default function Reports() {
  const { call, token, branches } = useAuth();
  const [rep, setRep] = useState(ALL[0][0]); const [branch, setBranch] = useState("all");
  const [from, setFrom] = useState(day(30)); const [to, setTo] = useState(day(0));
  const meta = ALL.find((r) => r[0] === rep)!;
  const group = GROUPS.find(([, l]) => l.includes(meta))![0];
  const sep = rep.includes("?") ? "&" : "?";
  const qs = `${sep}branch=${branch}&from=${from}&to=${to}`;
  const { data, loading, error } = useLoad<any[]>(() => call(`/reports/${rep}${qs}`, { branch: null }), [rep, branch, from, to]);

  const exportAs = (format: "csv" | "xlsx") => downloadExport(`/reports/${rep}${qs}&format=${format}`, token, `${rep.replace(/[?=&]/g, "-")}.${format}`).catch((e) => alert(e.message));
  const rows = data || [];
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const fmt = (c: string, v: any) => {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "number") return MONEY.test(c) ? money(v) : c === "margin_pct" ? `${v}%` : v.toLocaleString("en-GH");
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return dateTime(v);
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return dateFmt(v);
    if (v === "EXPIRED") return "Expired";
    return v;
  };
  const label = (c: string) => ({ qty: "Quantity", mins_to_dispatch: "Minutes to dispatch", mins_to_deliver: "Minutes to deliver", margin_pct: "Margin %", age_days: "Age (days)", rx: "Rx no.", po: "PO no." } as Record<string, string>)[c] || (c.charAt(0).toUpperCase() + c.slice(1)).replace(/_/g, " ");
  const numeric = (c: string) => rows.some((r) => typeof r[c] === "number");
  const summable = cols.filter((c) => numeric(c) && (MONEY.test(c) || COUNT.test(c)) && !/^(cost|credit_limit)$/.test(c) || (c === "cost" && cols.includes("margin")));
  const sum = (c: string) => rows.reduce((a, r) => a + (Number(r[c]) || 0), 0);
  const headline = summable.filter((c) => MONEY.test(c)).slice(-1)[0];
  const summary: [string, string][] = [
    ...(headline ? [[label(headline), money(sum(headline))] as [string, string]] : []),
    ...summable.filter((c) => COUNT.test(c)).slice(0, 1).map((c) => [label(c), sum(c).toLocaleString("en-GH")] as [string, string]),
    ...(cols.includes("margin") && sum("revenue") ? [["Margin", `${((sum("margin") / sum("revenue")) * 100).toFixed(1)}%`] as [string, string]] : []),
    [({ day: "Days", month: "Months", product: "Products", category: "Categories", cashier: "Cashiers", branch: "Branches", supplier: "Suppliers", order: "Orders", rx: "Prescriptions", po: "Purchase orders" } as Record<string, string>)[cols[0]] || "Rows", rows.length.toLocaleString("en-GH")],
  ];

  const chartKey = cols.includes("total") ? "total" : cols.includes("revenue") ? "revenue" : null;
  const byTime = /^(day|month)$/.test(cols[0] || "");
  const series = chartKey && rows.length > 1 && byTime ? rows.slice(-62) : null;
  const ranked = chartKey && rows.length > 1 && !byTime && rep.startsWith("sales") ? [...rows].sort((a, b) => b[chartKey] - a[chartKey]).slice(0, 8) : null;
  const top = Math.max(1, ...(series || ranked || []).map((r: any) => r[chartKey!] || 0));
  const setPreset = (n: number) => { setFrom(day(n)); setTo(day(0)); };

  return (
    <div>
      <PageHeader title="Reports" subtitle="For all branches or one. Download for Excel, or print and save as PDF."
        actions={<><Button variant="outline" onClick={() => exportAs("xlsx")}><Download className="h-4 w-4" />Excel</Button><Button variant="outline" onClick={() => exportAs("csv")}>CSV</Button><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button></>} />
      <div>
        <div className="min-w-0 space-y-4">
          <div className="no-print">
            <Tabs value={group} onChange={(g) => setRep(GROUPS.find(([n]) => n === g)![1][0][0])} items={GROUPS.map(([g]) => [g, g] as [string, string])} />
            <div className="-mt-1 flex flex-wrap gap-2">
              {GROUPS.find(([n]) => n === group)![1].map(([k, name]) => <button key={k} onClick={() => setRep(k)} className={`rounded-full border px-3 py-1 text-sm ${rep === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>{name}</button>)}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{group}: {meta[1].toLowerCase()}</h2>
            <p className="text-sm text-slate-500">{meta[3]}</p>
          </div>

          <div className="no-print flex flex-wrap items-end gap-3">
            <div className="w-48"><Select aria-label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="all">All branches</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select></div>
            {meta[2] && <>
              <div className="flex rounded-md border border-slate-300 bg-white p-0.5">{PRESETS.map(([l, n]) => <button key={l} onClick={() => setPreset(n)} className={`rounded px-3 py-1.5 text-sm ${from === day(n) && to === day(0) ? "bg-slate-900 font-medium text-white" : "text-slate-600 hover:text-slate-900"}`}>{l}</button>)}</div>
              <div className="flex items-center gap-2 text-sm text-slate-500"><Input aria-label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />to<Input aria-label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </>}
          </div>

          <ErrorNote error={error} />
          {loading && !data ? <Spinner /> : (
            <>
              {rows.length > 0 && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {summary.map(([k, v]) => <Card key={k} className="p-4"><div className="text-xs font-medium text-slate-500">{k}</div><div className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums text-slate-900">{v}</div></Card>)}
                </div>
              )}

              {series && (
                <Card className="p-5">
                  <div className="flex h-48 gap-3">
                    <div className="flex flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-slate-400">{[top, top / 2, 0].map((v) => <span key={v}>{short(v)}</span>)}</div>
                    <div className="relative flex flex-1 items-end gap-1" role="img" aria-label={`${label(chartKey!)} by ${cols[0]}`}>
                      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">{[0, 1, 2].map((i) => <div key={i} className="border-t border-dashed border-slate-200" />)}</div>
                      {series.map((r: any, i: number) => (
                        <div key={i} className="group relative flex h-full flex-1 flex-col items-center gap-1">
                          <div className="flex w-full flex-1 items-end"><div className="w-full rounded-t bg-slate-300 group-hover:bg-brand-700" style={{ height: `${Math.max(2, (r[chartKey!] / top) * 100)}%` }} /></div>
                          <div className="h-4 text-[10px] text-slate-400">{i % Math.ceil(series.length / 12) === 0 ? (cols[0] === "day" ? Number(String(r.day).slice(8)) : String(r[cols[0]]).slice(5)) : ""}</div>
                          <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">{fmt(cols[0], r[cols[0]])}: {money(r[chartKey!])}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
              {ranked && (
                <Card className="space-y-3 p-5">
                  {ranked.map((r: any, i: number) => (
                    <div key={i} className="grid grid-cols-[minmax(0,180px)_1fr_auto] items-center gap-3 text-sm">
                      <span className="truncate text-slate-800">{r[cols[0]] || "-"}</span>
                      <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600/70" style={{ width: `${(r[chartKey!] / top) * 100}%` }} /></div>
                      <span className="tabular-nums text-slate-600">{money(r[chartKey!])}</span>
                    </div>
                  ))}
                </Card>
              )}

              <Card className="overflow-x-auto">
                {!rows.length ? <p className="py-12 text-center text-sm text-slate-500">Nothing for this period and branch.</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-200 text-xs text-slate-500">{cols.map((c) => <th key={c} className={`whitespace-nowrap px-4 py-2.5 font-medium ${numeric(c) ? "text-right" : "text-left"}`}>{label(c)}</th>)}</tr></thead>
                    <tbody>
                      {rows.slice(0, 500).map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          {cols.map((c) => <td key={c} className={`px-4 py-2.5 ${numeric(c) ? "whitespace-nowrap text-right tabular-nums" : ""} ${r[c] === "EXPIRED" ? "text-red-700" : "text-slate-700"}`}>{fmt(c, r[c])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                    {summable.length > 0 && rows.length > 1 && (
                      <tfoot><tr className="border-t-2 border-slate-200 font-semibold text-slate-900">{cols.map((c, i) => <td key={c} className={`px-4 py-3 ${numeric(c) ? "whitespace-nowrap text-right tabular-nums" : ""}`}>{i === 0 ? "Total" : summable.includes(c) ? fmt(c, Math.round(sum(c) * 100) / 100) : ""}</td>)}</tr></tfoot>
                    )}
                  </table>
                )}
              </Card>
              {rows.length > 500 && <p className="text-xs text-slate-500">Showing the first 500 rows. Download for the full report.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
