"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";

const describe = (p: any) => (p.type === "percent" ? `${p.value}% off` : p.type === "fixed" ? `GH₵ ${p.value} off each` : `Buy ${p.buyQty} get ${p.getQty} free`);
const blank = { name: "", type: "percent", value: 10, buyQty: 2, getQty: 1, minQty: 1, products: [] as string[], categories: [] as string[], branches: [] as string[], channel: "both", startsAt: "", endsAt: "", active: true };

// Promotions (FR-POS-04). Applied automatically at the till and online; never to prescription medicines.
export default function Promotions() {
  const { call, can, branches } = useAuth();
  const list = useLoad<any[]>(() => call("/promotions", { branch: null }), []);
  const cats = useLoad<string[]>(() => call("/products/categories", { branch: null }), []);
  const prods = useLoad<any[]>(() => call("/products?limit=500", { branch: null }), []);
  const [f, setF] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const edit = can("branch_manager");
  const now = Date.now();
  const state = (p: any) => (!p.active ? ["Off", "slate"] : p.endsAt && new Date(p.endsAt).getTime() < now ? ["Ended", "slate"] : p.startsAt && new Date(p.startsAt).getTime() > now ? ["Scheduled", "blue"] : ["Running", "green"]);

  const save = async () => {
    setErr(null);
    try {
      const body = { ...f, value: Number(f.value), buyQty: Number(f.buyQty), getQty: Number(f.getQty), minQty: Number(f.minQty) || 1, products: f.products.map((x: any) => x._id || x) };
      if (f._id) await call(`/promotions/${f._id}`, { method: "PATCH", body, branch: null }); else await call("/promotions", { body, branch: null });
      setF(null); list.reload();
    } catch (e: any) { setErr(e.message); }
  };
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div>
      <PageHeader title="Promotions" subtitle="Discounts applied automatically at the till and in the online store. Prescription and controlled medicines are never included."
        actions={edit && <Button onClick={() => { setF({ ...blank }); setErr(null); }}><Plus className="h-4 w-4" />New promotion</Button>} />
      <Card className="p-4">
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Promotion", "Offer", "Applies to", "Where", "Dates", "Status", ""]} empty="No promotions yet">
            {(list.data || []).map((p) => { const [l, t] = state(p); return (
              <tr key={p._id}>
                <Td className="font-medium">{p.name}</Td><Td>{describe(p)}{p.minQty > 1 && ` (min ${p.minQty})`}</Td>
                <Td>{[...(p.categories || []), ...(p.products || []).map((x: any) => x.brand)].join(", ") || "All non-prescription items"}</Td>
                <Td>{p.channel === "both" ? "Till and online" : p.channel === "pos" ? "Till only" : "Online only"}{p.branches?.length ? ` · ${p.branches.length} branch(es)` : ""}</Td>
                <Td>{p.startsAt ? dateFmt(p.startsAt) : "now"} - {p.endsAt ? dateFmt(p.endsAt) : "open"}</Td>
                <Td><Badge tone={t as any}>{l}</Badge></Td>
                <Td className="whitespace-nowrap text-right">{edit && <><Button size="sm" variant="ghost" onClick={() => setF({ ...p, startsAt: p.startsAt?.slice(0, 10) || "", endsAt: p.endsAt?.slice(0, 10) || "", products: (p.products || []).map((x: any) => x._id) })}>Edit</Button><Button size="sm" variant="ghost" onClick={async () => { await call(`/promotions/${p._id}`, { method: "PATCH", body: { active: !p.active }, branch: null }); list.reload(); }}>{p.active ? "Switch off" : "Switch on"}</Button></>}</Td>
              </tr>); })}
          </Table>
        )}
      </Card>
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? "Edit promotion" : "New promotion"} wide>
        {f && <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Name (shown to customers)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">Percent off</option><option value="fixed">Amount off each unit</option><option value="bogo">Buy X get Y free</option></Select>
          {f.type !== "bogo" ? <Input label={f.type === "percent" ? "Percent off" : "GH₵ off each unit"} type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
            : <div className="grid grid-cols-2 gap-2"><Input label="Buy" type="number" value={f.buyQty} onChange={(e) => setF({ ...f, buyQty: e.target.value })} /><Input label="Get free" type="number" value={f.getQty} onChange={(e) => setF({ ...f, getQty: e.target.value })} /></div>}
          <Input label="Minimum quantity" type="number" value={f.minQty} onChange={(e) => setF({ ...f, minQty: e.target.value })} />
          <Input label="Starts" type="date" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
          <Input label="Ends" type="date" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
          <Select label="Where" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}><option value="both">Till and online</option><option value="pos">Till only</option><option value="online">Online only</option></Select>
          <div><div className="mb-1 text-sm font-medium">Branches (none ticked = all)</div><div className="flex flex-wrap gap-3">{branches.map((b) => <label key={b._id} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={f.branches.map(String).includes(b._id)} onChange={() => setF({ ...f, branches: toggle(f.branches.map(String), b._id) })} />{b.name}</label>)}</div></div>
          <div className="sm:col-span-2"><div className="mb-1 text-sm font-medium">Categories (none ticked and no products = everything eligible)</div><div className="flex flex-wrap gap-2">{(cats.data || []).filter((c) => c !== "Controlled").map((c) => <label key={c} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${f.categories.includes(c) ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300"}`}><input type="checkbox" className="hidden" checked={f.categories.includes(c)} onChange={() => setF({ ...f, categories: toggle(f.categories, c) })} />{c}</label>)}</div></div>
          <div className="sm:col-span-2"><Select label="Add a specific product" value="" onChange={(e) => e.target.value && setF({ ...f, products: [...new Set([...f.products, e.target.value])] })}><option value="">Choose...</option>{(prods.data || []).filter((p) => ["otc", "pharmacy_only"].includes(p.legalStatus)).map((p) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select>
            <div className="mt-2 flex flex-wrap gap-2">{f.products.map((id: string) => { const p = (prods.data || []).find((x) => x._id === id); return <button key={id} onClick={() => setF({ ...f, products: f.products.filter((x: string) => x !== id) })} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{p ? `${p.brand} ${p.strength || ""}` : id} ×</button>; })}</div></div>
          <div className="sm:col-span-2 space-y-2"><ErrorNote error={err} /><Button className="w-full" disabled={!f.name} onClick={save}>Save promotion</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
