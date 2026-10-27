import Link from "next/link";
import {
  Boxes, ClipboardCheck, ShoppingCart, Truck, BarChart3, BellRing, Smartphone, ShieldCheck, FileLock2, ScrollText, Siren,
  Check, ArrowRight, WifiOff,
} from "lucide-react";
import { Logo } from "@/components/ui";
import DemoForm from "@/components/marketing/DemoForm";
import NetworkMap from "@/components/marketing/NetworkMap";
import { CountUp, EventTicker, Reveal, RotatingWord } from "@/components/marketing/Motion";

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
    <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">{children}</div>
  </section>
);
const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="text-sm font-medium text-brand-700">{children}</p>;
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{children}</h2>;
const Serif = ({ children }: { children: React.ReactNode }) => <span className="font-serif text-[1.08em] font-normal italic tracking-normal text-brand-700">{children}</span>;

const MARQUEE = ["Batch and expiry", "Controlled-drug register", "Prescription checks", "Point of sale", "Mobile money", "Online store", "Delivery tracking", "Medication reminders", "Stock transfers", "Offline mode", "Excel reports", "Audit trail", "Loyalty and promotions"];

export default function Home() {
  return (
    <div className="bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-900">Features</a>
            <a href="#branches" className="transition hover:text-slate-900">Multi-branch</a>
            <a href="#patients" className="transition hover:text-slate-900">Patients</a>
            <a href="#compliance" className="transition hover:text-slate-900">Compliance</a>
            <a href="#pricing" className="transition hover:text-slate-900">Pricing</a>
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100">Sign in</Link>
            <a href="#demo" className="rounded-md bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800">Book a demo</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grain pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden="true" />
        <div className="drift pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-100 opacity-60 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-brand-600" />Pharmacy management for Ghana</p>
            <h1 className="rise mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[3.5rem]" style={{ animationDelay: "80ms" }}>
              Run every branch of your pharmacy<br /><RotatingWord words={["from one place.", "with confidence.", "even offline.", "ready for inspection."]} />
            </h1>
            <p className="rise mt-6 max-w-lg text-lg leading-relaxed text-slate-600" style={{ animationDelay: "160ms" }}>
              Stock and expiry, prescriptions and the controlled-drug register, the till, an online store and medication reminders. Owners see every branch together; each branch still works on its own.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <a href="#demo" className="group inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">Book a demo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></a>
              <Link href="/login" className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400">Try the live demo</Link>
            </div>
            <p className="rise mt-8 text-sm text-slate-500" style={{ animationDelay: "320ms" }}>Built around Pharmacy Council guidance, FDA controlled-substance rules and the Data Protection Act, 2012.</p>
          </div>

          <div className="rise relative" style={{ animationDelay: "200ms" }} aria-hidden="true">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-12px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between text-xs text-slate-500"><span>Today, all branches</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live</span></div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200">
                <div className="px-3 py-3"><div className="text-[11px] text-slate-500">Sales</div><div className="mt-0.5 whitespace-nowrap text-sm font-semibold sm:text-base"><CountUp to={18420} prefix="GH₵ " /></div></div>
                <div className="px-3 py-3"><div className="text-[11px] text-slate-500">Low stock</div><div className="mt-0.5 text-base font-semibold"><CountUp to={23} /></div></div>
                <div className="px-3 py-3"><div className="text-[11px] text-slate-500">Expiring</div><div className="mt-0.5 text-base font-semibold"><CountUp to={11} /></div></div>
              </div>
              <div className="mt-5 flex h-28 items-end gap-1.5">
                {[42, 55, 48, 66, 60, 78, 70, 84, 64, 76, 90, 82, 96, 88].map((h, i) => <div key={i} className={`bar-grow flex-1 rounded-sm ${i === 13 ? "bg-brand-700" : "bg-slate-200"}`} style={{ height: `${h}%`, animationDelay: `${400 + i * 45}ms` }} />)}
              </div>
              <div className="mt-4 divide-y divide-slate-100 text-sm">
                {[["Accra Central", 9870], ["Kumasi Adum", 5310], ["Takoradi", 3240]].map(([n, v]) => (
                  <div key={n as string} className="flex justify-between py-2"><span className="text-slate-600">{n}</span><span><CountUp to={v as number} prefix="GH₵ " /></span></div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 left-4 right-4 sm:-left-8 sm:right-auto sm:w-72"><EventTicker /></div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y border-slate-200 bg-[#f7f7f6] py-3.5" aria-hidden="true">
        <div className="marquee flex w-max gap-10 whitespace-nowrap text-sm text-slate-500">
          {[...MARQUEE, ...MARQUEE].map((m, i) => <span key={i} className="flex items-center gap-10">{m}<span className="text-slate-300">✦</span></span>)}
        </div>
      </div>

      {/* Numbers */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-16 sm:px-6 md:grid-cols-4">
          {[[20, "+", "branches supported per group"], [50000, "", "products supported"], [9, "", "staff roles, each with its own access"], [24, "/7", "online store and reminders"]].map(([n, suf, l], i) => (
            <Reveal key={l as string} delay={i * 90}>
              <div className="font-serif text-5xl italic text-slate-900"><CountUp to={n as number} suffix={suf as string} /></div>
              <div className="mt-1 text-sm text-slate-500">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <Section id="features">
        <Reveal className="max-w-2xl">
          <Eyebrow>Features</Eyebrow>
          <H2>Everything a pharmacy does, <Serif>in one system</Serif></H2>
          <p className="mt-3 text-slate-600">From the shelf to the patient, with a record of every step.</p>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 4) * 80} className="group bg-white p-6 transition-colors duration-300 hover:bg-[#f7f7f6]">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white transition duration-300 group-hover:-translate-y-0.5 group-hover:border-brand-300"><Icon className="h-[18px] w-[18px] text-slate-600 transition group-hover:text-brand-700" strokeWidth={1.75} /></span>
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Multi-branch */}
      <Section id="branches" muted>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Multi-branch</Eyebrow>
            <H2>Grow from one shop <Serif>to a chain</Serif> without changing systems</H2>
            <p className="mt-3 text-slate-600">Head office sets the catalogue and prices; each branch keeps its own stock, staff, licence and opening hours.</p>
            <ul className="mt-8 space-y-3.5 text-slate-700">
              {["Central catalogue with branch-level prices", "Transfers carry batch and expiry, with shortages flagged", "A prescription can never be filled twice, even at two branches", "Staff see only the branches they work at", "One dashboard and one set of reports across every branch"].map((p) => (
                <li key={p} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" strokeWidth={2} /><span>{p}</span></li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="rounded-xl border border-slate-200 bg-white p-4"><NetworkMap /></Reveal>
        </div>
      </Section>

      {/* Patients: online store + reminders */}
      <Section id="patients">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <div className="relative mx-auto w-72" aria-hidden="true">
              <div className="drift absolute -inset-10 -z-10 rounded-full bg-brand-50 blur-2xl" />
              <div className="rounded-[2.2rem] border border-slate-300 bg-white p-3 shadow-[0_24px_48px_-16px_rgba(15,23,42,0.18)]">
                <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-slate-200" />
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">MediCare Pharmacies</div>
                  <div className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-400">Search medicines or symptoms</div>
                  {[["Panadol Extra 500mg", "GH₵ 18.00", "In stock"], ["Coartem 80/480", "GH₵ 55.00", "In stock"], ["Amoxil 500mg", "GH₵ 45.00", "Prescription"]].map(([n, p, st]) => (
                    <div key={n} className="mt-2 flex items-center justify-between border-b border-slate-100 py-2 text-xs last:border-0">
                      <div><div className="font-medium text-slate-800">{n}</div><div className="text-slate-500">{st}</div></div><div className="font-medium">{p}</div>
                    </div>
                  ))}
                  <div className="mt-3 rounded-md bg-slate-900 py-2 text-center text-[11px] font-medium text-white">Checkout · delivery in 45 min</div>
                </div>
              </div>
              <div className="absolute -right-4 -top-6 w-56 rotate-2 rounded-xl sm:-right-24 border border-slate-200 bg-white p-3 text-xs shadow-[0_12px_32px_-8px_rgba(15,23,42,0.2)]">
                <div className="flex items-center justify-between text-[10px] text-slate-400"><span>Messages</span><span>08:00</span></div>
                <div className="mt-1 text-slate-700">MediCare: time for your 8:00 dose of <span className="font-medium">Amlodipine 5mg</span>.</div>
              </div>
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2" delay={100}>
            <Eyebrow>For patients</Eyebrow>
            <H2>An online store and reminders that <Serif>bring patients back</Serif></H2>
            <ul className="mt-8 space-y-3.5 text-slate-700">
              {["Order from a phone with a one-time code; no passwords", "Live stock per branch, with substitutes when something is out", "Upload a prescription; the pharmacist reviews before packing", "Pay by mobile money or card, or on delivery", "A text at each dose time, and before the refill is due", "Patients pause or stop reminders themselves"].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" strokeWidth={2} /><span>{t}</span></li>
              ))}
            </ul>
            <Link href="/shop/medicare" className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-900">Open the demo store <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
          </Reveal>
        </div>
      </Section>

      {/* Quote band */}
      <section className="border-t border-slate-200 bg-slate-900 text-white">
        <Reveal className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="font-serif text-3xl italic leading-snug sm:text-4xl">“Every batch traced, every prescription checked, every branch in view.”</p>
          <p className="mt-6 text-sm text-slate-400">What PharmaOne is built to do for your pharmacy</p>
        </Reveal>
      </section>

      {/* Compliance */}
      <Section id="compliance" muted>
        <Reveal className="max-w-2xl">
          <Eyebrow>Compliance</Eyebrow>
          <H2>Ready for an inspection <Serif>on any day</Serif>, at any branch</H2>
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
          {compliance.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 2) * 90} className="group bg-white p-7 transition-colors duration-300 hover:bg-[#fbfbfa]">
              <Icon className="h-5 w-5 text-slate-500 transition group-hover:text-brand-700" strokeWidth={1.75} />
              <h3 className="mt-3 font-medium">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">PharmaOne helps you follow the rules; it is not legal advice. Your superintendent pharmacist should confirm current requirements.</p>
      </Section>

      {/* Pricing */}
      <Section id="pricing">
        <Reveal className="max-w-2xl">
          <Eyebrow>Pricing</Eyebrow>
          <H2>Simple pricing that <Serif>grows with you</Serif></H2>
          <p className="mt-3 text-slate-600">Indicative pilot pricing. SMS, payment and hosting fees are billed at cost.</p>
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 90} className={`flex flex-col rounded-xl border p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)] ${t.featured ? "border-slate-900" : "border-slate-200"}`}>
              <div className="flex items-center justify-between"><h3 className="font-semibold">{t.name}</h3>{t.featured && <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] text-white">Most chosen</span>}</div>
              <p className="mt-1 text-sm text-slate-500">{t.blurb}</p>
              <div className="mt-6"><span className="font-serif text-5xl italic">{t.price}</span> <span className="text-sm text-slate-500">{t.per}</span></div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-700">{t.items.map((i2) => <li key={i2} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{i2}</li>)}</ul>
              <a href="#demo" className={`mt-8 rounded-md px-4 py-2 text-center text-sm font-medium transition ${t.featured ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-slate-300 hover:border-slate-400"}`}>{t.name === "Enterprise" ? "Talk to us" : "Book a demo"}</a>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section muted>
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <Reveal><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Questions <Serif>pharmacists</Serif> ask</h2></Reveal>
          <Reveal delay={100} className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">{q}<span className="ml-4 text-xl leading-none text-slate-400 transition duration-300 group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </Section>

      {/* Demo */}
      <Section id="demo">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">See it with <Serif>your pharmacy</Serif> in mind</h2>
            <p className="mt-3 text-slate-600">A 30-minute walkthrough based on your branches, your workflow and your regulatory questions.</p>
            <p className="mt-6 text-sm text-slate-500">Already a customer? <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4">Sign in</Link> or <Link href="/signup" className="font-medium text-slate-900 underline underline-offset-4">create a workspace</Link>.</p>
          </Reveal>
          <Reveal delay={100} className="rounded-xl border border-slate-200 p-6 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.15)] sm:p-8"><DemoForm /></Reveal>
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
