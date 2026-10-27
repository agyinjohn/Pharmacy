"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateFmt } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";

const ROLES = [["branch_manager", "Branch manager"], ["pharmacist", "Pharmacist"], ["technician", "Pharmacy technician / dispenser"], ["cashier", "Cashier"], ["store_officer", "Store officer"], ["accountant", "Accountant"], ["dispatcher", "Dispatcher / rider"], ["auditor", "Auditor / inspector (read-only)"], ["owner", "Owner"]];

export default function Team() {
  const { call, branches, user } = useAuth();
  const list = useLoad(() => call("/users", { branch: null }), []);
  const [f, setF] = useState<any>(null); const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    try {
      const body = { ...f }; if (!body.password) delete body.password;
      if (f._id) await call(`/users/${f._id}`, { method: "PATCH", body, branch: null }); else await call("/users", { body, branch: null });
      setF(null); list.reload();
    } catch (e: any) { setErr(e.message); }
  };
  const toggleBranch = (id: string) => setF({ ...f, branches: f.branches.includes(id) ? f.branches.filter((b: string) => b !== id) : [...f.branches, id] });

  return (
    <div>
      <PageHeader title="Team" subtitle="Users are assigned to one or more branches; permissions apply per branch."
        actions={<Button onClick={() => { setF({ name: "", email: "", password: "", role: "cashier", branches: [], pharmacistRegNo: "", pharmacistLicenseExpiry: "", active: true }); setErr(null); }}><Plus className="h-4 w-4" />Add user</Button>} />
      <Card className="p-4">
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Name", "Role", "Branches", "Registration", "Status", ""]}>
            {(list.data || []).map((u: any) => (
              <tr key={u._id}><Td className="font-medium">{u.name}<div className="text-xs text-slate-500">{u.email}</div></Td><Td>{ROLES.find((r) => r[0] === u.role)?.[1]}</Td>
                <Td>{u.role === "owner" || u.role === "auditor" ? "All" : u.branches.map((b: string) => branches.find((x) => x._id === b)?.code || "?").join(", ")}</Td>
                <Td>{u.pharmacistRegNo ? <>{u.pharmacistRegNo} <span className="text-xs text-slate-500">to {dateFmt(u.pharmacistLicenseExpiry)}</span></> : "-"}</Td>
                <Td>{u.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</Td>
                <Td className="text-right"><Button size="sm" variant="outline" onClick={() => { setF({ ...u, password: "", pharmacistLicenseExpiry: u.pharmacistLicenseExpiry?.slice(0, 10) || "" }); setErr(null); }}>Edit</Button></Td></tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? "Edit user" : "Add user"}>
        {f && <div className="space-y-3">
          <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input label="Email" type="email" value={f.email} disabled={!!f._id} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Input label={f._id ? "New password (leave blank to keep)" : "Password"} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.filter(([r]) => r !== "owner" || user?.role === "owner").map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          {f.role === "pharmacist" && <><Input label="Pharmacist registration no." value={f.pharmacistRegNo || ""} onChange={(e) => setF({ ...f, pharmacistRegNo: e.target.value })} /><Input label="Annual licence expiry" type="date" value={f.pharmacistLicenseExpiry || ""} onChange={(e) => setF({ ...f, pharmacistLicenseExpiry: e.target.value })} /></>}
          <div><div className="mb-1 text-sm font-medium">Branches</div><div className="flex flex-wrap gap-3">{branches.map((b) => <label key={b._id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.branches.includes(b._id)} onChange={() => toggleBranch(b._id)} />{b.name}</label>)}</div></div>
          {f._id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Account active</label>}
          <ErrorNote error={err} /><Button className="w-full" onClick={save}>Save</Button>
        </div>}
      </Modal>
    </div>
  );
}
