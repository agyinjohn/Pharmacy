"use client";
import Link from "next/link";
import { MapPin, Phone, Clock, BadgeCheck } from "lucide-react";
import { dateFmt } from "@/lib/api";

export function ShopHeader({ shop, slug, right }: { shop: any; slug: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={`/shop/${slug}`} className="flex items-center gap-2 text-lg font-bold text-teal-800">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
          {shop?.name || "Pharmacy"}
        </Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

// Licence, address, contact and hours shown on every customer page (CP-ACC-04).
export function ShopFooter({ shop, branch }: { shop: any; branch: any }) {
  if (!shop) return null;
  const b = branch || shop.branches?.[0];
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white py-8 text-sm text-slate-600">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-3">
        <div><div className="font-semibold text-slate-900">{b?.name}</div><div className="mt-1 flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{b?.address}</div></div>
        <div className="space-y-1"><div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" />{b?.phone}</div><div className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{b?.openingHours}</div></div>
        <div className="space-y-1"><div className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />Licensed pharmacy {b?.licenseNumber}</div><div>Licence valid to {dateFmt(b?.licenseExpiry)}</div><div>Superintendent: {b?.superintendent}</div>{shop.dpcRegistration && <div>Data Protection Commission reg. {shop.dpcRegistration}</div>}</div>
      </div>
      <p className="mx-auto mt-4 max-w-6xl px-4 text-xs text-slate-400">Prescription-only medicines are supplied after review by a registered pharmacist. Controlled medicines are not sold online. Powered by PharmaOne.</p>
    </footer>
  );
}
