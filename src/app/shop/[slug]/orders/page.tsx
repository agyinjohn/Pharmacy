"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
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
  const reminders = useLoad<any[]>(() => auth.call("/portal/me/reminders"), [auth.token], !!auth.token);
  const [times, setTimes] = useState<Record<string, string>>({});
  const changeReminder = async (id: string, body: any) => { setErr(null); try { await auth.call(`/portal/me/reminders/${id}`, { method: "PATCH", body }); reminders.reload(); } catch (e: any) { setErr(e.message); } };
  const [msg, setMsg] = useState<Record<string, string>>({}); const [err, setErr] = useState<string | null>(null);

  // Back from the payment page: confirm the payment with the server.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref || !auth.token || !orders.data) return;
    const o = orders.data.find((x: any) => x.payment?.reference === ref && x.payment.status === "pending");
    if (o) auth.call(`/portal/orders/${o._id}/verify-payment`, { body: {} }).then(() => orders.reload()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, orders.data?.length]);
  const cancel = async (o: any) => { if (!confirm("Cancel this order?")) return; try { await auth.call(`/portal/orders/${o._id}/cancel`, { body: {} }); orders.reload(); } catch (e: any) { setErr(e.message); } };
  const send = async (o: any) => { try { await auth.call(`/portal/orders/${o._id}/message`, { body: { text: msg[o._id] } }); setMsg({ ...msg, [o._id]: "" }); orders.reload(); } catch (e: any) { setErr(e.message); } };
  const exportData = async () => { const d = await auth.call("/portal/me/export"); const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "my-data.json"; a.click(); };

  const erasure = async () => { if (!confirm("Ask the pharmacy to erase your personal data? Records they must keep by law stay for the required period.")) return; try { const r = await auth.call("/portal/me/erasure-request", { body: {} }); alert(r.message); } catch (e: any) { setErr(e.message); } };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <ShopHeader shop={shop.data} slug={slug} right={<Link href={`/shop/${slug}`} className="text-sm font-medium text-brand-700">Continue shopping</Link>} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-semibold tracking-tight">My orders{auth.customer?.loyaltyPoints > 0 && <span className="ml-3 align-middle text-sm font-medium text-slate-700">{auth.customer.loyaltyPoints} loyalty points</span>}</h1>{auth.token && <span className="space-x-4 text-sm text-slate-500"><button onClick={exportData} className="underline">Download my data</button><button onClick={erasure} className="underline">Erase my data</button></span>}</div>
        {!auth.ready ? <Spinner /> : !auth.token ? <p className="text-slate-600">Please <Link href={`/shop/${slug}`} className="text-brand-700 underline">sign in</Link> from the store page to see your orders.</p> : (
          <>
            <ErrorNote error={err || orders.error} />
            {(reminders.data || []).length > 0 && (
              <Card className="mb-6 p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><BellRing className="h-5 w-5 text-brand-700" />My medication reminders</h2>
                <p className="text-sm text-slate-500">We send a text at these times. Pause or stop them any time.</p>
                <div className="mt-3 divide-y divide-slate-100">
                  {(reminders.data || []).map((r: any) => (
                    <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div>
                        <div className="font-medium">{r.medicine}{r.dose && <span className="font-normal text-slate-500"> · {r.dose}</span>}</div>
                        {times[r._id] !== undefined
                          ? <div className="mt-1 flex gap-2"><input aria-label="Reminder times" className="w-36 rounded border border-slate-300 px-2 py-1" value={times[r._id]} onChange={(e) => setTimes({ ...times, [r._id]: e.target.value })} /><Button size="sm" onClick={async () => { await changeReminder(r._id, { times: times[r._id].split(/[ ,;]+/).filter(Boolean).map((t) => (/^\d:\d\d$/.test(t) ? `0${t}` : t)) }); const n = { ...times }; delete n[r._id]; setTimes(n); }}>Save</Button></div>
                          : <div className="text-slate-500">{r.times.join(", ")} every day{r.endDate ? ` until ${new Date(r.endDate).toLocaleDateString("en-GB")}` : ""}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        {r.paused ? <Badge tone="amber">Paused</Badge> : <Badge tone="green">On</Badge>}
                        <Button size="sm" variant="ghost" onClick={() => setTimes({ ...times, [r._id]: r.times.join(", ") })}>Change times</Button>
                        <Button size="sm" variant="ghost" onClick={() => changeReminder(r._id, { paused: !r.paused })}>{r.paused ? "Resume" : "Pause"}</Button>
                        <Button size="sm" variant="ghost" onClick={() => confirm(`Stop reminders for ${r.medicine}?`) && changeReminder(r._id, { stop: true })}>Stop</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {orders.loading && !orders.data ? <Spinner /> : (orders.data || []).map((o: any) => {
              const idx = STEPS.indexOf(o.status === "pending_review" ? "received" : o.status);
              const dead = ["cancelled", "rejected", "failed"].includes(o.status);
              return (
                <Card key={o._id} className="mb-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-mono text-sm">{o.orderNo}</span> <span className="text-xs text-slate-500">{dateTime(o.createdAt)} · {o.branch?.name}</span></div><StatusBadge s={o.status} /></div>
                  <ul className="mt-3 text-sm text-slate-700">{o.items.map((i: any, k: number) => <li key={k}>{i.qty} × {i.name} {i.requiresRx && <Badge tone="amber">Rx</Badge>}</li>)}</ul>
                  <div className="mt-2 text-sm text-slate-600">{o.discount > 0 && <span className="text-emerald-700">You saved {money(o.discount)} · </span>}Total <b>{money(o.total)}</b>{o.payment.refundedAmount > 0 && <span> · refunded {money(o.payment.refundedAmount)}</span>} · {o.payment.method} ({o.payment.status})</div>
                  {o.status === "pending_review" && <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">A pharmacist is reviewing your prescription.</p>}
                  {o.reviewNote && dead && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-800">{o.reviewNote}</p>}
                  {!dead && (
                    <ol className="mt-4 flex items-center" aria-label="Order progress">{STEPS.map((s, i) => (
                      <li key={s} className="flex flex-1 items-center last:flex-none"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${i <= idx ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"}`}>{i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{i < STEPS.length - 1 && <span className={`mx-1 h-0.5 flex-1 ${i < idx ? "bg-slate-900" : "bg-slate-200"}`} />}</li>))}</ol>
                  )}
                  {!dead && <div className="mt-1 flex justify-between text-[10px] text-slate-500 sm:text-xs"><span>Received</span><span>Approved</span><span>Packed</span><span>Out for delivery</span><span>Delivered</span></div>}
                  {o.payment.status === "pending" && o.payment.authUrl && !dead && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Payment not completed. We are holding your items until {dateTime(o.reservedUntil)}. <a className="font-semibold underline" href={o.payment.authUrl}>Pay now</a></div>}
                  {o.status === "out_for_delivery" && o.rider?.location && <div className="mt-2 text-sm">Rider last seen {dateTime(o.rider.location.at)} · <a className="font-medium text-brand-700 underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${o.rider.location.lat}&mlon=${o.rider.location.lng}#map=16/${o.rider.location.lat}/${o.rider.location.lng}`}>View on map</a></div>}
                  {o.status === "out_for_delivery" && o.rider?.phone && <div className="mt-1 text-sm">Call rider: <a className="text-brand-700 underline" href={`tel:${o.rider.phone}`}>{o.rider.phone}</a></div>}
                  {o.status === "out_for_delivery" && o.rider?.trackingUrl && <div className="mt-1 text-sm"><a className="text-brand-700 underline" target="_blank" rel="noreferrer" href={o.rider.trackingUrl}>Courier tracking</a></div>}
                  {o.status === "out_for_delivery" && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-900">With {o.rider?.name}. Give the rider this code on arrival: <b className="font-mono text-lg">{o.deliveryCode}</b></div>}
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
