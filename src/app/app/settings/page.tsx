"use client";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import DataProtection from "@/components/DataProtection";

export default function Settings() {
  const { call, user, org, can, refresh, mustSetupTwoStep } = useAuth();
  const [tab, setTab] = useState("security");
  const tabs = [["security", "Security"], ...(can("branch_manager") ? [["org", "Organisation"], ["privacy", "Privacy requests"], ["dp", "Data protection"], ["notif", "Notifications"]] : [])];
  return (
    <div>
      <PageHeader title="Settings" subtitle={org?.name} />
      <div className="mb-4 flex gap-2">{tabs.map(([v, l]) => <Button key={v} size="sm" variant={tab === v ? "primary" : "outline"} onClick={() => setTab(v)}>{l}</Button>)}</div>
      {mustSetupTwoStep && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your organisation requires two-step sign-in for your role. Please turn it on below.</div>}
      {tab === "security" && <Security call={call} enabled={!!user?.totp?.enabled} refresh={refresh} />}
      {tab === "org" && <Org call={call} org={org} refresh={refresh} />}
      {tab === "privacy" && <Privacy call={call} />}
      {tab === "notif" && <Notifications call={call} />}
      {tab === "dp" && <DataProtection />}
    </div>
  );
}

function Security({ call, enabled, refresh }: any) {
  const [setup, setSetup] = useState<any>(null); const [code, setCode] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null);
  const start = async () => { setErr(null); try { setSetup(await call("/auth/2fa/setup", { body: {}, branch: null })); } catch (e: any) { setErr(e.message); } };
  const enable = async () => { setErr(null); try { await call("/auth/2fa/enable", { body: { code }, branch: null }); setSetup(null); setCode(""); setMsg("Two-step sign-in is on."); refresh(); } catch (e: any) { setErr(e.message); } };
  const disable = async () => { setErr(null); try { await call("/auth/2fa/disable", { body: { code, password: pw }, branch: null }); setCode(""); setPw(""); setMsg("Two-step sign-in is off."); refresh(); } catch (e: any) { setErr(e.message); } };
  return (
    <Card className="max-w-xl p-5">
      <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-teal-700" />Two-step sign-in {enabled ? <Badge tone="green">On</Badge> : <Badge tone="slate">Off</Badge>}</h2>
      <p className="mt-1 text-sm text-slate-600">Use an authenticator app (Google Authenticator, Microsoft Authenticator, Authy). Recommended for owners, managers and pharmacists.</p>
      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
      <div className="mt-4 space-y-3">
        {!enabled && !setup && <Button onClick={start}>Set up</Button>}
        {setup && <>
          <p className="text-sm">In your authenticator app choose "Enter a setup key" and type:</p>
          <code className="block break-all rounded bg-slate-100 p-3 text-sm">{setup.secret}</code>
          <Input label="Then enter the 6-digit code it shows" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button onClick={enable}>Turn on</Button>
        </>}
        {enabled && <>
          <Input label="Current authenticator code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button variant="danger" onClick={disable}>Turn off</Button>
        </>}
        <ErrorNote error={err} />
      </div>
    </Card>
  );
}

function Org({ call, org, refresh }: any) {
  const [f, setF] = useState({ name: org?.name || "", dpcRegistration: org?.dpcRegistration || "", ...org?.settings });
  const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false);
  const save = async () => {
    setErr(null); setOk(false);
    try { await call("/org", { method: "PATCH", branch: null, body: { name: f.name, dpcRegistration: f.dpcRegistration, settings: { purchasing: f.purchasing, codEnabled: f.codEnabled, requireTwoStep: f.requireTwoStep, retentionYears: Number(f.retentionYears), reservationMinutes: Number(f.reservationMinutes), reminders: { enabled: f.reminders?.enabled !== false, refillDaysBefore: Number(f.reminders?.refillDaysBefore ?? 3), timezone: f.reminders?.timezone || "Africa/Accra" }, loyalty: { enabled: f.loyalty?.enabled !== false, pointsPerCedi: Number(f.loyalty?.pointsPerCedi ?? 0.1), pointValue: Number(f.loyalty?.pointValue ?? 0.1), minRedeemPoints: Number(f.loyalty?.minRedeemPoints ?? 50) } } } }); setOk(true); refresh(); }
    catch (e: any) { setErr(e.message); }
  };
  return (
    <Card className="max-w-xl space-y-3 p-5">
      <Input label="Organisation name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input label="Data Protection Commission registration no." value={f.dpcRegistration} onChange={(e) => setF({ ...f, dpcRegistration: e.target.value })} hint="Shown on the customer portal" />
      <label className="block text-sm"><span className="mb-1 block font-medium">Purchasing</span><select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={f.purchasing} onChange={(e) => setF({ ...f, purchasing: e.target.value })}><option value="branch">Each branch buys for itself</option><option value="central">Head office buys, branches receive</option></select></label>
      <Input label="Retention period for controlled-drug records (years)" type="number" value={f.retentionYears} onChange={(e) => setF({ ...f, retentionYears: e.target.value })} />
      <div className="rounded-lg border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={f.loyalty?.enabled !== false} onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, enabled: e.target.checked } })} />Loyalty points</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Input label="Points per GH₵ spent" type="number" step="0.01" value={f.loyalty?.pointsPerCedi ?? 0.1} onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, pointsPerCedi: e.target.value } })} />
          <Input label="GH₵ value of a point" type="number" step="0.01" value={f.loyalty?.pointValue ?? 0.1} onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, pointValue: e.target.value } })} />
          <Input label="Minimum points to redeem" type="number" value={f.loyalty?.minRedeemPoints ?? 50} onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, minRedeemPoints: e.target.value } })} />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={f.reminders?.enabled !== false} onChange={(e) => setF({ ...f, reminders: { ...f.reminders, enabled: e.target.checked } })} />Medication reminders when dispensing</label>
        <div className="mt-2 max-w-xs"><Input label="Refill reminder, days before supply ends" type="number" value={f.reminders?.refillDaysBefore ?? 3} onChange={(e) => setF({ ...f, reminders: { ...f.reminders, refillDaysBefore: e.target.value } })} /></div>
        <p className="mt-1 text-xs text-slate-500">Sent only to patients who agreed to messages. The medicine name is included only if they also agreed to us holding health data.</p>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.codEnabled} onChange={(e) => setF({ ...f, codEnabled: e.target.checked })} />Allow pay on delivery</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.requireTwoStep} onChange={(e) => setF({ ...f, requireTwoStep: e.target.checked })} />Require two-step sign-in for owners, managers and pharmacists</label>
      <ErrorNote error={err} />{ok && <p className="text-sm text-emerald-700">Saved.</p>}
      <Button onClick={save}>Save settings</Button>
    </Card>
  );
}

function Privacy({ call }: any) {
  const list = useLoad<any[]>(() => call("/privacy/erasure-requests", { branch: null }), []);
  const [err, setErr] = useState<string | null>(null);
  const erase = async (c: any) => { if (!confirm(`Anonymise ${c.name}? This cannot be undone.`)) return; setErr(null); try { await call(`/privacy/erasure/${c._id}`, { body: {}, branch: null }); list.reload(); } catch (e: any) { setErr(e.message); } };
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm text-slate-600">Customers can ask for their data to be erased. Records the pharmacy must keep (such as controlled-drug prescriptions within the retention period) are never removed; the system tells you when erasure is blocked.</p>
      <ErrorNote error={err} />
      {list.loading && !list.data ? <Spinner /> : <Table head={["Customer", "Phone", "Requested", ""]} empty="No open requests">{(list.data || []).map((c: any) => <tr key={c._id}><Td className="font-medium">{c.name}</Td><Td>{c.phone}</Td><Td>{dateTime(c.erasureRequestedAt)}</Td><Td className="text-right"><Button size="sm" variant="danger" onClick={() => erase(c)}>Erase personal data</Button></Td></tr>)}</Table>}
    </Card>
  );
}

function Notifications({ call }: any) {
  const list = useLoad<any[]>(() => call("/notifications", { branch: null }), []);
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm text-slate-600">Every message sent to customers. In the demo, delivery is simulated.</p>
      {list.loading && !list.data ? <Spinner /> : <Table head={["When", "To", "Event", "Message", "Status"]} empty="Nothing sent yet">{(list.data || []).map((n: any) => <tr key={n._id}><Td className="whitespace-nowrap">{dateTime(n.createdAt)}</Td><Td>{n.customer?.name} <span className="text-xs text-slate-500">{n.phone}</span></Td><Td>{n.event}</Td><Td>{n.message}</Td><Td><Badge tone={n.status === "sent" ? "green" : "amber"}>{n.status}{n.skippedReason ? `: ${n.skippedReason}` : ""}</Badge></Td></tr>)}</Table>}
    </Card>
  );
}
