"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Clock, Mail, MapPin, Menu, MessageCircle, Navigation, Phone, ShieldCheck, ShoppingBag, Smartphone, Stethoscope, Truck, X } from "lucide-react";
import { api, dateFmt } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { imageSrc } from "@/lib/image";
import { DEFAULT_COLOR, DEFAULT_SERVICES, defaultHeadline, defaultIntro, telLink, textOn, whatsappLink } from "@/lib/website";
import ProductImage from "@/components/ProductImage";
import { Spinner } from "@/components/ui";

const Img = ({ url, alt, className }: { url?: string; alt: string; className?: string }) => {
  const src = imageSrc(url);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt} className={className} /> : null;
};
const Facebook = (p: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className} aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3Z" /></svg>;
const Instagram = (p: { className?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
const TikTok = (p: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className} aria-hidden="true"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5Z" /></svg>;
const XLogo = (p: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className} aria-hidden="true"><path d="M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.2L5.6 21h-3l7-8.1L2 3h6.2l4.3 5.7L17.8 3Zm-1 16.2h1.7L7.3 4.7H5.5l11.3 14.5Z" /></svg>;

// A pharmacy's own public website, written and styled by the pharmacy in Settings → Website.
export default function PharmacySite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const site = useLoad<any>(() => api(`/portal/${slug}/site`), [slug]);
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => { setPreview(new URLSearchParams(window.location.search).has("preview")); }, []);
  useEffect(() => { if (site.data) document.title = site.data.name; }, [site.data]);

  if (site.error) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-xl font-semibold">Pharmacy not found</h1><p className="mt-2 text-slate-600">Check the link and try again.</p></div></div>;
  if (!site.data) return <Spinner />;

  const s = site.data; const w = s.website || {};
  const color = w.brandColor || DEFAULT_COLOR; const on = textOn(color);
  const shop = `/shop/${slug}`;
  const services = w.services?.length ? w.services : DEFAULT_SERVICES;
  const branches = s.branches || [];
  const phone = w.contact?.phone || branches[0]?.phone; const wa = whatsappLink(w.contact?.whatsapp); const tel = telLink(phone);
  const social = [[w.social?.facebook, Facebook, "Facebook"], [w.social?.instagram, Instagram, "Instagram"], [w.social?.tiktok, TikTok, "TikTok"], [w.social?.x, XLogo, "X"]].filter(([u]) => u) as [string, any, string][];
  const licensed = branches.some((b: any) => b.licenseNumber);
  const nav = [["About", "#about"], ["Services", "#services"], ["Branches", "#branches"], ["Contact", "#contact"]];

  if (!w.published && !preview) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fafafa] p-6 text-center">
        <div className="max-w-sm"><h1 className="text-xl font-semibold text-slate-900">{s.name}</h1><p className="mt-2 text-slate-600">Our website is being updated. You can still order from our online pharmacy.</p>
          <Link href={shop} className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium" style={{ background: color, color: on }}><ShoppingBag className="h-4 w-4" />Order online</Link></div>
      </div>
    );
  }

  const Logo = () => (
    <a href="#top" className="flex min-w-0 items-center gap-2.5">
      {w.logoUrl ? <Img url={w.logoUrl} alt={s.name} className="h-8 w-auto max-w-[96px] shrink-0 object-contain sm:h-9 sm:max-w-[120px]" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold" style={{ background: color, color: on }}>{s.name.slice(0, 1)}</span>}
      <span className="truncate font-semibold tracking-tight text-slate-900">{s.name}</span>
    </a>
  );
  const OrderButton = ({ big }: { big?: boolean }) => (
    <Link href={shop} className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium shadow-sm transition hover:opacity-90 ${big ? "px-5 py-3" : "px-3.5 py-2 text-sm"}`} style={{ background: color, color: on }}><ShoppingBag className="h-4 w-4" />{big ? "Order online" : <><span className="sm:hidden">Order</span><span className="hidden sm:inline">Order online</span></>}</Link>
  );

  return (
    <div id="top" className="min-h-screen scroll-smooth bg-white text-slate-700">
      {preview && !w.published && <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">Preview. This website is hidden from the public until you turn it on in Settings → Website.</div>}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm md:flex">{nav.map(([l, h]) => <a key={h} href={h} className="text-slate-600 hover:text-slate-900">{l}</a>)}</nav>
          <div className="flex items-center gap-2"><OrderButton /><button onClick={() => setMenu(!menu)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label={menu ? "Close menu" : "Open menu"}>{menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
        </div>
        {menu && <nav className="border-t border-slate-100 px-4 py-2 md:hidden">{nav.map(([l, h]) => <a key={h} href={h} onClick={() => setMenu(false)} className="block py-2.5 text-slate-700">{l}</a>)}</nav>}
      </header>

      {/* Banner */}
      <section className="border-b border-slate-100" style={{ background: `linear-gradient(180deg, ${color}0d, transparent)` }}>
        <div className={`mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 ${w.heroImageUrl ? "lg:grid-cols-[1.1fr_1fr]" : ""}`}>
          <div className={w.heroImageUrl ? "" : "max-w-3xl"}>
            {licensed && <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"><BadgeCheck className="h-3.5 w-3.5" style={{ color }} />Licensed by the Pharmacy Council of Ghana</span>}
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">{w.headline || defaultHeadline(s.name)}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">{w.intro || defaultIntro(s.name, branches.length)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <OrderButton big />
              {wa ? <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 hover:bg-slate-50"><MessageCircle className="h-4 w-4" />WhatsApp a pharmacist</a>
                : tel && <a href={tel} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 hover:bg-slate-50"><Phone className="h-4 w-4" />Call us</a>}
            </div>
          </div>
          {w.heroImageUrl && <Img url={w.heroImageUrl} alt={s.name} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm" />}
        </div>
      </section>

      {/* What customers can count on */}
      <section className="border-b border-slate-100">
        <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[[ShieldCheck, "Genuine medicines", "From approved suppliers, stored properly."], [Stethoscope, "Registered pharmacists", "Every prescription is checked."], [Smartphone, "Mobile money", s.codEnabled ? "Or pay when your order arrives." : "Pay safely online."], [Truck, "Delivery or pick-up", "Order online, we bring it or keep it ready."]].map(([I, t, d]: any) => (
            <li key={t} className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${color}14`, color }}><I className="h-4 w-4" /></span><span><span className="block font-medium text-slate-900">{t}</span><span className="text-slate-500">{d}</span></span></li>
          ))}
        </ul>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-20">
        <div className={`mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 ${w.aboutImageUrl ? "items-center lg:grid-cols-2" : ""}`}>
          {w.aboutImageUrl && <Img url={w.aboutImageUrl} alt={`About ${s.name}`} className="aspect-[4/3] w-full rounded-2xl object-cover" />}
          <div className={w.aboutImageUrl ? "" : "max-w-3xl"}>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color }}>About us</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{s.name}</p>
            <div className="mt-4 space-y-4 leading-relaxed text-slate-600">{(w.about || defaultIntro(s.name, branches.length)).split(/\n\s*\n/).map((p: string, i: number) => <p key={i}>{p}</p>)}</div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-20 bg-[#fafafa]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color }}>Services</h2>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">How we can help</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((x: any) => <div key={x.title} className="rounded-xl border border-slate-200 bg-white p-5"><div className="h-1 w-8 rounded-full" style={{ background: color }} /><h3 className="mt-4 font-semibold text-slate-900">{x.title}</h3>{x.text && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{x.text}</p>}</div>)}
          </div>
        </div>
      </section>

      {/* Products from the online store */}
      {s.featured?.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color }}>Shop online</h2><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Order from our online pharmacy</p></div>
            <Link href={shop} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:underline">See all products<ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {s.featured.map((p: any) => (
              <Link key={p._id} href={shop} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm">
                <ProductImage product={p} className="aspect-square w-full p-3" />
                <div className="border-t border-slate-100 p-3"><div className="truncate text-sm font-medium text-slate-900">{p.brand}</div><div className="text-xs text-slate-500">{p.category}</div></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Photos */}
      {w.gallery?.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20">
          <h2 className="sr-only">Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{w.gallery.map((u: string, i: number) => <Img key={u} url={u} alt={`${s.name} photo ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />)}</div>
        </section>
      )}

      {/* Branches */}
      <section id="branches" className="scroll-mt-20 border-t border-slate-100 bg-[#fafafa]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color }}>{branches.length > 1 ? "Our branches" : "Visit us"}</h2>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Find a pharmacy near you</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((b: any) => {
              const map = b.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${b.address}`)}` : null;
              return (
                <div key={b._id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-slate-900">{b.name}</h3>
                  <ul className="mt-3 flex-1 space-y-2 text-sm text-slate-600">
                    {b.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{b.address}</li>}
                    {b.openingHours && <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{b.openingHours}</li>}
                    {b.phone && <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><a href={telLink(b.phone)!} className="hover:underline">{b.phone}</a></li>}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-sm">
                    {map && <a href={map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"><Navigation className="h-3.5 w-3.5" />Directions</a>}
                    {b.online && <Link href={shop} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Order from here<ArrowRight className="h-3.5 w-3.5" /></Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20" style={{ background: color, color: on }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:py-16 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Questions about your medicine?</h2>
            <p className="mt-2 max-w-xl opacity-80">Our pharmacists are happy to help. Call or message us, or order online and we&apos;ll take care of the rest.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={shop} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-medium text-slate-900 hover:bg-slate-100"><ShoppingBag className="h-4 w-4" />Order online</Link>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-medium ring-1 ring-current/40 hover:bg-white/10"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            {phone && <li><a href={tel!} className="flex items-center gap-3 hover:underline"><Phone className="h-4 w-4 opacity-70" />{phone}</a></li>}
            {w.contact?.email && <li><a href={`mailto:${w.contact.email}`} className="flex items-center gap-3 hover:underline"><Mail className="h-4 w-4 opacity-70" />{w.contact.email}</a></li>}
            {social.length > 0 && <li className="flex gap-2 pt-1">{social.map(([u, I, l]) => <a key={l} href={u} target="_blank" rel="noreferrer" aria-label={l} className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-current/30 hover:bg-white/10"><I className="h-4 w-4" /></a>)}</li>}
          </ul>
        </div>
      </section>

      <footer className="bg-white py-8 text-sm text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-medium text-slate-800">{s.name}</div>
            {branches.filter((b: any) => b.licenseNumber).slice(0, 3).map((b: any) => <div key={b._id}>{b.name}: licence {b.licenseNumber}{b.licenseExpiry ? `, valid to ${dateFmt(b.licenseExpiry)}` : ""}{b.superintendent ? ` · Superintendent ${b.superintendent}` : ""}</div>)}
            {s.dpcRegistration && <div>Data Protection Commission reg. {s.dpcRegistration}</div>}
          </div>
          <div className="flex gap-4 sm:flex-col sm:items-end sm:gap-1"><Link href={shop} className="hover:text-slate-800">Online pharmacy</Link><span className="text-slate-400">Powered by PharmaOne</span></div>
        </div>
      </footer>
    </div>
  );
}
