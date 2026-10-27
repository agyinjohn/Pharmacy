"use client";
import clsx from "clsx";
import { X, Loader2 } from "lucide-react";
import { useEffect } from "react";

export const cn = clsx;

export function Button({ variant = "primary", size = "md", loading, className, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        size === "sm" && "px-2.5 py-1.5 text-xs", size === "md" && "px-4 py-2 text-sm", size === "lg" && "px-6 py-3 text-base",
        variant === "primary" && "bg-brand-800 text-white hover:bg-brand-900",
        variant === "secondary" && "bg-slate-100 text-slate-900 hover:bg-slate-200",
        variant === "outline" && "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("rounded-lg border border-slate-200 bg-white", className)}>{children}</div>
);

export const Input = ({ label, className, hint, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) => (
  <label className="block text-sm">
    {label && <span className="mb-1 block font-medium text-slate-700">{label}</span>}
    <input {...p} className={cn("w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50", className)} />
    {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
  </label>
);

export const Select = ({ label, className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) => (
  <label className="block text-sm">
    {label && <span className="mb-1 block font-medium text-slate-700">{label}</span>}
    <select {...p} className={cn("w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10", className)}>{children}</select>
  </label>
);

export const Textarea = ({ label, className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <label className="block text-sm">
    {label && <span className="mb-1 block font-medium text-slate-700">{label}</span>}
    <textarea {...p} className={cn("w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10", className)} />
  </label>
);

// Status colours carry meaning only: green ok, amber needs attention, red problem. Everything else is grey.
const TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-700/15", red: "bg-red-50 text-red-800 ring-red-700/15",
  amber: "bg-amber-50 text-amber-900 ring-amber-700/15", blue: "bg-slate-100 text-slate-700 ring-slate-500/15",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/15", violet: "bg-slate-100 text-slate-700 ring-slate-500/15",
};
export const Badge = ({ tone = "slate", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", TONES[tone])}>{children}</span>
);

export const statusTone = (s: string) => ({
  completed: "green", delivered: "green", dispensed: "green", received: "blue", verified: "green", approved: "green", paid: "green", active: "green",
  pending: "amber", pending_review: "amber", partial: "amber", packed: "blue", sent: "blue", in_transit: "blue", out_for_delivery: "violet", requested: "amber", draft: "slate",
  rejected: "red", failed: "red", cancelled: "red", refunded: "red", quarantined: "red", expired: "red",
} as Record<string, string>)[s] || "slate";
const STATUS_LABEL: Record<string, string> = { pending_review: "Needs review", out_for_delivery: "Out for delivery", partially_refunded: "Part refunded", in_transit: "In transit", walk_in: "Walk-in" };
export const humanize = (s: string) => STATUS_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "");
export const StatusBadge = ({ s }: { s: string }) => <Badge tone={statusTone(s) as any}>{humanize(s)}</Badge>;

// Underlined tabs for switching views or filters; optional counts.
export function Tabs({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: [string, string, number?][] }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {items.map(([v, label, count]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={cn("relative -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition", value === v ? "border-slate-900 font-medium text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>
          {label}{count ? <span className={cn("ml-1.5 rounded-full px-1.5 text-[11px]", value === v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}>{count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, xl }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; xl?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl", xl ? "sm:max-w-5xl" : wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{actions}</div>
  </div>
);

export const Stat = ({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "red" | "amber" | "green" }) => (
  <Card className="p-4">
    <div className="text-xs font-medium text-slate-500">{label}</div>
    <div className={cn("mt-1 whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight", tone === "red" && "text-red-700", tone === "amber" && "text-amber-700", tone === "green" && "text-slate-900", !tone && "text-slate-900")}>{value}</div>
    {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
  </Card>
);

export const Table = ({ head, children, empty, right = [] }: { head: string[]; children: React.ReactNode; empty?: string; right?: number[] }) => {
  const rows = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-slate-200 text-xs text-slate-500">{head.map((h, i) => <th key={i} className={cn("whitespace-nowrap px-3 py-2.5 font-medium", right.includes(i) && "text-right")}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 [&>tr]:transition-colors [&>tr:hover]:bg-slate-50/70">{children}</tbody>
      </table>
      {rows === 0 && <div className="py-10 text-center text-sm text-slate-500">{empty || "Nothing here yet"}</div>}
    </div>
  );
};
export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => <td className={cn("px-3 py-3 align-middle text-slate-700", className)}>{children}</td>;
// Reference numbers (receipts, orders, prescriptions): readable, quiet, never wrapping.
export const Ref = ({ children }: { children: React.ReactNode }) => <span className="whitespace-nowrap text-xs font-medium tabular-nums tracking-wide text-slate-500">{children}</span>;

export const ErrorNote = ({ error }: { error?: string | null }) => (error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null);
export const Spinner = () => <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-700" /></div>;

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", light ? "text-white" : "text-slate-900", className)}>
      <span className={cn("grid h-7 w-7 place-items-center rounded-md", light ? "bg-white text-slate-900" : "bg-brand-800 text-white")}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </span>
      PharmaOne
    </span>
  );
}
