"use client";
import { useState } from "react";
import { PackagePlus, Search, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, daysUntil, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, Stat, Table, Td } from "@/components/ui";

export default function Inventory() {
  const { call, can, branch } = useAuth();
  const [filter, setFilter] = useState(""); const [q, setQ] = useState("");
  const list = useLoad(() => call(`/inventory?filter=${filter}&q=${encodeURIComponent(q)}`), [filter, q, branch?._id], !!branch);
  const alerts = useLoad(() => call("/inventory/alerts"), [branch?._id], !!branch);
  const [sel, setSel] = useState<any>(null); const [batches, setBatches] = useState<any[]>([]);
  const [recv, setRecv] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [adj, setAdj] = useState<any>(null); const [trace, setTrace] = useState<any>(null);
  const products = useLoad(() => call("/products?limit=500"), [], !!recv);
  const suppliers = useLoad(() => call("/suppliers").catch(() => []), [], !!recv);
  const manage = can("store_officer", "branch_manager", "pharmacist", "technician");

  const openBatches = async (row: any) => { setSel(row); setBatches(await call(`/inventory/batches?product=${row.product._id}`)); };
  const refresh = () => { list.reload(); alerts.reload(); if (sel) openBatches(sel); };

  const receive = async () => {
    setErr(null);
    try { await call("/inventory/receive", { body: { supplier: recv.supplier || undefined, invoiceNo: recv.invoiceNo, items: [{ product: recv.product, batchNo: recv.batchNo, expiry: recv.expiry, qty: Number(recv.qty), cost: Number(recv.cost || 0) }] } }); setRecv(null); refresh(); }
    catch (e: any) { setErr(e.message); }
  };
  const adjust = async () => { setErr(null); try { await call("/inventory/adjust", { body: { batch: adj.batch._id, newQty: Number(adj.newQty), reason: adj.reason, witness: adj.witness } }); setAdj(null); refresh(); } catch (e: any) { setErr(e.message); } };
  const quarantine = async (b: any, release = false) => {
    const reason = release ? "" : prompt("Reason for quarantine / recall?");
    if (!release && !reason) return;
    try { await call("/inventory/quarantine", { body: { product: b.product._id || b.product, batchNo: b.batchNo, reason, release } }); refresh(); } catch (e: any) { alert(e.message); }
  };
  const doTrace = async (b: any) => setTrace(await call(`/inventory/trace?product=${b.product._id || b.product}&batchNo=${encodeURIComponent(b.batchNo)}`));

  const a = alerts.data;
  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${branch?.name} - stock by batch and expiry, first-expiry-first-out`}
        actions={manage && <Button onClick={() => { setRecv({ product: "", batchNo: "", expiry: "", qty: "", cost: "" }); setErr(null); }}><PackagePlus className="h-4 w-4" />Receive stock</Button>} />
      {a && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Expiring ≤ 30d" value={a.expiring[30]} tone={a.expiring[30] ? "red" : undefined} />
          <Stat label="Expiring ≤ 60d" value={a.expiring[60]} tone={a.expiring[60] ? "amber" : undefined} />
          <Stat label="Expiring ≤ 90d" value={a.expiring[90]} />
          <Stat label="Expired on shelf" value={a.expired} tone={a.expired ? "red" : undefined} sub="blocked from sale" />
          <Stat label="Branch licence" value={a.licenceDays === null ? "-" : a.licenceDays < 0 ? "Expired" : `${a.licenceDays} days`} tone={a.licenceDays !== null && a.licenceDays < 60 ? "amber" : "green"} sub="until expiry" />
        </div>
      )}
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search stock" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48"><option value="">All products</option><option value="low">Low stock</option><option value="expiring">Expiring or expired</option></Select>
        </div>
        <ErrorNote error={list.error} />
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Product", "On hand", "Reorder at", "Near expiry", "Expired", "Next expiry", "Value", ""]} empty="No stock records">
            {(list.data || []).map((r: any) => (
              <tr key={r.product._id}>
                <Td><div className="font-medium">{r.product.brand} {r.product.strength}</div><div className="text-xs text-slate-500">{r.product.generic}</div></Td>
                <Td><span className={r.low ? "font-semibold text-amber-700" : ""}>{r.qty}</span> {r.low && <Badge tone="amber">Low</Badge>}{r.quarantined > 0 && <Badge tone="red">{r.quarantined} quarantined</Badge>}</Td>
                <Td>{r.reorderLevel}</Td>
                <Td>{r.nearExpiry ? <Badge tone="amber">{r.nearExpiry}</Badge> : "-"}</Td>
                <Td>{r.expired ? <Badge tone="red">{r.expired}</Badge> : "-"}</Td>
                <Td>{dateFmt(r.nextExpiry)}</Td><Td className="tabular-nums">{money(r.value)}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => openBatches(r)}>Batches</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!sel} onClose={() => setSel(null)} title={`Batches: ${sel?.product.brand || ""}`} wide>
        <Table head={["Batch", "Expiry", "Qty", "Cost", "Status", ""]} empty="No batches">
          {batches.map((b) => { const d = daysUntil(b.expiry)!; return (
            <tr key={b._id}>
              <Td className="font-mono text-xs">{b.batchNo}</Td>
              <Td>{dateFmt(b.expiry)} {d < 0 ? <Badge tone="red">Expired</Badge> : d <= 30 ? <Badge tone="red">{d}d</Badge> : d <= 90 ? <Badge tone="amber">{d}d</Badge> : null}</Td>
              <Td>{b.qty}</Td><Td>{money(b.cost)}</Td>
              <Td>{b.status === "quarantined" ? <Badge tone="red">Quarantined</Badge> : <Badge tone="green">Active</Badge>}</Td>
              <Td className="whitespace-nowrap text-right">
                {manage && <Button size="sm" variant="ghost" onClick={() => { setAdj({ batch: b, newQty: b.qty, reason: "", witness: "" }); setErr(null); }}>Adjust</Button>}
                {can("pharmacist", "branch_manager", "store_officer") && (b.status === "quarantined" ? <Button size="sm" variant="ghost" onClick={() => quarantine(b, true)}>Release</Button> : <Button size="sm" variant="ghost" onClick={() => quarantine(b)}><ShieldAlert className="h-3.5 w-3.5" />Recall</Button>)}
                <Button size="sm" variant="ghost" onClick={() => doTrace(b)}>Trace</Button>
              </Td>
            </tr>); })}
        </Table>
      </Modal>

      <Modal open={!!recv} onClose={() => setRecv(null)} title="Receive stock">
        {recv && <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Select label="Product" value={recv.product} onChange={(e) => setRecv({ ...recv, product: e.target.value })}><option value="">Choose product...</option>{(products.data || []).map((p: any) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select></div>
          <Select label="Supplier" value={recv.supplier || ""} onChange={(e) => setRecv({ ...recv, supplier: e.target.value })}><option value="">-</option>{(suppliers.data || []).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select>
          <Input label="Invoice no." value={recv.invoiceNo || ""} onChange={(e) => setRecv({ ...recv, invoiceNo: e.target.value })} />
          <Input label="Batch number" value={recv.batchNo} onChange={(e) => setRecv({ ...recv, batchNo: e.target.value })} />
          <Input label="Expiry date" type="date" value={recv.expiry} onChange={(e) => setRecv({ ...recv, expiry: e.target.value })} />
          <Input label="Quantity" type="number" value={recv.qty} onChange={(e) => setRecv({ ...recv, qty: e.target.value })} />
          <Input label="Unit cost" type="number" value={recv.cost} onChange={(e) => setRecv({ ...recv, cost: e.target.value })} />
          <div className="sm:col-span-2 space-y-3"><ErrorNote error={err} /><Button className="w-full" onClick={receive}>Add to stock</Button></div>
        </div>}
      </Modal>

      <Modal open={!!adj} onClose={() => setAdj(null)} title="Stock adjustment">
        {adj && <div className="space-y-3">
          <p className="text-sm text-slate-600">Batch {adj.batch.batchNo}: currently {adj.batch.qty}. A reason is mandatory; large write-offs need a manager.</p>
          <Input label="Counted / new quantity" type="number" value={adj.newQty} onChange={(e) => setAdj({ ...adj, newQty: e.target.value })} />
          <Input label="Reason (damage, expiry write-off, theft, count correction...)" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
          <Input label="Witness (controlled drugs)" value={adj.witness} onChange={(e) => setAdj({ ...adj, witness: e.target.value })} />
          <ErrorNote error={err} /><Button className="w-full" onClick={adjust}>Save adjustment</Button>
        </div>}
      </Modal>

      <Modal open={!!trace} onClose={() => setTrace(null)} title="Batch trace" wide>
        {trace && <div className="space-y-4 text-sm">
          <div><h3 className="font-semibold">Branches holding this batch</h3>{trace.branchesHolding.map((h: any, i: number) => <div key={i} className="py-1">{h.branch?.name}: {h.qty} <Badge tone={h.status === "active" ? "green" : "red"}>{h.status}</Badge></div>)}</div>
          <div><h3 className="font-semibold">Sales containing this batch ({trace.customers.length})</h3>{trace.customers.slice(0, 15).map((c: any, i: number) => <div key={i} className="py-0.5 text-slate-700">{c.receiptNo} · {c.branch?.name} · {c.customer?.name || "walk-in"} {c.customer?.phone}</div>)}</div>
          <div><h3 className="font-semibold">Transfers</h3>{trace.transfers.map((t: any) => <div key={t.ref}>{t.ref}: {t.from?.name} → {t.to?.name} ({t.status})</div>)}{!trace.transfers.length && <span className="text-slate-500">None</span>}</div>
        </div>}
      </Modal>
    </div>
  );
}
