"use client";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt, dateTime } from "@/lib/api";
import { downloadExport } from "@/lib/download";
import { Badge, Button, Card, ErrorNote, Input, Modal, Select, Spinner, Table, Td, Textarea } from "./ui";

const ACT_FIELDS: [string, string][] = [["name", "Activity"], ["purpose", "Purpose"], ["dataSubjects", "Whose data"], ["dataCategories", "Data held"], ["lawfulBasis", "Lawful basis"], ["recipients", "Recipients / processors"], ["processorAgreement", "Written agreement ref."], ["retention", "Kept for"], ["transfersOutsideGhana", "Transfers outside Ghana"], ["safeguards", "Safeguards"]];

// Data Protection Act 2012 (Act 843) records: REG-15 processing register, REG-16 retention,
// REG-18 incidents, REG-20 hosting location.
export default function DataProtection() {
  const { call, org, token, can, refresh } = useAuth();
  const canEdit = can("branch_manager");
  return (
    <div className="space-y-6">
      <Hosting call={call} org={org} refresh={refresh} canEdit={canEdit} />
      <Retention call={call} org={org} refresh={refresh} isOwner={can()} canEdit={canEdit} />
      <Processing call={call} token={token} canEdit={canEdit} />
      <Incidents call={call} token={token} canEdit={canEdit} />
    </div>
  );
}

function Hosting({ call, org, refresh, canEdit }: any) {
  const [h, setH] = useState({ country: "", provider: "", safeguards: "", ...org?.settings?.hosting });
  const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const save = async () => { setErr(null); try { await call("/org", { method: "PATCH", branch: null, body: { settings: { hosting: h } } }); setMsg("Saved"); refresh(); } catch (e: any) { setErr(e.message); } };
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Where data is hosted</h2>
      <p className="mb-3 text-sm text-slate-600">Record the country and provider, and the safeguards used if data is stored outside Ghana.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Country" value={h.country} disabled={!canEdit} onChange={(e) => setH({ ...h, country: e.target.value })} />
        <Input label="Hosting provider" value={h.provider} disabled={!canEdit} onChange={(e) => setH({ ...h, provider: e.target.value })} />
        <Input label="Safeguards" value={h.safeguards} disabled={!canEdit} placeholder="e.g. encryption at rest, contract clauses" onChange={(e) => setH({ ...h, safeguards: e.target.value })} />
      </div>
      {canEdit && <div className="mt-3 flex items-center gap-3"><Button onClick={save}>Save</Button>{msg && <span className="text-sm text-emerald-700">{msg}</span>}</div>}
      <ErrorNote error={err} />
    </Card>
  );
}

function Retention({ call, org, refresh, isOwner, canEdit }: any) {
  const [r, setR] = useState({ notificationsYears: 1, prescriptionImagesYears: 2, inactiveCustomerYears: 6, ...org?.settings?.retention });
  const [preview, setPreview] = useState<any>(null); const [ran, setRan] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const save = async () => { setErr(null); try { await call("/org", { method: "PATCH", branch: null, body: { settings: { retention: { notificationsYears: Number(r.notificationsYears), prescriptionImagesYears: Math.max(2, Number(r.prescriptionImagesYears)), inactiveCustomerYears: Number(r.inactiveCustomerYears) } } } }); refresh(); setPreview(await call("/dp/retention/preview", { branch: null })); } catch (e: any) { setErr(e.message); } };
  const run = async () => { if (!confirm("Apply the retention rules now? Deleted notifications and removed images cannot be recovered.")) return; try { setRan(await call("/dp/retention/run", { body: {}, branch: null })); setPreview(null); } catch (e: any) { setErr(e.message); } };
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Retention</h2>
      <p className="mb-3 text-sm text-slate-600">How long each kind of record is kept. Sales, the audit log, the controlled-drug register and account ledgers are never deleted by the system. Prescription records stay; only scanned images are removed, and never before 2 years.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Customer messages (years)" type="number" min={0.25} step={0.25} disabled={!canEdit} value={r.notificationsYears} onChange={(e) => setR({ ...r, notificationsYears: e.target.value })} />
        <Input label="Prescription scans (years, min 2)" type="number" min={2} disabled={!canEdit} value={r.prescriptionImagesYears} onChange={(e) => setR({ ...r, prescriptionImagesYears: e.target.value })} />
        <Input label="Anonymise customers inactive for (years)" type="number" min={1} disabled={!canEdit} value={r.inactiveCustomerYears} onChange={(e) => setR({ ...r, inactiveCustomerYears: e.target.value })} />
      </div>
      {canEdit && <div className="mt-3 flex flex-wrap items-center gap-3"><Button onClick={save}>Save and preview</Button>{isOwner && <Button variant="danger" onClick={run}>Apply retention now</Button>}</div>}
      {preview && <p className="mt-3 text-sm">Would delete <b>{preview.notificationsDeleted}</b> messages, remove <b>{preview.prescriptionImagesRemoved}</b> prescription scans and anonymise <b>{preview.customersAnonymised}</b> inactive customers (those with records that must be kept are skipped).</p>}
      {ran && <p className="mt-3 text-sm text-emerald-700">Done: {ran.notificationsDeleted} messages deleted, {ran.prescriptionImagesRemoved} scans removed, {ran.customersAnonymised} customers anonymised, {ran.customersKept} kept because records must be retained.</p>}
      <ErrorNote error={err} />
    </Card>
  );
}

function Processing({ call, token, canEdit }: any) {
  const list = useLoad<any[]>(() => call("/dp/processing", { branch: null }), []);
  const [f, setF] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const save = async () => { setErr(null); try { if (f._id) await call(`/dp/processing/${f._id}`, { method: "PATCH", body: f, branch: null }); else await call("/dp/processing", { body: f, branch: null }); setF(null); list.reload(); } catch (e: any) { setErr(e.message); } };
  const remove = async () => { if (!confirm(`Remove "${f.name}"?`)) return; await call(`/dp/processing/${f._id}`, { method: "DELETE", branch: null }); setF(null); list.reload(); };
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-semibold">Record of processing activities</h2><p className="text-sm text-slate-600">What personal data the pharmacy processes, why, and who receives it. Pre-filled from how this system works; review and adjust.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => downloadExport("/dp/processing?format=xlsx", token, "record-of-processing.xlsx").catch((e) => alert(e.message))}><Download className="h-4 w-4" />Excel</Button>{canEdit && <Button onClick={() => setF({ name: "" })}><Plus className="h-4 w-4" />Add</Button>}</div>
      </div>
      {list.loading && !list.data ? <Spinner /> : (
        <Table head={["Activity", "Purpose", "Data held", "Lawful basis", "Recipients", "Kept for", ""]}>
          {(list.data || []).map((a) => <tr key={a._id}><Td className="font-medium">{a.name}</Td><Td>{a.purpose}</Td><Td>{a.dataCategories}</Td><Td>{a.lawfulBasis}</Td><Td>{a.recipients}</Td><Td>{a.retention}</Td><Td className="text-right">{canEdit && <Button size="sm" variant="ghost" onClick={() => setF({ ...a })}>Edit</Button>}</Td></tr>)}
        </Table>
      )}
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? "Edit processing activity" : "Add processing activity"} wide>
        {f && <div className="grid gap-3 sm:grid-cols-2">
          {ACT_FIELDS.map(([k, l]) => <Input key={k} label={l} value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)}
          <div className="flex gap-2 sm:col-span-2"><Button onClick={save} disabled={!f.name}>Save</Button>{f._id && <Button variant="outline" onClick={remove}>Remove</Button>}</div>
          <div className="sm:col-span-2"><ErrorNote error={err} /></div>
        </div>}
      </Modal>
    </Card>
  );
}

function Incidents({ call, token, canEdit }: any) {
  const list = useLoad<any[]>(() => call("/dp/incidents", { branch: null }), []);
  const [f, setF] = useState<any>(null); const [action, setAction] = useState(""); const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setErr(null);
    try {
      const body = { ...f, action: action || undefined, peopleAffected: f.peopleAffected === "" ? undefined : f.peopleAffected };
      if (f._id) await call(`/dp/incidents/${f._id}`, { method: "PATCH", body, branch: null }); else await call("/dp/incidents", { body, branch: null });
      setF(null); setAction(""); list.reload();
    } catch (e: any) { setErr(e.message); }
  };
  const d = (v: any) => (v ? String(v).slice(0, 10) : "");
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-semibold">Security incidents</h2><p className="text-sm text-slate-600">Log any loss, theft or unauthorised access to personal data, what was done, and when the Commission and the people affected were told.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => downloadExport("/dp/incidents?format=xlsx", token, "security-incidents.xlsx").catch((e) => alert(e.message))}><Download className="h-4 w-4" />Excel</Button>{canEdit && <Button onClick={() => setF({ title: "", severity: "medium", status: "open", discoveredAt: new Date().toISOString() })}><Plus className="h-4 w-4" />Log incident</Button>}</div>
      </div>
      <Table head={["Discovered", "Incident", "Severity", "Status", "Commission told", "People told", ""]} empty="No incidents logged">
        {(list.data || []).map((i) => <tr key={i._id}><Td>{dateFmt(i.discoveredAt)}</Td><Td className="font-medium">{i.title}</Td><Td><Badge tone={i.severity === "high" ? "red" : i.severity === "medium" ? "amber" : "slate"}>{i.severity}</Badge></Td><Td><Badge tone={i.status === "closed" ? "green" : i.status === "contained" ? "blue" : "red"}>{i.status}</Badge></Td><Td>{dateFmt(i.commissionNotifiedAt)}</Td><Td>{dateFmt(i.subjectsNotifiedAt)}</Td><Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setF({ ...i })}>{canEdit ? "Update" : "View"}</Button></Td></tr>)}
      </Table>
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? f.title : "Log a security incident"} wide>
        {f && <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Input label="Discovered on" type="date" value={d(f.discoveredAt)} onChange={(e) => setF({ ...f, discoveredAt: e.target.value })} />
          <div className="sm:col-span-2"><Textarea label="What happened" rows={3} value={f.description || ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <Input label="Data affected" value={f.dataAffected || ""} onChange={(e) => setF({ ...f, dataAffected: e.target.value })} />
          <Input label="People affected (approx.)" type="number" value={f.peopleAffected ?? ""} onChange={(e) => setF({ ...f, peopleAffected: e.target.value })} />
          <Select label="Severity" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select>
          <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="open">Open</option><option value="contained">Contained</option><option value="closed">Closed</option></Select>
          <Input label="Data Protection Commission notified on" type="date" value={d(f.commissionNotifiedAt)} onChange={(e) => setF({ ...f, commissionNotifiedAt: e.target.value || null })} />
          <Input label="People affected notified on" type="date" value={d(f.subjectsNotifiedAt)} onChange={(e) => setF({ ...f, subjectsNotifiedAt: e.target.value || null })} />
          {f._id && <div className="sm:col-span-2"><Input label="Add an action taken" value={action} onChange={(e) => setAction(e.target.value)} /></div>}
          {f.actions?.length > 0 && <ol className="space-y-1 border-l-2 border-slate-200 pl-3 text-xs text-slate-600 sm:col-span-2">{f.actions.map((a: any, k: number) => <li key={k}>{dateTime(a.at)} · {a.by}: {a.text}</li>)}</ol>}
          {canEdit && <div className="sm:col-span-2"><Button onClick={save} disabled={!f.title}>Save</Button></div>}
          <div className="sm:col-span-2"><ErrorNote error={err} /></div>
        </div>}
      </Modal>
    </Card>
  );
}
