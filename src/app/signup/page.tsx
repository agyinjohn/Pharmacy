"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, ErrorNote, Input, Logo } from "@/components/ui";
import AuthAside from "@/components/AuthAside";

export default function Signup() {
  const { signup } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ orgName: "", branchName: "", licenseNumber: "", address: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await signup(f); router.replace("/app"); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  const step = (n: number, title: string) => <h2 className="flex items-center gap-2 text-sm font-medium text-slate-900"><span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[11px] text-white">{n}</span>{title}</h2>;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="lg:hidden"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create your pharmacy workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Start with one branch and add more any time. Takes about a minute.</p>
          <form onSubmit={submit} className="mt-8 space-y-7">
            <section className="space-y-3">
              {step(1, "Your pharmacy")}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Pharmacy or company name" required placeholder="e.g. MediCare Pharmacies" value={f.orgName} onChange={set("orgName")} />
                <Input label="Pharmacy Council licence no." placeholder="e.g. PC/RP/ACC/0412" value={f.licenseNumber} onChange={set("licenseNumber")} />
              </div>
            </section>
            <section className="space-y-3">
              {step(2, "First branch")}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Branch name" placeholder="Main branch" value={f.branchName} onChange={set("branchName")} />
                <Input label="Address" placeholder="Street, town" value={f.address} onChange={set("address")} />
              </div>
            </section>
            <section className="space-y-3">
              {step(3, "Your account")}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Your name" required autoComplete="name" value={f.name} onChange={set("name")} />
                <Input label="Email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} />
                <div className="sm:col-span-2"><Input label="Password" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} hint="At least 8 characters" /></div>
              </div>
            </section>
            <div className="space-y-3"><ErrorNote error={error} /><Button type="submit" size="lg" loading={busy} className="w-full">Create workspace</Button><p className="text-xs text-slate-500">You will be the owner. Add your team after you sign in.</p></div>
          </form>
          <p className="mt-6 text-sm text-slate-600">Already registered? <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4">Sign in</Link></p>
        </div>
      </div>
      <AuthAside />
    </main>
  );
}
