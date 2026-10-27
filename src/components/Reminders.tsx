"use client";
import { useState } from "react";
import { BellRing, Plus } from "lucide-react";
import { dateFmt } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { Badge, Button, ErrorNote, Input } from "./ui";

const parseTimes = (s: string) => s.split(/[ ,;]+/).map((t) => t.trim()).filter(Boolean).map((t) => (/^\d:\d\d$/.test(t) ? `0${t}` : t));

// Staff view of a patient's medication reminders (customer record).
export function StaffReminders({ call, customerId, canEdit }: { call: any; customerId: string; canEdit: boolean }) {
  const list = useLoad<any[]>(() => call(`/customers/${customerId}/reminders`), [customerId]);
  const [add, setAdd] = useState<any>(null); const [err, setErr] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const act = async (id: string, body: any) => { setErr(null); try { await call(`/reminders/${id}`, { method: "PATCH", body }); list.reload(); } catch (e: any) { setErr(e.message); } };
  const test = async (id: string) => { setErr(null); try { const r = await call(`/reminders/${id}/test`, { body: {} }); setNote(r.status === "sent" ? `Test sent: "${r.message}"` : `Not sent: ${r.reason}`); } catch (e: any) { setErr(e.message); } };
  const create = async () => { setErr(null); try { await call("/reminders", { body: { customer: customerId, medicine: add.medicine, dose: add.dose, times: parseTimes(add.times), days: Number(add.days) || undefined } }); setAdd(null); list.reload(); } catch (e: any) { setErr(e.message); } };
  const active = (list.data || []).filter((p) => p.active);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><BellRing className="h-4 w-4 text-brand-700" />Medication reminders</h3>{canEdit && !add && <Button size="sm" variant="ghost" onClick={() => setAdd({ medicine: "", dose: "", times: "08:00, 20:00", days: "30" })}><Plus className="h-3.5 w-3.5" />Add</Button>}</div>
      {active.map((p) => (
        <div key={p._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2">
          <div><div className="font-medium">{p.medicine} {p.dose && <span className="font-normal text-slate-500">· {p.dose}</span>}</div>
            {editing[p._id] !== undefined ? <div className="mt-1 flex gap-2"><input className="w-40 rounded border border-slate-300 px-2 py-1 text-sm" value={editing[p._id]} onChange={(e) => setEditing({ ...editing, [p._id]: e.target.value })} /><Button size="sm" onClick={async () => { await act(p._id, { times: parseTimes(editing[p._id]) }); const n = { ...editing }; delete n[p._id]; setEditing(n); }}>Save</Button></div>
              : <div className="text-xs text-slate-500">{p.times.join(", ")} daily{p.endDate ? ` until ${dateFmt(p.endDate)}` : ""}{p.refill ? " · refill reminder" : ""}</div>}</div>
          <div className="flex items-center gap-1">{p.paused ? <Badge tone="amber">Paused</Badge> : <Badge tone="green">On</Badge>}
            {canEdit && <><Button size="sm" variant="ghost" onClick={() => setEditing({ ...editing, [p._id]: p.times.join(", ") })}>Times</Button><Button size="sm" variant="ghost" onClick={() => act(p._id, { paused: !p.paused })}>{p.paused ? "Resume" : "Pause"}</Button><Button size="sm" variant="ghost" onClick={() => test(p._id)}>Send test</Button><Button size="sm" variant="ghost" onClick={() => confirm(`Stop reminders for ${p.medicine}?`) && act(p._id, { stop: true })}>Stop</Button></>}</div>
        </div>
      ))}
      {list.data && !active.length && !add && <p className="text-slate-500">No active reminders. They are set up automatically when a prescription is dispensed.</p>}
      {add && <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
        <Input label="Medicine" value={add.medicine} onChange={(e) => setAdd({ ...add, medicine: e.target.value })} />
        <Input label="Dose" value={add.dose} placeholder="1 tablet" onChange={(e) => setAdd({ ...add, dose: e.target.value })} />
        <Input label="Times (24h)" value={add.times} onChange={(e) => setAdd({ ...add, times: e.target.value })} />
        <Input label="For how many days" type="number" value={add.days} onChange={(e) => setAdd({ ...add, days: e.target.value })} />
        <div className="flex gap-2 sm:col-span-4"><Button size="sm" disabled={!add.medicine} onClick={create}>Save reminder</Button><Button size="sm" variant="outline" onClick={() => setAdd(null)}>Cancel</Button></div>
      </div>}
      {note && <p className="mt-2 text-xs text-slate-600">{note}</p>}
      <ErrorNote error={err} />
    </div>
  );
}
