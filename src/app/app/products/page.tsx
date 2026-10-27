"use client";
import { useState } from "react";
import { Plus, Upload, Repeat } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { money } from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import { downloadExport } from "@/lib/download";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";

const LEGAL: Record<string, [string, any]> = { otc: ["OTC", "green"], pharmacy_only: ["Pharmacy only", "blue"], prescription_only: ["Prescription", "amber"], controlled: ["Controlled", "red"] };
const blank = { brand: "", generic: "", strength: "", form: "", packSize: "", manufacturer: "", barcode: "", category: "General", legalStatus: "otc", controlClass: "standard", fdaRegNo: "", price: "", cost: "", taxRate: "0", reorderLevel: "10", isDrug: true, storage: "ambient" };

export default function Products() {
  const { call, can, branch, branches, token } = useAuth();
  const [q, setQ] = useState(""); const [legal, setLegal] = useState("");
  const { data, loading, error, reload } = useLoad(() => call(`/products?limit=500&branch=${branch?._id || ""}&q=${encodeURIComponent(q)}${legal ? `&legalStatus=${legal}` : ""}`), [q, legal, branch?._id]);
  const [edit, setEdit] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [alt, setAlt] = useState<any>(null); const [alts, setAlts] = useState<any[]>([]); const [net, setNet] = useState<any[]>([]);
  const [imp, setImp] = useState(false); const [report, setReport] = useState<any>(null);
  const editable = can("store_officer", "branch_manager", "pharmacist");

  const save = async () => {
    setErr(null);
    try {
      const body = { ...edit, branchPrices: (edit.branchPrices || []).filter((x: any) => x.price !== "" && x.price !== null && x.price !== undefined).map((x: any) => ({ branch: x.branch, price: Number(x.price) })), branchReorder: (edit.branchReorder || []).filter((x: any) => x.level !== "" && x.level !== null && x.level !== undefined).map((x: any) => ({ branch: x.branch, level: Number(x.level) })), price: Number(edit.price), cost: Number(edit.cost || 0), taxRate: Number(edit.taxRate || 0), reorderLevel: Number(edit.reorderLevel || 0) };
      if (edit._id) await call(`/products/${edit._id}`, { method: "PATCH", body }); else await call("/products", { body });
      setEdit(null); reload();
    } catch (e: any) { setErr(e.message); }
  };
  const showAlt = async (p: any) => {
    setAlt(p); setAlts([]); setNet([]);
    setAlts(await call(`/products/${p._id}/alternatives`)); setNet(await call(`/inventory/network/${p._id}`));
  };

  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text());
    try { setReport(await call("/products/import", { body: { rows } })); reload(); } catch (e: any) { setReport({ errors: [{ row: 0, error: e.message }], created: 0, updated: 0 }); }
  };

  return (
    <div>
      <PageHeader title="Products" subtitle="Shared catalogue for every branch. Stock shown for the selected branch."
        actions={<>
          <Button variant="outline" onClick={() => downloadExport("/export/products?format=xlsx", token, "products.xlsx").catch((e) => alert(e.message))}>Excel</Button>
          {editable && <><Button variant="outline" onClick={() => { setImp(true); setReport(null); }}><Upload className="h-4 w-4" />Import CSV</Button><Button onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" />Add product</Button></>}
        </>} />
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-60 flex-1"><Input placeholder="Search brand, generic, barcode or category" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select value={legal} onChange={(e) => setLegal(e.target.value)} className="w-48"><option value="">All legal classes</option>{Object.entries(LEGAL).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
        </div>
        <ErrorNote error={error} />
        {loading && !data ? <Spinner /> : (
          <Table head={["Product", "Generic", "Category", "Class", "Price", "Stock here", ""]} empty="No products match">
            {(data || []).map((p: any) => (
              <tr key={p._id}>
                <Td><div className="font-medium">{p.brand} {p.strength}</div><div className="text-xs text-slate-500">{p.form} · {p.packSize} · {p.barcode}</div></Td>
                <Td>{p.generic}</Td><Td>{p.category}</Td>
                <Td><Badge tone={LEGAL[p.legalStatus][1]}>{LEGAL[p.legalStatus][0]}</Badge></Td>
                <Td className="tabular-nums">{money(p.price)}</Td>
                <Td className={p.stock <= p.reorderLevel ? "font-semibold text-amber-700" : ""}>{p.stock}</Td>
                <Td className="whitespace-nowrap text-right"><Button size="sm" variant="ghost" onClick={() => showAlt(p)}><Repeat className="h-3.5 w-3.5" />Substitutes</Button>{editable && <Button size="sm" variant="ghost" onClick={() => setEdit(p)}>Edit</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? "Edit product" : "Add product"} wide>
        {edit && (
          <div className="grid gap-3 sm:grid-cols-2">
            {([["brand", "Brand name"], ["generic", "Generic (INN) name"], ["strength", "Strength"], ["form", "Dosage form"], ["packSize", "Pack size"], ["manufacturer", "Manufacturer"], ["barcode", "Barcode"], ["category", "Category"], ["fdaRegNo", "FDA registration no."], ["price", "Selling price"], ["cost", "Cost price"], ["taxRate", "Tax rate (0.15 = 15%)"], ["reorderLevel", "Reorder level"]] as const).map(([k, l]) => (
              <Input key={k} label={l} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
            ))}
            <Select label="Legal status" value={edit.legalStatus} onChange={(e) => setEdit({ ...edit, legalStatus: e.target.value })}>{Object.entries(LEGAL).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
            {edit.legalStatus === "controlled" && <Select label="Control class" value={edit.controlClass} onChange={(e) => setEdit({ ...edit, controlClass: e.target.value })}><option value="standard">Standard</option><option value="strict">Strictest (no refills)</option></Select>}
            <Select label="Storage" value={edit.storage} onChange={(e) => setEdit({ ...edit, storage: e.target.value })}><option value="ambient">Ambient</option><option value="cold_chain">Cold chain</option></Select>
            {branches.length > 1 ? (
              <div className="sm:col-span-2">
                <div className="mb-1 text-sm font-medium">Branch overrides <span className="font-normal text-slate-500">(leave blank to use the central price and reorder level)</span></div>
                <div className="space-y-2">{branches.map((b) => {
                  const bp = (edit.branchPrices || []).find((x: any) => x.branch === b._id); const br = (edit.branchReorder || []).find((x: any) => x.branch === b._id);
                  const upd = (key: "branchPrices" | "branchReorder", field: "price" | "level", v: string) => { const list = (edit[key] || []).filter((x: any) => x.branch !== b._id); setEdit({ ...edit, [key]: [...list, { branch: b._id, [field]: v }] }); };
                  return <div key={b._id} className="grid grid-cols-3 items-center gap-2 text-sm"><span>{b.name}</span><Input placeholder="Price" type="number" value={bp?.price ?? ""} onChange={(e) => upd("branchPrices", "price", e.target.value)} /><Input placeholder="Reorder level" type="number" value={br?.level ?? ""} onChange={(e) => upd("branchReorder", "level", e.target.value)} /></div>;
                })}</div>
              </div>
            ) : null}
            <div className="sm:col-span-2 space-y-3"><ErrorNote error={err} /><Button className="w-full" onClick={save}>Save product</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!alt} onClose={() => setAlt(null)} title={`Substitutes for ${alt?.brand || ""}`}>
        <h3 className="text-sm font-semibold">Same generic ({alt?.generic})</h3>
        <div className="mt-2 divide-y divide-slate-100">{alts.map((a) => <div key={a._id} className="flex justify-between py-2 text-sm"><span>{a.brand} {a.strength}</span><span className="tabular-nums">{money(a.price)} · <span className={a.stock ? "text-emerald-700" : "text-red-700"}>{a.stock} in stock</span></span></div>)}{!alts.length && <p className="py-3 text-sm text-slate-500">No substitutes in the catalogue.</p>}</div>
        <h3 className="mt-5 text-sm font-semibold">This product at other branches</h3>
        <div className="mt-2 divide-y divide-slate-100">{net.map((n) => <div key={n.branch?._id} className="flex justify-between py-2 text-sm"><span>{n.branch?.name}</span><span>{n.qty} units</span></div>)}{!net.length && <p className="py-3 text-sm text-slate-500">Not in stock at any branch.</p>}</div>
      </Modal>

      <Modal open={imp} onClose={() => setImp(false)} title="Import products from CSV">
        <p className="text-sm text-slate-600">First row must be column names: <code className="text-xs">brand, generic, strength, form, packSize, barcode, category, legalStatus, price, cost, taxRate</code>. Rows with the same barcode update the existing product.</p>
        <input type="file" accept=".csv" className="mt-4 block text-sm" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
        {report && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><div>Created <b>{report.created}</b> · Updated <b>{report.updated}</b> · Errors <b>{report.errors.length}</b></div>{report.errors.slice(0, 20).map((e: any, i: number) => <div key={i} className="text-red-700">Row {e.row}: {e.error}</div>)}</div>}
      </Modal>
    </div>
  );
}
