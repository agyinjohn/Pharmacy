"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { BellRing, Bike, Check, MapPin, Phone } from "lucide-react";
import ProductImage from "@/components/ProductImage";
import { api, dateTime, money } from "@/lib/api";
import { useShopAuth } from "@/lib/shop";
import { useLoad } from "@/lib/useLoad";
import { Badge, Button, Card, ErrorNote, Input, Spinner, StatusBadge } from "@/components/ui";
import { ShopFooter, ShopHeader } from "@/components/ShopChrome";

const STEPS = ["received", "approved", "packed", "out_for_delivery", "delivered"];
const STEP_LABEL = ["Received", "Approved", "Packed", "On the way", "Delivered"];
const DONE = ["delivered", "collected", "cancelled", "rejected", "failed", "refunded"];
const PAY: Record<string, string> = { momo: "Mobile money", card: "Card", cod: "Pay on delivery", cash: "Cash" };
const payText = (p: any) => `${PAY[p.method] || p.method}${p.status === "paid" ? " · Paid" : p.status === "pending" ? " · Not paid yet" : p.status ? ` · ${p.status}` : ""}`;

function Items({ o }: { o: any }) {
  return (
    <ul className="mt-4 space-y-2">
      {o.items.map((i: any, k: number) => (
        <li key={k} className="flex items-center gap-3 text-sm">
          <ProductImage product={{ brand: i.name, imageUrl: i.imageUrl }} size="xs" className="h-9 w-9 shrink-0 rounded-md border border-slate-200" />
          <span className="flex-1 text-slate-800">{i.name}{i.requiresRx && <span className="ml-2"><Badge tone="amber">Prescription</Badge></span>}</span>
          <span className="text-slate-500 tabular-nums">× {i.qty}</span>
        </li>
      ))}
    </ul>
  );
}

function Summary({ o }: { o: any }) {
  return (
    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
      <span className="text-slate-500">{payText(o.payment)}{o.payment.refundedAmount > 0 && ` · Refunded ${money(o.payment.refundedAmount)}`}</span>
      <span>{o.discount > 0 && <span className="mr-2 text-xs text-emerald-700">Saved {money(o.discount)}</span>}<b className="text-base tabular-nums">{money(o.total)}</b></span>
    </div>
  );
}

function CurrentOrder({ o, msg, setMsg, send, cancel }: { o: any; msg: string; setMsg: (v: string) => void; send: () => void; cancel: () => void }) {
  const idx = STEPS.indexOf(o.status === "pending_review" ? "received" : o.status === "ready" ? "packed" : o.status);
  const out = o.status === "out_for_delivery";
  const loc = o.rider?.location;
  return (
    <Card className="mb-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><div className="font-semibold text-slate-900">Order {o.orderNo}</div><div className="text-xs text-slate-500">{dateTime(o.createdAt)} · {o.branch?.name}</div></div>
        <StatusBadge s={o.status} />
      </div>
      <ol className="mt-5 grid grid-cols-5" aria-label="Order progress">
        {STEPS.map((s, i) => (
          <li key={s} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${i <= idx ? "bg-brand-700" : "bg-slate-200"}`} />}
            <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full text-xs ${i < idx ? "bg-brand-700 text-white" : i === idx ? "bg-brand-700 text-white ring-4 ring-brand-100" : "border border-slate-300 bg-white text-slate-400"}`}>{i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className={`mt-1.5 text-[11px] sm:text-xs ${i === idx ? "font-medium text-slate-900" : "text-slate-500"}`}>{STEP_LABEL[i]}</span>
          </li>
        ))}
      </ol>
      {o.status === "pending_review" && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">A pharmacist is checking your prescription. We will text you when it is approved.</p>}
      {o.payment.status === "pending" && o.payment.authUrl && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Payment not completed. We are holding your items until {dateTime(o.reservedUntil)}. <a className="font-semibold underline" href={o.payment.authUrl}>Pay now</a></div>}
      {out && (
        <div className="mt-5 rounded-lg border border-brand-100 bg-brand-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand-700"><Bike className="h-5 w-5" /></span>
              <div><div className="font-medium text-slate-900">{o.rider?.name || "Your rider"} is on the way</div>{loc && <div className="text-xs text-slate-500">Last seen {dateTime(loc.at)}</div>}</div>
            </div>
            <div className="text-right"><div className="text-xs text-slate-500">Delivery code</div><div className="font-mono text-2xl font-semibold tracking-widest text-slate-900">{o.deliveryCode}</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {o.rider?.phone && <a href={`tel:${o.rider.phone}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"><Phone className="h-4 w-4" />Call rider</a>}
            {loc && <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"><MapPin className="h-4 w-4" />View on map</a>}
            {o.rider?.trackingUrl && <a target="_blank" rel="noreferrer" href={o.rider.trackingUrl} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50">Courier tracking</a>}
          </div>
          <p className="mt-2 text-xs text-slate-500">Give the rider this code when your order arrives.</p>
        </div>
      )}
      <Items o={o} />
      <Summary o={o} />
      {o.messages?.length > 0 && <div className="mt-4 space-y-2">{o.messages.map((m: any, i: number) => <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from === "pharmacist" ? "bg-slate-100 text-slate-800" : "ml-auto bg-brand-700 text-white"}`}><div className="text-[11px] opacity-70">{m.from === "pharmacist" ? "Pharmacist" : "You"}</div>{m.text}</div>)}</div>}
      <div className="mt-4 flex gap-2">
        <div className="flex-1"><Input placeholder="Message the pharmacist" value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
        <Button variant="outline" disabled={!msg} onClick={send}>Send</Button>
        {["received", "pending_review", "approved"].includes(o.status) && <Button variant="ghost" onClick={cancel}>Cancel order</Button>}
      </div>
    </Card>
  );
}

function PastOrder({ o }: { o: any }) {
  const dead = ["cancelled", "rejected", "failed"].includes(o.status);
  return (
    <Card className="mb-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><div className="font-semibold text-slate-900">Order {o.orderNo}</div><div className="text-xs text-slate-500">{dateTime(o.createdAt)} · {o.branch?.name}</div></div>
        <StatusBadge s={o.status} />
      </div>
      {o.reviewNote && dead && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{o.reviewNote}</p>}
      <Items o={o} />
      <Summary o={o} />
    </Card>
  );
}

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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-semibold tracking-tight">My orders</h1>{auth.customer?.name && <p className="text-sm text-slate-500">Signed in as {auth.customer.name}</p>}</div>
          {auth.customer?.loyaltyPoints > 0 && <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right"><div className="text-lg font-semibold leading-tight tabular-nums">{auth.customer.loyaltyPoints}</div><div className="text-xs text-slate-500">loyalty points</div></div>}
        </div>
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
            {orders.loading && !orders.data ? <Spinner /> : (["current", "past"] as const).map((group) => {
              const list = (orders.data || []).filter((o: any) => (group === "past") === DONE.includes(o.status));
              if (!list.length) return null;
              return (
                <section key={group} className="mb-8">
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">{group === "current" ? "In progress" : "Past orders"}</h2>
                  {list.map((o: any) => group === "current" ? <CurrentOrder key={o._id} o={o} msg={msg[o._id] || ""} setMsg={(v) => setMsg({ ...msg, [o._id]: v })} send={() => send(o)} cancel={() => cancel(o)} /> : <PastOrder key={o._id} o={o} />)}
                </section>
              );
            })}
            {orders.data && !orders.data.length && <Card className="p-8 text-center text-slate-600">No orders yet. <Link href={`/shop/${slug}`} className="font-medium text-brand-700 underline">Start shopping</Link></Card>}
            <div className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">Your data: <button onClick={exportData} className="underline hover:text-slate-800">download a copy</button> · <button onClick={erasure} className="underline hover:text-slate-800">ask us to erase it</button></div>
          </>
        )}
      </main>
      <ShopFooter shop={shop.data} branch={null} />
    </div>
  );
}
