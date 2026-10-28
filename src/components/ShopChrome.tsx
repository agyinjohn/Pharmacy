"use client";
import Link from "next/link";
import { dateFmt } from "@/lib/api";
import { imageSrc } from "@/lib/image";
import { DEFAULT_COLOR, textOn } from "@/lib/website";

// The pharmacy's colour (from Settings → Website) and the text colour that reads on it.
export const shopColors = (shop: any) => { const color = shop?.website?.brandColor || DEFAULT_COLOR; return { color, on: textOn(color) }; };

export function ShopHeader({ shop, slug, right }: { shop: any; slug: string; right?: React.ReactNode }) {
  const logo = imageSrc(shop?.website?.logoUrl);
  const { color, on } = shopColors(shop);
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link href={`/shop/${slug}`} className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="" className="h-8 w-auto max-w-[96px] shrink-0 object-contain" /> : <span className="serif grid h-8 w-8 shrink-0 place-items-center rounded-full text-base" style={{ background: color, color: on }}>{(shop?.name || "P").slice(0, 1)}</span>}
          <span className="min-w-0"><span className="serif block truncate text-lg leading-tight">{shop?.name || "Pharmacy"}</span><span className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] sm:block">Online pharmacy</span></span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {shop?.website?.published && <Link href={`/site/${slug}`} className="uline hidden px-2 text-sm md:block">About us</Link>}
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
    <footer className="mt-24 overflow-hidden border-t border-black/10 pt-12 text-sm text-[var(--muted)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3 sm:px-8">
        <div><div className="serif text-xl text-[var(--ink)]">{b?.name}</div><div className="mt-2">{b?.address}</div>{b?.phone && <div className="mt-1">{b.phone}</div>}{b?.openingHours && <div className="mt-1">{b.openingHours}</div>}</div>
        <div className="space-y-1"><div className="text-xs font-medium uppercase tracking-[0.18em]">Licensed pharmacy</div><div>Licence {b?.licenseNumber}{b?.licenseExpiry ? `, valid to ${dateFmt(b.licenseExpiry)}` : ""}</div>{b?.superintendent && <div>Superintendent pharmacist: {b.superintendent}</div>}{shop.dpcRegistration && <div>Data Protection Commission reg. {shop.dpcRegistration}</div>}</div>
        <p className="text-xs leading-relaxed">Prescription-only medicines are supplied after review by a registered pharmacist. Controlled medicines are not sold online. Powered by PharmaOne.</p>
      </div>
      <div className="serif mt-10 select-none whitespace-nowrap text-center text-[16vw] leading-[0.8] text-[var(--ink)] opacity-[0.05]" aria-hidden="true">{shop.name.split(" ")[0]}</div>
    </footer>
  );
}
