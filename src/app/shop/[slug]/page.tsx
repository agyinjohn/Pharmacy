"use client";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingBag, Trash2, Upload, User, FileText } from "lucide-react";
import { api, money, store } from "@/lib/api";
import { useShopAuth } from "@/lib/shop";
import { useLoad } from "@/lib/useLoad";
import { Badge, Button, Card, ErrorNote, Input, Modal, Select, Spinner } from "@/components/ui";
import { ShopFooter, ShopHeader } from "@/components/ShopChrome";

type Item = { product: any; qty: number };

export default function Shop({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const auth = useShopAuth(slug);
  const shop = useLoad(() => api(`/portal/${slug}`), [slug]);
  const [branchId, setBranchId] = useState("");
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all");
  const [cart, setCart] = useState<Item[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [alt, setAlt] = useState<{ p: any; list: any[] } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [placed, setPlaced] = useState<any>(null);

  useEffect(() => { try { const c = localStorage.getItem(`cart:${slug}`); if (c) setCart(JSON.parse(c)); const b = localStorage.getItem(`shopbranch:${slug}`); if (b) setBranchId(b); } catch {} }, [slug]);
  useEffect(() => { try { localStorage.setItem(`cart:${slug}`, JSON.stringify(cart)); } catch {} }, [cart, slug]);
  useEffect(() => { if (!branchId && shop.data) setBranchId((shop.data.branches.find((b: any) => b.online) || shop.data.branches[0])?._id || ""); }, [shop.data, branchId]);
  useEffect(() => { if (branchId) store.set(`shopbranch:${slug}`, branchId); }, [branchId, slug]);

  const branch = shop.data?.branches.find((b: any) => b._id === branchId);
  const cats = useLoad(() => api(`/portal/${slug}/categories`), [slug]);
  const products = useLoad(() => api(`/portal/${slug}/products?branch=${branchId}&q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`), [slug, branchId, q, cat], !!branchId);

  // Prices and stock depend on the branch, so changing branch rebuilds the cart from the live catalogue.
  useEffect(() => { setCart((c) => c.filter((i) => !i.product.branchId || i.product.branchId === branchId)); }, [branchId]);

  const add = (p: any) => setCart((c) => { const i = c.findIndex((x) => x.product._id === p._id); const prod = { ...p, branchId }; if (i >= 0) return c.map((x, k) => (k === i ? { ...x, qty: Math.min(p.stock, x.qty + 1) } : x)); return [...c, { product: prod, qty: 1 }]; });
  const showAlt = async (p: any) => setAlt({ p, list: await api(`/portal/${slug}/products/${p._id}/alternatives?branch=${branchId}`) });
  const count = cart.reduce((s, i) => s + i.qty, 0);

  if (shop.error) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-xl font-semibold">Pharmacy not found</h1><p className="mt-2 text-slate-600">Check the link, or <Link href="/" className="text-teal-700 underline">visit PharmaOne</Link>.</p></div></div>;
  if (!shop.data) return <Spinner />;

  return (
    <div className="min-h-screen bg-slate-50">
      <ShopHeader shop={shop.data} slug={slug} right={<>
        {auth.customer ? <><Link href={`/shop/${slug}/orders`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">My orders</Link><button onClick={auth.logout} className="hidden text-sm text-slate-500 sm:block">Sign out</button></> : <Button size="sm" variant="outline" onClick={() => setLoginOpen(true)}><User className="h-4 w-4" />Sign in</Button>}
        <Button size="sm" onClick={() => setCartOpen(true)}><ShoppingBag className="h-4 w-4" />Cart{count > 0 && <span className="rounded-full bg-white/25 px-1.5 text-xs">{count}</span>}</Button>
      </>} />

      <section className="bg-gradient-to-br from-teal-700 to-teal-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Medicines and health products, delivered</h1>
          <p className="mt-1 text-teal-100">Search, order and pay online. Prescription items are checked by a registered pharmacist.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-2"><Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand, generic name or symptom (headache, malaria...)" className="w-full rounded-lg py-3 pl-10 pr-3 text-slate-900 outline-none" aria-label="Search medicines" /></div>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-lg px-3 py-3 text-slate-900" aria-label="Choose branch">{shop.data.branches.map((b: any) => <option key={b._id} value={b._id}>{b.name}{b.online ? "" : " (online ordering unavailable)"}</option>)}</select>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {branch && !branch.online && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This branch is not taking online orders right now. Please choose another branch.</div>}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {["all", ...(cats.data?.symptoms || []), ...(cats.data?.categories || []).filter((c: string) => !(cats.data?.symptoms || []).includes(c))].map((c: string) => (
            <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${cat === c ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-teal-500"}`}>{c === "all" ? "All" : c}</button>
          ))}
        </div>
        {products.loading && !products.data ? <Spinner /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(products.data || []).map((p: any) => (
              <Card key={p._id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-900">{p.brand} {p.strength}</h3><p className="text-sm text-slate-500">{p.generic} · {p.form} · {p.packSize}</p></div><div className="text-right text-lg font-bold tabular-nums">{money(p.price)}</div></div>
                <div className="mt-2 flex flex-wrap gap-1.5">{p.promo && <Badge tone="violet">{p.promo}</Badge>}{p.requiresRx ? <Badge tone="amber"><FileText className="mr-1 h-3 w-3" />Prescription needed</Badge> : <Badge tone="green">No prescription</Badge>}<Badge tone={p.inStock ? (p.stock < 10 ? "amber" : "green") : "red"}>{p.inStock ? (p.stock < 10 ? `Only ${p.stock} left` : "In stock") : "Out of stock here"}</Badge></div>
                <div className="mt-auto pt-4">{p.inStock ? <Button className="w-full" onClick={() => { add(p); }} disabled={!branch?.online}><Plus className="h-4 w-4" />Add to cart</Button> : <Button className="w-full" variant="outline" onClick={() => showAlt(p)}>See substitutes</Button>}</div>
              </Card>
            ))}
            {products.data && !products.data.length && <p className="col-span-full py-12 text-center text-slate-500">No medicines found. Try another search.</p>}
          </div>
        )}
      </main>
      <ShopFooter shop={shop.data} branch={branch} />

      <Cart open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setCart={setCart} branch={branch} shop={shop.data} slug={slug} auth={auth} needLogin={() => { setCartOpen(false); setLoginOpen(true); }} onPlaced={(o: any) => { setPlaced(o); setCart([]); setCartOpen(false); }} />
      <Login open={loginOpen} onClose={() => setLoginOpen(false)} auth={auth} />
      <Modal open={!!alt} onClose={() => setAlt(null)} title={`Alternatives to ${alt?.p.brand || ""}`}>
        {alt?.list.length ? alt.list.map((a) => <div key={a._id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm"><span>{a.brand} {a.strength}<div className="text-xs text-slate-500">{a.requiresRx ? "Prescription needed" : "No prescription"}</div></span><span className="flex items-center gap-2">{money(a.price)}{a.stock > 0 ? <Button size="sm" onClick={() => { add({ ...a, inStock: true, taxRate: 0 }); setAlt(null); }}>Add</Button> : <Badge tone="red">Out of stock</Badge>}</span></div>) : <p className="text-sm text-slate-600">No substitutes available at this branch. Try another branch from the selector above.</p>}
      </Modal>
      <Modal open={!!placed} onClose={() => setPlaced(null)} title="Order placed">
        {placed && <div className="space-y-2 text-sm"><p className="text-lg font-semibold text-emerald-700">Thank you!</p><p>Your order <b>{placed.orderNo}</b> is {placed.status === "pending_review" ? "waiting for the pharmacist to review your prescription" : "received"}. We will send updates by SMS.</p><Link href={`/shop/${slug}/orders`} className="inline-block rounded-lg bg-teal-700 px-4 py-2 font-medium text-white">Track my order</Link></div>}
      </Modal>
    </div>
  );
}

function Login({ open, onClose, auth }: { open: boolean; onClose: () => void; auth: ReturnType<typeof useShopAuth> }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(""); const [name, setName] = useState(""); const [code, setCode] = useState(""); const [needName, setNeedName] = useState(false);
  const [consent, setConsent] = useState(true); const [health, setHealth] = useState(false);
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [demo, setDemo] = useState<string | null>(null);

  const send = async () => {
    setBusy(true); setErr(null);
    try { const r = await auth.requestOtp(phone, needName ? name : undefined); if (r.newCustomer) { setNeedName(true); } else { setDemo(r.demoCode || null); setStep("code"); } }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const verify = async () => { setBusy(true); setErr(null); try { await auth.verify(phone, code, { communications: consent, healthData: health }); onClose(); setStep("phone"); setCode(""); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };

  return (
    <Modal open={open} onClose={onClose} title="Sign in or register">
      {step === "phone" ? (
        <div className="space-y-3">
          <Input label="Mobile number" type="tel" placeholder="+233 24 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          {needName && <Input label="Your full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          <ErrorNote error={err} /><Button className="w-full" loading={busy} disabled={!phone || (needName && !name)} onClick={send}>Send code</Button>
          <p className="text-xs text-slate-500">We will text you a one-time code. No password needed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Enter the 6-digit code sent to {phone}.</p>
          {demo && <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">Demo mode: your code is <b>{demo}</b></p>}
          <Input label="Code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />Send me order updates and refill reminders by SMS / email</label>
          <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" className="mt-0.5" checked={health} onChange={(e) => setHealth(e.target.checked)} />I agree to the pharmacy storing my prescription and health information to serve me safely</label>
          <ErrorNote error={err} /><Button className="w-full" loading={busy} onClick={verify}>Verify</Button>
        </div>
      )}
    </Modal>
  );
}

function Cart({ open, onClose, cart, setCart, branch, shop, slug, auth, needLogin, onPlaced }: any) {
  const [fulfilment, setFulfilment] = useState("delivery"); const [zone, setZone] = useState(""); const [line, setLine] = useState(""); const [digital, setDigital] = useState("");
  const [method, setMethod] = useState("momo"); const [image, setImage] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [refill, setRefill] = useState("");
  const rxs = useLoad<any[]>(() => auth.call("/portal/me/prescriptions"), [auth.token], !!auth.token && open);

  const needsRx = cart.some((i: Item) => i.product.requiresRx);
  const z = branch?.deliveryZones?.find((x: any) => x.name === zone);
  const subtotal = cart.reduce((s: number, i: Item) => s + i.product.price * i.qty, 0);
  const tax = cart.reduce((s: number, i: Item) => s + i.product.price * i.qty * (i.product.taxRate || 0), 0);
  const fee = fulfilment === "delivery" ? z?.fee || 0 : 0;
  const total = subtotal + tax + fee;
  const set = (id: string, d: number) => setCart(cart.map((i: Item) => (i.product._id === id ? { ...i, qty: Math.max(1, Math.min(i.product.stock || 99, i.qty + d)) } : i)));
  const onFile = (f: File) => { const r = new FileReader(); r.onload = () => setImage(String(r.result)); r.readAsDataURL(f); };
  const verifiedRx = (rxs.data || []).filter((r: any) => ["verified", "partial"].includes(r.status));

  const place = async () => {
    if (!auth.token) { needLogin(); return; }
    setBusy(true); setErr(null);
    try {
      const o = await auth.call(`/portal/${slug}/orders`, { body: { branch: branch._id, items: cart.map((i: Item) => ({ product: i.product._id, qty: i.qty })), fulfilment, address: fulfilment === "delivery" ? { line, digitalAddress: digital, zone } : undefined, payment: { method }, prescriptionImage: needsRx && !refill ? image : undefined, refillOf: refill || undefined } });
      if (o.paymentUrl) { setCart([]); window.location.href = o.paymentUrl; return; }
      onPlaced(o);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Your cart" wide>
      {!cart.length ? <p className="py-8 text-center text-slate-500">Your cart is empty.</p> : (
        <div className="space-y-5">
          <div className="divide-y divide-slate-100">{cart.map((i: Item) => (
            <div key={i.product._id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1"><div className="truncate font-medium">{i.product.brand} {i.product.strength}</div>{i.product.requiresRx && <Badge tone="amber">Prescription</Badge>}</div>
              <div className="flex items-center gap-1"><button aria-label="Less" onClick={() => set(i.product._id, -1)} className="rounded border p-1"><Minus className="h-3.5 w-3.5" /></button><span className="w-6 text-center">{i.qty}</span><button aria-label="More" onClick={() => set(i.product._id, 1)} className="rounded border p-1"><Plus className="h-3.5 w-3.5" /></button></div>
              <div className="w-20 text-right tabular-nums">{money(i.product.price * i.qty)}</div>
              <button aria-label="Remove" onClick={() => setCart(cart.filter((x: Item) => x !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>))}</div>

          {needsRx && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="font-medium text-amber-900">Prescription required</div>
              <p className="text-amber-800">A pharmacist will review it before your order is packed.</p>
              {verifiedRx.length > 0 && <Select className="mt-2" value={refill} onChange={(e) => setRefill(e.target.value)} aria-label="Refill a previous prescription"><option value="">Upload a new prescription</option>{verifiedRx.map((r: any) => <option key={r._id} value={r._id}>Refill {r.rxNo} ({r.items.map((x: any) => x.name).join(", ")})</option>)}</Select>}
              {!refill && <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-amber-400 bg-white p-3 text-slate-700"><Upload className="h-5 w-5" />{image ? "Prescription attached (tap to change)" : "Upload a photo or PDF of your prescription"}<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>}
              {image && !refill && <img src={image} alt="Your prescription" className="mt-2 max-h-32 rounded border" />}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => setFulfilment("delivery")} className={`rounded-lg border p-3 text-left text-sm ${fulfilment === "delivery" ? "border-teal-700 bg-teal-50" : "border-slate-300"}`}><div className="font-medium">Delivery</div><div className="text-slate-500">To your door</div></button>
            <button onClick={() => { setFulfilment("pickup"); if (method === "cod") setMethod("momo"); }} className={`rounded-lg border p-3 text-left text-sm ${fulfilment === "pickup" ? "border-teal-700 bg-teal-50" : "border-slate-300"}`}><div className="font-medium">Pick up in store</div><div className="text-slate-500">{branch?.name}</div></button>
          </div>
          {fulfilment === "delivery" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Delivery zone" value={zone} onChange={(e) => setZone(e.target.value)}><option value="">Choose...</option>{branch?.deliveryZones?.map((x: any) => <option key={x.name} value={x.name}>{x.name} - {money(x.fee)} (~{x.etaMins} min)</option>)}</Select>
              <Input label="Ghana digital address (optional)" placeholder="GA-123-4567" value={digital} onChange={(e) => setDigital(e.target.value)} />
              <div className="sm:col-span-2"><Input label="Street address / landmark" value={line} onChange={(e) => setLine(e.target.value)} /></div>
            </div>
          )}
          <div>
            <div className="mb-1 text-sm font-medium">Payment</div>
            <div className="flex flex-wrap gap-2">{[["momo", "Mobile money"], ["card", "Card"], ...(shop.codEnabled && fulfilment === "delivery" ? [["cod", "Pay on delivery"]] : [])].map(([v, l]) => <button key={v} onClick={() => setMethod(v)} className={`rounded-full border px-4 py-1.5 text-sm ${method === v ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300"}`}>{l}</button>)}</div>
            {method !== "cod" && <p className="mt-1 text-xs text-slate-500">Demo checkout: payment is simulated. Card details are never stored.</p>}
          </div>

          <div className="space-y-1 border-t border-slate-200 pt-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>{tax > 0 && <div className="flex justify-between"><span>Tax</span><span>{money(tax)}</span></div>}{cart.some((i: Item) => i.product.promo) && <div className="flex justify-between text-emerald-700"><span>Promotions</span><span>applied at checkout</span></div>}{fulfilment === "delivery" && <div className="flex justify-between"><span>Delivery {z ? `(~${z.etaMins} min)` : ""}</span><span>{z ? money(fee) : "Choose zone"}</span></div>}<div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(total)}</span></div></div>
          <ErrorNote error={err} />
          <Button className="w-full" size="lg" loading={busy} disabled={!branch?.online || (fulfilment === "delivery" && (!zone || !line)) || (needsRx && !image && !refill)} onClick={place}>{auth.token ? `Place order · ${money(total)}` : "Sign in to place order"}</Button>
        </div>
      )}
    </Modal>
  );
}
