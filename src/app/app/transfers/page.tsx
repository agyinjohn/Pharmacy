"use client";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Table, Td } from "@/components/ui";

export default function Transfers() {
  const { call, branch, branches, user } = useAuth();
  const list = useLoad(() => call("/transfers"), [branch?._id]);
  const prods = useLoad(() => call("/products?limit=500"), []);
  const allBranches = useLoad(() => call("/branches?all=1"), []);
  const [form, setForm] = useState<any>(null); const [recv, setRecv] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const mine = (id: string) => user?.role === "owner" || user?.branches.includes(id);

  const act = async (t: any, path: string, body: any = {}) => { setErr(null); try { await call(`/transfers/${t._id}/${path}`, { body }); list.reload(); setRecv(null); } catch (e: any) { alert(e.message); } };
  const create = async () => { setErr(null); try { await call("/transfers", { body: { from: form.from, to: branch?._id, note: form.note, items: form.items.filter((i: any) => i.product).map((i: any) => ({ product: i.product, qty: Number(i.qty) })) } }); setForm(null); list.reload(); } catch (e: any) { setErr(e.message); } };

  return (
    <div>
      <PageHeader title="Stock transfers" subtitle="Request stock from another branch. Batch and expiry travel with it; shortages are flagged."
        actions={<Button onClick={() => { setForm({ from: "", note: "", items: [{ product: "", qty: "" }] }); setErr(null); }}><Plus className="h-4 w-4" />Request stock</Button>} />
      <Card className="p-4">
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Ref", "Route", "Items", "Status", "Requested", ""]} empty="No transfers">
            {(list.data || []).map((t: any) => (
              <tr key={t._id}><Td className="font-mono text-xs">{t.ref}</Td><Td><span className="inline-flex items-center gap-1">{t.from?.name}<ArrowRight className="h-3 w-3" />{t.to?.name}</span></Td>
                <Td>{t.items.map((i: any) => `${i.name} ×${i.qty}${i.receivedQty !== undefined && i.receivedQty !== i.qty ? ` (got ${i.receivedQty})` : ""}`).join(", ")} {t.hasVariance && <Badge tone="red">Variance</Badge>}</Td>
                <Td><StatusBadge s={t.status} /></Td><Td>{dateTime(t.createdAt)}</Td>
                <Td className="whitespace-nowrap text-right">
                  {t.status === "requested" && mine(t.from._id) && <><Button size="sm" onClick={() => act(t, "dispatch")}>Approve and dispatch</Button><Button size="sm" variant="ghost" onClick={() => act(t, "reject", { reason: prompt("Reason?") || "" })}>Reject</Button></>}
                  {t.status === "in_transit" && mine(t.to._id) && <Button size="sm" onClick={() => setRecv({ t, counts: Object.fromEntries(t.items.map((i: any) => [i.product, i.qty])) })}>Receive</Button>}
                </Td></tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={`Request stock for ${branch?.name}`}>
        {form && <div className="space-y-3">
          <Select label="From branch" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}><option value="">Choose...</option>{(allBranches.data || []).filter((b: any) => b._id !== branch?._id).map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select>
          {form.items.map((it: any, i: number) => (
            <div key={i} className="grid grid-cols-3 gap-2"><div className="col-span-2"><Select value={it.product} onChange={(e) => setForm({ ...form, items: form.items.map((x: any, k: number) => (k === i ? { ...x, product: e.target.value } : x)) })}><option value="">Product...</option>{(prods.data || []).map((p: any) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select></div>
              <Input type="number" placeholder="Qty" value={it.qty} onChange={(e) => setForm({ ...form, items: form.items.map((x: any, k: number) => (k === i ? { ...x, qty: e.target.value } : x)) })} /></div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, items: [...form.items, { product: "", qty: "" }] })}>+ Add line</Button>
          <Input label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <ErrorNote error={err} /><Button className="w-full" onClick={create}>Send request</Button>
        </div>}
      </Modal>

      <Modal open={!!recv} onClose={() => setRecv(null)} title={`Receive ${recv?.t.ref || ""}`}>
        {recv && <div className="space-y-3"><p className="text-sm text-slate-600">Count what actually arrived. Any difference is flagged as a variance.</p>
          {recv.t.items.map((i: any) => <div key={i.product} className="grid grid-cols-3 items-end gap-2"><div className="col-span-2 text-sm font-medium">{i.name} <span className="text-slate-500">(sent {i.qty})</span></div><Input type="number" value={recv.counts[i.product]} onChange={(e) => setRecv({ ...recv, counts: { ...recv.counts, [i.product]: e.target.value } })} /></div>)}
          <Button className="w-full" onClick={() => act(recv.t, "receive", { items: recv.t.items.map((i: any) => ({ product: i.product, receivedQty: Number(recv.counts[i.product]) })) })}>Confirm receipt</Button></div>}
      </Modal>
    </div>
  );
}
