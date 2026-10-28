"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, ChevronDown, ExternalLink, ShoppingBag, ClipboardCheck, CloudOff, Globe, LogOut, Menu, PackageCheck, RefreshCw, Settings as Cog, Store, Truck, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOffline } from "@/lib/offlineContext";
import { cn } from "./ui";

// Closes a dropdown when the user clicks outside it or presses Escape.
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open, close]);
  return ref;
}

const panel = "absolute right-0 z-30 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg";

type Props = { title: string; menuOpen: boolean; onMenu: () => void; roleLabel: string; onSignOut: () => void };

export default function TopBar({ title, menuOpen, onMenu, roleLabel, onSignOut }: Props) {
  const { user, org, branches, branch, setBranchId, can, call } = useAuth();
  const { online, queue, syncing, syncNow } = useOffline();
  const [openMenu, setOpenMenu] = useState<null | "branch" | "alerts" | "user">(null);
  const close = () => setOpenMenu(null);
  const branchRef = useDismiss(openMenu === "branch", close);
  const alertsRef = useDismiss(openMenu === "alerts", close);
  const userRef = useDismiss(openMenu === "user", close);
  const toggle = (m: "branch" | "alerts" | "user") => setOpenMenu(openMenu === m ? null : m);

  // What needs attention at this branch, refreshed every 30 seconds.
  const seesOrders = can("pharmacist", "technician", "branch_manager");
  const seesRx = can("pharmacist", "branch_manager");
  const [orders, setOrders] = useState<any>(null); const [rxPending, setRxPending] = useState(0);
  useEffect(() => {
    if (!branch || (!seesOrders && !seesRx)) return;
    let live = true;
    const tick = () => {
      if (seesOrders) call("/orders/alerts").then((a: any) => live && setOrders(a)).catch(() => {});
      if (seesRx) call("/prescriptions?status=pending").then((r: any[]) => live && setRxPending(r.length)).catch(() => {});
    };
    tick(); const t = setInterval(tick, 30000);
    return () => { live = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?._id, seesOrders, seesRx]);

  const alerts = [
    seesRx && { n: rxPending, label: "prescriptions to verify", href: "/app/prescriptions", icon: ClipboardCheck },
    seesOrders && { n: (orders?.pendingReview || 0) + (orders?.awaitingApproval || 0), label: "online orders to review", href: "/app/orders", icon: Globe },
    seesOrders && { n: orders?.readyToDispatch || 0, label: "orders packed and ready", href: "/app/orders", icon: PackageCheck },
    seesOrders && { n: orders?.outForDelivery || 0, label: "out for delivery", href: "/app/orders", icon: Truck },
  ].filter(Boolean) as { n: number; label: string; href: string; icon: any }[];
  const urgent = alerts.slice(0, 2).reduce((a, x) => a + x.n, 0);
  const pending = queue.filter((q) => q.status === "pending").length;
  // Skip titles such as "Pharm." or "Dr." so the greeting and initials use the person's name.
  const plain = (user?.name || "").replace(/^(Pharm|Dr|Mr|Mrs|Ms|Rev)\.?\s+/i, "");
  const initials = plain.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:gap-3 sm:px-6">
      <button onClick={onMenu} aria-label={menuOpen ? "Close menu" : "Open menu"} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <h1 className="hidden truncate text-base font-semibold text-slate-900 sm:block">{title}</h1>

      {/* Branch: every page works on one branch at a time */}
      {branch && (
        <div ref={branchRef} className="relative min-w-0">
          <span className="mx-1 hidden text-slate-300 sm:inline" aria-hidden="true">/</span>
          <button onClick={() => branches.length > 1 && toggle("branch")} className={cn("inline-flex max-w-[11rem] items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-600 sm:max-w-none", branches.length > 1 && "hover:bg-slate-100")} aria-haspopup={branches.length > 1 ? "menu" : undefined} aria-expanded={openMenu === "branch"}>
            <Store className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{branch.name}</span>{branches.length > 1 && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
          </button>
          {openMenu === "branch" && (
            <div className={cn(panel, "fixed inset-x-3 top-14 mt-0 sm:absolute sm:inset-x-auto sm:left-0 sm:top-auto sm:mt-2 sm:w-64")} role="menu">
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Switch branch</div>
              {branches.map((b) => (
                <button key={b._id} role="menuitem" onClick={() => { setBranchId(b._id); close(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                  <span className="min-w-0 flex-1"><span className="block truncate text-slate-900">{b.name}</span>{b.address && <span className="block truncate text-xs text-slate-500">{b.address}</span>}</span>
                  {b._id === branch._id && <Check className="h-4 w-4 shrink-0 text-brand-700" />}
                </button>
              ))}
              {can("branch_manager") && <Link href="/app/branches" onClick={close} className="block border-t border-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Manage branches</Link>}
            </div>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        {/* Connection: only shown when something needs attention */}
        {(!online || pending > 0) && (
          <button onClick={() => online && syncNow()} className={cn("hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex", online ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200")} title={online ? "Send now" : "Working offline"}>
            {online ? <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} /> : <CloudOff className="h-3.5 w-3.5" />}
            {online ? `${syncing ? "Syncing" : "Waiting to sync"} · ${pending}` : `Offline${pending ? ` · ${pending} waiting` : ""}`}
          </button>
        )}
        {!online && <CloudOff className="h-4 w-4 text-amber-700 sm:hidden" aria-label="Offline" />}

        {alerts.length > 0 && (
          <div ref={alertsRef} className="relative">
            <button onClick={() => toggle("alerts")} aria-label={`Alerts${urgent ? `, ${urgent} waiting` : ""}`} aria-expanded={openMenu === "alerts"} className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              {urgent > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{urgent}</span>}
            </button>
            {openMenu === "alerts" && (
              <div className={cn(panel, "w-72")}>
                <div className="border-b border-slate-100 px-4 py-2.5"><div className="text-sm font-semibold text-slate-900">Needs attention</div><div className="text-xs text-slate-500">{branch?.name}</div></div>
                {alerts.some((a) => a.n > 0) ? alerts.map(({ n, label, href, icon: Icon }) => (
                  <Link key={label} href={href} onClick={close} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50", !n && "opacity-50")}>
                    <Icon className="h-4 w-4 text-slate-400" /><span className="flex-1 text-slate-700">{label.charAt(0).toUpperCase() + label.slice(1)}</span><span className={cn("min-w-6 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums", n ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500")}>{n}</span>
                  </Link>
                )) : <div className="px-4 py-6 text-center text-sm text-slate-500">All caught up.</div>}
              </div>
            )}
          </div>
        )}

        <div ref={userRef} className="relative">
          <button onClick={() => toggle("user")} aria-label="Account" aria-expanded={openMenu === "user"} className="flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 text-sm text-slate-700 hover:bg-slate-100 sm:pr-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-800 text-xs font-semibold text-white">{initials}</span>
            <span className="hidden max-w-[8rem] truncate font-medium md:block">{plain.split(" ")[0]}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" />
          </button>
          {openMenu === "user" && (
            <div className={cn(panel, "w-60")}>
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="truncate text-sm font-medium text-slate-900">{user?.name}</div>
                <div className="truncate text-xs text-slate-500">{user?.email}</div>
                <div className="mt-1 text-xs text-slate-500">{roleLabel} · {org?.name}</div>
              </div>
              {org?.slug && <a href={`/site/${org.slug}`} target="_blank" rel="noreferrer" onClick={close} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Globe className="h-4 w-4 text-slate-400" /><span className="flex-1">View website</span><ExternalLink className="h-3.5 w-3.5 text-slate-400" /></a>}
              {org?.slug && <a href={`/shop/${org.slug}`} target="_blank" rel="noreferrer" onClick={close} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><ShoppingBag className="h-4 w-4 text-slate-400" /><span className="flex-1">View online store</span><ExternalLink className="h-3.5 w-3.5 text-slate-400" /></a>}
              <Link href="/app/settings" onClick={close} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Cog className="h-4 w-4 text-slate-400" />Settings and security</Link>
              <button onClick={() => { close(); onSignOut(); }} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4 text-slate-400" />Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
