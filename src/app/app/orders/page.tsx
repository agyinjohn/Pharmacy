"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Table, Td } from "@/components/ui";

const TABS: [string, string][] = [["pending_review,received", "To review"], ["approved", "To pack"], ["packed", "Ready"], ["out_for_delivery", "Out for delivery"], ["delivered,failed,cancelled,rejected", "Closed"]];

export default function Orders() {
  const { call, user, branch } = useAuth();
  const [tab, setTab] = useState(TABS[0][0]);
  const list = useLoad(() => call(`/orders?status=${tab}`), [tab, branch?._id]);
  const [o, setO] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [riders, setRiders] = useState<any[]>([]); const [rider, setRider] = useState(""); const [courier, setCourier] = useState(""); const [trackUrl, setTrackUrl] = useState("");
  const [reason, setReason] = useState(""); const [msg, setMsg] = useState(""); const [code, setCode] = useState(""); const [recipient, setRecipient] = useState("");
  const [passTo, setPassTo] = useState("");
  // Pharmacist edit: change quantities, remove items, substitute products (CP-ORD-03).
  const [edit, setEdit] = useState<any[] | null>(null); const [editReason, setEditReason] = useState("");
  const [subsFor, setSubsFor] = useState<{ idx: number; list: any[] } | null>(null);
  const startEdit = () => { setEdit(o.items.map((i: any) => ({ product: i.product, name: i.name, qty: i.qty, unitPrice: i.unitPrice, requiresRx: i.requiresRx }))); setEditReason(""); };
  const showSubs = async (idx: number) => setSubsFor({ idx, list: await call(`/products/${edit![idx].product}/alternatives`) });
  const saveEdit = async () => { const r = await act("edit", { lines: edit!.map((l) => ({ product: l.product, qty: l.qty })), reason: editReason }); if (r) setEdit(null); };
  const { branches } = useAuth();
  const pharm = user?.role === "pharmacist" || user?.role === "owner";

  const open = async (id: string) => { setErr(null); setEdit(null); setSubsFor(null); setO(await call(`/orders/${id}`)); setRiders(await call("/riders").catch(() => [])); };
  const act = async (path: string, body: any = {}) => { setErr(null); try { const r = await call(`/orders/${o._id}/${path}`, { body }); setO(r); list.reload(); setReason(""); setMsg(""); return r; } catch (e: any) { setErr(e.message); } };
  const refreshO = async () => setO(await call(`/orders/${o._id}`));

  return (
    <div>
      <PageHeader title="Online orders" subtitle={`${branch?.name} - review, pack, dispatch and deliver`} />
      <Card className="p-4">
        <div className="mb-4 flex gap-2 overflow-x-auto">{TABS.map(([v, l]) => <Button key={v} size="sm" variant={tab === v ? "primary" : "outline"} onClick={() => setTab(v)}>{l}</Button>)}</div>
        <ErrorNote error={list.error} />
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Order", "Customer", "Items", "Fulfilment", "Payment", "Total", "Status", "Placed", ""]} empty="No orders in this stage">
            {(list.data || []).map((x: any) => (
              <tr key={x._id}>
                <Td className="font-mono text-xs">{x.orderNo}</Td><Td className="font-medium">{x.customer?.name}</Td>
                <Td>{x.items.length} {x.items.some((i: any) => i.requiresRx) && <Badge tone="amber">Rx</Badge>}</Td>
                <Td>{x.fulfilment}</Td><Td><StatusBadge s={x.payment.status} /> <span className="text-xs text-slate-500">{x.payment.method}</span></Td>
                <Td className="tabular-nums">{money(x.total)}</Td><Td><StatusBadge s={x.status} /></Td><Td>{dateTime(x.createdAt)}</Td>
                <Td className="text-right"><Button size="sm" variant="outline" onClick={() => open(x._id)}>Open</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!o} onClose={() => setO(null)} title={`Order ${o?.orderNo || ""}`} wide>
        {o && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge s={o.status} /><Badge tone="slate">{o.fulfilment}</Badge><StatusBadge s={o.payment.status} /><span className="text-slate-500">{o.payment.method} {o.payment.reference}</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><div className="text-xs text-slate-500">Customer</div><div className="font-medium">{o.customer?.name}</div><div>{o.customer?.phone}</div>{o.customer?.allergies?.length > 0 && <Badge tone="red">Allergies: {o.customer.allergies.join(", ")}</Badge>}</div>
              <div><div className="text-xs text-slate-500">{o.fulfilment === "delivery" ? "Deliver to" : "Pickup at"}</div><div>{o.fulfilment === "delivery" ? `${o.address?.line} (${o.address?.zone})` : o.branch?.name}</div>{o.address?.digitalAddress && <div className="text-slate-500">{o.address.digitalAddress}</div>}</div>
            </div>
            <Table head={["Item", "Qty", "Price", ""]}>{o.items.map((i: any, k: number) => <tr key={k}><Td>{i.name}</Td><Td>{i.qty}</Td><Td>{money(i.unitPrice * i.qty)}</Td><Td>{i.requiresRx && <Badge tone="amber">Prescription</Badge>}</Td></tr>)}</Table>
            <div className="text-right">{o.discount > 0 && <span className="text-emerald-700">Promotions -{money(o.discount)} · </span>}Delivery {money(o.deliveryFee)} · <b>Total {money(o.total)}</b>{o.payment.refundedAmount > 0 && <span className="text-slate-500"> · refunded {money(o.payment.refundedAmount)}</span>}</div>
            {o.prescription && <div className="rounded-lg bg-amber-50 p-3"><div className="font-medium text-amber-900">Prescription {o.prescription.rxNo}: <StatusBadge s={o.prescription.status} /></div>{o.prescription.image && <img src={o.prescription.image} alt="Uploaded prescription" className="mt-2 max-h-56 rounded border" />}{o.prescription.status === "pending" && <p className="mt-2 text-amber-800">Verify it in the Prescriptions tab, then approve the order here.</p>}</div>}
            {o.messages?.length > 0 && <div>{o.messages.map((m: any, i: number) => <div key={i}><b>{m.from}:</b> {m.text}</div>)}</div>}
            <ol className="space-y-1 border-l-2 border-slate-200 pl-3 text-xs text-slate-500">{o.history.map((h: any, i: number) => <li key={i}>{dateTime(h.at)} · {h.status.replace(/_/g, " ")} {h.by && `· ${h.by}`} {h.note && `· ${h.note}`}</li>)}</ol>
            <ErrorNote error={err} />

            <div className="space-y-3 border-t border-slate-200 pt-4">
              {["received", "pending_review"].includes(o.status) && <>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => act("approve")}>Approve and reserve stock</Button>
                  {o.prescription?.status === "pending" && <Button variant="outline" onClick={refreshO}>Refresh after verifying</Button>}
                </div>
                {pharm && !edit && <Button variant="outline" onClick={startEdit}>Change items / substitute</Button>}
                {edit && (
                  <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
                    <div className="font-medium">Change the order</div>
                    {edit.map((l, k) => (
                      <div key={k} className="flex flex-wrap items-center gap-2">
                        <span className="min-w-40 flex-1">{l.name}{l.substituteFor && <span className="text-xs text-slate-500"> (instead of {l.substituteFor})</span>}</span>
                        <input type="number" min={0} aria-label="Quantity" className="w-20 rounded border border-slate-300 px-2 py-1" value={l.qty} onChange={(e) => setEdit(edit.map((x, j) => (j === k ? { ...x, qty: Number(e.target.value) } : x)))} />
                        <Button size="sm" variant="ghost" onClick={() => showSubs(k)}>Substitute</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEdit(edit.map((x, j) => (j === k ? { ...x, qty: 0 } : x)))}>Remove</Button>
                      </div>
                    ))}
                    {subsFor && <div className="rounded border border-slate-200 bg-white p-2 text-sm">{subsFor.list.length ? subsFor.list.map((a: any) => <button key={a._id} disabled={!a.stock} onClick={() => { setEdit(edit.map((x, j) => (j === subsFor.idx ? { ...x, product: a._id, name: `${a.brand} ${a.strength || ""}`.trim(), substituteFor: x.substituteFor || x.name } : x))); setSubsFor(null); }} className="block w-full px-2 py-1 text-left hover:bg-slate-50 disabled:opacity-40">{a.brand} {a.strength} · {money(a.price)} · {a.stock} in stock</button>) : "No substitutes with the same generic name."}</div>}
                    <Input placeholder="Reason (the customer sees this)" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
                    <div className="flex gap-2"><Button disabled={!editReason.trim()} onClick={saveEdit}>Save changes and notify customer</Button><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button></div>
                  </div>
                )}
                {pharm && <div className="flex gap-2"><Input placeholder="Reason to reject" value={reason} onChange={(e) => setReason(e.target.value)} /><Button variant="danger" disabled={!reason.trim()} onClick={() => act("reject", { reason })}>Reject and refund</Button></div>}
                {pharm && <div className="flex gap-2"><Input placeholder="Message the customer (e.g. confirm dose)" value={msg} onChange={(e) => setMsg(e.target.value)} /><Button variant="outline" disabled={!msg.trim()} onClick={() => act("message", { text: msg })}>Send</Button></div>}
                <div className="flex gap-2"><Select value={passTo} onChange={(e) => setPassTo(e.target.value)} aria-label="Pass to branch"><option value="">Pass to another branch...</option>{branches.filter((b) => b._id !== branch?._id).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select><Button variant="outline" disabled={!passTo} onClick={() => act("pass", { branch: passTo })}>Pass</Button></div>
              </>}
              {o.status === "approved" && <div className="flex gap-2"><Button onClick={() => act("pack")}>Mark packed</Button><Button variant="outline" onClick={() => act("cancel", { reason: "Cancelled by pharmacy" })}>Cancel order</Button></div>}
              {o.status === "packed" && o.fulfilment === "delivery" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select label="Assign own rider" value={rider} onChange={(e) => setRider(e.target.value)}><option value="">-</option>{riders.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}</Select>
                  <Input label="...or third-party courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier name" />
                  {!rider && courier && <div className="sm:col-span-2"><Input label="Courier tracking link (optional)" value={trackUrl} onChange={(e) => setTrackUrl(e.target.value)} /></div>}
                  <div className="sm:col-span-2"><Button disabled={!rider && !courier} onClick={() => act("dispatch", rider ? { riderId: rider } : { courierName: courier, trackingUrl: trackUrl || undefined })}>Dispatch</Button></div>
                </div>
              )}
              {o.status === "packed" && o.fulfilment === "pickup" && <div className="flex gap-2"><Input placeholder="Collected by (name)" value={recipient} onChange={(e) => setRecipient(e.target.value)} /><Button disabled={!recipient} onClick={() => act("deliver", { recipient })}>Hand over</Button></div>}
              {o.status === "out_for_delivery" && (
                <div className="space-y-2">
                  <p className="text-slate-600">With {o.rider?.name}. Customer's code: <b className="font-mono">{o.deliveryCode}</b></p>
                  <div className="flex gap-2"><Input placeholder="Recipient name" value={recipient} onChange={(e) => setRecipient(e.target.value)} /><Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} /><Button onClick={() => act("deliver", { recipient, code })}>Delivered</Button></div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
