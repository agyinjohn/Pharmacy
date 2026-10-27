"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, ErrorNote, Input, Logo } from "@/components/ui";

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
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Create your pharmacy workspace</h1>
      <p className="mt-2 text-slate-600">Start with one branch. Add more any time.</p>
      <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
        <Input label="Pharmacy / company name" required value={f.orgName} onChange={set("orgName")} className="" />
        <Input label="First branch name" value={f.branchName} onChange={set("branchName")} placeholder="Main branch" />
        <Input label="Facility licence number" value={f.licenseNumber} onChange={set("licenseNumber")} />
        <Input label="Branch address" value={f.address} onChange={set("address")} />
        <Input label="Your name" required value={f.name} onChange={set("name")} />
        <Input label="Email" type="email" required value={f.email} onChange={set("email")} />
        <div className="sm:col-span-2"><Input label="Password" type="password" required minLength={8} value={f.password} onChange={set("password")} hint="At least 8 characters" /></div>
        <div className="space-y-3 sm:col-span-2"><ErrorNote error={error} /><Button type="submit" size="lg" loading={busy} className="w-full">Create workspace</Button></div>
      </form>
      <p className="mt-6 text-sm text-slate-600">Already registered? <Link href="/login" className="font-medium text-teal-700 hover:underline">Sign in</Link></p>
    </main>
  );
}
