"use client";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "./ui";

// A public web address of this pharmacy (online store, website), to open or share with customers.
export function PublicAddress({ label, path, note }: { label: string; path: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window === "undefined" ? "" : window.location.origin}${path}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt(`Copy your ${label.toLowerCase()}`, url); } };
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">{url}</code>
        <Button size="sm" variant="outline" onClick={copy}>{copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}</Button>
        <a href={path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />Open</a>
      </div>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

// A settings block: what it is on the left, the controls on the right.
export function Section({ title, desc, children }: { title: string; desc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-slate-200 py-6 first:pt-0 last:border-0 md:grid-cols-[260px_1fr]">
      <div><h2 className="font-semibold text-slate-900">{title}</h2>{desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1">
      <span><span className="block text-sm font-medium text-slate-800">{label}</span>{hint && <span className="block text-xs text-slate-500">{hint}</span>}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-brand-700" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} /></button>
    </label>
  );
}
