"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, ClipboardCheck, Package, Boxes, Truck, ArrowLeftRight, ShieldAlert, Users, BarChart3,
  Building2, UserCog, ScrollText, LogOut, Menu, X, Globe, Store, PackageCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo, Spinner, cn } from "@/components/ui";

const REPORTERS = ["branch_manager", "accountant", "auditor", "pharmacist", "store_officer"];
const NAV: { href: string; label: string; icon: any; roles: string[] | "all" }[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, roles: REPORTERS },
  { href: "/app/pos", label: "Point of sale", icon: ShoppingCart, roles: ["cashier", "pharmacist", "branch_manager", "technician"] },
  { href: "/app/prescriptions", label: "Prescriptions", icon: ClipboardCheck, roles: ["pharmacist", "technician", "branch_manager", "cashier"] },
  { href: "/app/orders", label: "Online orders", icon: Globe, roles: ["pharmacist", "technician", "branch_manager", "dispatcher", "accountant"] },
  { href: "/app/rider", label: "My deliveries", icon: Truck, roles: ["dispatcher"] },
  { href: "/app/inventory", label: "Inventory", icon: Boxes, roles: ["store_officer", "branch_manager", "pharmacist", "technician", "accountant", "auditor"] },
  { href: "/app/products", label: "Products", icon: Package, roles: ["store_officer", "branch_manager", "pharmacist", "technician", "accountant", "auditor", "cashier"] },
  { href: "/app/purchasing", label: "Purchasing", icon: PackageCheck, roles: ["store_officer", "branch_manager", "accountant", "pharmacist"] },
  { href: "/app/transfers", label: "Transfers", icon: ArrowLeftRight, roles: ["store_officer", "branch_manager", "pharmacist", "technician"] },
  { href: "/app/register", label: "Controlled drugs", icon: ShieldAlert, roles: ["pharmacist", "branch_manager", "auditor"] },
  { href: "/app/customers", label: "Customers", icon: Users, roles: ["cashier", "pharmacist", "technician", "branch_manager", "accountant", "auditor"] },
  { href: "/app/reports", label: "Reports", icon: BarChart3, roles: REPORTERS },
  { href: "/app/branches", label: "Branches", icon: Store, roles: ["branch_manager"] },
  { href: "/app/team", label: "Team", icon: UserCog, roles: ["branch_manager"] },
  { href: "/app/audit", label: "Audit log", icon: ScrollText, roles: ["branch_manager", "auditor"] },
];
const HOME: Record<string, string> = { cashier: "/app/pos", technician: "/app/orders", dispatcher: "/app/rider" };
const ROLE_LABEL: Record<string, string> = { owner: "Owner", branch_manager: "Branch manager", pharmacist: "Pharmacist", technician: "Technician", cashier: "Cashier", store_officer: "Store officer", accountant: "Accountant", dispatcher: "Rider", auditor: "Auditor (read-only)" };

export default function Shell({ children }: { children: React.ReactNode }) {
  const { ready, user, org, branches, branch, setBranchId, logout, can } = useAuth();
  const router = useRouter(); const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);
  useEffect(() => setOpen(false), [path]);

  const items = NAV.filter((n) => n.roles === "all" || can(...(n.roles as string[])));
  // Land users with no dashboard access on their working screen.
  useEffect(() => {
    if (user && path === "/app" && !can(...REPORTERS)) router.replace(HOME[user.role] || items[0]?.href || "/app/customers");
  }, [user, path, can, router, items]);

  if (!ready || !user) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;

  const Sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="px-4 py-4"><Logo light /></div>
      <div className="px-3 pb-3">
        <label className="mb-1 block px-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">Branch</label>
        <select value={branch?._id || ""} onChange={(e) => setBranchId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
          {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Main">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/app" ? path === "/app" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-teal-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white")}>
              <Icon className="h-[18px] w-[18px]" />{label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <div className="px-1 text-sm font-medium text-white">{user.name}</div>
        <div className="px-1 text-xs text-slate-400">{ROLE_LABEL[user.role] || user.role} · {org?.name}</div>
        <button onClick={() => { logout(); router.replace("/login"); }} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{Sidebar}</aside>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{Sidebar}</div>
        </div>
      )}
      <div className="lg:pl-60">
        <div className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(!open)} aria-label="Menu" className="rounded p-1 hover:bg-slate-100">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <Logo /> <span className="ml-auto truncate text-xs text-slate-500">{branch?.name}</span>
        </div>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
