"use client";
import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Fades and lifts children in when they scroll into view (once).
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: React.ReactNode; delay?: number; className?: string; as?: any }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reduced() || !("IntersectionObserver" in window)) { setIn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIn(true); io.disconnect(); } }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

// Counts up to a number once visible.
export function CountUp({ to, prefix = "", suffix = "", decimals = 0, duration = 1400 }: { to: number; prefix?: string; suffix?: string; decimals?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reduced()) { setV(to); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => { const k = Math.min(1, (t - t0) / duration); setV(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el); return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref} className="tabular-nums">{prefix}{v.toLocaleString("en-GH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

// Cycles through words with a typing caret, for the hero headline.
export function RotatingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0); const [n, setN] = useState(words[0].length); const [del, setDel] = useState(false);
  useEffect(() => {
    if (reduced()) return;
    const w = words[i];
    const t = setTimeout(() => {
      if (!del && n < w.length) setN(n + 1);
      else if (!del && n === w.length) setDel(true);
      else if (del && n > 0) setN(n - 1);
      else { setDel(false); setI((i + 1) % words.length); }
    }, !del && n === w.length ? 2200 : del ? 45 : 85);
    return () => clearTimeout(t);
  }, [i, n, del, words]);
  return <span className="whitespace-nowrap font-serif text-[1.1em] font-normal italic tracking-normal text-brand-700">{words[i].slice(0, n)}<span className="caret ml-0.5 inline-block h-[0.8em] w-[2px] translate-y-[0.08em] bg-brand-700 align-baseline" aria-hidden="true" /></span>;
}

// Rotating notification shown over the product preview.
const EVENTS = [
  ["Prescription verified", "Pharm. A. Mensah · Accra Central"],
  ["Dose reminder sent", "Amlodipine 5mg · 08:00"],
  ["Online order out for delivery", "ON-48213 · 3 items"],
  ["Low stock at Kumasi", "Coartem 80/480 · 8 left"],
  ["Transfer received", "40 x Amoxil · Accra → Takoradi"],
];
export function EventTicker() {
  const [i, setI] = useState(0);
  useEffect(() => { if (reduced()) return; const t = setInterval(() => setI((x) => (x + 1) % EVENTS.length), 3600); return () => clearInterval(t); }, []);
  const [title, sub] = EVENTS[i];
  return (
    <div key={i} className="toast-cycle flex items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
      <span className="pulse-ring relative grid h-2 w-2 shrink-0 place-items-center rounded-full bg-brand-600 text-brand-500" />
      <div className="min-w-0"><div className="truncate text-xs font-medium text-slate-900">{title}</div><div className="truncate text-[11px] text-slate-500">{sub}</div></div>
    </div>
  );
}
