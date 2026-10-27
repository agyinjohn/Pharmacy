"use client";
import { useState } from "react";
import { AlertTriangle, ArrowRight, PackageCheck, Plus, Trash2, Truck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, dateTime } from "@/lib/api";
import { Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Ref } from "@/components/ui";

const th = "px-3 py-2.5 text-left text-xs font-medium text-slate-500";

export default function Transfers() {
  const { call, branch, user, can } = useAuth();
  const list = useLoad<any[]>(() => call("/transfers"), [branch?._id]);
  const prods = useLoad<any[]>(() => call("/products?limit=500"), []);
  const allBranches = useLoad<any[]>(() => call("/branches?all=1"), []);
  const [form, setForm] = useState<any>(null); const [recv, setRecv] = useState<any>(null); const [view, setView] = useState<any>(null);
  const [rejecting, setRejecting] = useState(false); const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const mine = (id: string) => user?.role === "owner" || !!user?.branches.includes(id);
  const here = (id: string) => id === branch?._id;
  const stockRole = can("store_officer", "branch_manager", "pharmacist", "technician");

  // What this user can do next on a transfer: the sending branch dispatches or rejects, the receiving branch counts it in.
  const action = (t: any) => (t.status === "requested" && mine(t.from?._id) ? "dispatch" : t.status === "in_transit" && mine(t.to?._id) ? "receive" : null);
  const all = list.data || [];
  const FILTERS: [string, string, (t: any) => boolean][] = [
    ["action", "Needs action", (t) => !!action(t)],
    ["in", `Coming to ${branch?.name || "this branch"}`, (t) => here(t.to?._id)],
    ["out", `Going from ${branch?.name || "this branch"}`, (t) => here(t.from?._id)],
    ["all", "All", () => true],
  ];
  const active = filter ?? (all.some((t) => action(t)) ? "action" : "all");
  const rows = all.filter(FILTERS.find((f) => f[0] === active)![2]);

  const act = async (t: any, path: string, body: any = {}) => { setErr(null); try { await call(`/transfers/${t._id}/${path}`, { body }); list.reload(); setRecv(null); setView(null); setRejecting(false); setReason(""); } catch (e: any) { setErr(e.message); } };
  const create = async () => { setErr(null); try { await call("/transfers", { body: { from: form.from, to: branch?._id, note: form.note, items: form.items.filter((i: any) => i.product).map((i: any) => ({ product: i.product, qty: Number(i.qty) })) } }); setForm(null); list.reload(); } catch (e: any) { setErr(e.message); } };
  const openReceive = (t: any) => { setErr(null); setView(null); setRecv({ t, counts: Object.fromEntries(t.items.map((i: any) => [i.product, String(i.qty)])) }); };

  const Route = ({ t }: { t: any }) => (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={here(t.from?._id) ? "font-medium text-slate-900" : "text-slate-700"}>{t.from?.name}</span>
      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
      <span className={here(t.to?._id) ? "font-medium text-slate-900" : "text-slate-700"}>{t.to?.name}</span>
    </span>
  );
  const nextButton = (t: any, size: "sm" | "md" = "sm") => {
    if (!stockRole) return null;
    const a = action(t);
    if (a === "dispatch") return <Button size={size} onClick={(e) => { e.stopPropagation(); act(t, "dispatch"); }}><Truck className="h-4 w-4" />Approve and send</Button>;
    if (a === "receive") return <Button size={size} onClick={(e) => { e.stopPropagation(); openReceive(t); }}><PackageCheck className="h-4 w-4" />Receive</Button>;
    return null;
  };

  return (
    <div>
      <PageHeader title="Stock transfers" subtitle="Move stock between branches. Batch numbers and expiry dates travel with it, and any shortfall on arrival is flagged."
        actions={stockRole && <Button onClick={() => { setForm({ from: "", note: "", items: [{ product: "", qty: "" }] }); setErr(null); }}><Plus className="h-4 w-4" />Request stock</Button>} />

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map(([k, l, fn]) => { const n = all.filter(fn).length; return <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-sm ${active === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>{l} <span className={active === k ? "text-white/70" : "text-slate-400"}>{n}</span></button>; })}
        </div>
        {list.loading && !list.data ? <Spinner /> : !rows.length ? <p className="py-10 text-center text-sm text-slate-500">{active === "action" ? "Nothing waiting for you." : "No transfers here."}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-slate-200"><th className={th}>Transfer</th><th className={th}>From → to</th><th className={th}>Items</th><th className={th}>Status</th><th className={th} /></tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t._id} onClick={() => { setErr(null); setRejecting(false); setReason(""); setView(t); }} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3"><Ref>{t.ref}</Ref><div className="text-xs text-slate-500">{dateTime(t.createdAt)}</div></td>
                    <td className="px-3 py-3"><Route t={t} /></td>
                    <td className="px-3 py-3 text-slate-700">{t.items[0]?.name} × {t.items[0]?.qty}{t.items.length > 1 && <span className="text-slate-500"> +{t.items.length - 1} more</span>}</td>
                    <td className="px-3 py-3"><StatusBadge s={t.status} />{t.hasVariance && <div className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" />Arrived short</div>}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{nextButton(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ErrorNote error={!view && !recv && !form ? err : null} />
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title={`Transfer ${view?.ref || ""}`} wide>
        {view && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge s={view.status} /><span className="ml-auto text-xs text-slate-500">Requested {dateTime(view.createdAt)}</span></div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">From</div><div className="mt-1 font-semibold">{view.from?.name}</div></div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
              <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">To</div><div className="mt-1 font-semibold">{view.to?.name}</div></div>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50"><tr><th className={th}>Item</th><th className={`${th} text-right`}>Sent</th><th className={`${th} text-right`}>Received</th><th className={th}>Batches</th></tr></thead>
                <tbody>{view.items.map((i: any) => { const short = i.receivedQty !== undefined && i.receivedQty !== i.qty; return (
                  <tr key={i.product} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 font-medium">{i.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{i.qty}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${short ? "font-medium text-amber-700" : "text-slate-600"}`}>{i.receivedQty ?? "-"}{short && <div className="text-xs font-normal">{i.receivedQty - i.qty} short</div>}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{(i.lots || []).map((l: any) => `${l.batchNo} · exp ${dateFmt(l.expiry)} · ${l.qty}`).join("; ") || "Picked first-expiry-first-out when sent"}</td>
                  </tr>); })}</tbody>
              </table>
            </div>
            {view.note && <p className="rounded-lg bg-slate-50 p-3 text-slate-700"><span className="text-slate-500">Note: </span>{view.note}</p>}
            <ErrorNote error={err} />
            {stockRole && action(view) && (
              <div className="-mx-5 -mb-5 border-t border-slate-200 bg-slate-50 px-5 py-4">
                {rejecting ? (
                  <div className="flex flex-wrap gap-2"><div className="flex-1"><Input autoFocus placeholder="Why can't you send this?" value={reason} onChange={(e) => setReason(e.target.value)} /></div><Button variant="outline" onClick={() => setRejecting(false)}>Cancel</Button><Button variant="danger" disabled={!reason.trim()} onClick={() => act(view, "reject", { reason })}>Reject request</Button></div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    {action(view) === "dispatch" ? <Button variant="ghost" onClick={() => setRejecting(true)}>Reject…</Button> : <span />}
                    {nextButton(view, "md")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title={`Request stock for ${branch?.name || ""}`} wide>
        {form && <div className="space-y-4 text-sm">
          <Select label="Ask which branch?" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}><option value="">Choose a branch...</option>{(allBranches.data || []).filter((b) => b._id !== branch?._id).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className={th}>Product</th><th className={`${th} w-28`}>Quantity</th><th className="w-10" /></tr></thead>
              <tbody>
                {form.items.map((it: any, i: number) => {
                  const set = (patch: any) => setForm({ ...form, items: form.items.map((x: any, k: number) => (k === i ? { ...x, ...patch } : x)) });
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-2"><Select aria-label="Product" value={it.product} onChange={(e) => set({ product: e.target.value })}><option value="">Choose...</option>{(prods.data || []).map((p) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select></td>
                      <td className="px-2 py-2"><Input aria-label="Quantity" type="number" min={1} value={it.qty} onChange={(e) => set({ qty: e.target.value })} /></td>
                      <td className="px-2 py-2">{form.items.length > 1 && <button aria-label="Remove line" onClick={() => setForm({ ...form, items: form.items.filter((_: any, k: number) => k !== i) })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Trash2 className="h-4 w-4" /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2"><Button size="sm" variant="ghost" onClick={() => setForm({ ...form, items: [...form.items, { product: "", qty: "" }] })}><Plus className="h-4 w-4" />Add line</Button></div>
          </div>
          <Input label="Note for the other branch (optional)" placeholder="e.g. Running low before the weekend" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <ErrorNote error={err} />
          <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button disabled={!form.from || !form.items.some((i: any) => i.product && Number(i.qty) > 0)} onClick={create}>Send request</Button></div>
        </div>}
      </Modal>

      <Modal open={!!recv} onClose={() => setRecv(null)} title={`Receive ${recv?.t.ref || ""}`} wide>
        {recv && <div className="space-y-4 text-sm">
          <p className="text-slate-600">From <b>{recv.t.from?.name}</b>. Count what actually arrived. Any difference is recorded as a shortfall against the sending branch.</p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className={th}>Item</th><th className={`${th} text-right`}>Sent</th><th className={`${th} w-32`}>Counted</th><th className={`${th} w-28 text-right`}>Difference</th></tr></thead>
              <tbody>{recv.t.items.map((i: any) => { const diff = (Number(recv.counts[i.product]) || 0) - i.qty; return (
                <tr key={i.product} className="border-t border-slate-100">
                  <td className="px-3 py-2.5"><div className="font-medium">{i.name}</div>{i.lots?.length > 0 && <div className="text-xs text-slate-500">{i.lots.map((l: any) => `${l.batchNo} · exp ${dateFmt(l.expiry)}`).join("; ")}</div>}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{i.qty}</td>
                  <td className="px-2 py-2"><Input aria-label={`Counted ${i.name}`} type="number" min={0} value={recv.counts[i.product]} onChange={(e) => setRecv({ ...recv, counts: { ...recv.counts, [i.product]: e.target.value } })} /></td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${diff ? "font-medium text-amber-700" : "text-slate-400"}`}>{diff > 0 ? `+${diff}` : diff}</td>
                </tr>); })}</tbody>
            </table>
          </div>
          <ErrorNote error={err} />
          <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><Button variant="outline" onClick={() => setRecv(null)}>Cancel</Button><Button onClick={() => act(recv.t, "receive", { items: recv.t.items.map((i: any) => ({ product: i.product, receivedQty: Number(recv.counts[i.product]) })) })}><PackageCheck className="h-4 w-4" />Confirm and add to stock</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
