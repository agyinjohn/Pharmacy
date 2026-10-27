"use client";
import Link from "next/link";
import { use, useState } from "react";
import { Check } from "lucide-react";
import { api, dateTime, money } from "@/lib/api";
import { useShopAuth } from "@/lib/shop";
import { useLoad } from "@/lib/useLoad";
import { Badge, Button, Card, ErrorNote, Input, Spinner, StatusBadge } from "@/components/ui";
import { ShopFooter, ShopHeader } from "@/components/ShopChrome";

const STEPS = ["received", "approved", "packed", "out_for_delivery", "delivered"];

export default function MyOrders({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const auth = useShopAuth(slug);
  const shop = useLoad(() => api(`/portal/${slug}`), [slug]);
  const orders = useLoad(() => auth.call("/portal/orders/mine"), [auth.token], !!auth.token);
  const [msg, setMsg] = useState<Record<string, string>>({}); const [err, setErr] = useState<string | null>(null);

  const cancel = async (o: any) => { if (!confirm("Cancel this order?")) return; try { await auth.call(`/portal/orders/${o._id}/cancel`, { body: {} }); orders.reload(); } catch (e: any) { setErr(e.message); } };
  const send = async (o: any) => { try { await auth.call(`/portal/orders/${o._id}/message`, { body: { text: msg[o._id] } }); setMsg({ ...msg, [o._id]: "" }); orders.reload(); } catch (e: any) { setErr(e.message); } };
  const exportData = async () => { const d = await auth.call("/portal/me/export"); const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "my-data.json"; a.click(); };

  const erasure = async () => { if (!confirm("Ask the pharmacy to erase your personal data? Records they must keep by law stay for the required period.")) return; try { const r = await auth.call("/portal/me/erasure-request", { body: {} }); alert(r.message); } catch (e: any) { setErr(e.message); } };

  return (
    <div className="min-h-screen bg-slate-50">
      <ShopHeader shop={shop.data} slug={slug} right={<Link href={`/shop/${slug}`} className="text-sm font-medium text-teal-700">Continue shopping</Link>} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-bold">My orders</h1>{auth.token && <span className="space-x-4 text-sm text-slate-500"><button onClick={exportData} className="underline">Download my data</button><button onClick={erasure} className="underline">Erase my data</button></span>}</div>
        {!auth.ready ? <Spinner /> : !auth.token ? <p className="text-slate-600">Please <Link href={`/shop/${slug}`} className="text-teal-700 underline">sign in</Link> from the store page to see your orders.</p> : (
          <>
            <ErrorNote error={err || orders.error} />
            {orders.loading && !orders.data ? <Spinner /> : (orders.data || []).map((o: any) => {
              const idx = STEPS.indexOf(o.status === "pending_review" ? "received" : o.status);
              const dead = ["cancelled", "rejected", "failed"].includes(o.status);
              return (
                <Card key={o._id} className="mb-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-mono text-sm">{o.orderNo}</span> <span className="text-xs text-slate-500">{dateTime(o.createdAt)} · {o.branch?.name}</span></div><StatusBadge s={o.status} /></div>
                  <ul className="mt-3 text-sm text-slate-700">{o.items.map((i: any, k: number) => <li key={k}>{i.qty} × {i.name} {i.requiresRx && <Badge tone="amber">Rx</Badge>}</li>)}</ul>
                  <div className="mt-2 text-sm text-slate-600">Total <b>{money(o.total)}</b> · {o.payment.method} ({o.payment.status})</div>
                  {o.status === "pending_review" && <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">A pharmacist is reviewing your prescription.</p>}
                  {o.reviewNote && dead && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-800">{o.reviewNote}</p>}
                  {!dead && (
                    <ol className="mt-4 flex items-center" aria-label="Order progress">{STEPS.map((s, i) => (
                      <li key={s} className="flex flex-1 items-center last:flex-none"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${i <= idx ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-500"}`}>{i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{i < STEPS.length - 1 && <span className={`mx-1 h-0.5 flex-1 ${i < idx ? "bg-teal-700" : "bg-slate-200"}`} />}</li>))}</ol>
                  )}
                  {!dead && <div className="mt-1 flex justify-between text-[10px] text-slate-500 sm:text-xs"><span>Received</span><span>Approved</span><span>Packed</span><span>Out for delivery</span><span>Delivered</span></div>}
                  {o.status === "out_for_delivery" && <div className="mt-3 rounded-lg bg-violet-50 p-3 text-sm text-violet-900">With {o.rider?.name}. Give the rider this code on arrival: <b className="font-mono text-lg">{o.deliveryCode}</b></div>}
                  {o.messages?.map((m: any, i: number) => <p key={i} className="mt-2 text-sm"><b>{m.from === "pharmacist" ? "Pharmacist" : "You"}:</b> {m.text}</p>)}
                  {!dead && o.status !== "delivered" && (
                    <div className="mt-3 flex gap-2"><Input placeholder="Message the pharmacist" value={msg[o._id] || ""} onChange={(e) => setMsg({ ...msg, [o._id]: e.target.value })} /><Button variant="outline" disabled={!msg[o._id]} onClick={() => send(o)}>Send</Button>{["received", "pending_review", "approved"].includes(o.status) && <Button variant="ghost" onClick={() => cancel(o)}>Cancel</Button>}</div>
                  )}
                </Card>
              );
            })}
            {orders.data && !orders.data.length && <p className="text-slate-600">No orders yet.</p>}
          </>
        )}
      </main>
      <ShopFooter shop={shop.data} branch={null} />
    </div>
  );
}
