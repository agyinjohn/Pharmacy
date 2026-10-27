"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, PackageCheck, Plus, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, daysUntil, money } from "@/lib/api";
import { Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Ref, Tabs } from "@/components/ui";

const OPEN = ["draft", "approved", "sent", "partial"];
const FILTERS: [string, string, (p: any) => boolean][] = [
  ["all", "All", () => true],
  ["draft", "Waiting approval", (p) => p.status === "draft"],
  ["open", "On order", (p) => ["approved", "sent", "partial"].includes(p.status)],
  ["done", "Received", (p) => ["received", "cancelled"].includes(p.status)],
];
const th = "px-3 py-2.5 text-left text-xs font-medium text-slate-500";

export default function Purchasing() {
  const { call, can, branch } = useAuth();
  const [tab, setTab] = useState<"po" | "suppliers" | "returns">("po");
  const [filter, setFilter] = useState("all");
  const pos = useLoad<any[]>(() => call("/purchase-orders"), [branch?._id], !!branch);
  const sups = useLoad<any[]>(() => call("/suppliers"), []);
  const prods = useLoad<any[]>(() => call("/products?limit=500"), []);
  const [form, setForm] = useState<any>(null); const [recv, setRecv] = useState<any>(null); const [sup, setSup] = useState<any>(null); const [view, setView] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ret, setRet] = useState<any>(null); const [retBatches, setRetBatches] = useState<any[]>([]);
  const rets = useLoad<any[]>(() => call("/supplier-returns"), [tab === "returns"], tab === "returns");

  const doAct = async (id: string, path: string, body?: any) => {
    setErr(null);
    try { const r = await call(`/purchase-orders/${id}/${path}`, { body: body || {} }); pos.reload(); sups.reload(); setRecv(null); if (view?._id === id) setView(r?._id ? { ...view, ...r, supplier: view.supplier, branch: view.branch } : null); }
    catch (e: any) { setErr(e.message); }
  };
  const create = async () => {
    setErr(null);
    try { await call("/purchase-orders", { body: { supplier: form.supplier, items: form.items.filter((i: any) => i.product).map((i: any) => ({ product: i.product, qty: Number(i.qty), cost: i.cost === "" ? undefined : Number(i.cost) })) } }); setForm(null); pos.reload(); }
    catch (e: any) { setErr(e.message); }
  };
  const saveSup = async () => { setErr(null); try { if (sup._id) await call(`/suppliers/${sup._id}`, { method: "PATCH", body: sup }); else await call("/suppliers", { body: sup }); setSup(null); sups.reload(); } catch (e: any) { setErr(e.message); } };
  const openReturn = async (s: any) => { setErr(null); setRetBatches(await call("/inventory/batches")); setRet({ supplier: s._id, name: s.name, batch: "", qty: "", reason: "" }); };
  const doReturn = async () => { setErr(null); try { await call("/supplier-returns", { body: { supplier: ret.supplier, reason: ret.reason, items: [{ batch: ret.batch, qty: Number(ret.qty) }] } }); setRet(null); sups.reload(); if (tab === "returns") rets.reload(); } catch (e: any) { setErr(e.message); } };
  const pay = async (s: any) => { const a = prompt(`Payment to ${s.name} (balance ${money(s.balance)})`); if (a) { try { await call(`/suppliers/${s._id}/payments`, { body: { amount: Number(a) } }); sups.reload(); } catch (e: any) { alert(e.message); } } };
  const startReceive = (p: any) => { setErr(null); setRecv({ po: p, invoiceNo: "", invoiceTotal: "", lines: p.items.map((i: any) => ({ item: i._id, name: i.name, cost: i.cost, remaining: i.qty - (i.receivedQty || 0), qty: String(i.qty - (i.receivedQty || 0)), batchNo: "", expiry: "" })) }); };

  const all = pos.data || [];
  const rows = all.filter(FILTERS.find((f) => f[0] === filter)![2]);
  const drafts = all.filter((p) => p.status === "draft");
  const onOrder = all.filter((p) => ["approved", "sent", "partial"].includes(p.status));
  const owed = (sups.data || []).reduce((a, s) => a + (s.balance || 0), 0);
  const licenceSoon = (sups.data || []).filter((s) => s.licenseExpiry && daysUntil(s.licenseExpiry)! < 60);
  const formTotal = form ? form.items.reduce((a: number, i: any) => a + (Number(i.qty) || 0) * (Number(i.cost) || 0), 0) : 0;
  const recvValue = recv ? recv.lines.reduce((a: number, l: any) => a + (Number(l.qty) || 0) * l.cost, 0) : 0;
  const recvMismatch = recv && recv.invoiceTotal !== "" && Math.abs(Number(recv.invoiceTotal) - recvValue) > Math.max(1, recvValue * 0.01);

  const nextStep = (p: any, size: "sm" | "md" = "sm") => <>
    {p.status === "draft" && can("branch_manager", "accountant") && <Button size={size} onClick={(e) => { e.stopPropagation(); doAct(p._id, "approve"); }}><CheckCircle2 className="h-4 w-4" />Approve</Button>}
    {p.status === "approved" && can("store_officer", "branch_manager") && <Button size={size} variant="outline" onClick={(e) => { e.stopPropagation(); doAct(p._id, "send"); }}><Send className="h-4 w-4" />Send to supplier</Button>}
    {["sent", "partial", "approved"].includes(p.status) && can("store_officer", "branch_manager", "pharmacist", "technician") && <Button size={size} onClick={(e) => { e.stopPropagation(); startReceive(p); }}><PackageCheck className="h-4 w-4" />Receive</Button>}
  </>;

  return (
    <div>
      <PageHeader title="Purchasing" subtitle="Order from suppliers, receive goods into stock and keep track of what you owe"
        actions={<>{can("store_officer", "branch_manager", "accountant") && <Button variant="outline" onClick={() => { setSup({ name: "", contact: "", phone: "", licenseNumber: "", paymentTerms: "", creditLimit: 0 }); setErr(null); }}>Add supplier</Button>}{can("store_officer", "branch_manager") && <Button onClick={() => { setForm({ supplier: "", items: [{ product: "", qty: "", cost: "" }] }); setErr(null); }}><Plus className="h-4 w-4" />New purchase order</Button>}</>} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4"><div className="text-xs font-medium text-slate-500">Waiting approval</div><div className="mt-1 text-xl font-semibold tabular-nums">{drafts.length}</div><div className="mt-0.5 text-xs text-slate-500">{money(drafts.reduce((a, p) => a + p.total, 0))}</div></Card>
        <Card className="p-4"><div className="text-xs font-medium text-slate-500">On order</div><div className="mt-1 text-xl font-semibold tabular-nums">{onOrder.length}</div><div className="mt-0.5 text-xs text-slate-500">{money(onOrder.reduce((a, p) => a + p.total, 0))}</div></Card>
        <Card className="p-4"><div className="text-xs font-medium text-slate-500">Owed to suppliers</div><div className="mt-1 text-xl font-semibold tabular-nums">{money(owed)}</div><div className="mt-0.5 text-xs text-slate-500">{(sups.data || []).filter((s) => s.balance > 0).length} suppliers</div></Card>
        <Card className="p-4"><div className="text-xs font-medium text-slate-500">Supplier licences</div><div className="mt-1 text-xl font-semibold tabular-nums">{licenceSoon.length ? `${licenceSoon.length} expiring` : "All valid"}</div><div className="mt-0.5 text-xs text-slate-500">{licenceSoon.length ? licenceSoon.map((s) => s.name.split(" ")[0]).join(", ") : "next 60 days"}</div></Card>
      </div>

      <Tabs value={tab} onChange={(v) => setTab(v as any)} items={[["po", "Purchase orders", all.filter((p) => OPEN.includes(p.status)).length], ["suppliers", "Suppliers"], ["returns", "Returns and credit notes"]]} />

      {tab === "po" && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map(([k, l, fn]) => <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-sm ${filter === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>{l} <span className={filter === k ? "text-white/70" : "text-slate-400"}>{all.filter(fn).length}</span></button>)}
          </div>
          {pos.loading && !pos.data ? <Spinner /> : !rows.length ? <p className="py-10 text-center text-sm text-slate-500">No purchase orders here.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b border-slate-200"><th className={th}>Order</th><th className={th}>Supplier</th><th className={th}>Items</th><th className={`${th} text-right`}>Total</th><th className={th}>Status</th><th className={th} /></tr></thead>
                <tbody>
                  {rows.map((p) => {
                    const ordered = p.items.reduce((a: number, i: any) => a + i.qty, 0); const got = p.items.reduce((a: number, i: any) => a + (i.receivedQty || 0), 0);
                    return (
                      <tr key={p._id} onClick={() => { setErr(null); setView(p); }} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-3"><Ref>{p.poNo}</Ref><div className="text-xs text-slate-500">{dateFmt(p.createdAt)} · {p.branch?.name}</div></td>
                        <td className="px-3 py-3 font-medium text-slate-900">{p.supplier?.name}</td>
                        <td className="px-3 py-3 text-slate-700">{p.items[0]?.name} × {p.items[0]?.qty}{p.items.length > 1 && <span className="text-slate-500"> +{p.items.length - 1} more</span>}
                          {p.status === "partial" && <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><div className="h-1.5 w-24 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(got / ordered) * 100}%` }} /></div>{got} of {ordered} received</div>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">{money(p.total)}</td>
                        <td className="px-3 py-3"><StatusBadge s={p.status} />{p.receipts?.some((r: any) => r.mismatch) && <div className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" />Invoice mismatch</div>}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">{nextStep(p)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ErrorNote error={!view && !recv ? err : null} />
        </Card>
      )}

      {tab === "suppliers" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(sups.data || []).map((s) => {
            const d = s.licenseExpiry ? daysUntil(s.licenseExpiry)! : null; const used = s.creditLimit ? Math.min(100, (s.balance / s.creditLimit) * 100) : 0;
            return (
              <Card key={s._id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-semibold text-slate-900">{s.name}</div><div className="text-sm text-slate-500">{[s.contact, s.phone].filter(Boolean).join(" · ")}</div></div>
                  {s.paymentTerms && <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s.paymentTerms}</span>}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Balance due</span><span className="font-semibold tabular-nums">{money(s.balance || 0)}</span></div>
                  {s.creditLimit > 0 && <><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${used > 80 ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${used}%` }} /></div><div className="mt-1 text-xs text-slate-500">of {money(s.creditLimit)} credit</div></>}
                </div>
                <div className="mt-3 text-xs text-slate-500">Licence {s.licenseNumber || "-"}{d !== null && <span className={d < 60 ? "font-medium text-amber-700" : ""}> · {d < 0 ? "expired" : `valid to ${dateFmt(s.licenseExpiry)}`}</span>}</div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {can("accountant", "branch_manager") && <Button size="sm" variant="outline" onClick={() => pay(s)}>Record payment</Button>}
                  {can("store_officer", "branch_manager") && <Button size="sm" variant="ghost" onClick={() => openReturn(s)}>Return goods</Button>}
                  {can("store_officer", "branch_manager", "accountant") && <Button size="sm" variant="ghost" onClick={() => { setSup({ ...s }); setErr(null); }}>Edit</Button>}
                </div>
              </Card>
            );
          })}
          {sups.data && !sups.data.length && <p className="text-sm text-slate-500">No suppliers yet.</p>}
        </div>
      )}

      {tab === "returns" && (
        <Card className="overflow-x-auto p-4">
          {!(rets.data || []).length ? <p className="py-10 text-center text-sm text-slate-500">No returns yet. Use “Return goods” on a supplier to send back damaged, recalled or short-dated stock.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200"><th className={th}>Credit note</th><th className={th}>Supplier</th><th className={th}>Items</th><th className={th}>Reason</th><th className={`${th} text-right`}>Value</th></tr></thead>
              <tbody>{(rets.data || []).map((r) => <tr key={r._id} className="border-b border-slate-100"><td className="px-3 py-3"><Ref>{r.creditNoteNo}</Ref><div className="text-xs text-slate-500">{dateFmt(r.createdAt)}</div></td><td className="px-3 py-3">{r.supplier?.name}</td><td className="px-3 py-3">{r.items.map((i: any) => `${i.name} (${i.batchNo}) × ${i.qty}`).join(", ")}</td><td className="px-3 py-3 text-slate-600">{r.reason}</td><td className="px-3 py-3 text-right tabular-nums">{money(r.total)}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={!!view} onClose={() => setView(null)} title={`Purchase order ${view?.poNo || ""}`} wide>
        {view && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge s={view.status} /><span className="ml-auto text-xs text-slate-500">Raised {dateFmt(view.createdAt)} · for {view.branch?.name}</span></div>
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier</div><div className="mt-1 text-base font-semibold">{view.supplier?.name}</div><div className="text-slate-500">{[view.supplier?.phone, view.supplier?.paymentTerms].filter(Boolean).join(" · ")}</div></div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50"><tr><th className={th}>Item</th><th className={`${th} text-right`}>Ordered</th><th className={`${th} text-right`}>Received</th><th className={`${th} text-right`}>Unit cost</th><th className={`${th} text-right`}>Line total</th></tr></thead>
                <tbody>{view.items.map((i: any) => <tr key={i._id} className="border-t border-slate-100"><td className="px-3 py-2.5 font-medium">{i.name}</td><td className="px-3 py-2.5 text-right tabular-nums">{i.qty}</td><td className={`px-3 py-2.5 text-right tabular-nums ${i.receivedQty >= i.qty ? "text-brand-700" : "text-slate-500"}`}>{i.receivedQty || 0}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(i.cost)}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(i.qty * i.cost)}</td></tr>)}</tbody>
                <tfoot><tr className="border-t border-slate-200 font-semibold"><td className="px-3 py-2.5" colSpan={4}>Total</td><td className="px-3 py-2.5 text-right tabular-nums">{money(view.total)}</td></tr></tfoot>
              </table>
            </div>
            {view.receipts?.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Deliveries</div>
                {view.receipts.map((r: any, i: number) => <div key={i} className="flex justify-between border-b border-slate-100 py-2"><span>{dateFmt(r.at)}{r.invoiceNo && ` · invoice ${r.invoiceNo}`}</span><span className="tabular-nums">{money(r.receivedValue)}{r.mismatch && <span className="ml-2 text-amber-700">invoice says {money(r.invoiceTotal)}</span>}</span></div>)}
              </div>
            )}
            <ErrorNote error={err} />
            {OPEN.includes(view.status) && <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">{nextStep(view, "md")}</div>}
          </div>
        )}
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title="New purchase order" wide>
        {form && <div className="space-y-4 text-sm">
          <Select label="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}><option value="">Choose a supplier...</option>{(sups.data || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className={th}>Product</th><th className={`${th} w-24`}>Qty</th><th className={`${th} w-32`}>Unit cost</th><th className={`${th} w-28 text-right`}>Line total</th><th className="w-10" /></tr></thead>
              <tbody>
                {form.items.map((it: any, i: number) => {
                  const set = (patch: any) => setForm({ ...form, items: form.items.map((x: any, k: number) => (k === i ? { ...x, ...patch } : x)) });
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-2"><Select aria-label="Product" value={it.product} onChange={(e) => { const p = (prods.data || []).find((x) => x._id === e.target.value); set({ product: e.target.value, cost: p?.cost ?? "" }); }}><option value="">Choose...</option>{(prods.data || []).map((p) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select></td>
                      <td className="px-2 py-2"><Input aria-label="Quantity" type="number" min={1} value={it.qty} onChange={(e) => set({ qty: e.target.value })} /></td>
                      <td className="px-2 py-2"><Input aria-label="Unit cost" type="number" step="0.01" value={it.cost} onChange={(e) => set({ cost: e.target.value })} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{money((Number(it.qty) || 0) * (Number(it.cost) || 0))}</td>
                      <td className="px-2 py-2">{form.items.length > 1 && <button aria-label="Remove line" onClick={() => setForm({ ...form, items: form.items.filter((_: any, k: number) => k !== i) })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Trash2 className="h-4 w-4" /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2.5">
              <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, items: [...form.items, { product: "", qty: "", cost: "" }] })}><Plus className="h-4 w-4" />Add line</Button>
              <span className="font-semibold tabular-nums">Total {money(formTotal)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Saved as a draft. A branch manager or accountant approves it before it goes to the supplier.</p>
          <ErrorNote error={err} />
          <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button disabled={!form.supplier || !form.items.some((i: any) => i.product && Number(i.qty) > 0)} onClick={create}>Save draft</Button></div>
        </div>}
      </Modal>

      <Modal open={!!recv} onClose={() => setRecv(null)} title={`Receive goods · ${recv?.po.poNo || ""}`} wide>
        {recv && <div className="space-y-4 text-sm">
          <p className="text-slate-600">From <b>{recv.po.supplier?.name}</b>. Enter what actually arrived. Each line becomes a batch in stock, sold first-expiry-first-out.</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[620px]">
              <thead className="bg-slate-50"><tr><th className={th}>Item</th><th className={`${th} w-24`}>Received</th><th className={th}>Batch no.</th><th className={th}>Expiry</th></tr></thead>
              <tbody>
                {recv.lines.map((l: any, i: number) => {
                  const set = (patch: any) => setRecv({ ...recv, lines: recv.lines.map((x: any, k: number) => (k === i ? { ...x, ...patch } : x)) });
                  const short = l.expiry && daysUntil(l.expiry)! < 180;
                  return (
                    <tr key={l.item} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2.5"><div className="font-medium">{l.name}</div><div className="text-xs text-slate-500">{l.remaining} still due · {money(l.cost)} each</div></td>
                      <td className="px-2 py-2"><Input aria-label={`Quantity received of ${l.name}`} type="number" min={0} value={l.qty} onChange={(e) => set({ qty: e.target.value })} /></td>
                      <td className="px-2 py-2"><Input aria-label={`Batch number for ${l.name}`} placeholder="e.g. B2611" value={l.batchNo} onChange={(e) => set({ batchNo: e.target.value })} /></td>
                      <td className="px-2 py-2"><Input aria-label={`Expiry for ${l.name}`} type="date" value={l.expiry} onChange={(e) => set({ expiry: e.target.value })} />{short && <div className="mt-1 text-xs text-amber-700">Short expiry ({daysUntil(l.expiry)} days)</div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Supplier invoice no." value={recv.invoiceNo} onChange={(e) => setRecv({ ...recv, invoiceNo: e.target.value })} />
            <Input label="Invoice total (GH₵)" type="number" step="0.01" value={recv.invoiceTotal} onChange={(e) => setRecv({ ...recv, invoiceTotal: e.target.value })} />
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Value of goods received</div><div className="font-semibold tabular-nums">{money(recvValue)}</div></div>
          </div>
          {recvMismatch && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />The invoice is {money(Math.abs(Number(recv.invoiceTotal) - recvValue))} {Number(recv.invoiceTotal) > recvValue ? "more" : "less"} than the goods received. You can still receive; it will be flagged for the accountant.</div>}
          <ErrorNote error={err} />
          <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <Button variant="outline" onClick={() => setRecv(null)}>Cancel</Button>
            <Button disabled={!recv.lines.some((l: any) => Number(l.qty) > 0)} onClick={() => doAct(recv.po._id, "receive", { invoiceNo: recv.invoiceNo, invoiceTotal: recv.invoiceTotal, lines: recv.lines.filter((l: any) => Number(l.qty) > 0).map((l: any) => ({ item: l.item, qty: Number(l.qty), batchNo: l.batchNo, expiry: l.expiry })) })}><PackageCheck className="h-4 w-4" />Receive into stock</Button>
          </div>
        </div>}
      </Modal>

      <Modal open={!!ret} onClose={() => setRet(null)} title={`Return goods to ${ret?.name || ""}`}>
        {ret && <div className="space-y-3">
          <Select label="Batch to return (this branch)" value={ret.batch} onChange={(e) => setRet({ ...ret, batch: e.target.value })}><option value="">Choose...</option>{retBatches.map((b) => <option key={b._id} value={b._id}>{b.product?.brand} · {b.batchNo} · qty {b.qty} · exp {dateFmt(b.expiry)}</option>)}</Select>
          <Input label="Quantity" type="number" value={ret.qty} onChange={(e) => setRet({ ...ret, qty: e.target.value })} />
          <Input label="Reason" placeholder="Damaged, near expiry, recall..." value={ret.reason} onChange={(e) => setRet({ ...ret, reason: e.target.value })} />
          <ErrorNote error={err} /><Button className="w-full" onClick={doReturn}>Return and issue credit note</Button>
        </div>}
      </Modal>

      <Modal open={!!sup} onClose={() => setSup(null)} title={sup?._id ? "Edit supplier" : "Add supplier"}>
        {sup && <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Name" value={sup.name ?? ""} onChange={(e) => setSup({ ...sup, name: e.target.value })} /></div>
          {([["contact", "Contact person"], ["phone", "Phone"], ["email", "Email"], ["paymentTerms", "Payment terms"], ["licenseNumber", "Licence number"], ["creditLimit", "Credit limit (GH₵)"]] as const).map(([k, l]) => <Input key={k} label={l} value={sup[k] ?? ""} onChange={(e) => setSup({ ...sup, [k]: e.target.value })} />)}
          <Input label="Licence expiry" type="date" value={sup.licenseExpiry?.slice(0, 10) || ""} onChange={(e) => setSup({ ...sup, licenseExpiry: e.target.value })} />
          <div className="sm:col-span-2 space-y-2"><ErrorNote error={err} /><Button className="w-full" disabled={!sup.name} onClick={saveSup}>Save supplier</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
