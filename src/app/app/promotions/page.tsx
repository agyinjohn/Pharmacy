"use client";
import { useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";

const offer = (p: any) => (p.type === "percent" ? `${p.value}% off` : p.type === "fixed" ? `GH₵ ${Number(p.value).toFixed(2)} off` : `Buy ${p.buyQty}, get ${p.getQty} free`);
const where = (c: string) => (c === "both" ? "at the till and online" : c === "pos" ? "at the till only" : "online only");
const blank = { name: "", type: "percent", value: 10, buyQty: 2, getQty: 1, minQty: 1, products: [] as string[], categories: [] as string[], branches: [] as string[], channel: "both", startsAt: "", endsAt: "", active: true };
const TYPES: [string, string][] = [["percent", "Percent off"], ["fixed", "Amount off"], ["bogo", "Buy X get Y free"]];
const CHANNELS: [string, string][] = [["both", "Till and online"], ["pos", "Till only"], ["online", "Online only"]];

function Segmented({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: [string, string][] }) {
  return (
    <div className="flex rounded-md border border-slate-300 bg-white p-0.5">
      {items.map(([v, l]) => <button key={v} type="button" onClick={() => onChange(v)} className={`flex-1 rounded px-3 py-1.5 text-sm ${value === v ? "bg-slate-900 font-medium text-white" : "text-slate-600 hover:text-slate-900"}`}>{l}</button>)}
    </div>
  );
}

// Promotions (FR-POS-04). Applied automatically at the till and online; never to prescription medicines.
export default function Promotions() {
  const { call, can, branches } = useAuth();
  const list = useLoad<any[]>(() => call("/promotions", { branch: null }), []);
  const cats = useLoad<string[]>(() => call("/products/categories", { branch: null }), []);
  const prods = useLoad<any[]>(() => call("/products?limit=500", { branch: null }), []);
  const [f, setF] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const edit = can("branch_manager");
  const now = Date.now();
  const state = (p: any): [string, string] => (!p.active ? ["Off", "slate"] : p.endsAt && new Date(p.endsAt).getTime() < now ? ["Ended", "slate"] : p.startsAt && new Date(p.startsAt).getTime() > now ? ["Scheduled", "blue"] : ["Running", "green"]);
  const scope = (p: any, products: any[] = (p.products || [])) => { const names = [...(p.categories || []), ...products.map((x: any) => x?.brand || x)]; return names.length ? names.join(", ") : "all non-prescription items"; };

  const save = async () => {
    setErr(null);
    try {
      const body = { ...f, value: Number(f.value), buyQty: Number(f.buyQty), getQty: Number(f.getQty), minQty: Number(f.minQty) || 1, products: f.products.map((x: any) => x._id || x) };
      if (f._id) await call(`/promotions/${f._id}`, { method: "PATCH", body, branch: null }); else await call("/promotions", { body, branch: null });
      setF(null); list.reload();
    } catch (e: any) { setErr(e.message); }
  };
  const switchOnOff = async (p: any) => { await call(`/promotions/${p._id}`, { method: "PATCH", body: { active: !p.active }, branch: null }); list.reload(); };
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const rows = list.data || [];
  const order = (p: any) => ["Running", "Scheduled", "Off", "Ended"].indexOf(state(p)[0]);

  const preview = f && (() => {
    const prodObjs = f.products.map((id: string) => (prods.data || []).find((x) => x._id === id) || id);
    const when = f.startsAt || f.endsAt ? ` ${f.startsAt ? `from ${dateFmt(f.startsAt)}` : "from today"}${f.endsAt ? ` until ${dateFmt(f.endsAt)}` : ""}` : ", starting now with no end date";
    const at = f.branches.length ? ` at ${branches.filter((b) => f.branches.map(String).includes(b._id)).map((b) => b.name).join(", ")}` : "";
    return `Customers get ${offer(f).toLowerCase()} ${f.type === "bogo" ? "on " : ""}${scope(f, prodObjs)}${Number(f.minQty) > 1 ? ` when they buy ${f.minQty} or more` : ""}, ${where(f.channel)}${at}${when}.`;
  })();

  return (
    <div>
      <PageHeader title="Promotions" subtitle="Discounts applied automatically at the till and in the online store. Prescription and controlled medicines are never included."
        actions={edit && <Button onClick={() => { setF({ ...blank }); setErr(null); }}><Plus className="h-4 w-4" />New promotion</Button>} />
      {list.loading && !list.data ? <Spinner /> : !rows.length ? (
        <Card className="p-10 text-center"><Tag className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-medium">No promotions yet</p><p className="text-sm text-slate-500">Create one and it applies by itself at the till and online.</p></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...rows].sort((a, b) => order(a) - order(b)).map((p) => {
            const [label, tone] = state(p); const live = label === "Running";
            return (
              <Card key={p._id} className={`flex flex-col p-5 ${live ? "" : "opacity-75"}`}>
                <div className="flex items-start justify-between gap-2"><div className="font-semibold text-slate-900">{p.name}</div><Badge tone={tone as any}>{label}</Badge></div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{offer(p)}</div>
                <div className="text-sm text-slate-600">on {scope(p)}{p.minQty > 1 && ` · min ${p.minQty}`}</div>
                <dl className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Where</dt><dd className="text-right">{CHANNELS.find(([v]) => v === p.channel)?.[1]}{p.branches?.length ? ` · ${p.branches.length} branch${p.branches.length > 1 ? "es" : ""}` : " · all branches"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">When</dt><dd className="text-right">{p.startsAt ? dateFmt(p.startsAt) : "Now"} to {p.endsAt ? dateFmt(p.endsAt) : "no end date"}</dd></div>
                </dl>
                {edit && (
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <Button size="sm" variant="ghost" onClick={() => { setErr(null); setF({ ...p, startsAt: p.startsAt?.slice(0, 10) || "", endsAt: p.endsAt?.slice(0, 10) || "", products: (p.products || []).map((x: any) => x._id || x), branches: (p.branches || []).map(String) }); }}>Edit</Button>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                      {p.active ? "On" : "Off"}
                      <button role="switch" aria-checked={p.active} aria-label={`Switch ${p.name} ${p.active ? "off" : "on"}`} onClick={() => switchOnOff(p)} className={`relative h-5 w-9 rounded-full transition ${p.active ? "bg-brand-700" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${p.active ? "left-[18px]" : "left-0.5"}`} /></button>
                    </label>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? "Edit promotion" : "New promotion"} wide>
        {f && <div className="space-y-6 text-sm">
          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">The offer</h3>
            <Input label="Name customers will see" placeholder="e.g. Vitamins 20% off" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Segmented value={f.type} onChange={(v) => setF({ ...f, type: v })} items={TYPES} />
            <div className="grid gap-3 sm:grid-cols-3">
              {f.type !== "bogo" ? <Input label={f.type === "percent" ? "Percent off" : "GH₵ off each unit"} type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
                : <><Input label="Buy" type="number" value={f.buyQty} onChange={(e) => setF({ ...f, buyQty: e.target.value })} /><Input label="Get free" type="number" value={f.getQty} onChange={(e) => setF({ ...f, getQty: e.target.value })} /></>}
              <Input label="Minimum quantity" type="number" value={f.minQty} onChange={(e) => setF({ ...f, minQty: e.target.value })} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">What it covers</h3>
            <div className="flex flex-wrap gap-2">{(cats.data || []).filter((c) => c !== "Controlled").map((c) => <button key={c} type="button" onClick={() => setF({ ...f, categories: toggle(f.categories, c) })} className={`rounded-full border px-3 py-1 text-sm ${f.categories.includes(c) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:border-slate-400"}`}>{c}</button>)}</div>
            <Select aria-label="Add a specific product" value="" onChange={(e) => e.target.value && setF({ ...f, products: [...new Set([...f.products, e.target.value])] })}><option value="">Add a specific product...</option>{(prods.data || []).filter((p) => ["otc", "pharmacy_only"].includes(p.legalStatus)).map((p) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select>
            {f.products.length > 0 && <div className="flex flex-wrap gap-2">{f.products.map((id: string) => { const p = (prods.data || []).find((x) => x._id === id); return <span key={id} className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm">{p ? `${p.brand} ${p.strength || ""}` : id}<button aria-label="Remove" onClick={() => setF({ ...f, products: f.products.filter((x: string) => x !== id) })} className="rounded-full p-0.5 hover:bg-slate-200"><X className="h-3.5 w-3.5" /></button></span>; })}</div>}
            <p className="text-xs text-slate-500">Pick nothing to cover every non-prescription item.</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Where and when</h3>
            <Segmented value={f.channel} onChange={(v) => setF({ ...f, channel: v })} items={CHANNELS} />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setF({ ...f, branches: [] })} className={`rounded-full border px-3 py-1 text-sm ${!f.branches.length ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}>All branches</button>
              {branches.map((b) => { const on = f.branches.map(String).includes(b._id); return <button key={b._id} type="button" onClick={() => setF({ ...f, branches: toggle(f.branches.map(String), b._id) })} className={`rounded-full border px-3 py-1 text-sm ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:border-slate-400"}`}>{b.name}</button>; })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><Input label="Starts (blank = now)" type="date" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /><Input label="Ends (blank = no end)" type="date" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} /></div>
          </section>

          <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-slate-800"><span className="font-medium">Summary: </span>{preview}</div>
          <ErrorNote error={err} />
          <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><Button variant="outline" onClick={() => setF(null)}>Cancel</Button><Button disabled={!f.name.trim()} onClick={save}>Save promotion</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
