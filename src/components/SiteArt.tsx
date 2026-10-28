"use client";
import { useEffect } from "react";

// Drawings, the turning badge and motion helpers shared by the pharmacy website and online store.
// Styles live in app/site/site.css (loaded by the /site and /shop layouts).

// Hand-drawn marks used as decoration: a four-point star, a capsule and a leaf.
export const Star = ({ className, style }: { className?: string; style?: React.CSSProperties }) => <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true"><path d="M20 2c1.2 9.6 4.6 13.4 18 18-13.4 4.6-16.8 8.4-18 18-1.2-9.6-4.6-13.4-18-18C15.4 15.4 18.8 11.6 20 2Z" fill="currentColor" /></svg>;
export const Capsule = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 120 60" className={`draw ${className || ""}`} style={style} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="4" y="8" width="112" height="44" rx="22" /><line x1="60" y1="8" x2="60" y2="52" /><path d="M20 22c3-5 8-7 14-7" /></svg>
);
export const Leaf = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 80 100" className={`draw ${className || ""}`} style={style} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M40 96C40 60 40 40 40 8" /><path d="M40 8C66 22 74 52 40 80C6 52 14 22 40 8Z" /><path d="M40 38l14-10M40 54l16-10M40 54L24 44M40 38L27 30" /></svg>
);

// Round text that turns slowly, with a cross in the middle.
export function Badge({ text, color, on }: { text: string; color: string; on: string }) {
  const t = `${text} • `.repeat(Math.max(1, Math.round(40 / (text.length + 3))));
  return (
    <div className="relative grid h-28 w-28 place-items-center rounded-full sm:h-36 sm:w-36" style={{ background: color, color: on }}>
      <svg viewBox="0 0 200 200" className="spin absolute inset-0 h-full w-full" aria-hidden="true">
        <defs><path id="badge-circle" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" /></defs>
        <text fill="currentColor" style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 500 }}><textPath href="#badge-circle" textLength="462" lengthAdjust="spacing">{t}</textPath></text>
      </svg>
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" /></svg>
    </div>
  );
}

// Headline with each word rising in turn. Words wrapped in *stars* are set in italic colour;
// without stars, the last two words are.
export function Headline({ text, color }: { text: string; color: string }) {
  const marked = /\*[^*]+\*/.test(text);
  const words = text.replace(/\*/g, " * ").split(/\s+/).filter(Boolean);
  const plain = words.filter((w) => w !== "*");
  const out: React.ReactNode[] = [];
  let italic = false; let i = 0;
  for (const w of words) {
    if (w === "*") { italic = !italic; continue; }
    const em = marked ? italic : plain.length > 3 && i >= plain.length - 2;
    out.push(<span key={i} className="word"><span className={em ? "serif-i" : ""} style={{ ["--d" as any]: `${0.15 + i * 0.08}s`, color: em ? color : undefined }}>{w}</span></span>, " ");
    i++;
  }
  return <>{out}</>;
}

// Adds .in to every .reveal / .reveal-img element as it scrolls into view.
export function useReveal(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const els = document.querySelectorAll(".site .reveal, .site .reveal-img");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ready]);
}

