"use client";
import { useEffect, useState } from "react";
import { Bike, CheckCircle2, FileText, MapPin, Navigation, Phone, RefreshCw, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime, money } from "@/lib/api";
import { Button, Card, ErrorNote, Input, Select, Spinner } from "@/components/ui";

const FAIL_REASONS = ["Customer not reachable", "Wrong or unclear address", "Customer refused the order", "Customer not at home", "Other"];

// Phone-first screen for riders: only their own deliveries that are on the way.
export default function Rider() {
  const { call, user } = useAuth();
  const { data, loading, error, reload } = useLoad<any[]>(() => call("/rider/tasks", { branch: null }), []);
  const [step, setStep] = useState<Record<string, "deliver" | "fail" | undefined>>({});
  const [form, setForm] = useState<Record<string, { recipient: string; code: string; reason: string; note: string }>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // New deliveries appear without a manual refresh.
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t); }, [reload]);

  // Share this phone's position with the customer while deliveries are in progress (CP-DEL-05).
  const [sharing, setSharing] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  useEffect(() => {
    if (!sharing || !data?.length || !("geolocation" in navigator)) return;
    const send = () => navigator.geolocation.getCurrentPosition((pos) => {
      data.forEach((o: any) => call(`/orders/${o._id}/location`, { body: { lat: pos.coords.latitude, lng: pos.coords.longitude }, branch: null }).catch(() => {}));
      setLastSent(new Date());
    }, () => { setSharing(false); setErr("Location is blocked on this phone. Allow location for this site to share it."); }, { enableHighAccuracy: true, maximumAge: 15000 });
    send(); const t = setInterval(send, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharing, data]);

  const f = (o: any) => form[o._id] || { recipient: o.customer?.name || "", code: "", reason: FAIL_REASONS[0], note: "" };
  const set = (o: any, patch: any) => setForm({ ...form, [o._id]: { ...f(o), ...patch } });
  const toCollect = (o: any) => (o.payment?.method === "cod" && o.payment?.status !== "paid" ? o.total : 0) + (o.deliveryFee || 0);

  const finish = async (o: any, path: "deliver" | "fail", body: any, message: string) => {
    setErr(null); setBusy(o._id);
    try { await call(`/orders/${o._id}/${path}`, { body, branch: o.branch?._id }); setDone(message); setStep({ ...step, [o._id]: undefined }); reload(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };

  const list = data || [];
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My deliveries</h1>
          <p className="text-sm text-slate-500">{user?.role === "dispatcher" ? "Orders assigned to you that are on the way." : "All orders out for delivery."}</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {done && <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{done}</div>}
      <ErrorNote error={error || err} />

      {list.length > 0 && (
        <label className="mb-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <span>
            <span className="block text-sm font-medium text-slate-900">Share my location with customers</span>
            <span className="block text-xs text-slate-500">{sharing ? (lastSent ? `On · last sent ${lastSent.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "On · finding your location…") : "Off · customers see where you are while it is on"}</span>
          </span>
          <button type="button" role="switch" aria-checked={sharing} onClick={() => setSharing(!sharing)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${sharing ? "bg-brand-700" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${sharing ? "left-[22px]" : "left-0.5"}`} /></button>
        </label>
      )}

      {loading && !data ? <Spinner /> : list.map((o: any) => {
        const amount = toCollect(o); const rx = o.items.some((i: any) => i.requiresRx); const mode = step[o._id];
        const mapUrl = o.address?.digitalAddress || o.address?.line ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([o.address?.line, o.address?.digitalAddress].filter(Boolean).join(", "))}` : null;
        return (
          <Card key={o._id} className="mb-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
              <span className="font-medium tabular-nums tracking-wide text-slate-700">{o.orderNo}</span>
              <span>From {o.branch?.name}{o.history?.length ? ` · sent ${dateTime(o.history[o.history.length - 1].at)}` : ""}</span>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">{o.customer?.name}</div>
                <div className="mt-1 flex items-start gap-2 text-sm text-slate-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{o.address?.line || "No address given"}{o.address?.digitalAddress && <span className="text-slate-500"> · {o.address.digitalAddress}</span>}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${o.customer?.phone}`} className="flex items-center justify-center gap-2 rounded-md border border-slate-300 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"><Phone className="h-4 w-4" />Call</a>
                {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-md border border-slate-300 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"><Navigation className="h-4 w-4" />Directions</a> : <span />}
              </div>

              <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${amount > 0 ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-600"}`}>
                <span>{amount > 0 ? "Collect from the customer" : "Nothing to collect"}</span>
                <span className="font-semibold tabular-nums">{amount > 0 ? money(amount) : "Paid"}</span>
              </div>
              {amount > 0 && o.deliveryFee > 0 && <p className="-mt-3 text-xs text-slate-500">Includes the GH₵ {Number(o.deliveryFee).toFixed(2)} delivery fee{o.payment?.method === "cod" ? " and the order total" : ""}.</p>}

              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">In the bag</div>
                <ul className="space-y-0.5 text-sm text-slate-700">{o.items.map((i: any, k: number) => <li key={k}>{i.qty} × {i.name}</li>)}</ul>
                {rx && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800"><FileText className="h-3.5 w-3.5" />Contains prescription medicine: hand it only to the customer named on the order.</p>}
              </div>

              {mode === "deliver" ? (
                <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <Input label="Received by" value={f(o).recipient} onChange={(e) => set(o, { recipient: e.target.value })} />
                  <Input label="Customer's 4-digit code" inputMode="numeric" maxLength={4} placeholder="0000" hint="Ask the customer for it" className="text-center text-lg tracking-[0.5em]" value={f(o).code} onChange={(e) => set(o, { code: e.target.value.replace(/\D/g, "") })} />
                  <div className="flex gap-2"><Button variant="outline" onClick={() => setStep({ ...step, [o._id]: undefined })}>Back</Button><Button className="flex-1" size="lg" loading={busy === o._id} disabled={!f(o).recipient.trim() || f(o).code.length !== 4} onClick={() => finish(o, "deliver", { recipient: f(o).recipient, code: f(o).code }, `${o.orderNo} delivered.`)}><CheckCircle2 className="h-4 w-4" />Confirm delivered</Button></div>
                </div>
              ) : mode === "fail" ? (
                <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <Select label="What happened?" value={f(o).reason} onChange={(e) => set(o, { reason: e.target.value })}>{FAIL_REASONS.map((r) => <option key={r}>{r}</option>)}</Select>
                  <Input label="Note (optional)" placeholder="e.g. Called twice, no answer" value={f(o).note} onChange={(e) => set(o, { note: e.target.value })} />
                  <p className="text-xs text-slate-500">Bring the order back to {o.branch?.name}. The pharmacy will contact the customer.</p>
                  <div className="flex gap-2"><Button variant="outline" onClick={() => setStep({ ...step, [o._id]: undefined })}>Back</Button><Button className="flex-1" variant="danger" loading={busy === o._id} onClick={() => finish(o, "fail", { reason: [f(o).reason, f(o).note].filter(Boolean).join(": "), restock: false }, `${o.orderNo} marked as not delivered.`)}>Mark not delivered</Button></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button size="lg" onClick={() => { setDone(null); setStep({ ...step, [o._id]: "deliver" }); }}><CheckCircle2 className="h-4 w-4" />Delivered</Button>
                  <Button variant="outline" size="lg" onClick={() => { setDone(null); setStep({ ...step, [o._id]: "fail" }); }}><XCircle className="h-4 w-4" />Not delivered</Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {data && !list.length && (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100"><Bike className="h-6 w-6 text-slate-500" /></span>
          <p className="mt-3 font-medium text-slate-900">No deliveries right now</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">When the pharmacy sends an order out with you, it appears here with the address and what to collect.</p>
        </Card>
      )}
    </div>
  );
}
