"use client";
import { useState } from "react";
import { Download, FileUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { API, dateTime } from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import { Badge, Button, Card, ErrorNote, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";

const TYPES: [string, string, string][] = [
  ["products", "Products", "Catalogue. Rows with an existing barcode update that product."],
  ["stock", "Opening stock", "Batches with expiry per branch. Import products first."],
  ["customers", "Customers and opening balances", "Matched by phone. Allergies separated by ; Opening balance only for new customers."],
  ["suppliers", "Suppliers and balances", "Matched by name. openingBalance sets the amount owed."],
];

// Data migration (NFR-12): check the file first, see every problem by row, then import.
export default function Import() {
  const { call, token, branch } = useAuth();
  const [type, setType] = useState("products");
  const [file, setFile] = useState<{ name: string; rows: any[] } | null>(null);
  const [report, setReport] = useState<any>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const logs = useLoad<any[]>(() => call("/imports", { branch: null }), []);

  const template = async () => {
    const res = await fetch(`${API}/imports/templates/${type}.csv`, { headers: { Authorization: `Bearer ${token}` } });
    const url = URL.createObjectURL(await res.blob()); const a = document.createElement("a"); a.href = url; a.download = `${type}-template.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const pick = async (f: File) => {
    setErr(null); setReport(null);
    try {
      let rows: any[];
      if (/\.xlsx$/i.test(f.name)) {
        const b64 = await new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = bad; r.readAsDataURL(f); });
        rows = (await call("/imports/parse-xlsx", { body: { file: b64 }, branch: null })).rows;
      } else rows = parseCsv(await f.text());
      if (!rows.length) throw new Error("No rows found under the header row");
      setFile({ name: f.name, rows });
      setBusy(true); setReport(await call(`/imports/${type}`, { body: { rows, dryRun: true } }));
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const commit = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try { setReport(await call(`/imports/${type}`, { body: { rows: file.rows, fileName: file.name } })); setFile(null); logs.reload(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Data import" subtitle="Bring products, opening stock, customers and suppliers from spreadsheets. Every file is checked first." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-1">
          <Select label="What are you importing?" value={type} onChange={(e) => { setType(e.target.value); setFile(null); setReport(null); }}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <p className="text-sm text-slate-600">{TYPES.find((t) => t[0] === type)?.[2]}{type === "stock" && ` Rows without branchCode go to ${branch?.name}.`}</p>
          <Button variant="outline" onClick={template}><Download className="h-4 w-4" />Download template</Button>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-6 text-sm text-slate-600 hover:border-brand-500">
            <FileUp className="h-5 w-5" />{file ? file.name : "Choose a .csv or .xlsx file"}
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pick(f); }} />
          </label>
          <ErrorNote error={err} />
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">Validation report</h2>
          {busy ? <Spinner /> : !report ? <p className="mt-2 text-sm text-slate-500">Choose a file to check it. Nothing is saved until you press Import.</p> : (
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="slate">{report.total} rows</Badge><Badge tone="green">{report.created} {report.committed ? "created" : "to create"}</Badge><Badge tone="blue">{report.updated} {report.committed ? "updated" : "to update"}</Badge>{report.errors.length > 0 && <Badge tone="red">{report.errors.length} with errors</Badge>}{report.warnings?.length > 0 && <Badge tone="amber">{report.warnings.length} warnings</Badge>}
              </div>
              {report.committed ? <p className="text-emerald-700">Import complete. Rows with errors were skipped; fix them and import those rows again.</p>
                : <div className="flex items-center gap-3"><Button onClick={commit} disabled={report.created + report.updated === 0}>Import {report.created + report.updated} valid row(s)</Button>{report.errors.length > 0 && <span className="text-slate-500">or fix the errors in your file and choose it again</span>}</div>}
              {(report.errors.length > 0 || report.warnings?.length > 0) && (
                <Table head={["Row", "Problem"]}>
                  {report.errors.slice(0, 200).map((e: any, i: number) => <tr key={`e${i}`}><Td>{e.row}</Td><Td className="text-red-700">{e.error}</Td></tr>)}
                  {(report.warnings || []).slice(0, 100).map((w: any, i: number) => <tr key={`w${i}`}><Td>{w.row}</Td><Td className="text-amber-700">{w.warning}</Td></tr>)}
                </Table>
              )}
            </div>
          )}
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-semibold">Import history (data migration report)</h2>
        <Table head={["When", "Type", "File", "By", "Rows", "Created", "Updated", "Skipped"]} empty="No imports yet">
          {(logs.data || []).map((l) => <tr key={l._id}><Td>{dateTime(l.createdAt)}</Td><Td>{l.type}</Td><Td>{l.fileName || "-"}</Td><Td>{l.byName}</Td><Td>{l.total}</Td><Td>{l.created}</Td><Td>{l.updated}</Td><Td>{l.skipped ? <Badge tone="amber">{l.skipped}</Badge> : 0}</Td></tr>)}
        </Table>
      </Card>
    </div>
  );
}
