"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime } from "@/lib/api";
import { downloadExport } from "@/lib/download";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, Table, Td, Ref } from "@/components/ui";

export default function Register() {
  const { call, token, branch, can } = useAuth();
  const [product, setProduct] = useState("");
  const prods = useLoad(() => call("/products?legalStatus=controlled"), []);
  const rows = useLoad(() => call(`/controlled-register${product ? `?product=${product}` : ""}`), [product, branch?._id], !!branch);
  const rec = useLoad(() => call("/controlled-register/reconcile"), [branch?._id], !!branch);
  const [disp, setDisp] = useState<any>(null); const [batches, setBatches] = useState<any[]>([]); const [err, setErr] = useState<string | null>(null);

  const download = (format: "csv" | "xlsx") => downloadExport(`/controlled-register?format=${format}${product ? `&product=${product}` : ""}`, token, `controlled-drug-register.${format}`, branch!._id).catch((e) => alert(e.message));
  const openDisposal = async (p: any) => { setErr(null); const b = await call(`/inventory/batches?product=${p._id}`); setBatches(b); setDisp({ product: p._id, batch: b[0]?._id || "", qty: "", witness: "", note: "" }); };
  const dispose = async () => { try { await call("/controlled-register/disposal", { body: { ...disp, qty: Number(disp.qty) } }); setDisp(null); rows.reload(); rec.reload(); } catch (e: any) { setErr(e.message); } };

  return (
    <div>
      <PageHeader title="Controlled-drug register" subtitle={`${branch?.name} - append-only. Entries cannot be edited or deleted; corrections are new signed entries.`} actions={<><Button variant="outline" onClick={() => download("xlsx")}><Download className="h-4 w-4" />Excel for inspection</Button><Button variant="outline" onClick={() => download("csv")}><Download className="h-4 w-4" />CSV</Button></>} />
      <Card className="mb-6 p-4">
        <h2 className="mb-2 font-semibold">Register vs shelf</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(rec.data || []).map((r: any) => <div key={r.product} className={`rounded-lg border p-3 text-sm ${r.matches ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}><div className="font-medium">{r.product}</div><div>Register {r.register} · Shelf {r.onShelf} {r.matches ? <Badge tone="green">Match</Badge> : <Badge tone="red">Discrepancy</Badge>}</div></div>)}
        </div>
      </Card>
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={product} onChange={(e) => setProduct(e.target.value)} className="w-64"><option value="">All controlled drugs</option>{(prods.data || []).map((p: any) => <option key={p._id} value={p._id}>{p.brand}</option>)}</Select>
          {can("pharmacist") && <Select value="" onChange={(e) => e.target.value && openDisposal({ _id: e.target.value })} className="w-64"><option value="">Record disposal...</option>{(prods.data || []).map((p: any) => <option key={p._id} value={p._id}>{p.brand}</option>)}</Select>}
        </div>
        <ErrorNote error={rows.error} />
        {rows.loading && !rows.data ? <Spinner /> : (
          <Table head={["Date", "Drug", "Type", "Qty", "Balance", "Patient / counterparty", "Prescriber", "Rx", "Batch", "Pharmacist", "Witness"]} empty="No entries">
            {(rows.data || []).map((r: any) => (
              <tr key={r._id}><Td className="whitespace-nowrap">{dateTime(r.date)}</Td><Td className="font-medium">{r.productName}</Td><Td><Badge tone={r.type === "receipt" ? "green" : r.type === "supply" ? "blue" : "amber"}>{r.type}</Badge></Td>
                <Td>{r.type === "receipt" || r.type === "correction" ? "+" : "-"}{r.qty}</Td><Td className="font-semibold">{r.balance}</Td><Td>{r.patient || r.counterparty}</Td><Td>{r.prescriber}</Td><Td><Ref>{r.rxNo}</Ref></Td><Td><Ref>{r.batchNo}</Ref></Td><Td>{r.pharmacistName}</Td><Td>{r.witness}</Td></tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!disp} onClose={() => setDisp(null)} title="Record disposal">
        {disp && <div className="space-y-3">
          <Select label="Batch" value={disp.batch} onChange={(e) => setDisp({ ...disp, batch: e.target.value })}>{batches.map((b) => <option key={b._id} value={b._id}>{b.batchNo} (qty {b.qty})</option>)}</Select>
          <Input label="Quantity" type="number" value={disp.qty} onChange={(e) => setDisp({ ...disp, qty: e.target.value })} />
          <Input label="Witness name" value={disp.witness} onChange={(e) => setDisp({ ...disp, witness: e.target.value })} />
          <Input label="Note" value={disp.note} onChange={(e) => setDisp({ ...disp, note: e.target.value })} />
          <ErrorNote error={err} /><Button className="w-full" onClick={dispose}>Record disposal</Button>
        </div>}
      </Modal>
    </div>
  );
}
