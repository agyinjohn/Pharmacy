"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, dateTime, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Spinner, StatusBadge, Table, Td } from "@/components/ui";
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
                <Td className="text-right"><Button size="sm" variant="outline" onClick={() => open(c._id)}>Open</Button></Td></tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!stmt} onClose={() => setStmt(null)} title={`Statement: ${stmt?.customer.name || ""}`} wide>
        {stmt && <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Credit limit {money(stmt.customer.creditLimit)}</span><b>Balance due {money(stmt.customer.balance)}</b></div>
          <Table head={["Date", "Type", "Reference", "Amount", "Balance"]} empty="No activity">{stmt.rows.map((r: any, i: number) => <tr key={i}><Td>{dateTime(r.at)}</Td><Td>{r.type === "charge" ? "Credit sale" : "Payment"}</Td><Td className="font-mono text-xs">{r.ref}</Td><Td className="tabular-nums">{r.type === "payment" ? "-" : ""}{money(r.amount)}</Td><Td className="tabular-nums font-medium">{money(r.balance)}</Td></tr>)}</Table>
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
      <Modal open={!!view} onClose={() => setView(null)} title={view?.customer.name || ""} wide>
        {view && <div className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2"><div>Phone: {view.customer.phone}</div><div>Email: {view.customer.email || "-"}</div><div>Allergies: {view.customer.allergies?.join(", ") || "none recorded"}</div><div>Conditions: {view.customer.conditions?.join(", ") || "-"}</div><div>Loyalty points: {view.customer.loyaltyPoints}</div><div>Consent: comms {view.customer.consent?.communications ? "yes" : "no"}, health data {view.customer.consent?.healthData ? "yes" : "no"} ({dateFmt(view.customer.consent?.at)})</div></div>
          {view.customer.creditLimit > 0 && <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">Account balance {money(view.customer.balance)} of {money(view.customer.creditLimit)}<span className="flex gap-2"><Button size="sm" variant="outline" onClick={() => statement(view.customer._id)}>Statement</Button>{can("accountant", "cashier", "branch_manager") && <Button size="sm" onClick={() => payment(view.customer)}>Record payment</Button>}</span></div>}
          <StaffReminders call={call} customerId={view.customer._id} canEdit={can("pharmacist", "branch_manager")} />
          <div><h3 className="mb-1 font-semibold">Prescription history</h3>{view.prescriptions.map((r: any) => <div key={r._id} className="flex items-center justify-between border-b border-slate-100 py-1.5"><span>{r.rxNo} · {r.items.map((i: any) => i.name).join(", ")}</span><StatusBadge s={r.status} /></div>)}{!view.prescriptions.length && <p className="text-slate-500">None</p>}</div>
        </div>}
      </Modal>
    </div>
  );
}
