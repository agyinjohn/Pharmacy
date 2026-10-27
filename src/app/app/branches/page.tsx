"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, daysUntil, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";

export default function Branches() {
  const { call, can, user } = useAuth();
  const list = useLoad(() => call("/branches", { branch: null }), []);
  const [f, setF] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const isOwner = user?.role === "owner";

  const save = async () => {
    setErr(null);
    try {
      const body = { ...f, deliveryZones: (f.deliveryZones || []).filter((z: any) => z.name).map((z: any) => ({ ...z, fee: Number(z.fee), etaMins: Number(z.etaMins) })) };
      if (f._id) await call(`/branches/${f._id}`, { method: "PATCH", body, branch: null }); else await call("/branches", { body, branch: null });
      setF(null); list.reload(); location.reload();
    } catch (e: any) { setErr(e.message); }
  };
  const field = (k: string, l: string, type = "text") => <Input label={l} type={type} value={type === "date" ? (f[k] || "").slice(0, 10) : f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />;

  return (
    <div>
      <PageHeader title="Branches" subtitle="Each branch has its own licence, superintendent pharmacist, hours, tax details, receipt header and delivery zones."
        actions={isOwner && <Button onClick={() => { setF({ name: "", code: "", address: "", phone: "", licenseNumber: "", licenseExpiry: "", superintendent: "", openingHours: "", taxId: "", receiptHeader: "", onlineEnabled: true, deliveryZones: [{ name: "Within 5 km", fee: 10, etaMins: 60 }], copyFrom: "" }); setErr(null); }}><Plus className="h-4 w-4" />Open a branch</Button>} />
      {list.loading && !list.data ? <Spinner /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(list.data || []).map((b: any) => { const d = daysUntil(b.licenseExpiry); return (
            <Card key={b._id} className="p-5">
              <div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">{b.name} <span className="text-sm text-slate-400">{b.code}</span></h2><p className="text-sm text-slate-500">{b.address}</p></div>{!b.active ? <Badge tone="red">Closed</Badge> : b.onlineEnabled && d !== null && d > 0 ? <Badge tone="green">Online</Badge> : <Badge tone="amber">Online off</Badge>}</div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-xs text-slate-500">Licence</dt><dd>{b.licenseNumber || "-"}</dd></div>
                <div><dt className="text-xs text-slate-500">Licence expires</dt><dd>{dateFmt(b.licenseExpiry)} {d !== null && d < 60 && <Badge tone={d < 0 ? "red" : "amber"}>{d < 0 ? "Expired" : `${d} days`}</Badge>}</dd></div>
                <div><dt className="text-xs text-slate-500">Superintendent</dt><dd>{b.superintendent || "-"}</dd></div><div><dt className="text-xs text-slate-500">Hours</dt><dd>{b.openingHours || "-"}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-slate-500">Delivery zones</dt><dd>{b.deliveryZones?.map((z: any) => `${z.name} (${money(z.fee)}, ~${z.etaMins} min)`).join(" · ") || "-"}</dd></div>
              </dl>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => { setF({ ...b }); setErr(null); }}>Edit</Button>
            </Card>); })}
        </div>
      )}
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? `Edit ${f.name}` : "Open a branch"} wide>
        {f && <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Branch name")}{!f._id && field("code", "Short code (e.g. TMA)")}{field("address", "Address")}{field("phone", "Phone")}
          {field("licenseNumber", "Facility licence number")}{field("licenseExpiry", "Licence expiry", "date")}{field("superintendent", "Superintendent pharmacist")}{field("openingHours", "Opening hours")}
          {field("taxId", "Tax ID")}{field("receiptHeader", "Receipt header")}
          {!f._id && <Select label="Copy settings from" value={f.copyFrom} onChange={(e) => setF({ ...f, copyFrom: e.target.value })}><option value="">Start blank</option>{(list.data || []).map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select>}
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.onlineEnabled} onChange={(e) => setF({ ...f, onlineEnabled: e.target.checked })} />Take online orders</label>
          {f._id && can("branch_manager") && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Branch open (untick to close, history is kept)</label>}
          <div className="sm:col-span-2"><div className="mb-1 text-sm font-medium">Delivery zones</div>
            {(f.deliveryZones || []).map((z: any, i: number) => <div key={i} className="mb-2 grid grid-cols-3 gap-2"><Input placeholder="Zone" value={z.name} onChange={(e) => setF({ ...f, deliveryZones: f.deliveryZones.map((x: any, k: number) => (k === i ? { ...x, name: e.target.value } : x)) })} /><Input placeholder="Fee" type="number" value={z.fee} onChange={(e) => setF({ ...f, deliveryZones: f.deliveryZones.map((x: any, k: number) => (k === i ? { ...x, fee: e.target.value } : x)) })} /><Input placeholder="ETA mins" type="number" value={z.etaMins} onChange={(e) => setF({ ...f, deliveryZones: f.deliveryZones.map((x: any, k: number) => (k === i ? { ...x, etaMins: e.target.value } : x)) })} /></div>)}
            <Button size="sm" variant="ghost" onClick={() => setF({ ...f, deliveryZones: [...(f.deliveryZones || []), { name: "", fee: 0, etaMins: 60 }] })}>+ Zone</Button></div>
          <div className="sm:col-span-2 space-y-3"><ErrorNote error={err} /><Button className="w-full" onClick={save}>Save branch</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
