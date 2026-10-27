"use client";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { API } from "@/lib/api";
import { Button, Card, ErrorNote, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";

const REPORTS: [string, string, boolean][] = [
  ["sales?by=day", "Sales by day", true], ["sales?by=product", "Sales by product", true], ["sales?by=category", "Sales by category", true], ["sales?by=cashier", "Sales by cashier", true], ["sales?by=branch", "Sales by branch", true],
  ["stock", "Stock on hand and ageing", false], ["expiry", "Expiry report (90 days)", false], ["margin", "Profit margin by product", true], ["tax", "Tax and financial summary", true],
  ["purchases", "Purchases", false], ["supplier-balances", "Supplier balances", false], ["orders", "Online order and delivery performance", true], ["dispensing", "Prescription and dispensing", true],
];
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function Reports() {
  const { call, token, branches } = useAuth();
  const [rep, setRep] = useState(REPORTS[0][0]); const [branch, setBranch] = useState("all");
  const [from, setFrom] = useState(day(30)); const [to, setTo] = useState(day(0));
  const sep = rep.includes("?") ? "&" : "?";
  const qs = `${sep}branch=${branch}&from=${from}&to=${to}`;
  const { data, loading, error } = useLoad(() => call(`/reports/${rep}${qs}`, { branch: null }), [rep, branch, from, to]);

  const csv = async () => {
    const res = await fetch(`${API}/reports/${rep}${qs}&format=csv`, { headers: { Authorization: `Bearer ${token}` } });
    const url = URL.createObjectURL(await res.blob()); const a = document.createElement("a"); a.href = url; a.download = `${rep.replace(/[?=&]/g, "-")}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const cols = data?.length ? Object.keys(data[0]) : [];
  const dated = REPORTS.find((r) => r[0] === rep)?.[2];
  const fmt = (v: any) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v).toLocaleString("en-GB") : v ?? "");

  return (
    <div>
      <PageHeader title="Reports" subtitle="Across all branches or one. Export to CSV (opens in Excel) or print / save as PDF."
        actions={<><Button variant="outline" onClick={csv}><Download className="h-4 w-4" />CSV / Excel</Button><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF / Print</Button></>} />
      <Card className="no-print mb-4 grid gap-3 p-4 sm:grid-cols-4">
        <Select label="Report" value={rep} onChange={(e) => setRep(e.target.value)}>{REPORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Select label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="all">All branches</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select>
        <Input label="From" type="date" value={from} disabled={!dated} onChange={(e) => setFrom(e.target.value)} /><Input label="To" type="date" value={to} disabled={!dated} onChange={(e) => setTo(e.target.value)} />
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">{REPORTS.find((r) => r[0] === rep)?.[1]}</h2>
        <ErrorNote error={error} />
        {loading && !data ? <Spinner /> : (
          <Table head={cols.map((c) => c.replace(/_/g, " "))} empty="No data for this selection">
            {(data || []).slice(0, 500).map((r: any, i: number) => <tr key={i}>{cols.map((c) => <Td key={c} className={typeof r[c] === "number" ? "tabular-nums" : ""}>{fmt(r[c])}</Td>)}</tr>)}
          </Table>
        )}
        {data && data.length > 500 && <p className="mt-2 text-xs text-slate-500">Showing first 500 rows. Export for the full set.</p>}
      </Card>
    </div>
  );
}
