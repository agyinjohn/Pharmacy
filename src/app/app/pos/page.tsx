"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Printer, Trash2, PauseCircle, PlayCircle, ScanLine, X, UserRound, ShoppingBasket, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { ApiError, dateFmt, dateTime, money } from "@/lib/api";
import { adjustLocalStock, loadCatalog, newClientId, queueOp } from "@/lib/offline";
import { useOffline } from "@/lib/offlineContext";
import { Badge, Button, ErrorNote, Input, Modal, Select, cn } from "@/components/ui";
import { Receipt } from "@/components/Receipt";
import ProductImage from "@/components/ProductImage";

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
  const since = shift.data?.openedAt || new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const recent = useLoad<any[]>(() => call(`/sales?limit=300&from=${encodeURIComponent(since)}`).catch(() => []), [branch?._id, since, receipt], !!branch && !shift.loading);
  const rxs = useLoad(() => call("/prescriptions?status=verified").then(async (a: any[]) => [...a, ...(await call("/prescriptions?status=partial"))]).catch(() => []), [branch?._id], !!branch);

  useEffect(() => { barcodeRef.current?.focus(); }, [receipt]);

  // Everyday items to tap when nothing is typed (non-prescription catalogue for this branch).
  const catalog = useLoad<any[]>(() => call("/pos/catalog").then((c: any) => c.products).catch(async () => (branch ? (await loadCatalog(branch._id))?.products || [] : [])), [branch?._id], !!branch);
  const [cat, setCat] = useState("All");
  const categories = ["All", ...Array.from(new Set((catalog.data || []).map((p: any) => p.category).filter(Boolean))) as string[]];
  const browse = (catalog.data || []).filter((p: any) => cat === "All" || p.category === cat);
  const inCart = (id: string) => cart.find((l) => l.product._id === id)?.qty || 0;

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
  // One box for both: a scanner types the barcode and presses Enter; people type a name.
  const scan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = q.trim();
    if (!code) return;
    if (results.length === 1) { add(results[0]); setQ(""); return; }
    setQ("");
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
      items: cart.map((l) => ({ name: `${l.product.brand} ${l.product.strength || ""}`.trim(), directions: [l.product.directions, l.product.warnings].filter(Boolean).join(" ") || undefined, qty: l.qty, unitPrice: l.product.price, tax: l.product.price * l.qty * (l.product.taxRate || 0), lineTotal: l.product.price * l.qty })),
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
  const methods: [string, string][] = [["cash", "Cash"], ["momo", "MoMo"], ["card", "Card"], ...(customer?.creditLimit > 0 ? [["credit", "Account"] as [string, string]] : []), ...(customer?.loyaltyPoints > 0 && online ? [["loyalty", "Points"] as [string, string]] : [])];
  const setPay = (i: number, patch: any) => setPays(pays.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const tiles = q.trim() ? results : browse;
  const units = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="flex flex-col lg:h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-3"><h1 className="text-lg font-semibold tracking-tight">Point of sale</h1><span className="text-sm text-slate-500">{branch.name}</span></div>
        <div className="flex items-center gap-2">
          {shift.data
            ? <><span className="hidden items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Shift open since {dateTime(shift.data.openedAt).split(", ")[1] || dateTime(shift.data.openedAt)}</span><Button size="sm" variant="outline" onClick={() => setShiftModal("close")}>Close shift</Button></>
            : <Button size="sm" onClick={() => setShiftModal("open")}>Open shift</Button>}
          <Button size="sm" variant="outline" onClick={() => setHeldOpen(true)}><PlayCircle className="h-4 w-4" />Held{held.data?.length ? <span className="rounded bg-slate-900 px-1.5 text-[11px] text-white">{held.data.length}</span> : null}</Button>
        </div>
      </div>

      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[1fr_400px]">
        {/* Products */}
        <div className="min-w-0 px-4 py-5 sm:px-6 lg:overflow-y-auto">
          <form onSubmit={scan} className="relative">
            <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input ref={barcodeRef} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" aria-label="Scan a barcode or search products"
              placeholder="Scan a barcode or type a medicine name" className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-10 text-[15px] outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-900/5" />
            {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
          </form>
          {!q.trim() && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => <button key={c} onClick={() => setCat(c)} className={cn("whitespace-nowrap rounded-full border px-3 py-1 text-sm transition", cat === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400")}>{c}</button>)}
            </div>
          )}
          {q.trim() && <p className="mt-4 text-sm text-slate-500">{results.length ? `${results.length} result${results.length > 1 ? "s" : ""} for "${q}"` : `No matches for "${q}"`}{results.length === 1 ? " · press Enter to add" : ""}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {tiles.map((p: any) => {
              const n = inCart(p._id); const out = !p.stock;
              return (
                <button key={p._id} onClick={() => add(p)} disabled={out} className={cn("group relative flex flex-col overflow-hidden rounded-lg border bg-white text-left transition", out ? "cursor-not-allowed border-slate-200 opacity-60" : n ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-400 hover:shadow-sm")}>
                  <ProductImage product={p} size="sm" className="aspect-[16/9] w-full border-b border-slate-100" />
                  {n > 0 && <span className="absolute right-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-slate-900 px-1.5 text-xs font-semibold text-white">{n}</span>}
                  <div className="flex flex-1 flex-col p-3">
                    <div className="line-clamp-2 text-sm font-medium leading-snug text-slate-900">{p.brand}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">{[p.strength, p.generic].filter(Boolean).join(" · ")}</div>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{money(p.price)}</span>
                      <span className={cn("text-[11px]", out ? "text-red-700" : p.stock < 10 ? "text-amber-700" : "text-slate-500")}>{out ? "Out of stock" : `${p.stock} left`}</span>
                    </div>
                    {(p.legalStatus === "prescription_only" || p.legalStatus === "controlled") && <span className="mt-1.5 w-fit rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-amber-700/15">{p.legalStatus === "controlled" ? "Controlled" : "Prescription"}</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {!q.trim() && catalog.data && !browse.length && <p className="mt-10 text-center text-sm text-slate-500">No products to show. Search above for prescription medicines.</p>}
          {!q.trim() && <p className="mt-6 text-xs text-slate-400">Prescription-only medicines are not listed here; search for them by name.</p>}
        </div>

        {/* Basket */}
        <aside id="basket" className="flex scroll-mt-14 flex-col border-t border-slate-200 bg-white lg:min-h-0 lg:border-l lg:border-t-0">
          <div className="border-b border-slate-200 px-5 py-3">
            {customer ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{customer.name.split(" ").map((x: string) => x[0]).slice(0, 2).join("")}</span><span className="min-w-0"><span className="block truncate font-medium">{customer.name}</span><span className="text-xs text-slate-500">{customer.phone}{customer.loyaltyPoints > 0 ? ` · ${customer.loyaltyPoints} points` : ""}{customer.allergies?.length ? ` · allergic to ${customer.allergies.join(", ")}` : ""}</span></span></span>
                <button className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Remove customer" onClick={() => setCustomer(null)}><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Add customer (optional)" aria-label="Find customer" className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:bg-white" />
                {custList.length > 0 && <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">{custList.map((c) => <button key={c._id} onClick={() => { setCustomer(c); setCustQ(""); setCustList([]); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"><span>{c.name} <span className="text-slate-500">{c.phone}</span></span>{c.creditLimit > 0 && <Badge tone="slate">Account</Badge>}</button>)}</div>}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5">
            {cart.map((l) => {
              const pr = promoOf(l.product._id);
              return (
                <div key={l.product._id} className="border-b border-slate-100 py-3">
                <div className="flex items-center gap-3">
                  <ProductImage product={l.product} size="xs" className="h-10 w-10 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.product.brand}</div>
                    <div className="truncate text-xs text-slate-500">{[l.product.strength, money(l.product.price)].filter(Boolean).join(" · ")}{pr?.promoDiscount > 0 && <span className="ml-1 text-emerald-700">· {pr.promoName}</span>}</div>
                  </div>
                  <div className="flex items-center rounded-md border border-slate-200">
                    <button aria-label="One less" onClick={() => (l.qty === 1 ? setCart(cart.filter((x) => x !== l)) : setQty(l.product._id, -1))} className="grid h-7 w-7 place-items-center text-slate-500 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-sm tabular-nums">{l.qty}</span>
                    <button aria-label="One more" onClick={() => setQty(l.product._id, 1)} className="grid h-7 w-7 place-items-center text-slate-500 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="w-[4.75rem] text-right text-sm font-medium tabular-nums">{money(l.product.price * l.qty - (pr?.promoDiscount || 0))}</div>
                </div>
                {(l.product.directions || l.product.warnings) && <div className="ml-[3.25rem] mt-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"><span className="font-medium text-slate-700">Tell the customer: </span>{l.product.directions}{l.product.warnings && <span className="block text-amber-800">{l.product.warnings}</span>}</div>}
                </div>
              );
            })}
            {!cart.length && (
              <div className="flex min-h-full flex-col py-5">
                <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-200 px-6 py-8 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100"><ShoppingBasket className="h-6 w-6 text-slate-500" strokeWidth={1.75} /></span>
                  <p className="mt-3 font-medium text-slate-900">Ready for the next customer</p>
                  <p className="mt-1 text-sm text-slate-500">Scan a barcode, type a medicine name, or tap a product to start a sale.</p>
                </div>

                {(held.data || []).length > 0 && (
                  <section className="mt-6">
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">On hold</h3>
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {(held.data || []).slice(0, 3).map((h: any) => (
                        <div key={h._id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                          <PauseCircle className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1"><div className="truncate text-slate-800">{h.items.map((i: any) => `${i.name} × ${i.qty}`).join(", ")}</div><div className="text-xs text-slate-500">Held {dateTime(h.createdAt)}</div></div>
                          <Button size="sm" variant="outline" onClick={() => recall(h)}>Resume</Button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="mt-6">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{shift.data ? "This shift" : "Today"}</h3>
                    {recent.data && <span className="text-xs text-slate-500">{recent.data.length} sale{recent.data.length === 1 ? "" : "s"} · <span className="font-medium text-slate-700 tabular-nums">{money(recent.data.reduce((a: number, x: any) => a + x.total, 0))}</span></span>}
                  </div>
                  {recent.data?.length ? (
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {recent.data.slice(0, 5).map((x: any) => (
                        <button key={x._id} onClick={() => setReceipt(x)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50">
                          <span className="w-12 shrink-0 text-xs tabular-nums text-slate-500">{new Date(x.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="min-w-0 flex-1 truncate text-slate-800">{x.items[0]?.name}{x.items.length > 1 && <span className="text-slate-500"> +{x.items.length - 1}</span>}</span>
                          <span className="font-medium tabular-nums">{money(x.total)}</span>
                        </button>
                      ))}
                    </div>
                  ) : <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">No sales yet.</p>}
                  {recent.data && recent.data.length > 0 && <p className="mt-2 text-xs text-slate-400">Tap a sale to reprint its receipt.</p>}
                </section>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="space-y-3 border-t border-slate-200 px-5 py-4">
              {needsRx && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="font-medium text-amber-900">Prescription items in the basket</div>
                  {user?.role !== "pharmacist" && user?.role !== "owner" ? <p className="mt-1 text-amber-800">Only a registered pharmacist can sell these. Hand over to the pharmacist or dispense from Prescriptions.</p> : (
                    <Select className="mt-2" value={rxId} onChange={(e) => setRxId(e.target.value)} aria-label="Prescription">
                      <option value="">Select verified prescription...</option>
                      {(rxs.data || []).map((r: any) => <option key={r._id} value={r._id}>{r.rxNo} - {r.patientName}</option>)}
                    </Select>
                  )}
                </div>
              )}

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-600"><dt>Subtotal · {units} item{units > 1 ? "s" : ""}</dt><dd className="tabular-nums">{money(subtotal)}</dd></div>
                {promoTotal > 0 && <div className="flex justify-between text-emerald-700"><dt>Promotions</dt><dd className="tabular-nums">-{money(promoTotal)}</dd></div>}
                <div className="flex items-center justify-between text-slate-600">
                  <dt>Discount <span className="text-xs text-slate-400">(up to {money(limit)})</span></dt>
                  <dd><input type="number" min={0} step="0.01" aria-label="Discount" value={discount || ""} placeholder="0.00" onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 rounded border border-slate-200 px-2 py-0.5 text-right text-sm tabular-nums outline-none focus:border-slate-400" /></dd>
                </div>
                {tax > 0 && <div className="flex justify-between text-slate-600"><dt>Tax</dt><dd className="tabular-nums">{money(tax)}</dd></div>}
                <div className="flex items-baseline justify-between pt-1"><dt className="font-medium">Total</dt><dd className="text-2xl font-semibold tabular-nums tracking-tight">{money(total)}</dd></div>
              </dl>

              <div className="space-y-2">
                {pays.map((p, i) => (
                  <div key={i} className="space-y-2">
                    <div className="grid grid-flow-col gap-1 rounded-md bg-slate-100 p-1" role="radiogroup" aria-label="Payment method">
                      {methods.map(([v, l]) => <button key={v} role="radio" aria-checked={p.method === v} onClick={() => setPay(i, { method: v })} className={cn("rounded px-2 py-1.5 text-sm font-medium transition", p.method === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>{l}</button>)}
                    </div>
                    <div className="flex gap-2">
                      <input type="number" min={0} step="0.01" placeholder="Amount received" aria-label="Amount received" value={p.amount} onChange={(e) => setPay(i, { amount: e.target.value })} className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm tabular-nums outline-none focus:border-slate-500" />
                      <Button variant="outline" onClick={() => setPay(i, { amount: String(Math.max(0, total - paid + (Number(p.amount) || 0)).toFixed(2)) })}>Exact</Button>
                      {pays.length > 1 && <button aria-label="Remove payment" onClick={() => setPays(pays.filter((_, k) => k !== i))} className="px-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
                    </div>
                    {p.method === "cash" && i === pays.length - 1 && !p.amount && (
                      <div className="flex flex-wrap gap-1.5">{[20, 50, 100, 200].filter((n) => n >= total).map((n) => <button key={n} onClick={() => setPay(i, { amount: String(n) })} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400">GH₵ {n}</button>)}</div>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm">
                  <button onClick={() => setPays([...pays, { method: "momo", amount: "" }])} className="text-slate-600 underline-offset-4 hover:underline">Split payment</button>
                  {change > 0 ? <span className="font-medium">Change <span className="tabular-nums">{money(change)}</span></span> : paid > 0 && paid + 0.001 < total ? <span className="text-amber-700">Still to pay <span className="tabular-nums">{money(total - paid)}</span></span> : null}
                </div>
              </div>
              <ErrorNote error={error} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={hold} title="Hold this sale"><PauseCircle className="h-4 w-4" />Hold</Button>
                <Button className="h-12 flex-1 text-base" loading={busy} disabled={paid + 0.001 < total || (needsRx && !rxId)} onClick={pay}>Charge {money(total)}</Button>
              </div>
            </div>
          )}
          {!cart.length && (
            <div className="space-y-3 border-t border-slate-200 px-5 py-4">
              {error && <ErrorNote error={error} />}
              <div className="flex items-baseline justify-between"><span className="font-medium text-slate-400">Total</span><span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-300">{money(0)}</span></div>
              <Button className="h-12 w-full text-base" disabled>Charge</Button>
            </div>
          )}
        </aside>
      </div>

      {cart.length > 0 && (
        <a href="#basket" className="fixed inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg lg:hidden">
          <span>{units} item{units > 1 ? "s" : ""} in basket</span><span className="tabular-nums">{money(total)}</span>
        </a>
      )}
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
        {(held.data || []).map((h: any) => <div key={h._id} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm"><span className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" />{h.items.map((i: any) => `${i.qty} x ${i.name}`).join(", ")} <span className="text-slate-500">· {dateTime(h.createdAt)}</span></span><Button size="sm" onClick={() => recall(h)}>Recall</Button></div>)}
        {!held.data?.length && <p className="py-4 text-center text-sm text-slate-500">No held sales</p>}
      </Modal>
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Sale complete">
        {receipt && <Receipt sale={receipt} branch={branch} />}
        <div className="no-print mt-4 flex gap-2"><Button className="flex-1" onClick={() => window.print()}><Printer className="h-4 w-4" />Print receipt</Button><Button variant="outline" onClick={() => setReceipt(null)}>New sale</Button></div>
      </Modal>
    </div>
  );
}
