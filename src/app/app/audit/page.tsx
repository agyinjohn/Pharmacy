"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime } from "@/lib/api";
import { Badge, Card, ErrorNote, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";

export default function Audit() {
  const { call, branches } = useAuth();
  const [action, setAction] = useState(""); const [branch, setBranch] = useState("all");
  const { data, loading, error } = useLoad(() => call(`/audit?limit=200&branch=${branch}${action ? `&action=${action}` : ""}`, { branch: null }), [action, branch]);
  return (
    <div>
      <PageHeader title="Audit log" subtitle="Every change, login and view of patient or prescription records. Entries cannot be edited or removed." />
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-52"><option value="all">All branches</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</Select>
          <div className="w-60"><Input placeholder="Filter by action prefix, e.g. rx. or stock." value={action} onChange={(e) => setAction(e.target.value)} /></div>
        </div>
        <ErrorNote error={error} />
        {loading && !data ? <Spinner /> : (
          <Table head={["When", "User", "Branch", "Action", "Detail"]} empty="No entries">
            {(data || []).map((a: any) => <tr key={a._id}><Td className="whitespace-nowrap">{dateTime(a.createdAt)}</Td><Td>{a.userName}</Td><Td>{a.branch?.name || "-"}</Td><Td><Badge tone={a.action.startsWith("rx.view") || a.action.startsWith("customer.view") ? "violet" : "slate"}>{a.action}</Badge></Td><Td className="text-slate-700">{a.summary}</Td></tr>)}
          </Table>
        )}
      </Card>
    </div>
  );
}
