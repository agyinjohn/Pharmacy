"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, ClipboardCheck, Package, Boxes, Truck, ArrowLeftRight, ShieldAlert, Users, BarChart3,
  UserCog, ScrollText, LogOut, Menu, X, Globe, Store, PackageCheck, Settings as Cog, Upload, Tag, Bell, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo, Spinner, cn } from "@/components/ui";
import { OfflineProvider } from "@/lib/offlineContext";
import OfflineBanner from "@/components/OfflineBanner";

const REPORTERS = ["branch_manager", "accountant", "auditor", "pharmacist", "store_officer"];
// exact: only these roles see it (the owner otherwise sees every item).
const NAV: { href: string; label: string; icon: any; roles: string[] | "all"; group?: string; exact?: boolean }[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, roles: REPORTERS },
  { href: "/app/pos", label: "Point of sale", icon: ShoppingCart, roles: ["cashier", "pharmacist", "branch_manager", "technician"], group: "Sell" },
  { href: "/app/sales", label: "Sales", icon: ScrollText, roles: ["cashier", "pharmacist", "branch_manager", "accountant", "auditor"], group: "Sell" },
  { href: "/app/orders", label: "Online orders", icon: Globe, roles: ["pharmacist", "technician", "branch_manager", "dispatcher", "accountant"], group: "Sell" },
  { href: "/app/rider", label: "My deliveries", icon: Truck, roles: ["dispatcher"], group: "Sell", exact: true },
  { href: "/app/customers", label: "Customers", icon: Users, roles: ["cashier", "pharmacist", "technician", "branch_manager", "accountant", "auditor"], group: "Sell" },
  { href: "/app/promotions", label: "Promotions", icon: Tag, roles: ["branch_manager", "cashier", "pharmacist"], group: "Sell" },
  { href: "/app/prescriptions", label: "Prescriptions", icon: ClipboardCheck, roles: ["pharmacist", "technician", "branch_manager", "cashier"], group: "Pharmacy" },
  { href: "/app/register", label: "Controlled drugs", icon: ShieldAlert, roles: ["pharmacist", "branch_manager", "auditor"], group: "Pharmacy" },
  { href: "/app/inventory", label: "Inventory", icon: Boxes, roles: ["store_officer", "branch_manager", "pharmacist", "technician", "accountant", "auditor"], group: "Stock" },
  { href: "/app/products", label: "Products", icon: Package, roles: ["store_officer", "branch_manager", "pharmacist", "technician", "accountant", "auditor", "cashier"], group: "Stock" },
  { href: "/app/purchasing", label: "Purchasing", icon: PackageCheck, roles: ["store_officer", "branch_manager", "accountant", "pharmacist"], group: "Stock" },
  { href: "/app/transfers", label: "Transfers", icon: ArrowLeftRight, roles: ["store_officer", "branch_manager", "pharmacist", "technician"], group: "Stock" },
  { href: "/app/import", label: "Data import", icon: Upload, roles: ["branch_manager", "store_officer", "accountant"], group: "Stock" },
  { href: "/app/reports", label: "Reports", icon: BarChart3, roles: REPORTERS, group: "Business" },
  { href: "/app/branches", label: "Branches", icon: Store, roles: ["branch_manager"], group: "Business" },
  { href: "/app/team", label: "Team", icon: UserCog, roles: ["branch_manager"], group: "Business" },
  { href: "/app/audit", label: "Audit log", icon: ScrollText, roles: ["branch_manager", "auditor"], group: "Business" },
  { href: "/app/settings", label: "Settings", icon: Cog, roles: "all", group: "Business" },
];
const HOME: Record<string, string> = { cashier: "/app/pos", technician: "/app/orders", dispatcher: "/app/rider" };
const ROLE_LABEL: Record<string, string> = { owner: "Owner", branch_manager: "Branch manager", pharmacist: "Pharmacist", technician: "Technician", cashier: "Cashier", store_officer: "Store officer", accountant: "Accountant", dispatcher: "Rider", auditor: "Auditor (read-only)" };

export default function Shell({ children }: { children: React.ReactNode }) {
  const { ready, user, org, branches, branch, setBranchId, logout, can, call } = useAuth();
  const router = useRouter(); const path = usePathname();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState<any>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => { if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!user || !branch || !can("pharmacist", "technician", "branch_manager")) return;
    let live = true;
    const tick = () => call("/orders/alerts").then((a: any) => live && setAlerts(a)).catch(() => {});
    tick(); const t = setInterval(tick, 30000);
    return () => { live = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, branch?._id]);

  const items = NAV.filter((n) => n.roles === "all" || (n.exact ? (n.roles as string[]).includes(user?.role || "") : can(...(n.roles as string[]))));
  useEffect(() => {
    if (user && path === "/app" && !can(...REPORTERS)) router.replace(HOME[user.role] || items[0]?.href || "/app/customers");
  }, [user, path, can, router, items]);

  if (!ready || !user) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;

  const totalAlerts = alerts ? alerts.pendingReview + alerts.awaitingApproval : 0;
  const initials = user.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const Sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex h-14 items-center px-4 border-b border-slate-700/60">
        <Logo light />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Main">
        {items.map(({ href, label, icon: Icon, group }, i) => {
          const heading = group && group !== items[i - 1]?.group
            ? <div key={`g-${group}`} className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{group}</div>
            : null;
          const active = href === "/app" ? path === "/app" : path.startsWith(href);
          const badge = href === "/app/orders" && totalAlerts > 0 ? totalAlerts : null;
          return (
            <div key={href}>
              {heading}
              <Link href={href} className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              )}>
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-500")} />
                <span className="flex-1">{label}</span>
                {badge && <span className="rounded-full bg-brand-500 px-1.5 text-[11px] font-semibold text-white">{badge}</span>}
              </Link>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-slate-700/60 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-semibold text-white">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-xs text-slate-400">{ROLE_LABEL[user.role] || user.role}</div>
          </div>
          <button onClick={() => { logout(); router.replace("/login"); }} aria-label="Sign out" className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-56 lg:block">{Sidebar}</aside>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-56">{Sidebar}</div>
        </div>
      )}

      <div className="lg:pl-56">
        {/* Topbar */}
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
          <button onClick={() => setOpen(!open)} aria-label="Menu" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden lg:block"><Logo /></div>

          {/* Branch selector */}
          {branches.length > 1 && (
            <div className="relative ml-2 hidden sm:block">
              <ChevronsUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={branch?._id || ""}
                onChange={(e) => setBranchId(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-slate-50 pl-7 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
              >
                {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}
          {branches.length === 1 && (
            <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 sm:inline">{branch?.name}</span>
          )}

          <div className="ml-auto flex items-center gap-1">
            {/* Alerts bell */}
            <Link href="/app/orders" className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              {totalAlerts > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{totalAlerts}</span>
              )}
            </Link>

            {/* Settings */}
            <Link href="/app/settings" className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <Cog className="h-5 w-5" />
            </Link>

            {/* User menu */}
            <div ref={userMenuRef} className="relative ml-1">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-800 text-xs font-semibold text-white">{initials}</div>
                <span className="hidden max-w-[120px] truncate font-medium sm:block">{user.name.split(" ")[0]}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <div className="font-medium text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500">{ROLE_LABEL[user.role] || user.role}</div>
                    <div className="text-xs text-slate-400">{org?.name}</div>
                  </div>
                  <button
                    onClick={() => { logout(); router.replace("/login"); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4 text-slate-400" />Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <OfflineProvider>
          <main className={path.startsWith("/app/pos") ? "" : "mx-auto max-w-7xl p-4 sm:p-6"}>
            {path.startsWith("/app/pos")
              ? <div className="px-4 pt-4 empty:hidden sm:px-6"><OfflineBanner /></div>
              : <OfflineBanner />}
            {children}
          </main>
        </OfflineProvider>
      </div>
    </div>
  );
}
