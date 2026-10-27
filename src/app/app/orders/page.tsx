"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRightLeft, Phone, Bike, CheckCircle2, FileText, MessageSquare, Package, PencilLine } from "lucide-react";
import ProductImage from "@/components/ProductImage";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Table, Td, Ref, Tabs, humanize } from "@/components/ui";

const PAY: Record<string, string> = { momo: "Mobile money", card: "Card", cod: "Pay on delivery" };
const FOOTER = ["received", "pending_review", "approved", "packed", "out_for_delivery"];
const TABS: [string, string][] = [["pending_review,received", "To review"], ["approved", "To pack"], ["packed", "Ready"], ["out_for_delivery", "Out for delivery"], ["delivered,failed,cancelled,rejected", "Closed"]];

export default function Orders() {
  const { call, user, branch } = useAuth();
  const [tab, setTab] = useState(TABS[0][0]);
  const list = useLoad(() => call(`/orders?status=${tab}`), [tab, branch?._id]);
  const alerts = useLoad<any>(() => call("/orders/alerts"), [branch?._id, list.data]);
  const [o, setO] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [riders, setRiders] = useState<any[]>([]); const [rider, setRider] = useState(""); const [courier, setCourier] = useState(""); const [trackUrl, setTrackUrl] = useState("");
  const [reason, setReason] = useState(""); const [msg, setMsg] = useState(""); const [code, setCode] = useState(""); const [recipient, setRecipient] = useState("");
  const [passTo, setPassTo] = useState(""); const [fee, setFee] = useState(""); const [mode, setMode] = useState<null | "edit" | "message" | "pass" | "reject">(null);
  // Pharmacist edit: change quantities, remove items, substitute products (CP-ORD-03).
  const [edit, setEdit] = useState<any[] | null>(null); const [editReason, setEditReason] = useState("");
  const [subsFor, setSubsFor] = useState<{ idx: number; list: any[] } | null>(null);
  const startEdit = () => { setEdit(o.items.map((i: any) => ({ product: i.product, name: i.name, qty: i.qty, unitPrice: i.unitPrice, requiresRx: i.requiresRx }))); setEditReason(""); };
  const showSubs = async (idx: number) => setSubsFor({ idx, list: await call(`/products/${edit![idx].product}/alternatives`) });
  const saveEdit = async () => { const r = await act("edit", { lines: edit!.map((l) => ({ product: l.product, qty: l.qty })), reason: editReason }); if (r) { setEdit(null); setMode(null); } };
  const { branches } = useAuth();
  const pharm = user?.role === "pharmacist" || user?.role === "owner";

  const open = async (id: string) => { setErr(null); setFee(""); setEdit(null); setMode(null); setRecipient(""); setCode(""); setSubsFor(null); setO(await call(`/orders/${id}`)); setRiders(await call("/riders").catch(() => [])); };
  const act = async (path: string, body: any = {}) => { setErr(null); try { const r = await call(`/orders/${o._id}/${path}`, { body }); setO(r); list.reload(); setReason(""); setMsg(""); return r; } catch (e: any) { setErr(e.message); } };
  const refreshO = async () => setO(await call(`/orders/${o._id}`));

  return (
    <div>
      <PageHeader title="Online orders" subtitle={`${branch?.name} - review, pack, dispatch and deliver`} />
      <Card className="p-4">
        <Tabs value={tab} onChange={setTab} items={TABS.map(([v, l]) => [v, l, v === TABS[0][0] ? (alerts.data ? alerts.data.pendingReview + alerts.data.awaitingApproval : 0) : v === "packed" ? alerts.data?.readyToDispatch : v === "out_for_delivery" ? alerts.data?.outForDelivery : 0] as [string, string, number?])} />
        <ErrorNote error={list.error} />
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Order", "Customer", "Items", "Fulfilment", "Payment", "Total", "Status", "Placed", ""]} empty="No orders in this stage">
            {(list.data || []).map((x: any) => (
              <tr key={x._id}>
                <Td><Ref>{x.orderNo}</Ref></Td><Td className="font-medium">{x.customer?.name}</Td>
                <Td>{x.items.length} {x.items.some((i: any) => i.requiresRx) && <Badge tone="amber">Rx</Badge>}</Td>
                <Td>{x.fulfilment === "pickup" ? "Pickup" : "Delivery"}</Td><Td className="whitespace-nowrap"><StatusBadge s={x.payment.status} /> <span className="text-xs text-slate-500">{({ momo: "MoMo", card: "Card", cod: "On delivery" } as any)[x.payment.method]}</span></Td>
                <Td className="whitespace-nowrap tabular-nums">{money(x.total)}</Td><Td><StatusBadge s={x.status} /></Td><Td>{dateTime(x.createdAt)}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => open(x._id)}>View</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!o} onClose={() => setO(null)} title={`Order ${o?.orderNo || ""}`} wide>
        {o && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge s={o.status} />
              <Badge tone="slate">{o.fulfilment === "pickup" ? "Pickup" : "Delivery"}</Badge>
              <span className="text-slate-600">{PAY[o.payment.method] || o.payment.method} · <span className={o.payment.status === "paid" ? "text-emerald-700" : "text-slate-600"}>{humanize(o.payment.status)}</span></span>
              <span className="ml-auto text-xs text-slate-500">Placed {dateTime(o.createdAt)}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{o.customer?.name}</div>
                <div className="text-slate-600">{o.customer?.phone}</div>
                {o.customer?.allergies?.length > 0 && <div className="mt-2 flex items-center gap-1.5 text-red-700"><AlertTriangle className="h-4 w-4" />Allergic to <b>{o.customer.allergies.join(", ")}</b></div>}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{o.fulfilment === "delivery" ? "Deliver to" : "Pickup at"}</div>
                <div className="mt-1 text-slate-900">{o.fulfilment === "delivery" ? o.address?.line : o.branch?.name}</div>
                {o.fulfilment === "delivery" && <div className="text-slate-600">{[o.address?.zone, o.address?.digitalAddress].filter(Boolean).join(" · ")}</div>}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              {o.items.map((i: any, k: number) => (
                <div key={k} className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0">
                  <ProductImage product={{ brand: i.name, imageUrl: i.imageUrl }} size="xs" className="h-9 w-9 shrink-0 rounded-md border border-slate-200" />
                  <div className="min-w-0 flex-1"><span className="font-medium text-slate-900">{i.name}</span>{i.requiresRx && <span className="ml-2"><Badge tone="amber">Prescription</Badge></span>}<div className="text-xs text-slate-500">{i.qty} × {money(i.unitPrice)}</div></div>
                  <div className="tabular-nums">{money(i.unitPrice * i.qty)}</div>
                </div>
              ))}
              <div className="space-y-1 bg-slate-50 px-4 py-3">
                {o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Promotions</span><span className="tabular-nums">-{money(o.discount)}</span></div>}
                {o.fulfilment === "delivery" && <div className="flex justify-between text-slate-600"><span>Delivery</span><span className={o.deliveryFee ? "tabular-nums" : "text-slate-500"}>{o.deliveryFee ? `${money(o.deliveryFee)}, paid on delivery` : "Not agreed yet"}</span></div>}
                {o.fulfilment === "delivery" && (o.deliveryFee > 0 || o.payment.method === "cod") && <div className="flex justify-between text-slate-600"><span>To collect on delivery</span><span className="font-medium tabular-nums text-slate-900">{money((o.payment.method === "cod" && o.payment.status !== "paid" ? o.total : 0) + (o.deliveryFee || 0))}</span></div>}
                <div className="flex justify-between text-base font-semibold"><span>{o.fulfilment === "delivery" ? "Total for items" : "Total"}</span><span className="tabular-nums">{money(o.total)}</span></div>
                {o.payment.refundedAmount > 0 && <div className="flex justify-between text-slate-500"><span>Refunded</span><span className="tabular-nums">{money(o.payment.refundedAmount)}</span></div>}
              </div>
            </div>

            {o.fulfilment === "delivery" && !["delivered", "cancelled", "rejected", "failed"].includes(o.status) && (
              <div className="rounded-lg border border-slate-200 p-3 text-slate-700">
                <div className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{o.deliveryFee ? "Delivery fee agreed." : <>Call <a href={`tel:${o.customer?.phone}`} className="font-medium underline">{o.customer?.phone}</a> to agree the delivery fee and time, then record the fee here.</>}</span></div>
                <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
                  <div className="w-36"><Input aria-label="Agreed delivery fee" type="number" min={0} step="0.5" placeholder="Fee (GH₵)" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
                  <Button size="sm" variant="outline" disabled={fee === "" || Number(fee) === (o.deliveryFee || 0)} onClick={() => act("delivery-fee", { fee: Number(fee) })}>{o.deliveryFee ? "Update fee" : "Save fee"}</Button>
                  {o.deliveryFee > 0 && <span className="text-xs text-slate-500">Customer was sent a text with the fee.</span>}
                </div>
              </div>
            )}
            {o.prescription && (o.prescription.status === "pending"
              ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" />Prescription {o.prescription.rxNo} needs verifying first</div><div className="flex gap-2"><Link href="/app/prescriptions" className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100">Open prescriptions</Link><Button size="sm" variant="outline" onClick={refreshO}>Check again</Button></div></div>
                  {o.prescription.image && <img src={o.prescription.image} alt="Uploaded prescription" className="mt-3 max-h-56 rounded border bg-white" />}
                </div>
              : <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-slate-700"><CheckCircle2 className="h-4 w-4 text-brand-600" />Prescription {o.prescription.rxNo} <StatusBadge s={o.prescription.status} /></div>)}

            {o.status === "out_for_delivery" && <div className="flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50 p-3"><span className="flex items-center gap-2 text-slate-800"><Bike className="h-4 w-4" />With {o.rider?.name || o.courier?.name || "rider"}</span><span className="text-slate-600">Customer's code <b className="ml-1 font-mono text-base text-slate-900">{o.deliveryCode}</b></span></div>}

            {o.messages?.length > 0 && <div className="space-y-2">{o.messages.map((m: any, i: number) => <div key={i} className={`max-w-[80%] rounded-lg px-3 py-2 ${m.from === "customer" ? "bg-slate-100 text-slate-800" : "ml-auto bg-brand-700 text-white"}`}><div className="text-[11px] opacity-70">{m.from === "customer" ? o.customer?.name || "Customer" : "Pharmacy"}</div>{m.text}</div>)}</div>}

            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer select-none">Activity ({o.history.length})</summary>
              <ol className="mt-2 space-y-1 border-l-2 border-slate-200 pl-3">{o.history.map((h: any, i: number) => <li key={i}>{dateTime(h.at)} · {humanize(h.status)}{h.by && ` · ${h.by}`}{h.note && ` · ${h.note}`}</li>)}</ol>
            </details>
            <ErrorNote error={err} />

            {mode === "edit" && edit && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="font-medium text-slate-900">Change the order</div>
                {edit.map((l, k) => (
                  <div key={k} className={`flex flex-wrap items-center gap-2 ${l.qty === 0 ? "opacity-50" : ""}`}>
                    <span className="min-w-40 flex-1">{l.name}{l.substituteFor && <span className="text-xs text-slate-500"> (instead of {l.substituteFor})</span>}</span>
                    <input type="number" min={0} aria-label="Quantity" className="w-20 rounded-md border border-slate-300 px-2 py-1.5" value={l.qty} onChange={(e) => setEdit(edit.map((x, j) => (j === k ? { ...x, qty: Number(e.target.value) } : x)))} />
                    <Button size="sm" variant="outline" onClick={() => showSubs(k)}>Substitute</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEdit(edit.map((x, j) => (j === k ? { ...x, qty: 0 } : x)))}>Remove</Button>
                  </div>
                ))}
                {subsFor && <div className="rounded-md border border-slate-200 bg-slate-50 p-1">{subsFor.list.length ? subsFor.list.map((a: any) => <button key={a._id} disabled={!a.stock} onClick={() => { setEdit(edit.map((x, j) => (j === subsFor.idx ? { ...x, product: a._id, name: `${a.brand} ${a.strength || ""}`.trim(), substituteFor: x.substituteFor || x.name } : x))); setSubsFor(null); }} className="flex w-full justify-between rounded px-2 py-1.5 text-left hover:bg-white disabled:opacity-40"><span>{a.brand} {a.strength}</span><span className="text-slate-500">{money(a.price)} · {a.stock} in stock</span></button>) : <p className="p-2 text-slate-500">No substitutes with the same generic name.</p>}</div>}
                <Input placeholder="Reason (the customer sees this)" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setEdit(null); setMode(null); }}>Cancel</Button><Button disabled={!editReason.trim()} onClick={saveEdit}>Save and notify customer</Button></div>
              </div>
            )}
            {mode === "message" && <div className="flex gap-2"><div className="flex-1"><Input autoFocus placeholder="Message the customer (e.g. confirm the dose)" value={msg} onChange={(e) => setMsg(e.target.value)} /></div><Button variant="outline" onClick={() => setMode(null)}>Cancel</Button><Button disabled={!msg.trim()} onClick={async () => { if (await act("message", { text: msg })) setMode(null); }}>Send</Button></div>}
            {mode === "pass" && <div className="flex gap-2"><div className="flex-1"><Select value={passTo} onChange={(e) => setPassTo(e.target.value)} aria-label="Pass to branch"><option value="">Choose a branch...</option>{branches.filter((b) => b._id !== branch?._id).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select></div><Button variant="outline" onClick={() => setMode(null)}>Cancel</Button><Button disabled={!passTo} onClick={async () => { if (await act("pass", { branch: passTo })) setMode(null); }}>Pass order</Button></div>}
            {mode === "reject" && <div className="flex gap-2"><div className="flex-1"><Input autoFocus placeholder="Reason (the customer sees this)" value={reason} onChange={(e) => setReason(e.target.value)} /></div><Button variant="outline" onClick={() => setMode(null)}>Cancel</Button><Button variant="danger" disabled={!reason.trim()} onClick={async () => { if (await act("reject", { reason })) setMode(null); }}>Reject and refund</Button></div>}

            {o.status === "packed" && o.fulfilment === "delivery" && (
              <div className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
                <Select label="Our rider" value={rider} onChange={(e) => setRider(e.target.value)}><option value="">Choose...</option>{riders.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}</Select>
                <Input label="Or a courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier name" />
                {!rider && courier && <div className="sm:col-span-2"><Input label="Courier tracking link (optional)" value={trackUrl} onChange={(e) => setTrackUrl(e.target.value)} /></div>}
              </div>
            )}
            {o.status === "packed" && o.fulfilment === "pickup" && <Input label="Collected by" placeholder="Name of the person collecting" value={recipient} onChange={(e) => setRecipient(e.target.value)} />}
            {o.status === "out_for_delivery" && <div className="grid gap-3 sm:grid-cols-2"><Input label="Received by" placeholder="Recipient name" value={recipient} onChange={(e) => setRecipient(e.target.value)} /><Input label="Code from the customer" placeholder="4 digits" value={code} onChange={(e) => setCode(e.target.value)} /></div>}

            {!mode && FOOTER.includes(o.status) && (
              <div className="-mx-5 -mb-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap gap-1">
                  {["received", "pending_review"].includes(o.status) && pharm && <>
                    <Button variant="ghost" size="sm" onClick={() => { startEdit(); setMode("edit"); }}><PencilLine className="h-4 w-4" />Change items</Button>
                    <Button variant="ghost" size="sm" onClick={() => setMode("message")}><MessageSquare className="h-4 w-4" />Message</Button>
                    <Button variant="ghost" size="sm" onClick={() => setMode("pass")}><ArrowRightLeft className="h-4 w-4" />Pass to branch</Button>
                    <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => setMode("reject")}>Reject</Button>
                  </>}
                  {o.status === "approved" && <Button variant="ghost" size="sm" onClick={() => confirm("Cancel this order and release the stock?") && act("cancel", { reason: "Cancelled by pharmacy" })}>Cancel order</Button>}
                </div>
                {["received", "pending_review"].includes(o.status) && <Button disabled={o.prescription?.status === "pending"} onClick={() => act("approve")}><CheckCircle2 className="h-4 w-4" />Approve and reserve stock</Button>}
                {o.status === "approved" && <Button onClick={() => act("pack")}><Package className="h-4 w-4" />Mark packed</Button>}
                {o.status === "packed" && o.fulfilment === "delivery" && <Button disabled={!rider && !courier} onClick={() => act("dispatch", rider ? { riderId: rider } : { courierName: courier, trackingUrl: trackUrl || undefined })}><Bike className="h-4 w-4" />Dispatch</Button>}
                {o.status === "packed" && o.fulfilment === "pickup" && <Button disabled={!recipient} onClick={() => act("deliver", { recipient })}>Hand over</Button>}
                {o.status === "out_for_delivery" && <Button onClick={() => act("deliver", { recipient, code })}><CheckCircle2 className="h-4 w-4" />Confirm delivered</Button>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
