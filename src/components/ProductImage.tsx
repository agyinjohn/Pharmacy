"use client";
import { useState } from "react";
import { imageSrc } from "@/lib/image";
import { cn } from "./ui";

// Quiet tints so drawn packs are easy to tell apart without adding loud colour.
const TINTS = ["#eef2f1", "#f1f0ed", "#eef0f3", "#f2efee", "#eff1ec", "#f0eef2"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Product photo, or a drawn medicine pack with the name when there is no photo yet.
export default function ProductImage({ product, className, size = "md" }: { product: any; className?: string; size?: "xs" | "sm" | "md" }) {
  const [broken, setBroken] = useState(false);
  const src = imageSrc(product?.imageUrl);
  const name = product?.brand || product?.name || "";
  if (src && !broken) {
    return (
      <div className={cn("overflow-hidden bg-white", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-contain" />
      </div>
    );
  }
  const tint = TINTS[hash(product?.category || name) % TINTS.length];
  if (size === "xs") {
    return <div className={cn("grid place-items-center text-[10px] font-semibold text-slate-500", className)} style={{ background: tint }} aria-hidden="true">{name.slice(0, 2).toUpperCase()}</div>;
  }
  return (
    <div className={cn("grid place-items-center", className)} style={{ background: tint }} role="img" aria-label={name}>
      <svg viewBox="0 0 160 120" className="h-[78%] w-[78%]" aria-hidden="true">
        <rect x="28" y="22" width="104" height="76" rx="6" fill="#fff" stroke="#cbd5e1" />
        <path d="M28 40h104" stroke="#e2e8f0" />
        <rect x="38" y="28" width="22" height="6" rx="3" fill="#30514a" opacity=".85" />
        <text x="80" y="62" textAnchor="middle" fontSize={name.length > 14 ? 10 : 12} fontWeight="600" fill="#0f172a" fontFamily="Inter Variable, system-ui, sans-serif">{name.length > 22 ? name.slice(0, 21) + "…" : name}</text>
        <text x="80" y="78" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="Inter Variable, system-ui, sans-serif">{[product?.strength, product?.form].filter(Boolean).join(" · ")}</text>
        <g transform="translate(122 92) rotate(-35)"><rect x="-9" y="-4" width="18" height="8" rx="4" fill="#fff" stroke="#94a3b8" /><path d="M0 -4v8" stroke="#94a3b8" /></g>
      </svg>
    </div>
  );
}
