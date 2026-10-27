import Link from "next/link";
import {
  Boxes, ClipboardCheck, ShoppingCart, Truck, BarChart3, BellRing, Smartphone, ShieldCheck, FileLock2, ScrollText, Siren,
  Check, ArrowRight, WifiOff,
} from "lucide-react";
import { Logo } from "@/components/ui";
import DemoForm from "@/components/marketing/DemoForm";

const features = [
  { icon: Boxes, title: "Batch and expiry control", text: "Stock by batch at every branch. First-expiry-first-out by default, alerts at 90, 60 and 30 days, and expired stock is blocked at the till." },
  { icon: ClipboardCheck, title: "Prescriptions and dispensing", text: "Capture, verify and dispense with allergy, duplicate and interaction checks. Partial fills, refills and printed labels." },
  { icon: ShoppingCart, title: "Point of sale", text: "Barcode scanning, split payments across cash, mobile money and card, shifts with cash-up, promotions and loyalty points." },
  { icon: BellRing, title: "Medication reminders", text: "Patients get a text at each dose time, read from the prescription's directions, and a reminder before their refill is due." },
  { icon: Smartphone, title: "Online store", text: "Customers search, upload a prescription, pay and track their order. A pharmacist reviews anything that needs a prescription." },
  { icon: Truck, title: "Delivery", text: "Delivery zones and fees per branch, rider or courier assignment, live updates for the customer, and proof of delivery." },
  { icon: WifiOff, title: "Keeps working offline", text: "If the internet drops, branches keep selling, receiving stock and dispensing. Everything syncs when the connection returns." },
  { icon: BarChart3, title: "Reports", text: "Sales, margins, stock ageing, expiry, supplier balances and tax summaries across all branches. Export to Excel or PDF." },
];

const compliance = [
  { icon: ScrollText, title: "Controlled-drug register", text: "Append-only electronic register with running balances, witnessed disposals and inspector-ready exports, kept per branch." },
  { icon: FileLock2, title: "Audit trail", text: "Every change, sign-in and view of a prescription or patient record is logged with who, where and when. Logs cannot be edited." },
  { icon: ShieldCheck, title: "Licence tracking", text: "Branch and pharmacist licences are tracked and flagged before expiry. Online ordering switches off if a branch licence lapses." },
  { icon: Siren, title: "Recalls and data protection", text: "Trace a recalled batch to every branch and customer in minutes. Consent records, retention rules and an incident log for Act 843." },
];

const tiers = [
  { name: "Starter", blurb: "A single pharmacy", price: "GH₵ 350", per: "per month", items: ["1 branch", "Inventory, POS and prescriptions", "Controlled-drug register", "Up to 5 staff users"] },
  { name: "Growth", blurb: "Groups with several branches", price: "GH₵ 280", per: "per branch, per month", items: ["Unlimited staff users", "Stock transfers between branches", "Online store and delivery", "Medication reminders by SMS", "Owner dashboard across branches"], featured: true },
  { name: "Enterprise", blurb: "Large chains", price: "Custom", per: "", items: ["20 or more branches", "National e-pharmacy and insurance integrations", "Data migration support", "Service agreement"] },
];

const faqs = [
  ["Does it work for one pharmacy as well as a group?", "Yes. A single pharmacy is an organisation with one branch. Add branches later without changing anything."],
  ["What happens when the internet goes down?", "The branch keeps selling non-prescription items, receiving stock and dispensing verified prescriptions. Everything is saved on the device and sent when the connection returns; anything that needs a second look is flagged."],
  ["Do you sell controlled drugs online?", "No. Controlled drugs never appear in the online store. Prescription-only medicines are released only after a registered pharmacist verifies the prescription."],
  ["Can we bring our existing stock and customers?", "Yes. Import products, opening stock, customers, suppliers and balances from Excel or CSV. Each file is checked first and you see every problem by row."],
  ["Is patient data safe?", "Access is by role and branch, passwords are hashed, two-step sign-in is available, and every view of a patient record is logged. Consent is recorded, and reminder texts only name the medicine if the patient agreed."],
];

const Section = ({ id, children, muted }: { id?: string; children: React.ReactNode; muted?: boolean }) => (
  <section id={id} className={`scroll-mt-16 border-t border-slate-200 ${muted ? "bg-[#f7f7f6]" : "bg-white"}`}>
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">{children}</div>
  </section>
);
const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="text-sm font-medium text-brand-700">{children}</p>;

export default function Home() {
  return (
    <div className="bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#branches" className="hover:text-slate-900">Multi-branch</a>
            <a href="#compliance" className="hover:text-slate-900">Compliance</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">Sign in</Link>
            <a href="#demo" className="rounded-md bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-800">Book a demo</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
        <div>
          <p className="text-sm text-slate-500">Pharmacy management for Ghana</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">Run every branch of your pharmacy from one place.</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
            Stock and expiry, prescriptions and the controlled-drug register, the till, an online store and medication reminders. Owners see all branches together; each branch still works on its own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#demo" className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Book a demo <ArrowRight className="h-4 w-4" /></a>
            <Link href="/login" className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">Try the live demo</Link>
          </div>
          <p className="mt-8 text-sm text-slate-500">Built around Pharmacy Council guidance, FDA controlled-substance rules and the Data Protection Act, 2012.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]" aria-hidden="true">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>Today, all branches</span><span>27 Oct</span></div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200">
            {[["Sales", "GH₵ 18,420"], ["Low stock", "23"], ["Expiring", "11"]].map(([l, v]) => (
              <div key={l} className="px-3 py-3"><div className="text-[11px] text-slate-500">{l}</div><div className="mt-0.5 text-base font-semibold tabular-nums">{v}</div></div>
            ))}
          </div>
          <div className="mt-4 flex h-24 items-end gap-1.5">
            {[42, 55, 48, 66, 60, 78, 70, 84, 64, 76, 90, 82, 96, 88].map((h, i) => <div key={i} className={`flex-1 rounded-sm ${i === 13 ? "bg-brand-700" : "bg-slate-200"}`} style={{ height: `${h}%` }} />)}
          </div>
          <div className="mt-4 divide-y divide-slate-100 text-sm">
            {[["Accra Central", "GH₵ 9,870"], ["Kumasi Adum", "GH₵ 5,310"], ["Takoradi", "GH₵ 3,240"]].map(([n, v]) => (
              <div key={n} className="flex justify-between py-2"><span className="text-slate-600">{n}</span><span className="tabular-nums">{v}</span></div>
            ))}
          </div>
          <div className="mt-3 rounded-md bg-[#f7f7f6] px-3 py-2 text-xs text-slate-600">Allergy check: patient is allergic to penicillin. Review before verifying.</div>
        </div>
      </section>

      {/* Features */}
      <Section id="features">
        <div className="max-w-2xl">
          <Eyebrow>Features</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Everything a pharmacy does, in one system</h2>
          <p className="mt-3 text-slate-600">From the shelf to the patient, with a record of every step.</p>
        </div>
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
              <h3 className="mt-3 font-medium">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Multi-branch */}
      <Section id="branches" muted>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Multi-branch</Eyebrow>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Grow from one shop to a chain without changing systems</h2>
            <p className="mt-3 text-slate-600">Head office sets the catalogue and prices; each branch keeps its own stock, staff, licence and opening hours.</p>
          </div>
          <ul className="space-y-4 text-slate-700">
            {["Central catalogue with branch-level prices", "Transfers between branches carry batch and expiry, with shortages flagged", "A prescription can never be filled twice, even at two branches", "Staff see only the branches they work at", "One dashboard and one set of reports across every branch"].map((p) => (
              <li key={p} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" strokeWidth={2} /><span>{p}</span></li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Online store + reminders */}
      <Section id="portal">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>For patients</Eyebrow>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">An online store and reminders that bring patients back</h2>
            <ul className="mt-6 space-y-3 text-slate-700">
              {["Order from a phone with a one-time code; no passwords", "Live stock per branch, with substitutes when something is out", "Upload a prescription; the pharmacist reviews before packing", "Pay by mobile money or card, or on delivery", "A text at each dose time, and before the refill is due", "Patients pause or stop reminders themselves"].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" strokeWidth={2} /><span>{t}</span></li>
              ))}
            </ul>
            <Link href="/shop/medicare" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 underline underline-offset-4 hover:text-brand-700">Open the demo store <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mx-auto w-72 rounded-[2rem] border border-slate-300 bg-white p-3" aria-hidden="true">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">MediCare Pharmacies</div>
              <div className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-400">Search medicines or symptoms</div>
              {[["Panadol Extra 500mg", "GH₵ 18.00", "In stock"], ["Coartem 80/480", "GH₵ 55.00", "In stock"], ["Amoxil 500mg", "GH₵ 45.00", "Prescription"]].map(([n, p, st]) => (
                <div key={n} className="mt-2 flex items-center justify-between border-b border-slate-100 py-2 text-xs last:border-0">
                  <div><div className="font-medium text-slate-800">{n}</div><div className="text-slate-500">{st}</div></div><div className="font-medium">{p}</div>
                </div>
              ))}
              <div className="mt-3 rounded-md bg-[#f7f7f6] p-2.5 text-[11px] text-slate-600">MediCare: time for your 8:00 dose of Amlodipine 5mg.</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Compliance */}
      <Section id="compliance" muted>
        <div className="max-w-2xl">
          <Eyebrow>Compliance</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Ready for an inspection on any day, at any branch</h2>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2">
          {compliance.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-white p-6">
              <Icon className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
              <h3 className="mt-3 font-medium">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">PharmaOne helps you follow the rules; it is not legal advice. Your superintendent pharmacist should confirm current requirements.</p>
      </Section>

      {/* Pricing */}
      <Section id="pricing">
        <div className="max-w-2xl">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Simple pricing that grows with you</h2>
          <p className="mt-3 text-slate-600">Indicative pilot pricing. SMS, payment and hosting fees are billed at cost.</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className={`flex flex-col rounded-lg border p-6 ${t.featured ? "border-slate-900" : "border-slate-200"}`}>
              <div className="flex items-center justify-between"><h3 className="font-semibold">{t.name}</h3>{t.featured && <span className="text-xs text-slate-500">Most chosen</span>}</div>
              <p className="mt-1 text-sm text-slate-500">{t.blurb}</p>
              <div className="mt-5"><span className="text-3xl font-semibold tracking-tight">{t.price}</span> <span className="text-sm text-slate-500">{t.per}</span></div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-700">{t.items.map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{i}</li>)}</ul>
              <a href="#demo" className={`mt-8 rounded-md px-4 py-2 text-center text-sm font-medium ${t.featured ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-slate-300 hover:bg-slate-50"}`}>{t.name === "Enterprise" ? "Talk to us" : "Book a demo"}</a>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section muted>
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-3xl font-semibold tracking-tight">Questions pharmacists ask</h2>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">{q}<span className="ml-4 text-slate-400 transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* Demo */}
      <Section id="demo">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">See it with your pharmacy in mind</h2>
            <p className="mt-3 text-slate-600">A 30-minute walkthrough based on your branches, your workflow and your regulatory questions.</p>
            <p className="mt-6 text-sm text-slate-500">Already a customer? <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4">Sign in</Link> or <Link href="/signup" className="font-medium text-slate-900 underline underline-offset-4">create a workspace</Link>.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-6 sm:p-8"><DemoForm /></div>
        </div>
      </Section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} PharmaOne</p>
          <div className="flex gap-5"><Link href="/login" className="hover:text-slate-900">Sign in</Link><Link href="/shop/medicare" className="hover:text-slate-900">Demo store</Link></div>
        </div>
      </footer>
    </div>
  );
}
