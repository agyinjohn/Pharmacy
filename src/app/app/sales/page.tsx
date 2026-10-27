"use client";
import { useState } from "react";
import { Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { dateTime, money } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Spinner, StatusBadge, Table, Td } from "@/components/ui";
import { Receipt } from "@/components/Receipt";

export default function Sales() {
  const { call, branch } = useAuth();
  const [flagged, setFlagged] = useState(false);
  const list = useLoad<any[]>(() => call("/sales?limit=200"), [branch?._id]);
  const [sale, setSale] = useState<any>(null); const [reason, setReason] = useState(""); const [err, setErr] = useState<string | null>(null);
  const rows = (list.data || []).filter((s) => !flagged || s.flags?.length);
  const open = async (id: string) => { setErr(null); setReason(""); setSale(await call(`/sales/${id}`)); };
  const refund = async () => { setErr(null); try { await call(`/sales/${sale._id}/refund`, { body: { reason } }); setSale(null); list.reload(); } catch (e: any) { setErr(e.message); } };

  return (
    <div>
      <PageHeader title="Sales" subtitle={`${branch?.name} - recent receipts, refunds, and offline sales flagged on sync`}
        actions={<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} />Flagged only</label>} />
      <Card className="p-4">
        <ErrorNote error={list.error} />
        {list.loading && !list.data ? <Spinner /> : (
          <Table head={["Receipt", "When", "Branch", "Cashier", "Customer", "Total", "Status", ""]} empty="No sales">
            {rows.map((s: any) => (
              <tr key={s._id}>
                <Td className="font-mono text-xs">{s.receiptNo} {s.offlineAt && <Badge tone="blue">offline</Badge>}</Td><Td>{dateTime(s.createdAt)}</Td><Td>{s.branch?.name}</Td><Td>{s.cashier?.name}</Td><Td>{s.customer?.name || "-"}</Td>
                <Td className="tabular-nums">{money(s.total)}</Td><Td><StatusBadge s={s.status} />{s.flags?.length > 0 && <Badge tone="red">{s.flags.length} flag</Badge>}</Td>
                <Td className="text-right"><Button size="sm" variant="outline" onClick={() => open(s._id)}>Open</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!sale} onClose={() => setSale(null)} title={`Receipt ${sale?.receiptNo || ""}`}>
        {sale && <div className="space-y-4">
          {sale.flags?.length > 0 && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{sale.flags.map((f: string) => <div key={f}>⚠ {f}</div>)}<div className="mt-1 text-xs">Review and correct stock with an adjustment if needed.</div></div>}
          <Receipt sale={sale} branch={sale.branch} />
          {sale.refunds?.length > 0 && <div className="text-sm text-slate-600">Refunds: {sale.refunds.map((r: any) => `${money(r.amount)} (${r.reason})`).join("; ")}</div>}
          <div className="no-print space-y-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Reprint</Button>
            {["completed", "partially_refunded"].includes(sale.status) && <div className="flex gap-2"><Input placeholder="Reason for refund (full refund of remaining items)" value={reason} onChange={(e) => setReason(e.target.value)} /><Button variant="danger" disabled={!reason.trim()} onClick={refund}>Refund</Button></div>}
            <ErrorNote error={err} />
          </div>
        </div>}
      </Modal>
    </div>
  );
}
