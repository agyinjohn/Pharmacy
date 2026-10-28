"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, dateTime, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Spinner, StatusBadge, Table, Td, Ref } from "@/components/ui";
import { StaffReminders } from "@/components/Reminders";

const blank = { name: "", phone: "", email: "", allergies: "", conditions: "", creditLimit: "", consentComms: true, consentHealth: false };

export default function Customers() {
  const { call, can } = useAuth();
  const [q, setQ] = useState("");
  const list = useLoad(() => call(`/customers?q=${encodeURIComponent(q)}`), [q]);
  const [form, setForm] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<any>(null);
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const save = async () => {
    setErr(null);
    try { await call("/customers", { body: { name: form.name, phone: form.phone, email: form.email, allergies: split(form.allergies), conditions: split(form.conditions), creditLimit: form.creditLimit, consent: { communications: form.consentComms, healthData: form.consentHealth } } }); setForm(null); list.reload(); }
    catch (e: any) { setErr(e.message); }
  };
  const open = async (id: string) => setView(await call(`/customers/${id}`)); // logged as a record view on the server
  // Other pages link here with ?open=<customer id> to show that record straight away.
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("open"); if (id) open(id).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [stmt, setStmt] = useState<any>(null);
  const statement = async (id: string) => setStmt(await call(`/customers/${id}/statement`));
  const payment = async (c: any) => { const a = prompt(`Payment received from ${c.name} (balance ${money(c.balance)})`); if (a) { await call(`/customers/${c._id}/payments`, { body: { amount: Number(a) } }); list.reload(); setView(null); } };

  return (
    <div>
      <PageHeader title="Customers" subtitle="One record shared by walk-in and online channels. Opening a record is logged."
        actions={<Button onClick={() => { setForm({ ...blank }); setErr(null); }}><Plus className="h-4 w-4" />Add customer</Button>} />
      <Card className="p-4">
        <div className="mb-4 max-w-sm"><Input placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Name", "Phone", "Allergies", "Credit", "Points", "Consent", ""]} empty="No customers">
            {(list.data || []).map((c: any) => (
              <tr key={c._id}><Td className="font-medium">{c.name}</Td><Td>{c.phone}</Td><Td>{c.allergies?.length ? <Badge tone="red">{c.allergies.join(", ")}</Badge> : "-"}</Td>
                <Td>{c.creditLimit ? `${money(c.balance)} / ${money(c.creditLimit)}` : "-"}</Td><Td>{c.loyaltyPoints}</Td>
                <Td>{c.consent?.at ? <span className="text-xs text-slate-500">{dateFmt(c.consent.at)}</span> : <Badge tone="amber">None</Badge>}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => open(c._id)}>View</Button></Td></tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!stmt} onClose={() => setStmt(null)} title={`Statement: ${stmt?.customer.name || ""}`} wide>
        {stmt && <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Credit limit {money(stmt.customer.creditLimit)}</span><b>Balance due {money(stmt.customer.balance)}</b></div>
          <Table head={["Date", "Type", "Reference", "Amount", "Balance"]} empty="No activity">{stmt.rows.map((r: any, i: number) => <tr key={i}><Td>{dateTime(r.at)}</Td><Td>{r.type === "charge" ? "Credit sale" : "Payment"}</Td><Td><Ref>{r.ref}</Ref></Td><Td className="whitespace-nowrap tabular-nums">{r.type === "payment" ? "-" : ""}{money(r.amount)}</Td><Td className="tabular-nums font-medium">{money(r.balance)}</Td></tr>)}</Table>
          <Button className="no-print" variant="outline" onClick={() => window.print()}>Print statement</Button>
        </div>}
      </Modal>
      <Modal open={!!form} onClose={() => setForm(null)} title="Add customer">
        {form && <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Allergies (comma separated)" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /><Input label="Chronic conditions (optional)" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} />
          {can("accountant", "branch_manager") && <Input label="Credit limit (account customers)" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.consentComms} onChange={(e) => setForm({ ...form, consentComms: e.target.checked })} />Customer consents to SMS / email communications</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.consentHealth} onChange={(e) => setForm({ ...form, consentHealth: e.target.checked })} />Customer consents to health information being stored</label>
          <ErrorNote error={err} /><Button className="w-full" onClick={save}>Save customer</Button>
        </div>}
      </Modal>
      <Modal open={!!view} onClose={() => setView(null)} title="Customer record" wide>
        {view && (() => { const c = view.customer; return (
          <div className="space-y-6 text-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-base font-semibold text-brand-800">{c.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}</div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-slate-900">{c.name}</div>
                <div className="text-slate-500">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="rounded-lg border border-slate-200 px-3 py-2 text-right"><div className="text-lg font-semibold leading-tight tabular-nums">{c.loyaltyPoints || 0}</div><div className="text-xs text-slate-500">loyalty points</div></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className={`rounded-lg border p-3 ${c.allergies?.length ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Allergies</div>
                {c.allergies?.length ? <div className="mt-1 flex items-center gap-1.5 font-medium text-red-800"><AlertTriangle className="h-4 w-4" />{c.allergies.join(", ")}</div> : <div className="mt-1 text-slate-600">None recorded</div>}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Conditions</div>
                <div className="mt-1 text-slate-800">{c.conditions?.join(", ") || "None recorded"}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Consent</div>
                <div className="mt-1 space-y-0.5">
                  {[["SMS / email", c.consent?.communications], ["Health records", c.consent?.healthData]].map(([l, ok]) => <div key={l as string} className="flex items-center gap-1.5 text-slate-700">{ok ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <X className="h-3.5 w-3.5 text-slate-400" />}{l as string}</div>)}
                  {c.consent?.at && <div className="text-xs text-slate-500">Given {dateFmt(c.consent.at)}</div>}
                </div>
              </div>
            </div>

            {c.creditLimit > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Account</div><div className="mt-1"><b className="tabular-nums">{money(c.balance)}</b> <span className="text-slate-500">owed of {money(c.creditLimit)} limit</span></div></div>
                <span className="flex gap-2"><Button size="sm" variant="outline" onClick={() => statement(c._id)}>Statement</Button>{can("accountant", "cashier", "branch_manager") && <Button size="sm" onClick={() => payment(c)}>Record payment</Button>}</span>
              </div>
            )}

            <StaffReminders call={call} customerId={c._id} canEdit={can("pharmacist", "branch_manager")} />

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Prescriptions</h3>
                {view.prescriptions.map((r: any) => <div key={r._id} className="flex items-start justify-between gap-2 border-b border-slate-100 py-2 last:border-0"><div><div className="text-slate-800">{r.items.map((i: any) => i.name).join(", ")}</div><div className="text-xs text-slate-500"><Ref>{r.rxNo}</Ref> · {dateFmt(r.createdAt)}</div></div><StatusBadge s={r.status} /></div>)}
                {!view.prescriptions.length && <p className="text-slate-500">None yet</p>}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Recent purchases</h3>
                {(view.purchases || []).map((s: any) => <div key={s._id} className="flex items-start justify-between gap-2 border-b border-slate-100 py-2 last:border-0"><div><div className="text-slate-800">{s.items.map((i: any) => `${i.name} × ${i.qty}`).join(", ")}</div><div className="text-xs text-slate-500"><Ref>{s.receiptNo}</Ref> · {dateFmt(s.createdAt)} · {s.channel === "online" ? "Online" : s.branch?.name || "In store"}</div></div><span className="tabular-nums font-medium">{money(s.total)}</span></div>)}
                {!view.purchases?.length && <p className="text-slate-500">None yet</p>}
              </div>
            </div>
          </div>
        ); })()}
      </Modal>
    </div>
  );
}
