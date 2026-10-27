"use client";
import { useEffect, useState } from "react";
import { FilePlus2, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOffline } from "@/lib/offlineContext";
import { loadRxSnapshot, newClientId, queueOp, saveRxSnapshot } from "@/lib/offline";
import { useLoad } from "@/lib/useLoad";
import { ApiError, dateFmt, dateTime } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Table, Td, Textarea } from "@/components/ui";

const emptyRx = { patientName: "", customer: "", prescriber: { name: "", regNo: "", facility: "", address: "" }, items: [{ product: "", dose: "", frequency: "", duration: "", qty: "" }], refillsAllowed: 0, paperOriginalSeen: false, image: "", insurance: { scheme: "", memberNo: "", copay: "" } };

export default function Prescriptions() {
  const { call, user, can, branch, org } = useAuth();
  const { online, refresh: refreshQueue } = useOffline();
  const [snap, setSnap] = useState<any>(null);
  useEffect(() => { if (!online && org) loadRxSnapshot(org._id).then(setSnap).catch(() => setSnap(null)); }, [online, org]);
  // Offline dispensing of a cached, verified prescription; synced later and flagged if it was filled elsewhere meanwhile.
  const dispenseOffline = async (r: any) => {
    if (!branch || !org) return;
    const items = r.items.map((i: any) => ({ product: i.product, qty: Math.min(i.qty, i.max - i.dispensedQty) })).filter((i: any) => i.qty > 0);
    if (!items.length) return;
    if (!confirm(`Dispense ${r.rxNo} for ${r.patientName} while offline? It will be checked against other branches when the connection returns.`)) return;
    await queueOp({ clientId: newClientId(), kind: "dispense", branch: branch._id, createdAt: new Date().toISOString(), payload: { prescription: r._id, items }, label: `${r.rxNo} ${r.patientName}`, status: "pending" });
    const next = { ...snap, prescriptions: snap.prescriptions.map((x: any) => (x._id === r._id ? { ...x, items: x.items.map((i: any) => ({ ...i, dispensedQty: i.dispensedQty + (items.find((y: any) => y.product === i.product)?.qty || 0) })) } : x)) };
    await saveRxSnapshot(org._id, snap.at, next.prescriptions); setSnap(next); refreshQueue();
    setLabels(items.map((i: any) => { const line = r.items.find((x: any) => x.product === i.product); return { patient: r.patientName, drug: line.name, directions: [line.dose, line.frequency, line.duration].filter(Boolean).join(", "), qty: i.qty, batch: "(assigned on sync)", date: new Date(), rxNo: r.rxNo }; }));
  };
  const [status, setStatus] = useState("");
  const list = useLoad(() => call(`/prescriptions${status ? `?status=${status}` : ""}`), [status, branch?._id]);
  const [open, setOpen] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string[] | null>(null); const [overrideReason, setOverrideReason] = useState("");
  const [labels, setLabels] = useState<any[] | null>(null);
  const [form, setForm] = useState<any>(null);
  const products = useLoad(() => call("/products?limit=500"), [], !!form);
  const customers = useLoad(() => call("/customers"), [], !!form);
  const [note, setNote] = useState(""); const [reason, setReason] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const sendReminders = async () => { try { const r = await call("/refill-reminders/send", { body: {} }); setInfo(`Reminders sent: ${r.sent}. Skipped (no consent / opted out): ${r.skipped}.`); } catch (e: any) { setErr(e.message); } };
  const pharmacist = user?.role === "pharmacist" || user?.role === "owner";

  const load = async (id: string) => { setErr(null); setWarn(null); setOpen(await call(`/prescriptions/${id}`)); };
  const act = async (path: string, body: any = {}) => {
    setErr(null);
    try { const r = await call(`/prescriptions/${open._id}/${path}`, { body }); return r; }
    catch (e: any) { if (e instanceof ApiError && e.details?.needsOverride) { setWarn(e.details.warnings); } else setErr(e.message); return null; }
  };
  const afterAct = async () => { await load(open._id); list.reload(); };

  const verify = async (override = false) => { const r = await act("verify", override ? { override: true, overrideReason } : {}); if (r) { setWarn(null); setOverrideReason(""); afterAct(); } };
  const reject = async () => { if (await act("reject", { reason })) { setReason(""); afterAct(); } };
  const addNote = async () => { if (await act("notes", { type: "counselling", text: note })) { setNote(""); afterAct(); } };
  const sight = async () => { if (await act("paper-sighted")) afterAct(); };
  const dispense = async () => { const r = await act("dispense", {}); if (r) { setLabels(r.labels); afterAct(); } };

  const submit = async () => {
    setErr(null);
    try {
      const body = { ...form, customer: form.customer || undefined, items: form.items.filter((i: any) => i.product).map((i: any) => ({ ...i, qty: Number(i.qty) })), refillsAllowed: Number(form.refillsAllowed), insurance: form.insurance.scheme ? { ...form.insurance, copay: Number(form.insurance.copay) || 0 } : undefined };
      await call("/prescriptions", { body }); setForm(null); list.reload();
    } catch (e: any) { setErr(e.message); }
  };
  const onFile = (f: File) => { const r = new FileReader(); r.onload = () => setForm({ ...form, image: String(r.result) }); r.readAsDataURL(f); };
  const setItem = (i: number, k: string, v: string) => setForm({ ...form, items: form.items.map((x: any, n: number) => (n === i ? { ...x, [k]: v } : x)) });

  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="Capture, verify and dispense. Shared across branches so a prescription cannot be filled twice."
        actions={<>{can("pharmacist", "branch_manager") && <Button variant="outline" onClick={sendReminders}>Send refill reminders</Button>}{can("pharmacist", "technician", "branch_manager", "cashier") && <Button onClick={() => { setForm(structuredClone(emptyRx)); setErr(null); }}><FilePlus2 className="h-4 w-4" />Capture prescription</Button>}</>} />
      {info && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{info}</div>}
      {!online && (
        <Card className="mb-4 p-4">
          <h2 className="font-semibold">Offline: verified prescriptions saved on this device</h2>
          <p className="text-sm text-slate-500">{snap ? `Copy from ${dateTime(snap.at)}. Controlled drugs cannot be dispensed offline.` : "No offline copy yet. A pharmacist must open the app while online first."}</p>
          {user?.role === "pharmacist" && snap && <Table head={["Rx", "Patient", "Items", "Allergies", ""]} empty="Nothing to dispense">
            {snap.prescriptions.filter((r: any) => r.items.some((i: any) => i.dispensedQty < i.max)).map((r: any) => <tr key={r._id}><Td className="font-mono text-xs">{r.rxNo}</Td><Td>{r.patientName}</Td><Td>{r.items.map((i: any) => `${i.name} ${i.dispensedQty}/${i.max}`).join(", ")}</Td><Td>{r.allergies?.length ? <Badge tone="red">{r.allergies.join(", ")}</Badge> : "-"}</Td><Td className="text-right"><Button size="sm" onClick={() => dispenseOffline(r)}>Dispense offline</Button></Td></tr>)}
          </Table>}
        </Card>
      )}
      <Card className="p-4">
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {["", "pending", "verified", "partial", "dispensed", "rejected"].map((s) => <Button key={s} size="sm" variant={status === s ? "primary" : "outline"} onClick={() => setStatus(s)}>{s || "All"}</Button>)}
        </div>
        <ErrorNote error={list.error} />
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Rx no.", "Patient", "Prescriber", "Items", "Source", "Status", "Date", ""]} empty="No prescriptions">
            {(list.data || []).map((r: any) => (
              <tr key={r._id}>
                <Td className="font-mono text-xs">{r.rxNo}</Td><Td className="font-medium">{r.patientName}</Td><Td>{r.prescriber?.name}</Td>
                <Td>{r.items.map((i: any) => i.name).join(", ")} {r.hasControlled && <Badge tone="red">Controlled</Badge>}</Td>
                <Td>{r.source}</Td><Td><StatusBadge s={r.status} /></Td><Td>{dateFmt(r.createdAt)}</Td>
                <Td className="text-right"><Button size="sm" variant="outline" onClick={() => load(r._id)}>Open</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={`Prescription ${open?.rxNo || ""}`} wide>
        {open && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3"><StatusBadge s={open.status} />{open.hasControlled && <Badge tone="red">Controlled drug</Badge>}{open.paperOriginalSeen ? <Badge tone="green">Paper original sighted</Badge> : open.hasControlled && <Badge tone="amber">Paper original not yet sighted</Badge>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><div className="text-xs text-slate-500">Patient</div><div className="font-medium">{open.patientName}</div>{open.customer?.allergies?.length > 0 && <Badge tone="red">Allergies: {open.customer.allergies.join(", ")}</Badge>}</div>
              <div><div className="text-xs text-slate-500">Prescriber</div><div className="font-medium">{open.prescriber?.name}</div><div className="text-xs text-slate-500">{open.prescriber?.regNo} {open.prescriber?.facility}</div></div>
            </div>
            <Table head={["Medicine", "Directions", "Qty", "Dispensed"]}>
              {open.items.map((i: any, k: number) => <tr key={k}><Td className="font-medium">{i.name}</Td><Td>{[i.dose, i.frequency, i.duration].filter(Boolean).join(", ")}</Td><Td>{i.qty}</Td><Td>{i.dispensedQty} / {i.qty * (1 + open.refillsAllowed)}</Td></tr>)}
            </Table>
            {open.refillsAllowed > 0 && <p className="text-slate-600">Refills allowed: {open.refillsAllowed}</p>}
            {open.image && <img src={open.image} alt="Prescription scan" className="max-h-64 rounded-lg border" />}
            {open.allergyWarnings?.length > 0 && <div className="rounded-lg bg-amber-50 p-3 text-amber-900">{open.allergyWarnings.map((w: string) => <div key={w}>⚠ {w}</div>)}</div>}

            {warn && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="font-semibold text-red-900">Clinical warnings</div>
                {warn.map((w) => <div key={w} className="mt-1 text-red-800">⚠ {w}</div>)}
                <Textarea className="mt-3" rows={2} placeholder="Reason for proceeding (required to override)" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                <div className="mt-2 flex gap-2"><Button variant="danger" disabled={!overrideReason.trim()} onClick={() => verify(true)}>Override and verify</Button><Button variant="outline" onClick={() => setWarn(null)}>Cancel</Button></div>
              </div>
            )}

            {open.notes?.length > 0 && <div><div className="mb-1 font-semibold">Pharmacist notes</div>{open.notes.map((n: any, i: number) => <div key={i} className="border-l-2 border-teal-200 pl-3 text-slate-700"><span className="text-xs text-slate-500">{dateTime(n.at)} · {n.by?.name} · {n.type}</span><div>{n.text}</div></div>)}</div>}
            {open.verifiedBy && <p className="text-slate-600">Verified by {open.verifiedBy.name} on {dateTime(open.verifiedAt)}</p>}
            {open.rejectedReason && <p className="text-red-700">Rejected: {open.rejectedReason}</p>}
            <ErrorNote error={err} />

            {pharmacist && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                {open.hasControlled && !open.paperOriginalSeen && open.status === "pending" && <Button variant="outline" onClick={sight}>Record signed paper original sighted</Button>}
                {open.status === "pending" && (
                  <div className="flex flex-wrap items-end gap-2">
                    <Button onClick={() => verify()}>Verify prescription</Button>
                    <div className="flex flex-1 gap-2"><Input placeholder="Reason for declining" value={reason} onChange={(e) => setReason(e.target.value)} /><Button variant="danger" disabled={!reason.trim()} onClick={reject}>Decline</Button></div>
                  </div>
                )}
                {["verified", "partial"].includes(open.status) && <Button onClick={dispense}>Dispense at {branch?.name}</Button>}
                <div className="flex gap-2"><Input placeholder="Add counselling / intervention note" value={note} onChange={(e) => setNote(e.target.value)} /><Button variant="outline" disabled={!note.trim()} onClick={addNote}>Add note</Button></div>
              </div>
            )}
            {!pharmacist && open.status === "pending" && <p className="text-slate-500">Waiting for a pharmacist to verify.</p>}
          </div>
        )}
      </Modal>

      <Modal open={!!labels} onClose={() => setLabels(null)} title="Dispensed - print labels" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          {labels?.map((l, i) => (
            <div key={i} className="rounded-lg border-2 border-slate-800 p-3 text-sm">
              <div className="font-bold">{l.patient}</div><div className="text-base font-semibold">{l.drug}</div><div>{l.directions}</div>
              <div className="mt-1 text-xs">Qty {l.qty} · Batch {l.batch} · Exp {dateFmt(l.expiry)} · {dateFmt(l.date)} · {l.rxNo}</div>
            </div>
          ))}
        </div>
        <Button className="no-print mt-4" onClick={() => window.print()}><Printer className="h-4 w-4" />Print labels</Button>
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title="Capture prescription" wide>
        {form && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Existing customer (optional)" value={form.customer} onChange={(e) => { const c = (customers.data || []).find((x: any) => x._id === e.target.value); setForm({ ...form, customer: e.target.value, patientName: c?.name || form.patientName }); }}><option value="">-</option>{(customers.data || []).map((c: any) => <option key={c._id} value={c._id}>{c.name} {c.phone}</option>)}</Select>
              <Input label="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
              <Input label="Prescriber name" value={form.prescriber.name} onChange={(e) => setForm({ ...form, prescriber: { ...form.prescriber, name: e.target.value } })} />
              <Input label="Prescriber registration no." value={form.prescriber.regNo} onChange={(e) => setForm({ ...form, prescriber: { ...form.prescriber, regNo: e.target.value } })} />
              <Input label="Facility" value={form.prescriber.facility} onChange={(e) => setForm({ ...form, prescriber: { ...form.prescriber, facility: e.target.value } })} />
              <Input label="Prescriber address" value={form.prescriber.address} onChange={(e) => setForm({ ...form, prescriber: { ...form.prescriber, address: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Medicines</div>
              {form.items.map((it: any, i: number) => (
                <div key={i} className="grid gap-2 sm:grid-cols-6">
                  <div className="sm:col-span-2"><Select value={it.product} onChange={(e) => setItem(i, "product", e.target.value)} aria-label="Medicine"><option value="">Medicine...</option>{(products.data || []).filter((p: any) => p.legalStatus !== "otc").map((p: any) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select></div>
                  <Input placeholder="Dose" value={it.dose} onChange={(e) => setItem(i, "dose", e.target.value)} />
                  <Input placeholder="Frequency" value={it.frequency} onChange={(e) => setItem(i, "frequency", e.target.value)} />
                  <Input placeholder="Duration" value={it.duration} onChange={(e) => setItem(i, "duration", e.target.value)} />
                  <Input placeholder="Qty" type="number" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} />
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, items: [...form.items, { product: "", dose: "", frequency: "", duration: "", qty: "" }] })}>+ Add medicine</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Refills allowed" type="number" min={0} value={form.refillsAllowed} onChange={(e) => setForm({ ...form, refillsAllowed: e.target.value })} hint="Not allowed for the strictest controlled class" />
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Scan or photo of paper original</span><input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-sm" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Insurance / scheme (optional)" value={form.insurance.scheme} onChange={(e) => setForm({ ...form, insurance: { ...form.insurance, scheme: e.target.value } })} />
              <Input label="Member number" value={form.insurance.memberNo} onChange={(e) => setForm({ ...form, insurance: { ...form.insurance, memberNo: e.target.value } })} />
              <Input label="Co-payment" type="number" value={form.insurance.copay} onChange={(e) => setForm({ ...form, insurance: { ...form.insurance, copay: e.target.value } })} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.paperOriginalSeen} onChange={(e) => setForm({ ...form, paperOriginalSeen: e.target.checked })} />Signed paper original has been sighted (required for controlled drugs)</label>
            <ErrorNote error={err} /><Button className="w-full" onClick={submit}>Save prescription</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
