"use client";
import Link from "next/link";
import { MapPin, Phone, Clock, BadgeCheck } from "lucide-react";
import { dateFmt } from "@/lib/api";
import { imageSrc } from "@/lib/image";

export function ShopHeader({ shop, slug, right }: { shop: any; slug: string; right?: React.ReactNode }) {
  const logo = imageSrc(shop?.website?.logoUrl);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={`/shop/${slug}`} className="flex min-w-0 items-center gap-2 font-semibold tracking-tight text-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="" className="h-8 w-auto max-w-[96px] shrink-0 object-contain" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-800 text-white"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>}
          <span className="truncate">{shop?.name || "Pharmacy"}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {shop?.website?.published && <Link href={`/site/${slug}`} className="hidden rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 md:block">About us</Link>}
          {right}
        </div>
      </div>
    </header>
  );
}

// Licence, address, contact and hours shown on every customer page (CP-ACC-04).
export function ShopFooter({ shop, branch }: { shop: any; branch: any }) {
  if (!shop) return null;
  const b = branch || shop.branches?.[0];
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white py-8 text-sm text-slate-600">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-3">
        <div><div className="font-semibold text-slate-900">{b?.name}</div><div className="mt-1 flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{b?.address}</div></div>
        <div className="space-y-1"><div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" />{b?.phone}</div><div className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{b?.openingHours}</div></div>
        <div className="space-y-1"><div className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />Licensed pharmacy {b?.licenseNumber}</div><div>Licence valid to {dateFmt(b?.licenseExpiry)}</div><div>Superintendent: {b?.superintendent}</div>{shop.dpcRegistration && <div>Data Protection Commission reg. {shop.dpcRegistration}</div>}</div>
      </div>
      <p className="mx-auto mt-4 max-w-6xl px-4 text-xs text-slate-400">Prescription-only medicines are supplied after review by a registered pharmacist. Controlled medicines are not sold online. Powered by PharmaOne.</p>
    </footer>
  );
}
