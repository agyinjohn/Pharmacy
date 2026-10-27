"use client";
import { useState } from "react";
import { PackagePlus, Search, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOffline } from "@/lib/offlineContext";
import { adjustLocalStock, loadCatalog, newClientId, queueOp } from "@/lib/offline";
import { ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, daysUntil, money } from "@/lib/api";
import ProductImage from "@/components/ProductImage";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, Stat, Table, Td, Ref } from "@/components/ui";

// Brand names often already carry the strength ("Ibuprofen 400"); avoid printing it twice.
const productName = (p: any) => (p.strength && !p.brand.includes(p.strength.replace(/[^0-9/.]/g, "")) ? `${p.brand} ${p.strength}` : p.brand);

export default function Inventory() {
  const { call, can, branch } = useAuth();
  const { online, setOffline, refresh: refreshQueue } = useOffline();
  const [filter, setFilter] = useState(""); const [q, setQ] = useState("");
  const list = useLoad(() => call(`/inventory?filter=${filter}&q=${encodeURIComponent(q)}`), [filter, q, branch?._id], !!branch);
  const alerts = useLoad(() => call("/inventory/alerts"), [branch?._id], !!branch);
  const [sel, setSel] = useState<any>(null); const [batches, setBatches] = useState<any[]>([]);
  const [recv, setRecv] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [adj, setAdj] = useState<any>(null); const [trace, setTrace] = useState<any>(null);
  const [sug, setSug] = useState<any[] | null>(null); const [picked, setPicked] = useState<Record<string, boolean>>({}); const [defSup, setDefSup] = useState(""); const [done, setDone] = useState<string | null>(null);
  const products = useLoad(() => call("/products?limit=500").catch(async (e: any) => { const c = branch ? await loadCatalog(branch._id) : undefined; if (c) return c.products; throw e; }), [], !!recv);
  const suppliers = useLoad(() => call("/suppliers").catch(() => []), [], !!recv || !!sug);
  const manage = can("store_officer", "branch_manager", "pharmacist", "technician");

  const openBatches = async (row: any) => { setSel(row); setBatches(await call(`/inventory/batches?product=${row.product._id}`)); };
  const refresh = () => { list.reload(); alerts.reload(); if (sel) openBatches(sel); };

  const receive = async () => {
    setErr(null);
    const payload = { supplier: recv.supplier || undefined, invoiceNo: recv.invoiceNo, receivedAt: new Date().toISOString(), items: [{ product: recv.product, batchNo: recv.batchNo, expiry: recv.expiry, qty: Number(recv.qty), cost: Number(recv.cost || 0) }] };
    // Offline: keep the goods receipt on this device and send it when the connection returns (NFR-05).
    const queueReceipt = async () => {
      if (!recv.product || !recv.batchNo || !recv.expiry || !(Number(recv.qty) > 0)) { setErr("Product, batch, expiry and quantity are required"); return; }
      const name = (products.data || []).find((x: any) => x._id === recv.product)?.brand || "Item";
      await queueOp({ clientId: newClientId(), kind: "receipt", branch: branch!._id, createdAt: payload.receivedAt, payload, label: `${name} batch ${recv.batchNo} x${recv.qty}`, status: "pending" });
      await adjustLocalStock(branch!._id, [{ product: recv.product, qty: Number(recv.qty) }], 1);
      setRecv(null); refreshQueue();
    };
    try {
      if (!online) return await queueReceipt();
      await call("/inventory/receive", { body: payload }); setRecv(null); refresh();
    } catch (e: any) { if (e instanceof ApiError && e.status === 0) { setOffline(); await queueReceipt(); } else setErr(e.message); }
  };
  const adjust = async () => { setErr(null); try { await call("/inventory/adjust", { body: { batch: adj.batch._id, newQty: Number(adj.newQty), reason: adj.reason, witness: adj.witness } }); setAdj(null); refresh(); } catch (e: any) { setErr(e.message); } };
  const quarantine = async (b: any, release = false) => {
    const reason = release ? "" : prompt("Reason for quarantine / recall?");
    if (!release && !reason) return;
    try { await call("/inventory/quarantine", { body: { product: b.product._id || b.product, batchNo: b.batchNo, reason, release } }); refresh(); } catch (e: any) { alert(e.message); }
  };
  const doTrace = async (b: any) => setTrace(await call(`/inventory/trace?product=${b.product._id || b.product}&batchNo=${encodeURIComponent(b.batchNo)}`));

  const openSuggest = async () => { setErr(null); setDone(null); const r = await call("/inventory/reorder-suggestions"); setSug(r); setPicked(Object.fromEntries(r.map((x: any) => [x.product, true]))); };
  const createPos = async () => {
    setErr(null);
    try { const r = await call("/purchase-orders/from-suggestions", { body: { items: sug!.filter((x) => picked[x.product]), fallbackSupplier: defSup || undefined } }); setDone(`Created ${r.length} draft purchase order(s). Approve them in Purchasing.`); setSug(null); }
    catch (e: any) { setErr(e.message); }
  };
  const a = alerts.data;
  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${branch?.name} - stock by batch and expiry, first-expiry-first-out`}
        actions={manage && <><Button variant="outline" onClick={openSuggest}><Sparkles className="h-4 w-4" />Suggest reorder</Button><Button onClick={() => { setRecv({ product: "", batchNo: "", expiry: "", qty: "", cost: "" }); setErr(null); }}><PackagePlus className="h-4 w-4" />Receive stock</Button></>} />
      {done && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{done}</div>}
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
          <Table head={["Product", "On hand", "Reorder at", "Expiry", "Stock value", ""]} right={[1, 2, 4]} empty="No stock records">
            {(list.data || []).map((r: any) => (
              <tr key={r.product._id} className="cursor-pointer" onClick={() => openBatches(r)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <ProductImage product={r.product} size="sm" className="h-10 w-10 shrink-0 rounded-md border border-slate-200" />
                    <div><div className="font-medium text-slate-900">{productName(r.product)}</div><div className="text-xs text-slate-500">{r.product.generic}</div></div>
                  </div>
                </Td>
                <Td className="text-right">
                  <div className={`font-medium tabular-nums ${r.qty === 0 ? "text-red-700" : r.low ? "text-amber-700" : "text-slate-900"}`}>{r.qty}</div>
                  {r.qty === 0 ? <div className="text-xs text-red-700">Out of stock</div> : r.low ? <div className="text-xs text-amber-700">Low</div> : null}
                  {r.quarantined > 0 && <div className="text-xs text-red-700">{r.quarantined} quarantined</div>}
                </Td>
                <Td className="text-right tabular-nums text-slate-500">{r.reorderLevel}</Td>
                <Td>
                  <div className="tabular-nums">{r.nextExpiry ? dateFmt(r.nextExpiry) : "-"}</div>
                  {(r.expired > 0 || r.nearExpiry > 0) && <div className="text-xs">{r.expired > 0 && <span className="text-red-700">{r.expired} expired</span>}{r.expired > 0 && r.nearExpiry > 0 && <span className="text-slate-400"> · </span>}{r.nearExpiry > 0 && <span className="text-amber-700">{r.nearExpiry} within 90 days</span>}</div>}
                </Td>
                <Td className="whitespace-nowrap text-right tabular-nums">{money(r.value)}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openBatches(r); }}>Batches</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!sel} onClose={() => setSel(null)} title="Batches" wide>
        {sel && (
          <div className="mb-4 flex items-center gap-4">
            <ProductImage product={sel.product} size="sm" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200" />
            <div className="flex-1"><div className="text-base font-semibold text-slate-900">{productName(sel.product)}</div><div className="text-sm text-slate-500">{sel.product.generic}</div></div>
            <div className="text-right"><div className="text-xl font-semibold tabular-nums">{sel.qty}</div><div className="text-xs text-slate-500">on hand · {money(sel.value)}</div></div>
          </div>
        )}
        <p className="mb-2 text-xs text-slate-500">Sold first-expiry-first-out: the top batch goes first.</p>
        <Table head={["Batch", "Expiry", "Qty", "Cost", "Status", ""]} right={[2, 3]} empty="No batches">
          {batches.map((b) => { const d = daysUntil(b.expiry)!; return (
            <tr key={b._id}>
              <Td><Ref>{b.batchNo}</Ref></Td>
              <Td><div className="tabular-nums">{dateFmt(b.expiry)}</div>{d < 0 ? <div className="text-xs text-red-700">Expired</div> : d <= 90 ? <div className={`text-xs ${d <= 30 ? "text-red-700" : "text-amber-700"}`}>in {d} days</div> : null}</Td>
              <Td className="text-right tabular-nums">{b.qty}</Td><Td className="text-right tabular-nums">{money(b.cost)}</Td>
              <Td>{b.status === "quarantined" ? <Badge tone="red">Quarantined</Badge> : <Badge tone="green">Active</Badge>}</Td>
              <Td className="whitespace-nowrap text-right">
                {manage && <Button size="sm" variant="ghost" onClick={() => { setAdj({ batch: b, newQty: b.qty, reason: "", witness: "" }); setErr(null); }}>Adjust</Button>}
                {can("pharmacist", "branch_manager", "store_officer") && (b.status === "quarantined" ? <Button size="sm" variant="ghost" onClick={() => quarantine(b, true)}>Release</Button> : <Button size="sm" variant="ghost" onClick={() => quarantine(b)}>Recall</Button>)}
                <Button size="sm" variant="ghost" onClick={() => doTrace(b)}>Trace</Button>
              </Td>
            </tr>); })}
        </Table>
      </Modal>

      <Modal open={!!recv} onClose={() => setRecv(null)} title="Receive stock">
        {recv && <div className="grid gap-3 sm:grid-cols-2">
          {!online && <p className="sm:col-span-2 rounded bg-amber-50 p-2 text-xs text-amber-900">Offline: this receipt is saved on the device and added to stock when the connection returns. Only products in the offline catalogue can be chosen.</p>}
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

      <Modal open={!!sug} onClose={() => setSug(null)} title="Suggested reorder (from last 30 days of sales)" wide>
        {sug && <div className="space-y-3">
          <p className="text-sm text-slate-600">Quantity covers about two weeks of sales plus the reorder level. Untick anything you do not want. One draft order is made per supplier.</p>
          <Table head={["", "Product", "On hand", "Sold 30d", "Suggest", "Last supplier"]} empty="Nothing needs reordering">
            {sug.map((x) => <tr key={x.product}><Td><input type="checkbox" checked={!!picked[x.product]} onChange={(e) => setPicked({ ...picked, [x.product]: e.target.checked })} /></Td><Td className="font-medium">{x.name}</Td><Td>{x.onHand}</Td><Td>{x.soldLast30}</Td>
              <Td><input type="number" className="w-20 rounded border border-slate-300 px-2 py-1" value={x.suggestedQty} onChange={(e) => setSug(sug.map((y) => (y.product === x.product ? { ...y, suggestedQty: Number(e.target.value) } : y)))} /></Td><Td>{x.supplierName || <span className="text-amber-700">none</span>}</Td></tr>)}
          </Table>
          <Select label="Default supplier for items with none" value={defSup} onChange={(e) => setDefSup(e.target.value)}><option value="">-</option>{(suppliers.data || []).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select>
          <ErrorNote error={err} /><Button className="w-full" disabled={!sug.some((x) => picked[x.product])} onClick={createPos}>Create draft purchase orders</Button>
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
