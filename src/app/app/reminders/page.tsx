"use client";
import Link from "next/link";
import { useState } from "react";
import { BellOff, BellRing, Pause, Play, Plus, Search, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, dateTime } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Ref, Spinner, Stat } from "@/components/ui";

const th = "px-3 py-2.5 text-left text-xs font-medium text-slate-500";
const DAY = 86400000;
const parseTimes = (s: string) => s.split(/[ ,;]+/).map((t) => t.trim()).filter(Boolean).map((t) => (/^\d:\d\d$/.test(t) ? `0${t}` : t));
const daysLeft = (p: any) => (p.endDate ? Math.ceil((new Date(p.endDate).getTime() - Date.now()) / DAY) : null);
const endingSoon = (p: any) => { const d = daysLeft(p); return d !== null && d <= 3; };

// Every patient's medication reminders in one place, for the pharmacist to check and adjust.
export default function Reminders() {
  const { call } = useAuth();
  const [ended, setEnded] = useState(false);
  const list = useLoad<any[]>(() => call(`/reminders${ended ? "?status=ended" : ""}`, { branch: null }), [ended]);
  const [filter, setFilter] = useState("all"); const [q, setQ] = useState("");
  const [view, setView] = useState<any>(null); const [times, setTimes] = useState("");
  const [add, setAdd] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);

  const all = list.data || [];
  const FILTERS: [string, string, (p: any) => boolean][] = [
    ["all", "All active", () => true],
    ["soon", "Ending in 3 days", endingSoon],
    ["paused", "Paused", (p) => p.paused],
    ["blocked", "Not sending", (p) => !p.canSend],
  ];
  const term = q.trim().toLowerCase();
  const rows = all
    .filter(ended ? () => true : FILTERS.find((f) => f[0] === filter)![2])
    .filter((p) => !term || [p.customer?.name, p.customer?.phone, p.medicine].some((x) => String(x || "").toLowerCase().includes(term)));

  const open = (p: any) => { setErr(null); setNote(null); setView(p); setTimes(p.times.join(", ")); };
  const update = async (p: any, body: any) => {
    setErr(null);
    try { const r = await call(`/reminders/${p._id}`, { method: "PATCH", body, branch: null }); list.reload(); if (view) setView(body.stop ? null : { ...view, ...r, customer: view.customer, branch: view.branch, prescription: view.prescription }); }
    catch (e: any) { setErr(e.message); }
  };
  const test = async (p: any) => {
    setErr(null); setNote(null);
    try { const r = await call(`/reminders/${p._id}/test`, { body: {}, branch: null }); setNote(r.status === "sent" ? `Test sent: "${r.message}"` : `Not sent: ${r.reason}.`); }
    catch (e: any) { setErr(e.message); }
  };

  const Status = ({ p }: { p: any }) => (
    ended ? <Badge tone="slate">{p.active ? "Finished" : "Stopped"}</Badge>
      : !p.canSend ? <Badge tone="red">No SMS consent</Badge>
        : p.paused ? <Badge tone="amber">Paused</Badge> : <Badge tone="green">On</Badge>
  );
  const Ends = ({ p }: { p: any }) => {
    if (!p.endDate) return <span className="text-slate-500">No end date</span>;
    const d = daysLeft(p)!;
    return <span><span className="text-slate-700">{dateFmt(p.endDate)}</span>{!ended && <span className={`block text-xs ${d <= 3 ? "font-medium text-amber-700" : "text-slate-500"}`}>{d <= 0 ? "Ends today" : d === 1 ? "1 day left" : `${d} days left`}</span>}</span>;
  };

  return (
    <div>
      <PageHeader title="Medication reminders" subtitle="Dose reminders texted to patients. They start when you dispense a prescription with directions, or you can add one here."
        actions={<Button onClick={() => { setErr(null); setAdd({ q: "", customer: null, medicine: "", dose: "", times: "08:00, 20:00", days: "30" }); }}><Plus className="h-4 w-4" />Add reminder</Button>} />

      {!ended && list.data && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Active" value={all.filter((p) => !p.paused && p.canSend).length} sub="Texting patients" />
          <Stat label="Paused" value={all.filter((p) => p.paused).length} sub="By staff or the patient" />
          <Stat label="Ending in 3 days" value={all.filter(endingSoon).length} sub="Check if a refill is due" tone={all.some(endingSoon) ? "amber" : undefined} />
          <Stat label="Not sending" value={all.filter((p) => !p.canSend).length} sub="No SMS consent recorded" tone={all.some((p) => !p.canSend) ? "red" : undefined} />
        </div>
      )}

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {!ended && FILTERS.map(([k, l, fn]) => { const n = all.filter(fn).length; return <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-sm ${filter === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>{l} <span className={filter === k ? "text-white/70" : "text-slate-400"}>{n}</span></button>; })}
          <button onClick={() => setEnded(!ended)} className={`rounded-full border px-3 py-1 text-sm ${ended ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>{ended ? "← Back to active" : "Ended"}</button>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Patient, phone or medicine" aria-label="Search reminders" className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-slate-500" />
          </div>
        </div>

        {list.loading && !list.data ? <Spinner /> : !rows.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><BellRing className="h-5 w-5 text-slate-500" /></span>
            <p className="mt-3 text-sm font-medium text-slate-900">{term ? "No reminders match your search" : ended ? "No ended reminders yet" : filter === "all" ? "No active reminders" : "Nothing in this list"}</p>
            {!term && !ended && filter === "all" && <p className="mt-1 max-w-sm text-sm text-slate-500">Tick "Send the patient dose reminders by SMS" when dispensing a prescription, or add one here.</p>}
          </div>
        ) : (
          <>
          {/* Phones: one card per reminder */}
          <ul className="divide-y divide-slate-100 sm:hidden">
            {rows.map((p) => (
              <li key={p._id}><button onClick={() => open(p)} className="w-full py-3 text-left">
                <div className="flex items-start justify-between gap-2"><div><div className="font-medium text-slate-900">{p.customer?.name}</div><div className="text-sm text-slate-700">{p.medicine}{p.dose && <span className="text-slate-500"> · {p.dose}</span>}</div></div><Status p={p} /></div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-slate-500">{p.times.map((t: string) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 tabular-nums text-slate-700">{t}</span>)}<span className="ml-1">{p.endDate ? `until ${dateFmt(p.endDate)}` : "no end date"}</span></div>
              </button></li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-slate-200"><th className={th}>Patient</th><th className={th}>Medicine</th><th className={th}>Times each day</th><th className={th}>Ends</th><th className={th}>Last sent</th><th className={th}>Status</th>{!ended && <th className={th} />}</tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p._id} onClick={() => open(p)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3"><div className="font-medium text-slate-900">{p.customer?.name}</div><div className="text-xs text-slate-500">{p.customer?.phone}</div></td>
                    <td className="px-3 py-3"><div className="text-slate-900">{p.medicine}</div><div className="text-xs text-slate-500">{[p.dose, p.prescription?.rxNo].filter(Boolean).join(" · ") || "Added by hand"}</div></td>
                    <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{p.times.map((t: string) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-700">{t}</span>)}</div></td>
                    <td className="whitespace-nowrap px-3 py-3"><Ends p={p} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{p.lastSentAt ? <>{dateTime(p.lastSentAt)}<span className="block text-xs text-slate-500">{p.sentCount} sent</span></> : <span className="text-slate-400">Not yet</span>}</td>
                    <td className="px-3 py-3"><Status p={p} /></td>
                    {!ended && <td className="whitespace-nowrap px-3 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); update(p, { paused: !p.paused }); }}>{p.paused ? <><Play className="h-3.5 w-3.5" />Resume</> : <><Pause className="h-3.5 w-3.5" />Pause</>}</Button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        <ErrorNote error={!view && !add ? err || list.error : null} />
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title={view ? `${view.medicine} for ${view.customer?.name}` : ""}>
        {view && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Status p={view} />{view.prescription?.rxNo && <Ref>{view.prescription.rxNo}</Ref>}<span className="ml-auto text-xs text-slate-500">Set up {dateFmt(view.startDate)}{view.createdBy ? ` by ${view.createdBy}` : ""}</span></div>
            {!view.canSend && <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800"><BellOff className="mt-0.5 h-4 w-4 shrink-0" />{view.customer?.name} has not agreed to receive text messages, so these reminders are not being sent. Record their consent on the customer record.</p>}
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-slate-500">Patient</dt><dd className="text-slate-900">{view.customer?.phone} · <Link href={`/app/customers?open=${view.customer?._id}`} className="text-brand-700 underline-offset-4 hover:underline">Open record</Link></dd></div>
              <div><dt className="text-xs text-slate-500">Dose</dt><dd className="text-slate-900">{view.dose || "Not given"}</dd></div>
              <div><dt className="text-xs text-slate-500">Ends</dt><dd><Ends p={view} /></dd></div>
              <div><dt className="text-xs text-slate-500">Texts sent</dt><dd className="text-slate-900">{view.sentCount}{view.lastSentAt && <span className="text-slate-500"> · last {dateTime(view.lastSentAt)}</span>}</dd></div>
              {view.branch?.name && <div><dt className="text-xs text-slate-500">Dispensed at</dt><dd className="text-slate-900">{view.branch.name}</dd></div>}
              {view.stoppedBy && <div><dt className="text-xs text-slate-500">Stopped by</dt><dd className="text-slate-900">{view.stoppedBy}</dd></div>}
            </dl>
            {!ended && <>
              <div className="flex items-end gap-2">
                <div className="flex-1"><Input label="Times each day (24-hour)" value={times} onChange={(e) => setTimes(e.target.value)} hint="Separate with commas, e.g. 07:00, 19:00" /></div>
                <Button variant="outline" className="mb-6" disabled={times === view.times.join(", ")} onClick={() => update(view, { times: parseTimes(times) })}>Save</Button>
              </div>
              {note && <p className="rounded-lg bg-slate-50 p-3 text-slate-700">{note}</p>}
              <ErrorNote error={err} />
              <div className="-mx-5 -mb-5 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
                <Button variant="ghost" onClick={() => confirm(`Stop ${view.medicine} reminders for ${view.customer?.name}? This cannot be undone.`) && update(view, { stop: true })}>Stop for good</Button>
                <span className="ml-auto flex gap-2">
                  <Button variant="outline" onClick={() => test(view)}><Send className="h-4 w-4" />Send test</Button>
                  <Button onClick={() => update(view, { paused: !view.paused })}>{view.paused ? <><Play className="h-4 w-4" />Resume</> : <><Pause className="h-4 w-4" />Pause</>}</Button>
                </span>
              </div>
            </>}
          </div>
        )}
      </Modal>

      <AddReminder add={add} setAdd={setAdd} onSaved={() => { setAdd(null); if (ended) setEnded(false); else list.reload(); }} />
    </div>
  );
}

// Add a reminder by hand, e.g. for medicine bought without a prescription or directions the system could not read.
function AddReminder({ add, setAdd, onSaved }: { add: any; setAdd: (v: any) => void; onSaved: () => void }) {
  const { call } = useAuth();
  const found = useLoad<any[]>(() => call(`/customers?q=${encodeURIComponent(add?.q || "")}`), [add?.q], !!add && !add.customer && (add?.q || "").trim().length > 1);
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(null); setBusy(true);
    try { await call("/reminders", { body: { customer: add.customer._id, medicine: add.medicine, dose: add.dose, times: parseTimes(add.times), days: Number(add.days) || undefined }, branch: null }); onSaved(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!add} onClose={() => setAdd(null)} title="Add a medication reminder">
      {add && (
        <div className="space-y-4 text-sm">
          {add.customer ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div><div className="font-medium text-slate-900">{add.customer.name}</div><div className="text-xs text-slate-500">{add.customer.phone}</div></div>
              <Button size="sm" variant="ghost" onClick={() => setAdd({ ...add, customer: null })}>Change</Button>
            </div>
          ) : (
            <div>
              <Input label="Patient" autoFocus placeholder="Search by name or phone" value={add.q} onChange={(e) => setAdd({ ...add, q: e.target.value })} />
              {(found.data || []).length > 0 && <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200">{found.data!.slice(0, 8).map((c) => (
                <li key={c._id}><button onClick={() => setAdd({ ...add, customer: c })} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"><span className="text-slate-900">{c.name}</span><span className="text-xs text-slate-500">{c.phone}</span></button></li>
              ))}</ul>}
              {found.data && !found.data.length && <p className="mt-1 text-xs text-slate-500">No patient found. Add them on the Customers page first.</p>}
            </div>
          )}
          {add.customer && add.customer.consent && !add.customer.consent.communications && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">{add.customer.name} has not agreed to text messages. The reminder will be saved but not sent until their consent is recorded.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Medicine" value={add.medicine} onChange={(e) => setAdd({ ...add, medicine: e.target.value })} />
            <Input label="Dose" placeholder="1 tablet" value={add.dose} onChange={(e) => setAdd({ ...add, dose: e.target.value })} />
            <Input label="Times each day (24-hour)" value={add.times} hint="e.g. 08:00, 20:00" onChange={(e) => setAdd({ ...add, times: e.target.value })} />
            <Input label="For how many days" type="number" min={1} value={add.days} hint="Leave empty for ongoing" onChange={(e) => setAdd({ ...add, days: e.target.value })} />
          </div>
          <ErrorNote error={err} />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAdd(null)}>Cancel</Button><Button loading={busy} disabled={!add.customer || !add.medicine.trim() || !add.times.trim()} onClick={save}>Save reminder</Button></div>
        </div>
      )}
    </Modal>
  );
}
