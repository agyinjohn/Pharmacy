"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FilePlus2, Pill, Printer, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOffline } from "@/lib/offlineContext";
import { loadRxSnapshot, newClientId, queueOp, saveRxSnapshot } from "@/lib/offline";
import { useLoad } from "@/lib/useLoad";
import { DirectionInputs, DirectionLists } from "@/components/Directions";
import { ApiError, dateFmt, dateTime } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Table, Td, Textarea, Ref, Tabs, humanize } from "@/components/ui";

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
  const [open, setOpenRaw] = useState<any>(null);
  const setOpen = (v: any) => { setOpenRaw(v); setRemind(true); setDeclining(false); setDirs(v ? Object.fromEntries(v.items.map((i: any) => [i.product, { dose: i.dose || "", frequency: i.frequency || "", duration: i.duration || "" }])) : {}); };
  const [dirs, setDirs] = useState<Record<string, { dose: string; frequency: string; duration: string }>>({}); const [declining, setDeclining] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string[] | null>(null); const [overrideReason, setOverrideReason] = useState("");
  const [labels, setLabels] = useState<any[] | null>(null);
  const [remind, setRemind] = useState(true); const [madeReminders, setMadeReminders] = useState<any[]>([]);
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

  // The pharmacist types the prescriber's directions; they feed the labels and dose reminders.
  const editDirs = !!open && pharmacist && open.status === "pending";
  const dirsChanged = editDirs && open.items.some((i: any) => ["dose", "frequency", "duration"].some((k) => (dirs[i.product] as any)?.[k] !== (i[k] || "")));
  const missingDirs = editDirs && open.items.some((i: any) => !dirs[i.product]?.dose.trim() || !dirs[i.product]?.frequency.trim());
  const saveDirs = async () => {
    setErr(null);
    try { const r = await call(`/prescriptions/${open._id}/directions`, { method: "PATCH", body: { items: Object.entries(dirs).map(([product, d]) => ({ product, ...d })) } }); setOpenRaw(r); return true; }
    catch (e: any) { setErr(e.message); return false; }
  };
  const verify = async (override = false) => { if (dirsChanged && !(await saveDirs())) return; const r = await act("verify", override ? { override: true, overrideReason } : {}); if (r) { setWarn(null); setOverrideReason(""); afterAct(); } };
  const reject = async () => { if (await act("reject", { reason })) { setReason(""); setDeclining(false); afterAct(); } };
  const addNote = async () => { if (await act("notes", { type: "counselling", text: note })) { setNote(""); afterAct(); } };
  const sight = async () => { if (await act("paper-sighted")) afterAct(); };
  const dispense = async () => { const r = await act("dispense", { reminders: remind }); if (r) { setLabels(r.labels); setMadeReminders(r.reminders || []); afterAct(); } };

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
            {snap.prescriptions.filter((r: any) => r.items.some((i: any) => i.dispensedQty < i.max)).map((r: any) => <tr key={r._id}><Td><Ref>{r.rxNo}</Ref></Td><Td>{r.patientName}</Td><Td>{r.items.map((i: any) => `${i.name} ${i.dispensedQty}/${i.max}`).join(", ")}</Td><Td>{r.allergies?.length ? <Badge tone="red">{r.allergies.join(", ")}</Badge> : "-"}</Td><Td className="text-right"><Button size="sm" onClick={() => dispenseOffline(r)}>Dispense offline</Button></Td></tr>)}
          </Table>}
        </Card>
      )}
      <Card className="p-4">
        <Tabs value={status} onChange={setStatus} items={[["", "All"], ["pending", "To verify"], ["verified", "Ready to dispense"], ["partial", "Refills left"], ["dispensed", "Dispensed"], ["rejected", "Declined"]]} />
        <ErrorNote error={list.error} />
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Rx no.", "Patient", "Prescriber", "Items", "Source", "Status", "Date", ""]} empty="No prescriptions">
            {(list.data || []).map((r: any) => (
              <tr key={r._id}>
                <Td><Ref>{r.rxNo}</Ref></Td><Td className="font-medium">{r.patientName}</Td><Td>{r.prescriber?.name}</Td>
                <Td>{r.items.map((i: any) => i.name).join(", ")} {r.hasControlled && <Badge tone="red">Controlled</Badge>}</Td>
                <Td>{r.source === "online" ? "Online" : r.source === "prescriber" ? "Prescriber" : "Walk-in"}</Td><Td><StatusBadge s={r.status} /></Td><Td>{dateFmt(r.createdAt)}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => load(r._id)}>View</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={`Prescription ${open?.rxNo || ""}`} wide>
        {open && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge s={open.status} />
              {open.hasControlled && <Badge tone="red">Controlled drug</Badge>}
              {open.paperOriginalSeen ? <Badge tone="green">Paper original sighted</Badge> : open.hasControlled && <Badge tone="amber">Paper original not yet sighted</Badge>}
              <span className="ml-auto text-xs text-slate-500">{open.source === "online" ? "Uploaded online" : open.source === "prescriber" ? "Sent by prescriber" : "Walk-in"} · {dateTime(open.createdAt)}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{open.patientName}</div>
                {open.customer?.phone && <div className="text-xs text-slate-500">{open.customer.phone}</div>}
                {open.customer?.allergies?.length > 0
                  ? <div className="mt-2 flex items-center gap-1.5 text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Allergic to <b>{open.customer.allergies.join(", ")}</b></span></div>
                  : open.customer && <div className="mt-2 text-xs text-slate-500">No known allergies recorded</div>}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Prescriber</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{open.prescriber?.name}</div>
                <div className="text-xs text-slate-500">{[open.prescriber?.regNo, open.prescriber?.facility].filter(Boolean).join(" · ")}</div>
              </div>
            </div>

            {editDirs && <DirectionLists />}
            {editDirs && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-slate-600">{open.image ? "Read the directions on the prescription below and type them in for each medicine." : "Check the directions match the paper prescription."} They print on the label and set the patient's dose reminders.</p>
                {dirsChanged && <Button size="sm" variant="outline" onClick={saveDirs}>Save directions</Button>}
              </div>
            )}
            {editDirs && open.image && <a href={open.image} target="_blank" rel="noreferrer" className="block"><img src={open.image} alt="Uploaded prescription" className="max-h-80 w-full rounded-lg border bg-slate-50 object-contain" /></a>}
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {open.items.map((i: any, k: number) => {
                const total = i.qty * (1 + open.refillsAllowed);
                return (
                  <div key={k} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">{i.name}</div>
                      {editDirs ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-3"><DirectionInputs value={dirs[i.product] || {}} onChange={(patch) => setDirs({ ...dirs, [i.product]: { ...dirs[i.product], ...patch } })} /></div>
                      ) : <div className="text-slate-600">{[i.dose, i.frequency, i.duration].filter(Boolean).join(" · ") || <span className="text-amber-700">No directions entered</span>}</div>}
                    </div>
                    <div className="w-16 text-right"><div className="font-medium tabular-nums">{i.qty}</div><div className="text-xs text-slate-500">per fill</div></div>
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-slate-500"><span>Supplied</span><span className="tabular-nums">{i.dispensedQty} of {total}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${Math.min(100, (i.dispensedQty / total) * 100)}%` }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
            {open.refillsAllowed > 0 && <p className="-mt-3 text-xs text-slate-500">Includes {open.refillsAllowed} refill{open.refillsAllowed > 1 ? "s" : ""}.</p>}
            {open.image && !editDirs && <img src={open.image} alt="Prescription scan" className="max-h-64 rounded-lg border" />}
            {open.allergyWarnings?.length > 0 && !warn && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">{open.allergyWarnings.map((w: string) => <div key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}</div>)}</div>}

            {warn && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-red-900"><ShieldAlert className="h-5 w-5" />Check before verifying</div>
                <ul className="mt-2 space-y-1 text-red-800">{warn.map((w) => <li key={w}>{w.replace(/^ALLERGY:\s*/i, "Allergy: ")}</li>)}</ul>
                <p className="mt-3 text-xs text-red-800">To continue anyway, record your clinical reason. It is saved with your name in the audit log.</p>
                <Textarea className="mt-1.5 bg-white" rows={2} placeholder="e.g. Confirmed with prescriber, patient tolerated amoxicillin before" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => setWarn(null)}>Don't verify</Button><Button variant="danger" disabled={!overrideReason.trim()} onClick={() => verify(true)}>Override and verify</Button></div>
              </div>
            )}

            {open.verifiedBy && <p className="flex items-center gap-1.5 text-slate-600"><CheckCircle2 className="h-4 w-4 text-brand-600" />Verified by {open.verifiedBy.name} on {dateTime(open.verifiedAt)}</p>}
            {open.rejectedReason && <p className="text-red-700">Declined: {open.rejectedReason}</p>}

            {(open.notes?.length > 0 || pharmacist) && (
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Pharmacist notes</div>
                {open.notes?.map((n: any, i: number) => <div key={i} className="mb-2 border-l-2 border-brand-200 pl-3"><div className="text-xs text-slate-500">{dateTime(n.at)} · {n.by?.name} · {humanize(n.type)}</div><div className="text-slate-700">{n.text}</div></div>)}
                {pharmacist && <div className="flex gap-2"><div className="flex-1"><Input placeholder="Add a counselling or intervention note" value={note} onChange={(e) => setNote(e.target.value)} /></div><Button variant="outline" disabled={!note.trim()} onClick={addNote}>Add note</Button></div>}
              </div>
            )}
            <ErrorNote error={err} />

            {pharmacist && !(warn && open.status === "pending") && (
              <div className="-mx-5 -mb-5 border-t border-slate-200 bg-slate-50 px-5 py-4">
                {open.hasControlled && !open.paperOriginalSeen && open.status === "pending" && <Button className="mb-3" variant="outline" onClick={sight}>Record signed paper original sighted</Button>}
                {open.status === "pending" && !declining && !warn && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button variant="ghost" onClick={() => setDeclining(true)}>Decline…</Button>
                    <span className="flex flex-wrap items-center justify-end gap-3">{missingDirs && <span className="text-xs text-slate-500">Enter the dose and how often for each medicine first</span>}<Button disabled={missingDirs} onClick={() => verify()}><CheckCircle2 className="h-4 w-4" />Verify prescription</Button></span>
                  </div>
                )}
                {open.status === "pending" && declining && (
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1"><Input autoFocus placeholder="Reason for declining (shared with the patient)" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                    <Button variant="outline" onClick={() => { setDeclining(false); setReason(""); }}>Cancel</Button>
                    <Button variant="danger" disabled={!reason.trim()} onClick={reject}>Decline</Button>
                  </div>
                )}
                {["verified", "partial"].includes(open.status) && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {open.customer ? <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={remind} onChange={(e) => setRemind(e.target.checked)} />Send the patient dose reminders by SMS</label> : <span />}
                    <Button onClick={dispense}><Pill className="h-4 w-4" />Dispense at {branch?.name}</Button>
                  </div>
                )}
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
              <div className="font-bold">{l.patient}</div><div className="text-base font-semibold">{l.drug}</div><div>{l.directions}</div>{l.warnings && <div className="mt-1 text-xs font-medium">{l.warnings}</div>}
              <div className="mt-1 text-xs">Qty {l.qty} · Batch {l.batch} · Exp {dateFmt(l.expiry)} · {dateFmt(l.date)} · {l.rxNo}</div>
            </div>
          ))}
        </div>
        {madeReminders.length > 0 && <div className="no-print mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900"><b>Dose reminders set up:</b> {madeReminders.map((m) => `${m.medicine} at ${m.times.join(", ")}${m.endDate ? ` until ${dateFmt(m.endDate)}` : ""}`).join("; ")}. The patient can pause or stop them in the online store. Change them on the customer record.</div>}
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
              <div className="text-sm font-medium">Medicines <span className="font-normal text-slate-500">and the prescriber's directions</span></div>
              <DirectionLists />
              {form.items.map((it: any, i: number) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-2 sm:grid-cols-6">
                    <div className="sm:col-span-2"><Select value={it.product} onChange={(e) => setItem(i, "product", e.target.value)} aria-label="Medicine"><option value="">Medicine...</option>{(products.data || []).filter((p: any) => p.legalStatus !== "otc").map((p: any) => <option key={p._id} value={p._id}>{p.brand} {p.strength}</option>)}</Select></div>
                    <DirectionInputs value={it} onChange={(patch) => setForm({ ...form, items: form.items.map((x: any, n: number) => (n === i ? { ...x, ...patch } : x)) })} />
                    <Input placeholder="Qty" aria-label="Quantity" type="number" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} />
                  </div>
                  {(() => { const p = (products.data || []).find((x: any) => x._id === it.product); return p?.directions ? <p className="mt-2 text-xs text-slate-500"><span className="font-medium text-slate-600">Usual directions:</span> {p.directions} The prescriber's directions come first.</p> : null; })()}
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
