"use client";
import { useState } from "react";
import { Download, Plus, Repeat, Search, Snowflake, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { money } from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import { downloadExport } from "@/lib/download";
import { resizeImage } from "@/lib/image";
import ProductImage from "@/components/ProductImage";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";

const LEGAL: Record<string, [string, any, string]> = {
  otc: ["OTC", "slate", "Anyone can buy it, on the shelf or online."],
  pharmacy_only: ["Pharmacy only", "slate", "Sold over the counter after a word with pharmacy staff."],
  prescription_only: ["Prescription", "amber", "Needs a prescription verified by a pharmacist."],
  controlled: ["Controlled", "red", "Prescription plus the controlled-drug register. Never sold online."],
};
const TAX: [string, string][] = [["0", "Exempt (0%)"], ["0.15", "VAT 15%"], ["0.219", "VAT and levies 21.9%"]];
const blank = { brand: "", generic: "", strength: "", form: "", packSize: "", manufacturer: "", barcode: "", category: "General", legalStatus: "otc", controlClass: "standard", fdaRegNo: "", price: "", cost: "", taxRate: "0", reorderLevel: "10", isDrug: true, storage: "ambient" };
const th = "px-3 py-2.5 text-left text-xs font-medium text-slate-500";
// Brand names often already carry the strength ("Ibuprofen 400"); avoid printing it twice.
const productName = (p: any) => (p.strength && !p.brand.includes(p.strength.replace(/[^0-9/.]/g, "")) ? `${p.brand} ${p.strength}` : p.brand);

export default function Products() {
  const { call, can, branch, branches, token } = useAuth();
  const [q, setQ] = useState(""); const [legal, setLegal] = useState(""); const [cat, setCat] = useState("");
  const { data, loading, error, reload } = useLoad<any[]>(() => call(`/products?limit=500&branch=${branch?._id || ""}&q=${encodeURIComponent(q)}`), [q, branch?._id]);
  const [edit, setEdit] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [alt, setAlt] = useState<any>(null); const [alts, setAlts] = useState<any[]>([]); const [net, setNet] = useState<any[]>([]);
  const [imp, setImp] = useState(false); const [report, setReport] = useState<any>(null);
  const editable = can("store_officer", "branch_manager", "pharmacist");

  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setErr(null); setUploading(true);
    try { const image = await resizeImage(file); const p = await call(`/products/${edit._id}/image`, { body: { image } }); setEdit({ ...edit, imageUrl: p.imageUrl }); reload(); }
    catch (e: any) { setErr(e.message); } finally { setUploading(false); }
  };
  const removeImage = async () => { const p = await call(`/products/${edit._id}/image`, { method: "DELETE" }); setEdit({ ...edit, imageUrl: p.imageUrl }); reload(); };
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

  const all = data || [];
  const cats = [...new Set(all.map((p) => p.category).filter(Boolean))].sort();
  const rows = all.filter((p) => (!legal || p.legalStatus === legal) && (!cat || p.category === cat));
  const set = (patch: any) => setEdit({ ...edit, ...patch });
  const margin = edit && Number(edit.price) > 0 ? ((Number(edit.price) - Number(edit.cost || 0)) / Number(edit.price)) * 100 : null;
  const taxOptions = edit && !TAX.some(([v]) => Number(v) === Number(edit.taxRate)) ? [...TAX, [String(edit.taxRate), `${+(Number(edit.taxRate) * 100).toFixed(2)}%`] as [string, string]] : TAX;

  return (
    <div>
      <PageHeader title="Products" subtitle={`One catalogue for every branch. Stock shown for ${branch?.name || "this branch"}.`}
        actions={<>
          <Button variant="outline" onClick={() => downloadExport("/export/products?format=xlsx", token, "products.xlsx").catch((e) => alert(e.message))}><Download className="h-4 w-4" />Excel</Button>
          {editable && <><Button variant="outline" onClick={() => { setImp(true); setReport(null); }}><Upload className="h-4 w-4" />Import</Button><Button onClick={() => { setErr(null); setEdit({ ...blank }); }}><Plus className="h-4 w-4" />Add product</Button></>}
        </>} />

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search brand, generic name or barcode" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="w-52"><Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {[["", "All"], ...Object.entries(LEGAL).map(([k, [l]]) => [k, l])].map(([k, l]) => <button key={k} onClick={() => setLegal(k)} className={`rounded-full border px-3 py-1 text-sm ${legal === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>{l} <span className={legal === k ? "text-white/70" : "text-slate-400"}>{all.filter((p) => !k || p.legalStatus === k).length}</span></button>)}
        </div>
        <ErrorNote error={error} />
        {loading && !data ? <Spinner /> : !rows.length ? <p className="py-10 text-center text-sm text-slate-500">No products match.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-slate-200"><th className={th}>Product</th><th className={th}>Category</th><th className={th}>Class</th><th className={`${th} text-right`}>Price</th><th className={`${th} text-right`}>In stock</th><th className={th} /></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const m = p.price > 0 && p.cost ? Math.round(((p.price - p.cost) / p.price) * 100) : null;
                  return (
                    <tr key={p._id} onClick={() => (editable ? (setErr(null), setEdit(p)) : showAlt(p))} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <ProductImage product={p} size="sm" className="h-11 w-11 shrink-0 rounded-md border border-slate-200" />
                          <div><div className="flex items-center gap-1.5 font-medium text-slate-900">{productName(p)}{p.storage === "cold_chain" && <Snowflake className="h-3.5 w-3.5 text-slate-400" aria-label="Cold chain" />}</div><div className="text-xs text-slate-500">{[p.generic, p.form, p.packSize].filter(Boolean).join(" · ")}</div></div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{p.category}</td>
                      <td className="px-3 py-2.5"><Badge tone={LEGAL[p.legalStatus]?.[1]}>{LEGAL[p.legalStatus]?.[0] || p.legalStatus}</Badge></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right"><div className="font-medium tabular-nums">{money(p.price)}</div>{m !== null && <div className="text-xs text-slate-500">{m}% margin</div>}</td>
                      <td className="px-3 py-2.5 text-right"><div className={`font-medium tabular-nums ${p.stock === 0 ? "text-red-700" : p.stock <= p.reorderLevel ? "text-amber-700" : "text-slate-900"}`}>{p.stock ?? "-"}</div>{p.stock === 0 ? <div className="text-xs text-red-700">Out</div> : p.stock <= p.reorderLevel ? <div className="text-xs text-amber-700">Low</div> : null}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); showAlt(p); }}><Repeat className="h-3.5 w-3.5" />Substitutes</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? `Edit ${edit.brand}` : "Add product"} wide>
        {edit && (
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Product</h3>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="shrink-0 space-y-2">
                  <ProductImage product={edit} className="h-32 w-32 rounded-lg border border-slate-200" />
                  {edit._id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50">{uploading ? "Uploading..." : edit.imageUrl ? "Change photo" : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} /></label>
                      {edit.imageUrl && <button type="button" onClick={removeImage} className="text-xs text-slate-500 underline">Remove</button>}
                    </div>
                  ) : <p className="w-32 text-xs text-slate-500">Add a photo after saving.</p>}
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <Input label="Brand name" value={edit.brand ?? ""} onChange={(e) => set({ brand: e.target.value })} />
                  <Input label="Generic name" value={edit.generic ?? ""} onChange={(e) => set({ generic: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                    <Input label="Strength" placeholder="500mg" value={edit.strength ?? ""} onChange={(e) => set({ strength: e.target.value })} />
                    <Input label="Form" placeholder="Tablet" value={edit.form ?? ""} onChange={(e) => set({ form: e.target.value })} />
                    <Input label="Pack size" placeholder="24s" value={edit.packSize ?? ""} onChange={(e) => set({ packSize: e.target.value })} />
                  </div>
                  <Input label="Category" list="product-categories" value={edit.category ?? ""} onChange={(e) => set({ category: e.target.value })} />
                  <datalist id="product-categories">{cats.map((c) => <option key={c} value={c} />)}</datalist>
                  <Input label="Manufacturer" value={edit.manufacturer ?? ""} onChange={(e) => set({ manufacturer: e.target.value })} />
                  <Input label="Barcode" value={edit.barcode ?? ""} onChange={(e) => set({ barcode: e.target.value })} />
                  <Input label="FDA registration no." value={edit.fdaRegNo ?? ""} onChange={(e) => set({ fdaRegNo: e.target.value })} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Who can buy it</h3>
              <div className="grid gap-2 sm:grid-cols-4">
                {Object.entries(LEGAL).map(([k, [l, , d]]) => <button key={k} type="button" onClick={() => set({ legalStatus: k })} className={`rounded-lg border p-3 text-left ${edit.legalStatus === k ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"}`}><div className="font-medium text-slate-900">{l}</div><div className="mt-0.5 text-xs text-slate-500">{d}</div></button>)}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {edit.legalStatus === "controlled" && <Select label="Control class" value={edit.controlClass} onChange={(e) => set({ controlClass: e.target.value })}><option value="standard">Standard</option><option value="strict">Strictest (no refills)</option></Select>}
                <Select label="Storage" value={edit.storage} onChange={(e) => set({ storage: e.target.value })}><option value="ambient">Room temperature</option><option value="cold_chain">Cold chain (2–8°C)</option></Select>
              </div>
            </section>

            <section>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">How to take it</h3>
              <p className="mb-3 text-xs text-slate-500">{edit.legalStatus === "prescription_only" || edit.legalStatus === "controlled" ? "Optional for prescription medicines: the prescriber's directions are used on each label. Anything here shows to staff as a guide." : "Written by your pharmacist. Shown at the till, printed on the receipt and shown in the online store."}</p>
              <div className="grid gap-3">
                <Textarea label="Usual directions" rows={2} placeholder="e.g. Adults: 2 tablets every 4 to 6 hours when needed. No more than 8 tablets in 24 hours." value={edit.directions ?? ""} onChange={(e) => set({ directions: e.target.value })} />
                <Textarea label="Warnings and advice (optional)" rows={2} placeholder="e.g. Take after food. May cause drowsiness. Avoid alcohol." value={edit.warnings ?? ""} onChange={(e) => set({ warnings: e.target.value })} />
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Price and stock</h3>
              <div className="grid gap-3 sm:grid-cols-4">
                <Input label="Selling price (GH₵)" type="number" step="0.01" value={edit.price ?? ""} onChange={(e) => set({ price: e.target.value })} />
                <Input label="Cost price (GH₵)" type="number" step="0.01" value={edit.cost ?? ""} onChange={(e) => set({ cost: e.target.value })} />
                <Select label="Tax" value={String(Number(edit.taxRate || 0))} onChange={(e) => set({ taxRate: e.target.value })}>{taxOptions.map(([v, l]) => <option key={v} value={String(Number(v))}>{l}</option>)}</Select>
                <Input label="Reorder at" type="number" value={edit.reorderLevel ?? ""} onChange={(e) => set({ reorderLevel: e.target.value })} />
              </div>
              {margin !== null && <p className={`mt-2 text-xs ${margin < 10 ? "text-amber-700" : "text-slate-500"}`}>Margin {margin.toFixed(1)}% · GH₵ {(Number(edit.price) - Number(edit.cost || 0)).toFixed(2)} per unit</p>}
              {branches.length > 1 && (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full">
                    <thead className="bg-slate-50"><tr><th className={th}>Branch</th><th className={th}>Own price</th><th className={th}>Own reorder level</th></tr></thead>
                    <tbody>{branches.map((b) => {
                      const bp = (edit.branchPrices || []).find((x: any) => String(x.branch) === b._id); const br = (edit.branchReorder || []).find((x: any) => String(x.branch) === b._id);
                      const upd = (key: "branchPrices" | "branchReorder", field: "price" | "level", v: string) => { const list = (edit[key] || []).filter((x: any) => String(x.branch) !== b._id); set({ [key]: [...list, { branch: b._id, [field]: v }] }); };
                      return <tr key={b._id} className="border-t border-slate-100"><td className="px-3 py-2 text-slate-700">{b.name}</td><td className="px-2 py-1.5"><Input aria-label={`Price at ${b.name}`} placeholder={edit.price ? `Same (${Number(edit.price).toFixed(2)})` : "Same"} type="number" value={bp?.price ?? ""} onChange={(e) => upd("branchPrices", "price", e.target.value)} /></td><td className="px-2 py-1.5"><Input aria-label={`Reorder level at ${b.name}`} placeholder={edit.reorderLevel ? `Same (${edit.reorderLevel})` : "Same"} type="number" value={br?.level ?? ""} onChange={(e) => upd("branchReorder", "level", e.target.value)} /></td></tr>;
                    })}</tbody>
                  </table>
                </div>
              )}
            </section>

            <ErrorNote error={err} />
            <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={!edit.brand?.trim() || !(Number(edit.price) > 0)} onClick={save}>Save product</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!alt} onClose={() => setAlt(null)} title="Substitutes and other branches">
        {alt && <div className="space-y-5 text-sm">
          <div className="flex items-center gap-3"><ProductImage product={alt} size="sm" className="h-12 w-12 rounded-md border border-slate-200" /><div><div className="font-semibold">{productName(alt)}</div><div className="text-slate-500">{alt.generic}</div></div></div>
          <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Same medicine, other brands</h3>
            <div className="divide-y divide-slate-100">{alts.map((a) => <div key={a._id} className="flex items-center justify-between py-2"><span className="flex items-center gap-2"><ProductImage product={a} size="xs" className="h-8 w-8 rounded border border-slate-200" />{productName(a)}</span><span className="tabular-nums">{money(a.price)} · <span className={a.stock ? "text-slate-700" : "text-red-700"}>{a.stock ? `${a.stock} in stock` : "out of stock"}</span></span></div>)}{!alts.length && <p className="py-2 text-slate-500">No other brands in the catalogue.</p>}</div>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">This product at other branches</h3>
            <div className="divide-y divide-slate-100">{net.map((n) => <div key={n.branch?._id} className="flex justify-between py-2"><span>{n.branch?.name}</span><span className="tabular-nums">{n.qty} units</span></div>)}{!net.length && <p className="py-2 text-slate-500">Not in stock at any other branch.</p>}</div>
          </div>
        </div>}
      </Modal>

      <Modal open={imp} onClose={() => setImp(false)} title="Import products">
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">Upload a CSV with these column names in the first row. Rows with a barcode that already exists update that product.</p>
          <code className="block rounded-md bg-slate-100 p-3 text-xs text-slate-700">brand, generic, strength, form, packSize, barcode, category, legalStatus, price, cost, taxRate</code>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-6 text-slate-600 hover:border-slate-400"><Upload className="h-5 w-5" />Choose a CSV file<input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} /></label>
          <p className="text-xs text-slate-500">Moving from another system with stock and customers too? Use Data import in the menu.</p>
          {report && <div className="rounded-lg bg-slate-50 p-3"><div>Created <b>{report.created}</b> · Updated <b>{report.updated}</b> · Problems <b>{report.errors.length}</b></div>{report.errors.slice(0, 20).map((e: any, i: number) => <div key={i} className="text-red-700">Row {e.row}: {e.error}</div>)}</div>}
        </div>
      </Modal>
    </div>
  );
}
