"use client";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime } from "@/lib/api";
import { Button, Card, ErrorNote, Input, PageHeader, Spinner, Tabs, humanize } from "@/components/ui";
import DataProtection from "@/components/DataProtection";

export default function Settings() {
  const { call, user, org, can, refresh, mustSetupTwoStep } = useAuth();
  const [tab, setTab] = useState("security");
  const tabs = [["security", "Security"], ...(can("branch_manager") ? [["org", "Organisation"], ["privacy", "Privacy requests"], ["dp", "Data protection"], ["notif", "Notifications"]] : [])];
  return (
    <div>
      <PageHeader title="Settings" subtitle={`${org?.name || ""} · your account and how the business runs`} />
      <Tabs value={tab} onChange={setTab} items={tabs as [string, string][]} />
      {mustSetupTwoStep && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your organisation requires two-step sign-in for your role. Please turn it on below.</div>}
      {tab === "security" && <Security call={call} enabled={!!user?.totp?.enabled} refresh={refresh} user={user} />}
      {tab === "org" && <Org call={call} org={org} refresh={refresh} />}
      {tab === "privacy" && <Privacy call={call} />}
      {tab === "notif" && <Notifications call={call} />}
      {tab === "dp" && <DataProtection />}
    </div>
  );
}

// A settings block: what it is on the left, the controls on the right.
function Section({ title, desc, children }: { title: string; desc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-slate-200 py-6 first:pt-0 last:border-0 md:grid-cols-[260px_1fr]">
      <div><h2 className="font-semibold text-slate-900">{title}</h2>{desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1">
      <span><span className="block text-sm font-medium text-slate-800">{label}</span>{hint && <span className="block text-xs text-slate-500">{hint}</span>}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-brand-700" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} /></button>
    </label>
  );
}

const ROLE: Record<string, string> = { owner: "Owner", branch_manager: "Branch manager", pharmacist: "Pharmacist", technician: "Pharmacy technician", cashier: "Cashier", store_officer: "Store officer", accountant: "Accountant", dispatcher: "Dispatcher", auditor: "Auditor" };

function Security({ call, enabled, refresh, user }: any) {
  const [setup, setSetup] = useState<any>(null); const [code, setCode] = useState(""); const [pw, setPw] = useState(""); const [turningOff, setTurningOff] = useState(false);
  const [err, setErr] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null);
  const start = async () => { setErr(null); try { setSetup(await call("/auth/2fa/setup", { body: {}, branch: null })); } catch (e: any) { setErr(e.message); } };
  const enable = async () => { setErr(null); try { await call("/auth/2fa/enable", { body: { code }, branch: null }); setSetup(null); setCode(""); setMsg("Two-step sign-in is on."); refresh(); } catch (e: any) { setErr(e.message); } };
  const disable = async () => { setErr(null); try { await call("/auth/2fa/disable", { body: { code, password: pw }, branch: null }); setCode(""); setPw(""); setTurningOff(false); setMsg("Two-step sign-in is off."); refresh(); } catch (e: any) { setErr(e.message); } };
  return (
    <Card className="p-6">
      <Section title="Your account" desc="Ask the owner to change your role or branches.">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Name</dt><dd className="font-medium">{user?.name}</dd></div>
          <div><dt className="text-xs text-slate-500">Email</dt><dd className="font-medium">{user?.email}</dd></div>
          <div><dt className="text-xs text-slate-500">Role</dt><dd className="font-medium">{ROLE[user?.role] || user?.role}</dd></div>
        </dl>
      </Section>
      <Section title="Two-step sign-in" desc="A code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy) as well as your password.">
        <div className="max-w-md space-y-3 text-sm">
          <div className="flex items-center gap-2"><ShieldCheck className={`h-5 w-5 ${enabled ? "text-brand-700" : "text-slate-400"}`} /><span className="font-medium">{enabled ? "On for your account" : "Off"}</span></div>
          {msg && <p className="text-emerald-700">{msg}</p>}
          {!enabled && !setup && <Button onClick={start}>Set up two-step sign-in</Button>}
          {setup && <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p><b>1.</b> In your authenticator app choose “Enter a setup key” and type:</p>
            <code className="block break-all rounded bg-slate-100 p-3 font-mono text-sm tracking-wider">{setup.secret}</code>
            <p><b>2.</b> Enter the 6-digit code it shows:</p>
            <div className="flex gap-2"><div className="w-40"><Input aria-label="Code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} /></div><Button disabled={code.length < 6} onClick={enable}>Turn on</Button><Button variant="ghost" onClick={() => setSetup(null)}>Cancel</Button></div>
          </div>}
          {enabled && !turningOff && <Button variant="outline" onClick={() => setTurningOff(true)}>Turn off…</Button>}
          {enabled && turningOff && <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <Input label="Current authenticator code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input label="Your password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <div className="flex gap-2"><Button variant="outline" onClick={() => setTurningOff(false)}>Cancel</Button><Button variant="danger" onClick={disable}>Turn off</Button></div>
          </div>}
          <ErrorNote error={err} />
        </div>
      </Section>
    </Card>
  );
}

function Org({ call, org, refresh }: any) {
  const [f, setF] = useState({ name: org?.name || "", dpcRegistration: org?.dpcRegistration || "", ...org?.settings });
  const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false); const [dirty, setDirty] = useState(false);
  const upd = (patch: any) => { setF({ ...f, ...patch }); setDirty(true); setOk(false); };
  const save = async () => {
    setErr(null); setOk(false);
    try { await call("/org", { method: "PATCH", branch: null, body: { name: f.name, dpcRegistration: f.dpcRegistration, settings: { purchasing: f.purchasing, codEnabled: f.codEnabled, requireTwoStep: f.requireTwoStep, retentionYears: Number(f.retentionYears), reservationMinutes: Number(f.reservationMinutes), reminders: { enabled: f.reminders?.enabled !== false, refillDaysBefore: Number(f.reminders?.refillDaysBefore ?? 3), timezone: f.reminders?.timezone || "Africa/Accra" }, loyalty: { enabled: f.loyalty?.enabled !== false, pointsPerCedi: Number(f.loyalty?.pointsPerCedi ?? 0.1), pointValue: Number(f.loyalty?.pointValue ?? 0.1), minRedeemPoints: Number(f.loyalty?.minRedeemPoints ?? 50) } } } }); setOk(true); setDirty(false); refresh(); }
    catch (e: any) { setErr(e.message); }
  };
  const loyaltyOn = f.loyalty?.enabled !== false; const remindersOn = f.reminders?.enabled !== false;
  const perHundred = Number(f.loyalty?.pointsPerCedi ?? 0.1) * 100; const worth = perHundred * Number(f.loyalty?.pointValue ?? 0.1);
  return (
    <Card className="p-6">
      <Section title="Business details" desc="Shown on receipts and in the online store.">
        <div className="grid max-w-xl gap-3">
          <Input label="Business name" value={f.name} onChange={(e) => upd({ name: e.target.value })} />
          <Input label="Data Protection Commission registration no." placeholder="e.g. DPC-2024-004217" value={f.dpcRegistration} onChange={(e) => upd({ dpcRegistration: e.target.value })} hint="Shown at the bottom of the online store." />
        </div>
      </Section>
      <Section title="Buying stock" desc="Who places purchase orders with suppliers.">
        <div className="grid max-w-xl gap-2 sm:grid-cols-2">
          {[["branch", "Each branch buys", "Branch managers order for their own branch."], ["central", "Head office buys", "Orders are placed centrally and branches receive."]].map(([v, l, d]) => <button key={v} type="button" onClick={() => upd({ purchasing: v })} className={`rounded-lg border p-3 text-left text-sm ${(f.purchasing || "branch") === v ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"}`}><div className="font-medium">{l}</div><div className="mt-0.5 text-xs text-slate-500">{d}</div></button>)}
        </div>
      </Section>
      <Section title="Loyalty points" desc="Customers earn points on purchases and spend them at the till or online.">
        <div className="max-w-xl space-y-3">
          <Toggle label="Give loyalty points" checked={loyaltyOn} onChange={(v) => upd({ loyalty: { ...f.loyalty, enabled: v } })} />
          {loyaltyOn && <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Points per GH₵ 1" type="number" step="0.01" value={f.loyalty?.pointsPerCedi ?? 0.1} onChange={(e) => upd({ loyalty: { ...f.loyalty, pointsPerCedi: e.target.value } })} />
              <Input label="Each point is worth (GH₵)" type="number" step="0.01" value={f.loyalty?.pointValue ?? 0.1} onChange={(e) => upd({ loyalty: { ...f.loyalty, pointValue: e.target.value } })} />
              <Input label="Spend from (points)" type="number" value={f.loyalty?.minRedeemPoints ?? 50} onChange={(e) => upd({ loyalty: { ...f.loyalty, minRedeemPoints: e.target.value } })} />
            </div>
            <p className="text-xs text-slate-500">A GH₵ 100 purchase earns {+perHundred.toFixed(2)} points, worth GH₵ {worth.toFixed(2)} off a later purchase.</p>
          </>}
        </div>
      </Section>
      <Section title="Medication reminders" desc="Dose and refill text messages for patients, set up when you dispense.">
        <div className="max-w-xl space-y-3">
          <Toggle label="Offer reminders when dispensing" checked={remindersOn} onChange={(v) => upd({ reminders: { ...f.reminders, enabled: v } })} />
          {remindersOn && <div className="w-56"><Input label="Refill reminder, days before running out" type="number" value={f.reminders?.refillDaysBefore ?? 3} onChange={(e) => upd({ reminders: { ...f.reminders, refillDaysBefore: e.target.value } })} /></div>}
          <p className="text-xs text-slate-500">Only sent to patients who agreed to messages. The medicine name is included only if they also agreed to us holding health data.</p>
        </div>
      </Section>
      <Section title="Online store" desc="How customers pay for online orders.">
        <div className="max-w-xl"><Toggle label="Allow pay on delivery" hint="Riders collect cash or mobile money at the door." checked={!!f.codEnabled} onChange={(v) => upd({ codEnabled: v })} /></div>
      </Section>
      <Section title="Security and records" desc="Rules that apply to everyone in the business.">
        <div className="max-w-xl space-y-3">
          <Toggle label="Require two-step sign-in" hint="For owners, managers and pharmacists." checked={!!f.requireTwoStep} onChange={(v) => upd({ requireTwoStep: v })} />
          <div className="w-56"><Input label="Keep controlled-drug records for (years)" type="number" value={f.retentionYears ?? ""} onChange={(e) => upd({ retentionYears: e.target.value })} /></div>
        </div>
      </Section>
      <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 rounded-b-lg border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <ErrorNote error={err} />{ok && <span className="text-sm text-emerald-700">Saved.</span>}{dirty && !ok && <span className="text-sm text-slate-500">Unsaved changes</span>}
        <Button disabled={!dirty} onClick={save}>Save changes</Button>
      </div>
    </Card>
  );
}

function Privacy({ call }: any) {
  const list = useLoad<any[]>(() => call("/privacy/erasure-requests", { branch: null }), []);
  const [err, setErr] = useState<string | null>(null);
  const erase = async (c: any) => { if (!confirm(`Anonymise ${c.name}? This cannot be undone.`)) return; setErr(null); try { await call(`/privacy/erasure/${c._id}`, { body: {}, branch: null }); list.reload(); } catch (e: any) { setErr(e.message); } };
  return (
    <Card className="p-6">
      <Section title="Erasure requests" desc="Customers can ask for their personal data to be erased from the online store. Records the law says you must keep, such as controlled-drug prescriptions, stay until their retention period ends; the system tells you when erasure is blocked.">
        <ErrorNote error={err} />
        {list.loading && !list.data ? <Spinner /> : !(list.data || []).length ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No open requests.</div> : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {(list.data || []).map((c) => <div key={c._id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><div><div className="font-medium">{c.name}</div><div className="text-xs text-slate-500">{c.phone} · asked {dateTime(c.erasureRequestedAt)}</div></div><Button size="sm" variant="outline" onClick={() => erase(c)}>Erase personal data</Button></div>)}
          </div>
        )}
      </Section>
    </Card>
  );
}

const EVENT: Record<string, string> = { order: "Online order", refill: "Refill reminder", refill_due: "Refill reminder", dose_reminder: "Dose reminder" };

function Notifications({ call }: any) {
  const list = useLoad<any[]>(() => call("/notifications", { branch: null }), []);
  return (
    <Card className="p-6">
      <Section title="Messages sent" desc="Every text message sent to customers, newest first. Messages to people who haven't agreed to them are skipped and listed with the reason.">
        {list.loading && !list.data ? <Spinner /> : !(list.data || []).length ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Nothing sent yet.</div> : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {(list.data || []).map((n) => (
              <div key={n._id} className="grid gap-1 p-3 text-sm sm:grid-cols-[180px_1fr_auto] sm:gap-4">
                <div><div className="font-medium">{n.customer?.name || n.phone}</div><div className="text-xs text-slate-500">{dateTime(n.createdAt)}</div></div>
                <div><div className="text-xs text-slate-500">{EVENT[n.event] || humanize(n.event || "")}</div><div className="text-slate-700">{n.message}</div></div>
                <div className={`text-xs sm:text-right ${n.status === "sent" ? "text-slate-500" : "text-amber-700"}`}>{n.status === "sent" ? "Sent" : `Skipped${n.skippedReason ? `: ${n.skippedReason}` : ""}`}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Card>
  );
}
