"use client";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { downloadExport } from "@/lib/download";
import { dateFmt, dateTime, money } from "@/lib/api";
import { Button, Card, ErrorNote, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";

const REPORTS: [string, string, boolean][] = [
  ["sales?by=day", "Sales by day", true], ["sales?by=product", "Sales by product", true], ["sales?by=category", "Sales by category", true], ["sales?by=cashier", "Sales by cashier", true], ["sales?by=branch", "Sales by branch", true],
  ["stock", "Stock on hand and ageing", false], ["expiry", "Expiry report (90 days)", false], ["margin", "Profit margin by product", true], ["tax", "Tax and financial summary", true],
  ["purchases", "Purchases", false], ["supplier-balances", "Supplier balances", false], ["orders", "Online order and delivery performance", true], ["dispensing", "Prescription and dispensing", true], ["insurance-claims", "Insurance / scheme claims", true], ["payment-reconciliation", "Online payment reconciliation", true],
];
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function Reports() {
  const { call, token, branches } = useAuth();
  const [rep, setRep] = useState(REPORTS[0][0]); const [branch, setBranch] = useState("all");
  const [from, setFrom] = useState(day(30)); const [to, setTo] = useState(day(0));
  const sep = rep.includes("?") ? "&" : "?";
  const qs = `${sep}branch=${branch}&from=${from}&to=${to}`;
  const { data, loading, error } = useLoad(() => call(`/reports/${rep}${qs}`, { branch: null }), [rep, branch, from, to]);

  const exportAs = (format: "csv" | "xlsx") => downloadExport(`/reports/${rep}${qs}&format=${format}`, token, `${rep.replace(/[?=&]/g, "-")}.${format}`).catch((e) => alert(e.message));
  const cols = data?.length ? Object.keys(data[0]) : [];
  const dated = REPORTS.find((r) => r[0] === rep)?.[2];
  const MONEY = /^(subtotal|total|revenue|cost|margin|tax|discount|discounts|net_sales|gross|value|value_at_risk|balance_due|credit_limit|claim_amount|dispensed_value|copay|collected|refunded|awaiting_cod|net_expected_from_provider)$/;
  const fmt = (c: string, v: any) => {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "number") return MONEY.test(c) ? money(v) : c === "margin_pct" ? `${v}%` : v.toLocaleString("en-GH");
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return dateTime(v);
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return dateFmt(v);
    return v;
  };
  const label = (c: string) => (c.charAt(0).toUpperCase() + c.slice(1)).replace(/_/g, " ");
  const numeric = (c: string) => (data || []).some((r: any) => typeof r[c] === "number");
  const chartKey = cols.includes("total") ? "total" : cols.includes("revenue") ? "revenue" : null;
  const chartRows = chartKey && (data || []).length > 1 && (data || []).length <= 62 ? data! : null;
  const chartMax = chartRows ? Math.max(1, ...chartRows.map((r: any) => r[chartKey!] || 0)) : 1;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Across all branches or one. Export to Excel or CSV, or print / save as PDF."
        actions={<><Button variant="outline" onClick={() => exportAs("xlsx")}><Download className="h-4 w-4" />Excel</Button><Button variant="outline" onClick={() => exportAs("csv")}><Download className="h-4 w-4" />CSV</Button><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF / Print</Button></>} />
      <Card className="no-print mb-4 grid gap-3 p-4 sm:grid-cols-4">
        <Select label="Report" value={rep} onChange={(e) => setRep(e.target.value)}>{REPORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Select label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="all">All branches</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select>
        <Input label="From" type="date" value={from} disabled={!dated} onChange={(e) => setFrom(e.target.value)} /><Input label="To" type="date" value={to} disabled={!dated} onChange={(e) => setTo(e.target.value)} />
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">{REPORTS.find((r) => r[0] === rep)?.[1]}</h2>
        <ErrorNote error={error} />
        {loading && !data ? <Spinner /> : (
          <>
            {chartRows && (
              <div className="mb-6 flex h-40 items-end gap-1 border-b border-slate-100 pb-2" role="img" aria-label="Chart of the report totals">
                {chartRows.slice(0, 40).map((r: any, i: number) => (
                  <div key={i} className="group relative flex h-full flex-1 items-end" title={`${fmt(cols[0], r[cols[0]])}: ${money(r[chartKey!])}`}>
                    <div className="w-full rounded-sm bg-slate-300 transition group-hover:bg-brand-700" style={{ height: `${Math.max(2, (r[chartKey!] / chartMax) * 100)}%` }} />
                  </div>
                ))}
              </div>
            )}
            <Table head={cols.map(label)} right={cols.map((c, i) => (numeric(c) ? i : -1)).filter((i) => i >= 0)} empty="No data for this selection">
              {(data || []).slice(0, 500).map((r: any, i: number) => <tr key={i}>{cols.map((c) => <Td key={c} className={numeric(c) ? "whitespace-nowrap text-right tabular-nums" : ""}>{fmt(c, r[c])}</Td>)}</tr>)}
            </Table>
          </>
        )}
        {data && data.length > 500 && <p className="mt-2 text-xs text-slate-500">Showing first 500 rows. Export for the full set.</p>}
      </Card>
    </div>
  );
}
