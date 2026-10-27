"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Printer, Search, Trash2, PauseCircle, PlayCircle, ScanLine } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { ApiError, dateFmt, dateTime, money } from "@/lib/api";
import { adjustLocalStock, loadCatalog, newClientId, queueOp } from "@/lib/offline";
import { useOffline } from "@/lib/offlineContext";
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, Select } from "@/components/ui";
import { Receipt } from "@/components/Receipt";

type Line = { product: any; qty: number };
const DISCOUNT_LIMIT: Record<string, number> = { cashier: 0.05, pharmacist: 0.1, branch_manager: 0.3, owner: 1 };

export default function POS() {
  const { call, branch, user } = useAuth();
  const [q, setQ] = useState(""); const [results, setResults] = useState<any[]>([]);
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState<any>(null);
  const [custQ, setCustQ] = useState(""); const [custList, setCustList] = useState<any[]>([]);
  const [rxId, setRxId] = useState("");
  const [pays, setPays] = useState<{ method: string; amount: string }[]>([{ method: "cash", amount: "" }]);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [shiftModal, setShiftModal] = useState<"open" | "close" | null>(null);
  const [float, setFloat] = useState("0"); const [counted, setCounted] = useState("");
  const [heldOpen, setHeldOpen] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const { online, setOffline, refresh: refreshQueue } = useOffline();
  const offline = !online;
  const [quote, setQuote] = useState<any>(null);

  const localSearch = async (text: string, barcode: boolean) => {
    const c = branch ? await loadCatalog(branch._id) : undefined;
    if (!c) return [];
    const t = text.toLowerCase();
    return c.products.filter((p) => (barcode ? p.barcode === text : `${p.brand} ${p.generic || ""} ${p.barcode || ""}`.toLowerCase().includes(t))).slice(0, 20);
  };

  const shift = useLoad(() => call("/shifts/current"), [branch?._id], !!branch);
  const held = useLoad(() => call("/sales/held"), [branch?._id, heldOpen], !!branch);
  const rxs = useLoad(() => call("/prescriptions?status=verified").then(async (a: any[]) => [...a, ...(await call("/prescriptions?status=partial"))]).catch(() => []), [branch?._id], !!branch);

  useEffect(() => { barcodeRef.current?.focus(); }, [receipt]);

  const search = useCallback(async (text: string, barcode = false) => {
    if (!text.trim()) { setResults([]); return; }
    try {
      if (!navigator.onLine) { setResults(await localSearch(text, barcode)); return; }
      setResults(await call(`/pos/lookup?${barcode ? "barcode" : "q"}=${encodeURIComponent(text)}`));
    } catch (e: any) { if (e instanceof ApiError && e.status === 0) { setOffline(); setResults(await localSearch(text, barcode)); } else setError(e.message); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, branch?._id]);
  useEffect(() => { const t = setTimeout(() => search(q), 200); return () => clearTimeout(t); }, [q, search]);
  useEffect(() => { if (!custQ) { setCustList([]); return; } const t = setTimeout(() => call(`/customers?q=${encodeURIComponent(custQ)}`).then(setCustList).catch(() => {}), 250); return () => clearTimeout(t); }, [custQ, call]);

  const add = (p: any) => {
    setError(null);
    if (!p.stock) { setError(`${p.brand} is out of stock at this branch. Check substitutes in Products.`); return; }
    setCart((c) => { const i = c.findIndex((l) => l.product._id === p._id); if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: Math.min(p.stock, n[i].qty + 1) }; return n; } return [...c, { product: p, qty: 1 }]; });
  };
  const scan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("barcode") as HTMLInputElement;
    const code = input.value.trim();
    input.value = "";
    if (!code) return;
    try { const r = navigator.onLine ? await call(`/pos/lookup?barcode=${encodeURIComponent(code)}`).catch(async (er) => { if (er instanceof ApiError && er.status === 0) { setOffline(); return localSearch(code, true); } throw er; }) : await localSearch(code, true); if (r[0]) add(r[0]); else setError(`No product with barcode ${code}${offline ? " (offline catalogue only has non-prescription items)" : ""}`); } catch (er: any) { setError(er.message); }
  };
  const setQty = (id: string, d: number) => setCart((c) => c.map((l) => (l.product._id === id ? { ...l, qty: Math.max(1, Math.min(l.product.stock, l.qty + d)) } : l)));

  // Promotions are priced by the server; offline, the till falls back to list prices.
  useEffect(() => {
    if (!cart.length || offline) { setQuote(null); return; }
    const t = setTimeout(() => call("/pos/quote", { body: { items: cart.map((l) => ({ product: l.product._id, qty: l.qty })), discount: Number(discount) || 0 } }).then(setQuote).catch(() => setQuote(null)), 250);
    return () => clearTimeout(t);
  }, [cart, discount, offline, call]);
  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const promoOf = (id: string) => quote?.lines?.find((x: any) => x.product === id);
  const promoTotal = quote?.promoDiscount || 0;
  const rawTax = cart.reduce((s, l) => s + l.product.price * l.qty * (l.product.taxRate || 0), 0);
  const limit = (DISCOUNT_LIMIT[user?.role || ""] ?? 0) * (subtotal - promoTotal);
  const disc = Math.min(Math.max(0, Number(discount) || 0), subtotal - promoTotal);
  const tax = quote ? quote.tax : subtotal ? rawTax * ((subtotal - disc) / subtotal) : 0;
  const total = quote ? quote.total : subtotal - disc + tax;
  const paid = pays.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const needsRx = cart.some((l) => ["prescription_only", "controlled"].includes(l.product.legalStatus));
  const change = Math.max(0, paid - total);

  const reset = () => { setCart([]); setDiscount(0); setCustomer(null); setRxId(""); setPays([{ method: "cash", amount: "" }]); setError(null); };

  const sellOffline = async (payments: { method: string; amount: number }[]) => {
    if (!branch || !user) return;
    if (payments.some((p) => p.method === "credit")) { setError("Account credit needs a connection. Take cash, mobile money or card."); return; }
    const clientId = newClientId();
    const createdAt = new Date().toISOString();
    const items = cart.map((l) => ({ product: l.product._id, qty: l.qty }));
    const receipt = {
      receiptNo: `OFF-${clientId.slice(0, 6).toUpperCase()}`, createdAt, cashier: { name: user.name }, offline: true,
      items: cart.map((l) => ({ name: `${l.product.brand} ${l.product.strength || ""}`.trim(), qty: l.qty, unitPrice: l.product.price, tax: l.product.price * l.qty * (l.product.taxRate || 0), lineTotal: l.product.price * l.qty })),
      subtotal, discount: disc, tax, total, payments, changeGiven: change,
    };
    if (payments.some((p) => p.method === "loyalty")) { setError("Loyalty points need a connection."); return; }
    await queueOp({ clientId, kind: "sale", branch: branch._id, createdAt, payload: { items, payments, discount: disc, customer: customer?._id }, label: `${receipt.receiptNo} · ${money(total)}`, receipt, status: "pending" });
    await adjustLocalStock(branch._id, items);
    setReceipt(receipt); reset(); refreshQueue();
  };

  const pay = async () => {
    setBusy(true); setError(null);
    const payments = pays.filter((p) => Number(p.amount) > 0).map((p) => ({ method: p.method, amount: Number(p.amount) }));
    try {
      if (!navigator.onLine) { await sellOffline(payments); return; }
      const sale = await call("/sales", { body: { items: cart.map((l) => ({ product: l.product._id, qty: l.qty })), customer: customer?._id, discount: disc, payments, prescription: needsRx ? rxId : undefined } });
      setReceipt(sale); reset(); shift.reload();
    } catch (e: any) {
      // Connection dropped mid-sale: fall back to offline selling when every item allows it.
      if (e instanceof ApiError && e.status === 0 && !needsRx) { setOffline(); await sellOffline(payments); }
      else setError(e.message);
    } finally { setBusy(false); }
  };

  const hold = async () => { try { await call("/sales/hold", { body: { items: cart.map((l) => ({ product: l.product._id, qty: l.qty })), customer: customer?._id } }); reset(); held.reload(); } catch (e: any) { setError(e.message); } };
  const recall = async (h: any) => {
    const prods = await Promise.all(h.items.map((i: any) => call(`/pos/lookup?q=${encodeURIComponent(i.name)}`).then((r: any[]) => r.find((p) => p._id === i.product))));
    setCart(h.items.map((i: any, k: number) => ({ product: prods[k], qty: i.qty })).filter((l: Line) => l.product));
    await call(`/sales/held/${h._id}`, { method: "DELETE" }); setHeldOpen(false);
  };

  const openShift = async () => { try { await call("/shifts/open", { body: { openingCash: Number(float) } }); setShiftModal(null); shift.reload(); } catch (e: any) { setError(e.message); } };
  const closeShift = async () => { try { const s = await call("/shifts/close", { body: { countedCash: Number(counted) } }); setShiftModal(null); shift.reload(); alert(`Shift closed. Expected cash ${money(s.expectedCash)}, counted ${money(s.countedCash)}, variance ${money(s.variance)}`); } catch (e: any) { setError(e.message); } };

  if (!branch) return null;
  return (
    <div>
      <PageHeader title="Point of sale" subtitle={branch.name}
        actions={<>
          {shift.data ? <><Badge tone="green">Shift open since {dateTime(shift.data.openedAt)}</Badge><Button size="sm" variant="outline" onClick={() => setShiftModal("close")}>Close shift</Button></>
            : <Button size="sm" onClick={() => setShiftModal("open")}>Open shift</Button>}
          <Button size="sm" variant="outline" onClick={() => setHeldOpen(true)}><PlayCircle className="h-4 w-4" />Held ({held.data?.length || 0})</Button>
        </>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card className="p-4">
            <form onSubmit={scan} className="flex gap-2">
              <div className="relative flex-1"><ScanLine className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input ref={barcodeRef} name="barcode" autoComplete="off" placeholder="Scan barcode and press Enter" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" /></div>
            </form>
            <div className="relative mt-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand or generic name" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" /></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {results.map((p) => (
                <button key={p._id} onClick={() => add(p)} className="rounded-lg border border-slate-200 p-3 text-left hover:border-teal-500 hover:bg-teal-50/40">
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-medium">{p.brand} {p.strength}</span><span className="text-sm font-semibold tabular-nums">{money(p.price)}</span></div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">{p.generic}
                    {p.legalStatus === "prescription_only" && <Badge tone="amber">Rx</Badge>}{p.legalStatus === "controlled" && <Badge tone="red">Controlled</Badge>}{p.legalStatus === "pharmacy_only" && <Badge tone="blue">Pharmacy only</Badge>}
                    <span className={p.stock ? (p.stock < 10 ? "text-amber-700" : "text-emerald-700") : "text-red-700"}>{p.stock ? `${p.stock} in stock` : "Out of stock"}</span>
                    {p.nextExpiry && p.stock > 0 && <span>exp {dateFmt(p.nextExpiry)}</span>}
                  </div>
                </button>
              ))}
              {q && !results.length && <p className="col-span-full py-6 text-center text-sm text-slate-500">No matches</p>}
            </div>
          </Card>
        </div>

        <Card className="p-4 lg:col-span-2">
          <h2 className="font-semibold">Basket</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {cart.map((l) => (
              <div key={l.product._id} className="flex items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{l.product.brand} {l.product.strength}</div><div className="text-xs text-slate-500">{money(l.product.price)} each{promoOf(l.product._id)?.promoDiscount > 0 && <span className="ml-1 font-medium text-emerald-700">{promoOf(l.product._id).promoName}: -{money(promoOf(l.product._id).promoDiscount)}</span>}</div></div>
                <div className="flex items-center gap-1"><button aria-label="Less" onClick={() => setQty(l.product._id, -1)} className="rounded border border-slate-200 p-1 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button><span className="w-7 text-center tabular-nums">{l.qty}</span><button aria-label="More" onClick={() => setQty(l.product._id, 1)} className="rounded border border-slate-200 p-1 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button></div>
                <div className="w-20 text-right tabular-nums">{money(l.product.price * l.qty)}</div>
                <button aria-label="Remove" onClick={() => setCart(cart.filter((x) => x !== l))} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!cart.length && <p className="py-8 text-center text-sm text-slate-500">Scan or search to add items</p>}
          </div>

          {cart.length > 0 && (
            <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
              {needsRx && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="font-medium text-amber-900">Prescription items in basket</div>
                  {user?.role !== "pharmacist" && user?.role !== "owner" ? <p className="mt-1 text-amber-800">Only a registered pharmacist can sell these. Hand over to the pharmacist or dispense from Prescriptions.</p> : (
                    <Select className="mt-2" value={rxId} onChange={(e) => setRxId(e.target.value)} aria-label="Prescription">
                      <option value="">Select verified prescription...</option>
                      {(rxs.data || []).map((r: any) => <option key={r._id} value={r._id}>{r.rxNo} - {r.patientName}</option>)}
                    </Select>
                  )}
                </div>
              )}
              <div className="relative">
                {customer ? <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{customer.name} <span className="text-slate-500">{customer.phone}</span>{customer.loyaltyPoints > 0 && <Badge tone="violet">{customer.loyaltyPoints} pts</Badge>}</span><button className="text-xs text-teal-700" onClick={() => setCustomer(null)}>Remove</button></div> : (
                  <>
                    <Input placeholder="Attach customer (optional)" value={custQ} onChange={(e) => setCustQ(e.target.value)} />
                    {custList.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">{custList.map((c) => <button key={c._id} onClick={() => { setCustomer(c); setCustQ(""); setCustList([]); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{c.name} <span className="text-slate-500">{c.phone}</span>{c.creditLimit > 0 && <Badge tone="blue">Credit</Badge>}</button>)}</div>}
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 items-end gap-3">
                <Input label={`Discount (max ${money(limit)})`} type="number" min={0} step="0.01" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
                <div className="text-right text-sm text-slate-600"><div>Subtotal {money(subtotal)}</div>{promoTotal > 0 && <div className="text-emerald-700">Promotions -{money(promoTotal)}</div>}{tax > 0 && <div>Tax {money(tax)}</div>}</div>
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-200 pt-3"><span className="font-medium">Total</span><span className="text-2xl font-bold tabular-nums">{money(total)}</span></div>

              <div className="space-y-2">
                {pays.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={p.method} onChange={(e) => setPays(pays.map((x, k) => (k === i ? { ...x, method: e.target.value } : x)))} className="rounded-lg border border-slate-300 px-2 py-2 text-sm" aria-label="Payment method">
                      <option value="cash">Cash</option><option value="momo">Mobile money</option><option value="card">Card</option>{customer?.creditLimit > 0 && <option value="credit">Account credit</option>}{customer?.loyaltyPoints > 0 && online && <option value="loyalty">Loyalty points</option>}
                    </select>
                    <input type="number" min={0} step="0.01" placeholder="Amount" value={p.amount} onChange={(e) => setPays(pays.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)))} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums" />
                    <Button size="sm" variant="outline" onClick={() => setPays(pays.map((x, k) => (k === i ? { ...x, amount: String(Math.max(0, total - paid + (Number(x.amount) || 0)).toFixed(2)) } : x)))}>Rest</Button>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm"><button onClick={() => setPays([...pays, { method: "momo", amount: "" }])} className="text-teal-700 hover:underline">+ Split payment</button>{change > 0 && <span className="font-medium text-emerald-700">Change {money(change)}</span>}</div>
              </div>
              <ErrorNote error={error} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={hold}><PauseCircle className="h-4 w-4" />Hold</Button>
                <Button className="flex-1" size="lg" loading={busy} disabled={paid + 0.001 < total || (needsRx && !rxId)} onClick={pay}>Charge {money(total)}</Button>
              </div>
            </div>
          )}
          {!cart.length && <ErrorNote error={error} />}
        </Card>
      </div>

      <Modal open={shiftModal === "open"} onClose={() => setShiftModal(null)} title="Open shift">
        <Input label="Opening cash float (GH₵)" type="number" value={float} onChange={(e) => setFloat(e.target.value)} />
        <Button className="mt-4 w-full" onClick={openShift}>Open shift</Button>
      </Modal>
      <Modal open={shiftModal === "close"} onClose={() => setShiftModal(null)} title="Close shift">
        <p className="mb-3 text-sm text-slate-600">Count the drawer and enter the total cash. Expected: {money((shift.data?.openingCash || 0) + (shift.data?.cashSales || 0))}</p>
        <Input label="Counted cash (GH₵)" type="number" value={counted} onChange={(e) => setCounted(e.target.value)} />
        <Button className="mt-4 w-full" onClick={closeShift}>Close shift</Button>
      </Modal>
      <Modal open={heldOpen} onClose={() => setHeldOpen(false)} title="Held sales">
        {(held.data || []).map((h: any) => <div key={h._id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm"><span>{h.items.length} item(s) · {dateTime(h.createdAt)}</span><Button size="sm" onClick={() => recall(h)}>Recall</Button></div>)}
        {!held.data?.length && <p className="py-4 text-center text-sm text-slate-500">No held sales</p>}
      </Modal>
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Sale complete">
        {receipt && <Receipt sale={receipt} branch={branch} />}
        <div className="no-print mt-4 flex gap-2"><Button className="flex-1" onClick={() => window.print()}><Printer className="h-4 w-4" />Print receipt</Button><Button variant="outline" onClick={() => setReceipt(null)}>New sale</Button></div>
      </Modal>
    </div>
  );
}
