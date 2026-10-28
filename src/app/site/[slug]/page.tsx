"use client";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Mail, Menu, MessageCircle, Phone, X } from "lucide-react";
import { api, dateFmt } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { imageSrc } from "@/lib/image";
import { DEFAULT_COLOR, DEFAULT_SERVICES, defaultHeadline, defaultIntro, telLink, textOn, whatsappLink } from "@/lib/website";
import ProductImage from "@/components/ProductImage";
import { Badge, Capsule, Headline, Leaf, Star, useReveal } from "@/components/SiteArt";

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
  const [scrolled, setScrolled] = useState(false);
  const heroImg = useRef<HTMLDivElement>(null);
  useEffect(() => { setPreview(new URLSearchParams(window.location.search).has("preview")); }, []);
  useEffect(() => { if (site.data) document.title = site.data.name; }, [site.data]);
  useEffect(() => {
    // The header firms up once you scroll; the hero photo moves a little slower than the page.
    const onScroll = () => { setScrolled(window.scrollY > 24); if (heroImg.current && window.scrollY < 1200) heroImg.current.style.transform = `translateY(${window.scrollY * 0.12}px)`; };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useReveal(!!site.data);

  if (site.error) return <div className="site grid min-h-screen place-items-center p-6 text-center"><div><h1 className="serif text-3xl">Pharmacy not found</h1><p className="mt-2 text-[var(--muted)]">Check the link and try again.</p></div></div>;
  if (!site.data) return <div className="site grid min-h-screen place-items-center"><Star className="spin h-8 w-8 text-[var(--muted)]" /></div>;

  const s = site.data; const w = s.website || {};
  const color = w.brandColor || DEFAULT_COLOR; const on = textOn(color);
  const shop = `/shop/${slug}`;
  const services: { title: string; text?: string }[] = w.services?.length ? w.services : DEFAULT_SERVICES;
  const branches = s.branches || [];
  const phone = w.contact?.phone || branches[0]?.phone; const wa = whatsappLink(w.contact?.whatsapp); const tel = telLink(phone);
  const social = [[w.social?.facebook, Facebook, "Facebook"], [w.social?.instagram, Instagram, "Instagram"], [w.social?.tiktok, TikTok, "TikTok"], [w.social?.x, XLogo, "X"]].filter(([u]) => u) as [string, any, string][];
  const city = (branches[0]?.address || "").split(",").pop()?.trim();
  const [lead, ...rest] = (w.about || defaultIntro(s.name, branches.length)).split(/\n\s*\n/);
  const tint = `${color}14`;

  // Sections are numbered in order, skipping the ones that have nothing to show.
  const sections = ["about", "services", ...(s.featured?.length ? ["shop"] : []), ...(w.gallery?.length ? ["photos"] : []), "visit"];
  const num = (k: string) => `(${String(sections.indexOf(k) + 1).padStart(2, "0")})`;
  const nav = [["About", "#about"], ["Services", "#services"], ["Visit", "#visit"], ["Contact", "#contact"]];

  if (!w.published && !preview) {
    return (
      <div className="site grain grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-md"><h1 className="serif text-4xl">{s.name}</h1><p className="mt-3 text-[var(--muted)]">Our website is being refreshed. You can still order from our online pharmacy.</p>
          <Link href={shop} className="btn-arrow mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium" style={{ background: color, color: on }}>Order online<ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    );
  }

  // Plain render helpers rather than components, so scrolling re-renders don't remount them (and undo their reveal).
  const eyebrow = (k: string, children: React.ReactNode) => (
    <div className="reveal flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]"><span className="serif-i text-base normal-case tracking-normal" style={{ color }}>{num(k)}</span><span className="h-px w-10 bg-current opacity-40" />{children}</div>
  );
  const orderBtn = (big?: boolean, light?: boolean) => (
    <Link href={shop} className={`btn-arrow inline-flex items-center gap-2 whitespace-nowrap rounded-full font-medium transition hover:opacity-90 ${big ? "px-6 py-3.5" : "px-4 py-2 text-sm"}`} style={light ? { background: "var(--paper)", color: "var(--ink)" } : { background: color, color: on }}>
      {big ? "Order medicines online" : <><span className="sm:hidden">Order</span><span className="hidden sm:inline">Order online</span></>}<ArrowRight className="h-4 w-4" />
    </Link>
  );

  return (
    <div id="top" className="site grain min-h-screen overflow-x-hidden scroll-smooth">
      {preview && !w.published && <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">Preview. This website is hidden from the public until you turn it on in Settings → Website.</div>}

      <header className={`sticky top-0 z-40 transition-all duration-500 ${scrolled ? "bg-[var(--paper)]/90 shadow-[0_1px_0_rgba(29,26,22,.08)] backdrop-blur" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            {w.logoUrl ? <Img url={w.logoUrl} alt="" className="h-8 w-auto max-w-[96px] shrink-0 object-contain sm:h-9" /> : <span className="serif grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg" style={{ background: color, color: on }}>{s.name.slice(0, 1)}</span>}
            <span className="serif truncate text-lg sm:text-xl">{s.name}</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm md:flex">{nav.map(([l, h]) => <a key={h} href={h} className="uline opacity-80 hover:opacity-100">{l}</a>)}</nav>
          <div className="flex items-center gap-1">{orderBtn()}<button onClick={() => setMenu(!menu)} className="rounded-full p-2 md:hidden" aria-label={menu ? "Close menu" : "Open menu"}>{menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
        </div>
        {menu && <nav className="border-t border-black/5 bg-[var(--paper)] px-5 pb-4 md:hidden">{nav.map(([l, h]) => <a key={h} href={h} onClick={() => setMenu(false)} className="serif block border-b border-black/5 py-3 text-2xl">{l}</a>)}</nav>}
      </header>

      {/* Opening */}
      <section className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-28">
        <Star className="float absolute right-[46%] top-10 hidden h-6 w-6 lg:block" style={{ color, ["--d" as any]: "1s" }} />
        <div className="relative z-10 flex flex-col justify-center">
          <div className="fade-in flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]" style={{ ["--d" as any]: ".05s" }}>
            <span className="h-px w-10 bg-current opacity-40" />{branches.length > 1 ? `${branches.length} pharmacies` : "Community pharmacy"}{city ? ` · ${city}` : ""}
          </div>
          <h1 className="serif mt-6 text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[5.25rem]"><Headline text={w.headline || defaultHeadline(s.name)} color={color} /></h1>
          <p className="fade-in mt-7 max-w-lg text-lg leading-relaxed text-[var(--muted)]" style={{ ["--d" as any]: ".9s" }}>{w.intro || defaultIntro(s.name, branches.length)}</p>
          <div className="fade-in mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ ["--d" as any]: "1.1s" }}>
            {orderBtn(true)}
            {wa ? <a href={wa} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 font-medium"><MessageCircle className="h-4 w-4" /><span className="uline">Chat with a pharmacist</span></a>
              : tel && <a href={tel} className="group inline-flex items-center gap-2 font-medium"><Phone className="h-4 w-4" /><span className="uline">Call {phone}</span></a>}
          </div>
        </div>

        {/* Arched frame: the pharmacy's photo, or a drawn still life when there isn't one */}
        <div className="fade-in relative mx-auto w-full max-w-md lg:max-w-none" style={{ ["--d" as any]: ".35s" }}>
          <div className="absolute -left-4 top-8 h-full w-full rounded-b-[28px] rounded-t-[999px] border sm:-left-6" style={{ borderColor: `${color}55` }} />
          <div className="relative aspect-[4/5] overflow-hidden rounded-b-[28px] rounded-t-[999px]" style={{ background: `linear-gradient(170deg, ${color}26, ${color}0a 60%, var(--paper-2))` }}>
            {w.heroImageUrl ? <div ref={heroImg} className="absolute inset-[-6%]"><Img url={w.heroImageUrl} alt={s.name} className="kenburns h-full w-full object-cover" /></div> : (
              <div className="absolute inset-0" style={{ color }}>
                <Capsule className="float absolute left-[14%] top-[30%] w-[46%]" style={{ ["--r" as any]: "-24deg", ["--d" as any]: ".8s" }} />
                <Leaf className="float absolute right-[14%] top-[44%] w-[28%]" style={{ ["--r" as any]: "12deg", ["--d" as any]: "1.6s" }} />
                <Star className="float absolute left-[24%] top-[66%] h-8 w-8 opacity-70" style={{ ["--d" as any]: "2.2s" }} />
                <div className="serif-i absolute inset-x-0 bottom-[10%] text-center text-[clamp(2.5rem,6vw,4.5rem)] leading-none opacity-90">{s.name.split(" ")[0]}</div>
              </div>
            )}
          </div>
          <div className="absolute -right-1 -top-4 sm:-bottom-6 sm:-left-8 sm:right-auto sm:top-auto"><Badge text={branches.some((b: any) => b.licenseNumber) ? "Licensed pharmacy · Pharmacists on duty" : "Your community pharmacy · Pharmacists on duty"} color={color} on={on} /></div>
        </div>
      </section>

      {/* Endless band of services */}
      <div className="relative -rotate-1 border-y border-black/10 py-5" style={{ background: color, color: on }} aria-hidden="true">
        <div className="marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {[...services.map((x) => x.title), "Genuine medicines", "Mobile money", "Delivery to your door"].map((t, i) => (
                <span key={`${k}-${i}`} className="flex items-center"><span className="serif-i whitespace-nowrap px-7 text-3xl sm:text-4xl">{t}</span><Star className="h-5 w-5 opacity-70" /></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <section id="about" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
        {eyebrow("about", "Our story")}
        <div className={`mt-10 grid gap-14 ${w.aboutImageUrl ? "lg:grid-cols-[1.2fr_1fr] lg:items-start" : ""}`}>
          <div>
            <p className="reveal serif text-3xl leading-[1.2] sm:text-[2.6rem]">{lead}</p>
            <div className="mt-8 max-w-2xl space-y-5 text-lg leading-relaxed text-[var(--muted)]">{rest.map((p: string, i: number) => <p key={i} className="reveal" style={{ ["--d" as any]: `${0.1 * (i + 1)}s` }}>{p}</p>)}</div>
            <p className="reveal serif-i mt-10 text-xl" style={{ color }}>— The team at {s.name}</p>
          </div>
          {w.aboutImageUrl && (
            <div className="relative mx-auto w-full max-w-md lg:mt-16">
              <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[28px]" style={{ background: tint }} />
              <Img url={w.aboutImageUrl} alt={`Inside ${s.name}`} className="reveal-img relative aspect-[4/5] w-full rounded-[28px] object-cover" />
              <Leaf className="float absolute -right-6 -top-10 w-16" style={{ color, ["--r" as any]: "18deg" }} />
            </div>
          )}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-24 bg-[var(--paper-2)] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>{eyebrow("services", "What we do")}<h2 className="reveal serif mt-6 text-4xl sm:text-6xl">How we can <span className="serif-i" style={{ color }}>help</span></h2></div>
            <p className="reveal max-w-sm text-[var(--muted)]">Ask us anything about your medicines. There is always a registered pharmacist on duty.</p>
          </div>
          <ol className="mt-14 border-t border-black/15">
            {services.map((x, i) => (
              <li key={x.title} className="reveal row-fill group grid cursor-default gap-2 border-b border-black/15 px-2 py-7 sm:grid-cols-[80px_1fr_1.2fr_40px] sm:items-center sm:gap-6 sm:px-4" style={{ ["--tint" as any]: tint, ["--d" as any]: `${i * 0.06}s` }}>
                <span className="serif-i text-xl" style={{ color }}>{String(i + 1).padStart(2, "0")}</span>
                <h3 className="serif text-2xl transition-transform duration-500 group-hover:translate-x-2 sm:text-3xl">{x.title}</h3>
                <p className="text-[var(--muted)]">{x.text}</p>
                <ArrowUpRight className="hidden h-6 w-6 opacity-30 transition duration-500 group-hover:rotate-45 group-hover:opacity-100 sm:block" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* From the online store */}
      {s.featured?.length > 0 && (
        <section className="py-24 sm:py-32">
          <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-5 sm:px-8">
            <div>{eyebrow("shop", "From our shelves")}<h2 className="reveal serif mt-6 max-w-3xl text-4xl sm:text-6xl">Order <span className="serif-i" style={{ color }}>online</span>, collect or get it delivered</h2></div>
            <Link href={shop} className="reveal group inline-flex items-center gap-2 font-medium"><span className="uline">Visit the online pharmacy</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="no-scrollbar mt-14 flex snap-x gap-6 overflow-x-auto px-5 pb-10 pt-2 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            {s.featured.map((p: any, i: number) => (
              <Link key={p._id} href={shop} className="reveal tilt group w-56 shrink-0 snap-start overflow-hidden rounded-[22px] bg-white sm:w-64" style={{ transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)`, ["--d" as any]: `${i * 0.06}s` }}>
                <ProductImage product={p} className="aspect-square w-full p-5" />
                <div className="flex items-end justify-between gap-2 border-t border-black/5 p-4"><div className="min-w-0"><div className="serif truncate text-lg">{p.brand}</div><div className="text-xs uppercase tracking-wider text-[var(--muted)]">{p.category}</div></div><ArrowUpRight className="h-5 w-5 shrink-0 opacity-40 transition group-hover:rotate-45 group-hover:opacity-100" /></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Photos */}
      {w.gallery?.length > 0 && (
        <section className={`mx-auto max-w-7xl px-5 pb-24 sm:px-8 sm:pb-32 ${s.featured?.length ? "" : "pt-24 sm:pt-32"}`}>
          {eyebrow("photos", "Inside the pharmacy")}
          <div className="mt-12 columns-2 gap-4 sm:columns-3 sm:gap-6">
            {w.gallery.map((u: string, i: number) => <Img key={u} url={u} alt={`${s.name}, photo ${i + 1}`} className={`reveal-img mb-4 w-full break-inside-avoid rounded-[20px] object-cover sm:mb-6 ${["aspect-[4/5]", "aspect-square", "aspect-[3/4]"][i % 3]}`} />)}
          </div>
        </section>
      )}

      {/* Branches */}
      <section id="visit" className="scroll-mt-24 border-t border-black/10 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {eyebrow("visit", <>{branches.length > 1 ? "Our pharmacies" : "Visit us"}</>)}
          <h2 className="reveal serif mt-6 text-4xl sm:text-6xl">Come and <span className="serif-i" style={{ color }}>see us</span></h2>
          <div className="mt-14 border-t border-black/15">
            {branches.map((b: any, i: number) => {
              const map = b.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${b.address}`)}` : null;
              return (
                <div key={b._id} className="reveal group grid gap-4 border-b border-black/15 py-8 md:grid-cols-[1.3fr_1fr_auto] md:items-center md:gap-8" style={{ ["--d" as any]: `${i * 0.08}s` }}>
                  <h3 className="serif text-3xl sm:text-5xl"><span className="uline">{b.name}</span></h3>
                  <div className="space-y-1 text-[var(--muted)]">{b.address && <div>{b.address}</div>}{b.openingHours && <div>{b.openingHours}</div>}{b.phone && <a href={telLink(b.phone)!} className="block hover:text-[var(--ink)]">{b.phone}</a>}</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {map && <a href={map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-black/20 px-4 py-2 font-medium transition hover:border-black/60">Directions<ArrowUpRight className="h-4 w-4" /></a>}
                    {b.online && <Link href={shop} className="btn-arrow inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-medium" style={{ background: tint }}>Order here<ArrowRight className="h-4 w-4" /></Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative scroll-mt-24 overflow-hidden" style={{ background: color, color: on }}>
        <svg viewBox="0 0 400 400" className="spin-rev pointer-events-none absolute -right-32 -top-32 h-[34rem] w-[34rem] opacity-20" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="200" cy="200" r="190" strokeDasharray="2 10" /><circle cx="200" cy="200" r="140" /><circle cx="200" cy="200" r="90" strokeDasharray="1 6" /></svg>
        <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <h2 className="reveal serif max-w-4xl text-5xl leading-[1.02] sm:text-7xl lg:text-8xl">Questions about your medicine? <span className="serif-i opacity-80">Just ask.</span></h2>
          <div className="mt-14 grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <div className="reveal flex flex-wrap gap-4">
              {orderBtn(true, true)}
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-medium ring-1 ring-current/40 transition hover:bg-white/10"><MessageCircle className="h-4 w-4" />WhatsApp us</a>}
            </div>
            <ul className="reveal space-y-3 text-lg">
              {phone && <li><a href={tel!} className="group flex items-center gap-3"><Phone className="h-4 w-4 opacity-70" /><span className="uline">{phone}</span></a></li>}
              {w.contact?.email && <li><a href={`mailto:${w.contact.email}`} className="group flex items-center gap-3"><Mail className="h-4 w-4 opacity-70" /><span className="uline">{w.contact.email}</span></a></li>}
              {social.length > 0 && <li className="flex gap-2 pt-2">{social.map(([u, I, l]) => <a key={l} href={u} target="_blank" rel="noreferrer" aria-label={l} className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-current/30 transition hover:bg-white/10"><I className="h-4 w-4" /></a>)}</li>}
            </ul>
          </div>
        </div>
      </section>

      <footer className="overflow-hidden pt-16 text-sm text-[var(--muted)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:flex-row sm:justify-between sm:px-8">
          <div className="space-y-1">
            {branches.filter((b: any) => b.licenseNumber).slice(0, 3).map((b: any) => <div key={b._id}>{b.name}: licence {b.licenseNumber}{b.licenseExpiry ? `, valid to ${dateFmt(b.licenseExpiry)}` : ""}{b.superintendent ? ` · Superintendent ${b.superintendent}` : ""}</div>)}
            {s.dpcRegistration && <div>Data Protection Commission reg. {s.dpcRegistration}</div>}
          </div>
          <div className="flex gap-6 sm:flex-col sm:items-end sm:gap-1"><Link href={shop} className="hover:text-[var(--ink)]">Online pharmacy</Link><a href="#top" className="hover:text-[var(--ink)]">Back to top ↑</a><span className="opacity-60">Powered by PharmaOne</span></div>
        </div>
        <div className="serif mt-10 select-none whitespace-nowrap text-center text-[18vw] leading-[0.8] text-[var(--ink)] opacity-[0.06]" aria-hidden="true">{s.name.split(" ")[0]}</div>
      </footer>
    </div>
  );
}
