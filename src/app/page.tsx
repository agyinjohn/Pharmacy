import Link from "next/link";
import {
  Boxes, ClipboardCheck, ShoppingCart, Truck, Building2, BarChart3, ShieldCheck, FileLock2, Smartphone, Check,
  ArrowRight, ScrollText, Siren, Network, Store, PackageCheck, Pill, Clock, Users,
} from "lucide-react";
import { Logo } from "@/components/ui";
import DemoForm from "@/components/marketing/DemoForm";

const features = [
  { icon: Boxes, title: "Batch and expiry control", text: "Track every batch by branch in real time. First-expiry-first-out by default, alerts at 90 / 60 / 30 days, and expired stock is blocked at the till." },
  { icon: ClipboardCheck, title: "Prescriptions and dispensing", text: "Capture, verify and dispense with allergy, duplicate and interaction checks. Partial fills, refills and printed labels built in." },
  { icon: ShoppingCart, title: "Fast point of sale", text: "Barcode scanning, split payments (cash, mobile money, card, credit), shifts with cash-up, hold and recall, returns with reasons." },
  { icon: Smartphone, title: "Online ordering portal", text: "Customers search, upload a prescription, pay and track their order from a phone. The pharmacist reviews before anything is packed." },
  { icon: Truck, title: "Delivery management", text: "Zones and fees per branch, rider or courier assignment, status updates to the customer, and proof of delivery with a one-time code." },
  { icon: BarChart3, title: "Reports your accountant will like", text: "Sales, margin, stock ageing, expiry, supplier balances, tax summaries and order performance. Export to Excel, CSV or PDF." },
];

const branchPoints = [
  "One organisation, any number of branches, each with its own licence, superintendent pharmacist and opening hours",
  "Central product catalogue with branch-level price overrides",
  "Stock transfers between branches that carry batch and expiry, with variances flagged",
  "A prescription can never be filled twice, even at two different branches",
  "Owners see every branch on one dashboard; staff only see the branches they are assigned to",
];

const compliance = [
  { icon: ScrollText, title: "Controlled-drug register", text: "Append-only electronic register with running balances, signed entries, witnessed disposals and inspector-ready extracts. Kept per branch." },
  { icon: FileLock2, title: "Audit trail on everything", text: "Every change, login and every view of a prescription or patient record is logged with who, where and when. Logs cannot be edited." },
  { icon: ShieldCheck, title: "Licence tracking", text: "Branch and pharmacist licences are tracked and warned before expiry. If a branch licence lapses, online ordering switches itself off." },
  { icon: Siren, title: "Recall in minutes", text: "Quarantine a batch and instantly see every branch and customer that received it." },
];

const tiers = [
  { name: "Starter", blurb: "A single pharmacy getting organised", price: "GH₵ 350", per: "per month", items: ["1 branch", "Inventory, POS and prescriptions", "Controlled-drug register", "Up to 5 staff users", "Email support"], cta: "Start free trial" },
  { name: "Growth", blurb: "Groups with several branches", price: "GH₵ 280", per: "per branch / month", items: ["Unlimited staff users", "Multi-branch stock and transfers", "Online ordering portal and delivery", "Consolidated owner dashboard", "SMS notifications", "Priority support"], cta: "Book a demo", featured: true },
  { name: "Enterprise", blurb: "Large chains and special integrations", price: "Custom", per: "", items: ["20+ branches", "National e-pharmacy platform and insurance integrations", "Data migration from your current system", "Single sign-on and custom roles", "Service agreement with response times"], cta: "Talk to us" },
];

const faqs = [
  ["Does it work for one pharmacy as well as a group?", "Yes. A single pharmacy is simply an organisation with one branch. You can add branches later without changing anything."],
  ["Can a branch keep selling if the internet goes down?", "Offline selling with automatic sync is part of our roadmap for branches with unreliable connections. Tell us about your connectivity during the demo and we will plan around it."],
  ["Do you sell controlled drugs online?", "No. Controlled drugs never appear in the customer portal. Prescription-only medicines are released only after a registered pharmacist verifies the uploaded prescription."],
  ["Can we bring our existing stock and customers?", "Yes. Import products, stock, customers, suppliers and opening balances from spreadsheets, with a validation report showing anything that needs fixing."],
  ["Is our data safe?", "Passwords are hashed, access is controlled by role and branch, data is encrypted in transit, and patient records are only visible to the roles that need them. We support your Data Protection Commission obligations with consent records and data export."],
  ["Are the regulatory rules hard-coded?", "No. Rules such as what may be sold online, refund limits and expiry alert windows are settings, because requirements change. Your superintendent pharmacist should always confirm the current rules."],
];

export default function Home() {
  return (
    <div className="bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#branches" className="hover:text-slate-900">Multi-branch</a>
            <a href="#portal" className="hover:text-slate-900">Online ordering</a>
            <a href="#compliance" className="hover:text-slate-900">Compliance</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Sign in</Link>
            <a href="#demo" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800">Book a demo</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-white to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-900">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-600" /> Built for pharmacies in Ghana
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Every branch, every batch, <span className="text-teal-700">one platform.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              PharmaOne runs the whole pharmacy: stock with expiry control, prescriptions and the controlled-drug register, the till, and an online store with delivery. Owners see all branches on one screen. Each branch still works on its own.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#demo" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 font-medium text-white shadow-sm hover:bg-teal-800">Book a demo <ArrowRight className="h-4 w-4" /></a>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-800 hover:bg-slate-50">Try the live demo</Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 text-sm">
              {[["20+", "branches supported"], ["50,000", "products supported"], ["< 2 sec", "target sale time"]].map(([a, b]) => (
                <div key={b}><dt className="text-2xl font-bold text-slate-900">{a}</dt><dd className="text-slate-500">{b}</dd></div>
              ))}
            </dl>
          </div>

          {/* Product preview */}
          <div className="relative" aria-hidden="true">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-teal-200/40 to-sky-200/40 blur-2xl" />
            <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-300" /><i className="h-2.5 w-2.5 rounded-full bg-amber-300" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">All branches</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[["Today's sales", "GH₵ 18,420", "text-slate-900"], ["Low stock", "23 items", "text-amber-700"], ["Expiring 90d", "11 batches", "text-red-700"]].map(([l, v, c]) => (
                  <div key={l} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5"><div className="text-[10px] text-slate-500">{l}</div><div className={`text-sm font-semibold ${c}`}>{v}</div></div>
                ))}
              </div>
              <div className="mt-3 flex h-28 items-end gap-1.5 rounded-lg bg-slate-50 p-3">
                {[40, 55, 48, 70, 62, 85, 74, 90, 66, 78, 95, 88, 100, 92].map((h, i) => <div key={i} className="flex-1 rounded-t bg-teal-600/80" style={{ height: `${h}%` }} />)}
              </div>
              <div className="mt-3 divide-y divide-slate-100 text-xs">
                {[["Accra Central", "GH₵ 9,870", "bg-emerald-500"], ["Kumasi Adum", "GH₵ 5,310", "bg-emerald-500"], ["Takoradi", "GH₵ 3,240", "bg-amber-500"]].map(([n, v, d]) => (
                  <div key={n} className="flex items-center justify-between py-2"><span className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${d}`} />{n}</span><span className="font-medium tabular-nums">{v}</span></div>
                ))}
              </div>
              <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs shadow-lg sm:block">
                <div className="font-semibold text-amber-900">Allergy warning</div>
                <div className="text-amber-800">Patient is allergic to Penicillin</div>
              </div>
              <div className="absolute -right-4 -top-4 hidden rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs shadow-lg sm:block">
                <div className="font-semibold text-emerald-900">Prescription verified</div>
                <div className="text-emerald-800">Pharm. A. Mensah, 10:42</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-sm font-medium text-slate-600 sm:px-6">
          <span className="text-slate-400">Designed around</span>
          {["Pharmacy Council guidelines", "FDA Ghana controlled-substance rules", "Data Protection Act, 2012 (Act 843)", "Ghana cedi and local tax"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-teal-700" />{t}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything a pharmacy does, in one place</h2>
          <p className="mt-4 text-lg text-slate-600">From the shelf to the customer's door, with a record of every step.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-teal-300 hover:shadow-md">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-6 w-6" /></div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-branch */}
      <section id="branches" className="scroll-mt-20 bg-slate-900 py-20 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-300"><Building2 className="h-4 w-4" /> Multi-branch</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Grow from one store to a chain without switching systems</h2>
            <ul className="mt-8 space-y-4">
              {branchPoints.map((p) => (
                <li key={p} className="flex gap-3 text-slate-300"><Check className="mt-1 h-5 w-5 shrink-0 text-teal-400" /><span>{p}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6" aria-hidden="true">
            <div className="mx-auto w-fit rounded-xl bg-teal-600 px-5 py-3 text-center text-sm font-semibold"><Network className="mx-auto mb-1 h-5 w-5" />Head office<div className="text-xs font-normal text-teal-100">Catalogue, prices, reports</div></div>
            <div className="mx-auto h-6 w-px bg-white/20" />
            <div className="grid grid-cols-3 gap-3">
              {[["Accra Central", "ACC"], ["Kumasi Adum", "KSI"], ["Takoradi", "TKD"]].map(([n, c]) => (
                <div key={c} className="rounded-xl border border-white/10 bg-slate-800 p-3 text-center text-sm">
                  <Store className="mx-auto mb-1 h-5 w-5 text-teal-300" /><div className="font-medium">{n}</div>
                  <div className="mt-1 text-[11px] text-slate-400">Own stock, staff, licence</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 text-xs text-slate-300"><PackageCheck className="h-4 w-4 text-teal-300" /> Transfers carry batch and expiry between branches</div>
          </div>
        </div>
      </section>

      {/* Portal */}
      <section id="portal" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 flex justify-center lg:order-1" aria-hidden="true">
            <div className="w-72 rounded-[2rem] border-8 border-slate-900 bg-white p-3 shadow-2xl">
              <div className="rounded-xl bg-teal-700 p-3 text-white"><div className="text-xs opacity-80">MediCare Pharmacies</div><div className="text-sm font-semibold">Order medicines, delivered</div></div>
              <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400">Search: headache, malaria, ORS...</div>
              {[["Panadol Extra 500mg", "GH₵ 18.00", "In stock"], ["Coartem 80/480", "GH₵ 55.00", "In stock"], ["Amoxil 500mg", "GH₵ 45.00", "Prescription"]].map(([n, p, s]) => (
                <div key={n} className="mt-2 flex items-center justify-between rounded-lg border border-slate-100 p-2.5 text-xs">
                  <div><div className="font-medium text-slate-800">{n}</div><div className={s === "Prescription" ? "text-amber-700" : "text-emerald-700"}>{s}</div></div>
                  <div className="text-right font-semibold">{p}</div>
                </div>
              ))}
              <div className="mt-3 rounded-lg bg-teal-700 py-2 text-center text-xs font-medium text-white">Checkout - Delivery in 45 min</div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"><Smartphone className="h-4 w-4" /> Customer portal</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your pharmacy, open online</h2>
            <p className="mt-4 text-lg text-slate-600">A fast, mobile-first store for your customers, with the pharmacist still in control of anything that needs a prescription.</p>
            <ul className="mt-6 space-y-3 text-slate-700">
              {["Sign in with a phone number and a one-time code", "Search by brand, generic name or symptom, with live stock per branch and substitutes", "Upload a prescription photo; the pharmacist reviews, approves or suggests a substitute", "Pay by mobile money or card, or on delivery", "Track the order: approved, packed, out for delivery, delivered", "Controlled drugs are never sold online"].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" /><span>{t}</span></li>
              ))}
            </ul>
            <Link href="/shop/medicare" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white hover:bg-teal-800">Open the demo store <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="scroll-mt-20 bg-teal-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Compliance is built in, not bolted on</h2>
            <p className="mt-4 text-lg text-slate-600">Be ready for an inspection on any day, at any branch.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {compliance.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 rounded-2xl bg-white p-6 shadow-sm">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><Icon className="h-6 w-6" /></div>
                <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p></div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">PharmaOne is software that helps you follow the rules. It is not legal advice; your superintendent pharmacist should confirm current requirements.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Live in three steps</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[[Pill, "Bring your data", "Import products, stock, customers and suppliers from spreadsheets. We give you a validation report so nothing is lost."], [Users, "Train your team", "Screens are simple enough to learn in half a day. Guides and short videos for each role."], [Clock, "Go live branch by branch", "Start with one branch, then roll out. Each phase ends with your testing and sign-off."]].map(([Icon, t, d]: any, i) => (
            <div key={t} className="relative rounded-2xl border border-slate-200 p-6">
              <span className="absolute -top-3 left-6 rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-bold text-white">Step {i + 1}</span>
              <Icon className="h-8 w-8 text-teal-700" /><h3 className="mt-3 text-lg font-semibold">{t}</h3><p className="mt-2 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple pricing that grows with you</h2>
            <p className="mt-4 text-slate-600">Indicative pricing for the pilot. Third-party fees (payments, SMS, hosting, maps) are billed at cost.</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {tiers.map((t) => (
              <div key={t.name} className={`flex flex-col rounded-2xl border bg-white p-7 ${t.featured ? "border-teal-600 shadow-xl ring-2 ring-teal-600" : "border-slate-200"}`}>
                {t.featured && <span className="mb-3 w-fit rounded-full bg-teal-700 px-3 py-0.5 text-xs font-semibold text-white">Most popular</span>}
                <h3 className="text-xl font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{t.blurb}</p>
                <div className="mt-5"><span className="text-4xl font-bold">{t.price}</span> <span className="text-sm text-slate-500">{t.per}</span></div>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
                  {t.items.map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />{i}</li>)}
                </ul>
                <a href="#demo" className={`mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-medium ${t.featured ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 text-slate-800 hover:bg-slate-50"}`}>{t.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">Questions pharmacists ask us</h2>
        <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {faqs.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-900">{q}<span className="ml-4 text-teal-700 transition group-open:rotate-45">+</span></summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Demo CTA */}
      <section id="demo" className="scroll-mt-20 bg-gradient-to-br from-teal-800 to-teal-950 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-5">
          <div className="text-white lg:col-span-2">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">See it with your own pharmacy in mind</h2>
            <p className="mt-4 text-teal-100">A 30-minute walkthrough tailored to your branches, your workflow and your regulatory questions.</p>
            <ul className="mt-6 space-y-2 text-sm text-teal-100">
              {["No commitment", "We will answer the open questions about your setup", "Pilot data import included"].map((t) => <li key={t} className="flex gap-2"><Check className="h-5 w-5 text-teal-300" />{t}</li>)}
            </ul>
            <p className="mt-8 text-sm text-teal-200">Already have an account? <Link href="/login" className="font-semibold underline">Sign in</Link> or <Link href="/signup" className="font-semibold underline">create a pharmacy workspace</Link>.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-2xl lg:col-span-3 sm:p-8"><DemoForm /></div>
        </div>
      </section>

      <footer className="bg-slate-950 py-10 text-sm text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo light />
          <p>© {new Date().getFullYear()} PharmaOne. Pharmacy management for Ghana.</p>
          <div className="flex gap-5"><Link href="/login" className="hover:text-white">Sign in</Link><Link href="/shop/medicare" className="hover:text-white">Demo store</Link></div>
        </div>
      </footer>
    </div>
  );
}
