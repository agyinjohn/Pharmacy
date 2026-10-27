import Link from "next/link";
import { Building2, ClipboardCheck, ShoppingBag } from "lucide-react";
import { Logo } from "./ui";

const POINTS = [
  [Building2, "Every branch in one place", "Sales, stock and expiry for each branch, or all of them together."],
  [ClipboardCheck, "Safer dispensing", "Allergy checks, a digital controlled-drug register and label printing."],
  [ShoppingBag, "Your own online store", "Customers order, pay by mobile money and track delivery."],
] as const;

// Quiet brand panel shown beside the sign-in and sign-up forms on wide screens.
export default function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <Link href="/" className="relative self-start"><Logo light /></Link>
      <div className="max-w-md">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">Run your pharmacy, every branch, from one screen.</h2>
        <ul className="mt-10 space-y-6">
          {POINTS.map(([Icon, title, text]) => (
            <li key={title} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10"><Icon className="h-4.5 w-4.5 text-brand-100" /></span>
              <span><span className="block font-medium">{title}</span><span className="block text-sm text-brand-200">{text}</span></span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-brand-300">Built for Ghana: Pharmacy Council and FDA record-keeping, Data Protection Act, mobile money.</p>
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 text-white/[0.04]"><path d="M100 20v160M20 100h160" stroke="currentColor" strokeWidth="44" strokeLinecap="round" /></svg>
    </aside>
  );
}
