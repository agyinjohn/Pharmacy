"use client";
import { useEffect, useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, PageHeader, Spinner } from "@/components/ui";

// Mobile-first view for riders: only their own assigned deliveries.
export default function Rider() {
  const { call } = useAuth();
  const { data, loading, error, reload } = useLoad(() => call("/rider/tasks", { branch: null }), []);
  const [form, setForm] = useState<Record<string, { recipient: string; code: string; reason: string }>>({});
  const [err, setErr] = useState<string | null>(null);
  // Share this phone's position with the customer while deliveries are in progress (CP-DEL-05).
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    if (!sharing || !data?.length || !("geolocation" in navigator)) return;
    const send = () => navigator.geolocation.getCurrentPosition((pos) => {
      data.forEach((o: any) => call(`/orders/${o._id}/location`, { body: { lat: pos.coords.latitude, lng: pos.coords.longitude }, branch: null }).catch(() => {}));
    }, () => setSharing(false), { enableHighAccuracy: true, maximumAge: 15000 });
    send(); const t = setInterval(send, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharing, data]);
  const f = (id: string) => form[id] || { recipient: "", code: "", reason: "" };
  const set = (id: string, k: string, v: string) => setForm({ ...form, [id]: { ...f(id), [k]: v } });

  const deliver = async (o: any) => { setErr(null); try { await call(`/orders/${o._id}/deliver`, { body: { recipient: f(o._id).recipient, code: f(o._id).code }, branch: o.branch._id }); reload(); } catch (e: any) { setErr(e.message); } };
  const fail = async (o: any) => { setErr(null); try { await call(`/orders/${o._id}/fail`, { body: { reason: f(o._id).reason, restock: false }, branch: o.branch._id }); reload(); } catch (e: any) { setErr(e.message); } };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="My deliveries" subtitle="Assigned to you. Ask the customer for their 4-digit code on arrival." />
      {data && data.length > 0 && <label className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 p-3 text-sm"><input type="checkbox" checked={sharing} onChange={(e) => setSharing(e.target.checked)} />Share my live location with customers while I deliver</label>}
      <ErrorNote error={error || err} />
      {loading && !data ? <Spinner /> : (data || []).map((o: any) => (
        <Card key={o._id} className="mb-4 p-4">
          <div className="flex items-center justify-between"><span className="font-mono text-xs">{o.orderNo}</span>{o.items.some((i: any) => i.requiresRx) && <Badge tone="amber">Prescription - hand to the verified recipient only</Badge>}</div>
          <div className="mt-2 text-lg font-semibold">{o.customer?.name}</div>
          <a href={`tel:${o.customer?.phone}`} className="mt-1 flex items-center gap-2 text-sm text-teal-700"><Phone className="h-4 w-4" />{o.customer?.phone}</a>
          <div className="mt-1 flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>{o.address?.line} {o.address?.digitalAddress && `(${o.address.digitalAddress})`}</span></div>
          <div className="mt-2 text-sm text-slate-600">Pickup from {o.branch?.name} · {o.items.length} item(s){o.payment.method === "cod" && <b> · Collect {money(o.total)} cash</b>}</div>
          <div className="mt-3 grid gap-2"><Input placeholder="Recipient name" value={f(o._id).recipient} onChange={(e) => set(o._id, "recipient", e.target.value)} /><Input placeholder="Customer's code" inputMode="numeric" value={f(o._id).code} onChange={(e) => set(o._id, "code", e.target.value)} /><Button size="lg" onClick={() => deliver(o)}>Confirm delivered</Button>
            <div className="flex gap-2"><Input placeholder="Reason if failed" value={f(o._id).reason} onChange={(e) => set(o._id, "reason", e.target.value)} /><Button variant="danger" disabled={!f(o._id).reason} onClick={() => fail(o)}>Failed</Button></div></div>
        </Card>
      ))}
      {data && !data.length && <p className="py-12 text-center text-slate-500">No deliveries assigned right now.</p>}
    </div>
  );
}
