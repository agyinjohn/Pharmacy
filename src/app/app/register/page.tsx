"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Lock, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime } from "@/lib/api";
import { downloadExport } from "@/lib/download";
import { Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, Ref } from "@/components/ui";

const TYPE: Record<string, [string, string]> = { receipt: ["Received", "text-brand-700"], supply: ["Supplied", "text-slate-700"], disposal: ["Disposed", "text-amber-700"], correction: ["Correction", "text-slate-500"] };
const th = "px-3 py-2.5 text-left text-xs font-medium text-slate-500";

export default function Register() {
  const { call, token, branch, can } = useAuth();
  const [product, setProduct] = useState("");
  const prods = useLoad<any[]>(() => call("/products?legalStatus=controlled"), []);
  const rows = useLoad<any[]>(() => call(`/controlled-register${product ? `?product=${product}` : ""}`), [product, branch?._id], !!branch);
  const rec = useLoad<any[]>(() => call("/controlled-register/reconcile"), [branch?._id], !!branch);
  const [disp, setDisp] = useState<any>(null); const [batches, setBatches] = useState<any[]>([]); const [err, setErr] = useState<string | null>(null);
  const controlled = (prods.data || []).filter((p) => p.legalStatus === "controlled" || !p.legalStatus);
  const productId = (name: string) => controlled.find((p) => p.brand === name || `${p.brand} ${p.strength || ""}`.trim() === name)?._id || "";

  const download = (format: "csv" | "xlsx") => downloadExport(`/controlled-register?format=${format}${product ? `&product=${product}` : ""}`, token, `controlled-drug-register.${format}`, branch!._id).catch((e) => alert(e.message));
  const pickProduct = async (id: string) => { setBatches(id ? await call(`/inventory/batches?product=${id}`) : []); };
  const openDisposal = async () => { setErr(null); setBatches([]); setDisp({ product: "", batch: "", qty: "", witness: "", note: "" }); };
  const dispose = async () => { setErr(null); try { await call("/controlled-register/disposal", { body: { ...disp, qty: Number(disp.qty) } }); setDisp(null); rows.reload(); rec.reload(); } catch (e: any) { setErr(e.message); } };
  const issues = (rec.data || []).filter((r) => !r.matches);
  const selectedName = controlled.find((p) => p._id === product)?.brand;

  return (
    <div>
      <PageHeader title="Controlled drugs" subtitle={`${branch?.name || ""} · the legal register of every controlled medicine received, supplied or destroyed`}
        actions={<>
          <Button variant="outline" onClick={() => download("xlsx")}><Download className="h-4 w-4" />Excel for inspection</Button>
          <Button variant="outline" onClick={() => download("csv")}>CSV</Button>
          {can("pharmacist") && <Button onClick={openDisposal}><Trash2 className="h-4 w-4" />Record disposal</Button>}
        </>} />

      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Register against shelf count</h2>
        {rec.data && <span className={`text-sm ${issues.length ? "text-red-700" : "text-slate-500"}`}>{issues.length ? `${issues.length} need${issues.length === 1 ? "s" : ""} investigating` : "Everything balances"}</span>}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(rec.data || []).map((r) => {
          const id = productId(r.product); const diff = r.onShelf - r.register; const on = id && product === id;
          return (
            <button key={r.product} onClick={() => setProduct(on ? "" : id)} disabled={!id} className={`rounded-lg border bg-white p-4 text-left transition hover:border-slate-300 ${on ? "ring-2 ring-slate-900" : ""} ${r.matches ? "border-slate-200" : "border-red-300"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900">{r.product}</div>
                {r.matches ? <CheckCircle2 className="h-5 w-5 text-brand-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
              </div>
              <div className="mt-3 flex gap-6 text-sm">
                <div><div className="text-xs text-slate-500">Register</div><div className="text-lg font-semibold tabular-nums">{r.register}</div></div>
                <div><div className="text-xs text-slate-500">On shelf</div><div className={`text-lg font-semibold tabular-nums ${r.matches ? "" : "text-red-700"}`}>{r.onShelf}</div></div>
              </div>
              <div className={`mt-2 text-xs ${r.matches ? "text-slate-500" : "font-medium text-red-700"}`}>{r.matches ? "Balances" : `${Math.abs(diff)} ${diff < 0 ? "missing from the shelf" : "more on the shelf than recorded"}`}</div>
            </button>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="w-64"><Select aria-label="Filter by drug" value={product} onChange={(e) => setProduct(e.target.value)}><option value="">All controlled drugs</option>{controlled.map((p) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select></div>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />Entries are permanent: they can't be edited or deleted.</span>
        </div>
        <ErrorNote error={rows.error} />
        {rows.loading && !rows.data ? <Spinner /> : !(rows.data || []).length ? <p className="py-10 text-center text-sm text-slate-500">No entries{selectedName ? ` for ${selectedName}` : ""} yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr className="border-b border-slate-200"><th className={th}>Date</th><th className={th}>Drug</th><th className={th}>Entry</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Balance</th><th className={th}>Details</th><th className={th}>Batch</th><th className={th}>Signed by</th></tr></thead>
              <tbody>
                {(rows.data || []).map((r) => {
                  const [label, cls] = TYPE[r.type] || [r.type, "text-slate-700"]; const plus = r.type === "receipt" || (r.type === "correction" && r.qty > 0);
                  return (
                    <tr key={r._id} className="border-b border-slate-100 align-top">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{dateTime(r.date)}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">{r.productName}</td>
                      <td className={`px-3 py-3 font-medium ${cls}`}>{label}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${plus ? "text-brand-700" : "text-slate-700"}`}>{plus ? "+" : "−"}{Math.abs(r.qty)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{r.balance}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {r.type === "supply" ? <><div>{r.patient}</div><div className="text-xs text-slate-500">{r.prescriber}{r.rxNo && <> · <Ref>{r.rxNo}</Ref></>}</div></>
                          : r.type === "receipt" ? <div>From {r.counterparty}</div>
                          : <div>{r.note || r.counterparty || "-"}</div>}
                      </td>
                      <td className="px-3 py-3"><Ref>{r.batchNo}</Ref></td>
                      <td className="px-3 py-3 text-slate-700"><div>{r.pharmacistName}</div>{r.witness && <div className="text-xs text-slate-500">Witness: {r.witness}</div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!disp} onClose={() => setDisp(null)} title="Record disposal">
        {disp && <div className="space-y-3 text-sm">
          <p className="text-slate-600">For expired, damaged or returned controlled drugs that are destroyed. A second person must witness it.</p>
          <Select label="Drug" value={disp.product} onChange={async (e) => { const id = e.target.value; setDisp({ ...disp, product: id, batch: "" }); await pickProduct(id); }}><option value="">Choose...</option>{controlled.map((p) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select>
          <Select label="Batch" value={disp.batch} disabled={!batches.length} onChange={(e) => setDisp({ ...disp, batch: e.target.value })}><option value="">{disp.product && !batches.length ? "No stock at this branch" : "Choose..."}</option>{batches.map((b) => <option key={b._id} value={b._id}>{b.batchNo} · {b.qty} in stock</option>)}</Select>
          <Input label="Quantity destroyed" type="number" min={1} value={disp.qty} onChange={(e) => setDisp({ ...disp, qty: e.target.value })} />
          <Input label="Witness (name and role)" placeholder="e.g. Pharm. Kojo Ansah, superintendent" value={disp.witness} onChange={(e) => setDisp({ ...disp, witness: e.target.value })} />
          <Input label="Reason" placeholder="e.g. Expired, damaged blister" value={disp.note} onChange={(e) => setDisp({ ...disp, note: e.target.value })} />
          <ErrorNote error={err} />
          <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><Button variant="outline" onClick={() => setDisp(null)}>Cancel</Button><Button disabled={!disp.batch || !(Number(disp.qty) > 0) || !disp.witness.trim()} onClick={dispose}>Sign and record</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
