"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, daysUntil, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Table, Td } from "@/components/ui";

export default function Purchasing() {
  const { call, can, branch } = useAuth();
  const [tab, setTab] = useState<"po" | "suppliers">("po");
  const pos = useLoad(() => call("/purchase-orders"), [branch?._id], !!branch);
  const sups = useLoad(() => call("/suppliers"), []);
  const prods = useLoad(() => call("/products?limit=500"), []);
  const [form, setForm] = useState<any>(null); const [recv, setRecv] = useState<any>(null); const [sup, setSup] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const doAct = async (id: string, path: string, body?: any) => { setErr(null); try { await call(`/purchase-orders/${id}/${path}`, { body: body || {} }); pos.reload(); sups.reload(); setRecv(null); } catch (e: any) { setErr(e.message); alert(e.message); } };
  const create = async () => {
    setErr(null);
    try { await call("/purchase-orders", { body: { supplier: form.supplier, items: form.items.filter((i: any) => i.product).map((i: any) => ({ product: i.product, qty: Number(i.qty), cost: i.cost === "" ? undefined : Number(i.cost) })) } }); setForm(null); pos.reload(); }
    catch (e: any) { setErr(e.message); }
  };
  const saveSup = async () => { setErr(null); try { if (sup._id) await call(`/suppliers/${sup._id}`, { method: "PATCH", body: sup }); else await call("/suppliers", { body: sup }); setSup(null); sups.reload(); } catch (e: any) { setErr(e.message); } };
  const pay = async (s: any) => { const a = prompt(`Payment to ${s.name} (balance ${money(s.balance)})`); if (a) { try { await call(`/suppliers/${s._id}/payments`, { body: { amount: Number(a) } }); sups.reload(); } catch (e: any) { alert(e.message); } } };

  return (
    <div>
      <PageHeader title="Purchasing" subtitle="Purchase orders, goods received and supplier balances"
        actions={<>{can("store_officer", "branch_manager") && <Button onClick={() => { setForm({ supplier: "", items: [{ product: "", qty: "", cost: "" }] }); setErr(null); }}><Plus className="h-4 w-4" />New purchase order</Button>}{can("store_officer", "branch_manager", "accountant") && <Button variant="outline" onClick={() => { setSup({ name: "", contact: "", phone: "", licenseNumber: "", paymentTerms: "", creditLimit: 0 }); setErr(null); }}>Add supplier</Button>}</>} />
      <div className="mb-4 flex gap-2"><Button size="sm" variant={tab === "po" ? "primary" : "outline"} onClick={() => setTab("po")}>Purchase orders</Button><Button size="sm" variant={tab === "suppliers" ? "primary" : "outline"} onClick={() => setTab("suppliers")}>Suppliers</Button></div>
      <Card className="p-4">
        {tab === "po" ? (pos.loading && !pos.data ? <Spinner /> : (
          <Table head={["PO", "Supplier", "Branch", "Lines", "Total", "Status", ""]} empty="No purchase orders">
            {(pos.data || []).map((p: any) => (
              <tr key={p._id}><Td className="font-mono text-xs">{p.poNo}</Td><Td>{p.supplier?.name}</Td><Td>{p.branch?.name}</Td><Td>{p.items.map((i: any) => `${i.name} ×${i.qty}`).join(", ")}</Td><Td className="tabular-nums">{money(p.total)}</Td><Td><StatusBadge s={p.status} /></Td>
                <Td className="whitespace-nowrap text-right">
                  {p.status === "draft" && can("branch_manager", "accountant") && <Button size="sm" onClick={() => doAct(p._id, "approve")}>Approve</Button>}
                  {p.status === "approved" && <Button size="sm" onClick={() => doAct(p._id, "send")}>Send to supplier</Button>}
                  {["sent", "partial", "approved"].includes(p.status) && <Button size="sm" variant="outline" onClick={() => setRecv({ po: p, invoiceNo: "", lines: p.items.map((i: any) => ({ item: i._id, name: i.name, qty: i.qty - i.receivedQty, batchNo: "", expiry: "" })) })}>Receive</Button>}
                </Td></tr>
            ))}
          </Table>
        )) : (
          <Table head={["Supplier", "Terms", "Licence", "Credit limit", "Balance due", ""]} empty="No suppliers">
            {(sups.data || []).map((s: any) => (
              <tr key={s._id}><Td className="font-medium">{s.name}<div className="text-xs text-slate-500">{s.phone}</div></Td><Td>{s.paymentTerms}</Td>
                <Td>{s.licenseNumber} {s.licenseExpiry && (daysUntil(s.licenseExpiry)! < 60 ? <Badge tone="amber">expires {dateFmt(s.licenseExpiry)}</Badge> : <span className="text-xs text-slate-500">to {dateFmt(s.licenseExpiry)}</span>)}</Td>
                <Td>{money(s.creditLimit)}</Td><Td className="tabular-nums font-medium">{money(s.balance)}</Td>
                <Td className="whitespace-nowrap text-right">{can("accountant", "branch_manager") && <Button size="sm" variant="outline" onClick={() => pay(s)}>Record payment</Button>}</Td></tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title="New purchase order" wide>
        {form && <div className="space-y-3">
          <Select label="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}><option value="">Choose...</option>{(sups.data || []).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select>
          {form.items.map((it: any, i: number) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4">
              <div className="sm:col-span-2"><Select value={it.product} onChange={(e) => { const p = (prods.data || []).find((x: any) => x._id === e.target.value); setForm({ ...form, items: form.items.map((x: any, k: number) => (k === i ? { ...x, product: e.target.value, cost: p?.cost ?? "" } : x)) }); }}><option value="">Product...</option>{(prods.data || []).map((p: any) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select></div>
              <Input placeholder="Qty" type="number" value={it.qty} onChange={(e) => setForm({ ...form, items: form.items.map((x: any, k: number) => (k === i ? { ...x, qty: e.target.value } : x)) })} />
              <Input placeholder="Unit cost" type="number" value={it.cost} onChange={(e) => setForm({ ...form, items: form.items.map((x: any, k: number) => (k === i ? { ...x, cost: e.target.value } : x)) })} />
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, items: [...form.items, { product: "", qty: "", cost: "" }] })}>+ Add line</Button>
          <ErrorNote error={err} /><Button className="w-full" onClick={create}>Create draft</Button>
        </div>}
      </Modal>

      <Modal open={!!recv} onClose={() => setRecv(null)} title={`Receive ${recv?.po.poNo || ""}`} wide>
        {recv && <div className="space-y-3">
          <Input label="Supplier invoice no." value={recv.invoiceNo} onChange={(e) => setRecv({ ...recv, invoiceNo: e.target.value })} />
          {recv.lines.map((l: any, i: number) => (
            <div key={l.item} className="grid gap-2 sm:grid-cols-4"><div className="self-end pb-2 text-sm font-medium">{l.name}</div>
              <Input label="Qty" type="number" value={l.qty} onChange={(e) => setRecv({ ...recv, lines: recv.lines.map((x: any, k: number) => (k === i ? { ...x, qty: e.target.value } : x)) })} />
              <Input label="Batch no." value={l.batchNo} onChange={(e) => setRecv({ ...recv, lines: recv.lines.map((x: any, k: number) => (k === i ? { ...x, batchNo: e.target.value } : x)) })} />
              <Input label="Expiry" type="date" value={l.expiry} onChange={(e) => setRecv({ ...recv, lines: recv.lines.map((x: any, k: number) => (k === i ? { ...x, expiry: e.target.value } : x)) })} /></div>
          ))}
          <ErrorNote error={err} />
          <Button className="w-full" onClick={() => doAct(recv.po._id, "receive", { invoiceNo: recv.invoiceNo, lines: recv.lines.filter((l: any) => Number(l.qty) > 0).map((l: any) => ({ ...l, qty: Number(l.qty) })) })}>Confirm receipt into stock</Button>
        </div>}
      </Modal>

      <Modal open={!!sup} onClose={() => setSup(null)} title={sup?._id ? "Edit supplier" : "Add supplier"}>
        {sup && <div className="space-y-3">
          {([["name", "Name"], ["contact", "Contact person"], ["phone", "Phone"], ["email", "Email"], ["licenseNumber", "Licence number"], ["paymentTerms", "Payment terms"], ["creditLimit", "Credit limit"]] as const).map(([k, l]) => <Input key={k} label={l} value={sup[k] ?? ""} onChange={(e) => setSup({ ...sup, [k]: e.target.value })} />)}
          <Input label="Licence expiry" type="date" value={sup.licenseExpiry?.slice(0, 10) || ""} onChange={(e) => setSup({ ...sup, licenseExpiry: e.target.value })} />
          <ErrorNote error={err} /><Button className="w-full" onClick={saveSup}>Save</Button>
        </div>}
      </Modal>
    </div>
  );
}
