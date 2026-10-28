"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { imageSrc, resizeImage } from "@/lib/image";
import { COLOR_PRESETS, DEFAULT_COLOR, DEFAULT_SERVICES, defaultHeadline, defaultIntro } from "@/lib/website";
import { Button, Card, ErrorNote, Input, Spinner, Textarea, cn } from "./ui";
import { PublicAddress, Section, Toggle } from "./SettingsParts";

type Kind = "logo" | "banner" | "photo";
const SIZE: Record<Kind, [number, "image/jpeg" | "image/png"]> = { logo: [480, "image/png"], banner: [1600, "image/jpeg"], photo: [1200, "image/jpeg"] };

// Picks a photo, shrinks it in the browser and uploads it; hands back the stored image's URL.
function useUpload() {
  const { call } = useAuth();
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const upload = async (file: File, kind: Kind, tag: string) => {
    setErr(null); setBusy(tag);
    try { const [max, type] = SIZE[kind]; const image = await resizeImage(file, max, 0.85, type); return (await call("/org/website/images", { body: { image }, branch: null })).url as string; }
    catch (e: any) { setErr(e.message); return null; } finally { setBusy(null); }
  };
  return { upload, busy, err };
}

function ImageField({ label, hint, value, onChange, kind, upload, busy, wide }: { label: string; hint?: string; value?: string; onChange: (url?: string) => void; kind: Kind; upload: ReturnType<typeof useUpload>["upload"]; busy: string | null; wide?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => { if (!f) return; const url = await upload(f, kind, label); if (url) onChange(url); };
  const src = imageSrc(value);
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-slate-700">{label}</div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => input.current?.click()} className={cn("grid shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400", wide ? "aspect-[16/9] w-48" : kind === "logo" ? "h-16 w-28" : "aspect-[4/3] w-32")}>
          {busy === label ? <Spinner /> : src ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={src} alt="" className={cn("h-full w-full", kind === "logo" ? "object-contain p-2" : "object-cover")} /> : <ImagePlus className="h-5 w-5" />}
        </button>
        <div className="space-y-1.5 text-sm">
          <div className="flex gap-2"><Button size="sm" variant="outline" type="button" onClick={() => input.current?.click()}>{value ? "Change" : "Upload"}</Button>{value && <Button size="sm" variant="ghost" type="button" onClick={() => onChange(undefined)}>Remove</Button>}</div>
          {hint && <p className="max-w-xs text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

// Settings → Website: the pharmacy writes its own public website and chooses its photos and colour.
export default function WebsiteEditor() {
  const { call, org } = useAuth();
  const saved = useLoad<any>(() => call("/org/website", { branch: null }), []);
  const branches = useLoad<any[]>(() => call("/branches?all=1", { branch: null }), []);
  const [w, setW] = useState<any>(null);
  const [dirty, setDirty] = useState(false); const [ok, setOk] = useState(false); const [err, setErr] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const { upload, busy, err: upErr } = useUpload();
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (saved.data && !w) setW({ published: true, showProducts: true, services: [], gallery: [], contact: {}, social: {}, ...saved.data }); }, [saved.data, w]);
  const upd = (patch: any) => { setW((x: any) => ({ ...x, ...patch })); setDirty(true); setOk(false); };
  const save = async () => {
    setErr(null); setSaving(true);
    try { const r = await call("/org/website", { method: "PATCH", body: w, branch: null }); setW({ ...w, ...r }); setDirty(false); setOk(true); }
    catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  if (!w || !org) return <Card className="p-6"><Spinner /></Card>;
  const name = org.name; const color = w.brandColor || DEFAULT_COLOR;
  const services: any[] = w.services || [];
  const setService = (i: number, patch: any) => upd({ services: services.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const addGallery = async (files: FileList | null) => {
    const room = 8 - (w.gallery?.length || 0);
    const urls: string[] = [];
    for (const f of Array.from(files || []).slice(0, room)) { const u = await upload(f, "photo", "gallery"); if (u) urls.push(u); }
    if (urls.length) upd({ gallery: [...(w.gallery || []), ...urls] });
  };
  const fieldProps = { upload, busy };

  return (
    <Card className="p-6">
      <Section title="Your website" desc="A website for your pharmacy, with a button that takes customers to your online store. Change anything here and save.">
        <div className="max-w-xl space-y-4">
          <PublicAddress label="Website address" path={`/site/${org.slug}`} note="Put it on your signboard, receipts, Google Maps listing and social media pages." />
          <Toggle label="Show the website to the public" hint="When off, visitors see a short notice with a link to your online store." checked={w.published !== false} onChange={(v) => upd({ published: v })} />
        </div>
      </Section>

      <Section title="Logo and colour" desc="Your logo appears at the top of the website and the online store. The colour is used for buttons and headings.">
        <div className="max-w-xl space-y-5">
          <ImageField label="Logo" kind="logo" value={w.logoUrl} onChange={(u) => upd({ logoUrl: u })} hint="A PNG with a transparent background looks best." {...fieldProps} />
          <div>
            <div className="mb-1.5 text-sm font-medium text-slate-700">Brand colour</div>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => <button key={c} type="button" onClick={() => upd({ brandColor: c === DEFAULT_COLOR ? "" : c })} aria-label={`Use ${c}`} className="grid h-8 w-8 place-items-center rounded-full ring-offset-2 transition" style={{ background: c, boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }}>{color === c && <Check className="h-4 w-4 text-white" />}</button>)}
              <label className="ml-1 flex items-center gap-2 text-sm text-slate-600">Custom<input type="color" value={color} onChange={(e) => upd({ brandColor: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5" /></label>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Top of the page" desc="The first thing visitors see. Say who you are and why they should choose you.">
        <div className="max-w-xl space-y-4">
          <Input label="Headline" maxLength={90} placeholder={defaultHeadline(name)} value={w.headline || ""} onChange={(e) => upd({ headline: e.target.value })} hint="Put *stars* around the words to set in coloured italics, e.g. Caring for Ghana’s *families*." />
          <Textarea label="Short introduction" maxLength={300} rows={3} placeholder={defaultIntro(name, branches.data?.length || 1)} value={w.intro || ""} onChange={(e) => upd({ intro: e.target.value })} />
          <ImageField label="Banner photo" kind="banner" wide value={w.heroImageUrl} onChange={(u) => upd({ heroImageUrl: u })} hint="A bright photo of your shop front or team. Landscape works best." {...fieldProps} />
        </div>
      </Section>

      <Section title="About us" desc="Your story: how long you've served the community and what makes you different.">
        <div className="max-w-xl space-y-4">
          <Textarea label="About your pharmacy" maxLength={2000} rows={6} placeholder="e.g. We opened on Oxford Street in 2009…" value={w.about || ""} onChange={(e) => upd({ about: e.target.value })} />
          <p className="-mt-2 text-xs text-slate-500">Leave a blank line between paragraphs.</p>
          <ImageField label="Photo" kind="photo" value={w.aboutImageUrl} onChange={(u) => upd({ aboutImageUrl: u })} hint="Inside the pharmacy, or your pharmacists at work." {...fieldProps} />
        </div>
      </Section>

      <Section title="Services" desc="What you offer besides selling medicines. Up to 8.">
        <div className="max-w-xl space-y-3">
          {!services.length && <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">Your website shows four common services until you add your own.<div className="mt-2"><Button size="sm" variant="outline" type="button" onClick={() => upd({ services: DEFAULT_SERVICES.map((s) => ({ ...s })) })}>Start from these and edit</Button></div></div>}
          {services.map((s, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-slate-200 p-3">
              <div className="flex-1 space-y-2">
                <Input aria-label="Service name" placeholder="Service, e.g. Malaria testing" maxLength={60} value={s.title || ""} onChange={(e) => setService(i, { title: e.target.value })} />
                <Textarea aria-label="Description" placeholder="One or two sentences" maxLength={240} rows={2} value={s.text || ""} onChange={(e) => setService(i, { text: e.target.value })} />
              </div>
              <button type="button" aria-label="Remove service" onClick={() => upd({ services: services.filter((_, k) => k !== i) })} className="self-start rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {services.length > 0 && services.length < 8 && <Button size="sm" variant="outline" type="button" onClick={() => upd({ services: [...services, { title: "", text: "" }] })}><Plus className="h-4 w-4" />Add a service</Button>}
        </div>
      </Section>

      <Section title="Photos" desc="Your shop, your team, health days in the community. Up to 8.">
        <div className="max-w-xl">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(w.gallery || []).map((u: string) => (
              <div key={u} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc(u)!} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => upd({ gallery: w.gallery.filter((x: string) => x !== u) })} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {(w.gallery?.length || 0) < 8 && <button type="button" onClick={() => galleryInput.current?.click()} className="grid aspect-square place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400">{busy === "gallery" ? <Spinner /> : <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus className="h-5 w-5" />Add photos</span>}</button>}
          </div>
          <input ref={galleryInput} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { addGallery(e.target.files); e.target.value = ""; }} />
        </div>
      </Section>

      <Section title="Contact" desc="How customers reach you. Branch addresses, phone numbers and opening hours come from Branches.">
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <Input label="Main phone" placeholder={branches.data?.[0]?.phone || "+233 30 000 0000"} value={w.contact?.phone || ""} onChange={(e) => upd({ contact: { ...w.contact, phone: e.target.value } })} />
          <Input label="WhatsApp number" placeholder="+233 24 000 0000" value={w.contact?.whatsapp || ""} onChange={(e) => upd({ contact: { ...w.contact, whatsapp: e.target.value } })} />
          <div className="sm:col-span-2"><Input label="Email" type="email" placeholder="hello@yourpharmacy.com" value={w.contact?.email || ""} onChange={(e) => upd({ contact: { ...w.contact, email: e.target.value } })} /></div>
          {[["facebook", "Facebook page"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["x", "X (Twitter)"]].map(([k, l]) => <Input key={k} label={l} placeholder="https://" value={w.social?.[k] || ""} onChange={(e) => upd({ social: { ...w.social, [k]: e.target.value } })} />)}
        </div>
      </Section>

      <Section title="Products" desc="A few products from your online store, linking to it.">
        <div className="max-w-xl"><Toggle label="Show products on the website" hint="Over-the-counter products only, those with photos first. Prices are shown in the store." checked={w.showProducts !== false} onChange={(v) => upd({ showProducts: v })} /></div>
      </Section>

      <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-3 rounded-b-lg border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <ErrorNote error={err || upErr || saved.error} />{ok && <span className="text-sm text-emerald-700">Saved. Your website is updated.</span>}{dirty && !ok && <span className="text-sm text-slate-500">Unsaved changes</span>}
        <a href={`/site/${org.slug}${w.published === false ? "?preview=1" : ""}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />View website</a>
        <Button disabled={!dirty || !!busy} loading={saving} onClick={save}>Save website</Button>
      </div>
    </Card>
  );
}
