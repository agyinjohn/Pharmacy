"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button, ErrorNote, Input, Logo } from "@/components/ui";

const DEMO = [
  ["owner@demo.com", "Owner - all branches"], ["manager@demo.com", "Branch manager"], ["pharmacist@demo.com", "Pharmacist"],
  ["cashier@demo.com", "Cashier"], ["store@demo.com", "Store officer"], ["rider@demo.com", "Rider"], ["accountant@demo.com", "Accountant"], ["auditor@demo.com", "Auditor"],
];

export default function Login() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [code, setCode] = useState(""); const [needCode, setNeedCode] = useState(false);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && user) router.replace("/app"); }, [ready, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await login(email, password, code || undefined); router.replace("/app"); }
    catch (err: any) { if (err instanceof ApiError && err.details?.needs2fa) { setNeedCode(true); setError(code ? err.message : null); } else setError(err.message); } finally { setBusy(false); }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <Link href="/"><Logo /></Link>
        <h1 className="mt-10 text-3xl font-bold tracking-tight">Sign in to your pharmacy</h1>
        <form onSubmit={submit} className="mt-8 max-w-sm space-y-4">
          <Input label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {needCode && <Input label="Authenticator code" inputMode="numeric" autoFocus autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} hint="6-digit code from your authenticator app" />}
          <ErrorNote error={error} />
          <Button type="submit" size="lg" loading={busy} className="w-full">Sign in</Button>
        </form>
        <p className="mt-6 text-sm text-slate-600">New pharmacy? <Link href="/signup" className="font-medium text-teal-700 hover:underline">Create a workspace</Link></p>
      </div>
      <div className="hidden flex-col justify-center bg-teal-900 p-16 text-white lg:flex">
        <h2 className="text-2xl font-semibold">Demo accounts</h2>
        <p className="mt-2 text-sm text-teal-200">Password for all: <code className="rounded bg-white/10 px-1.5 py-0.5">Demo@1234</code>. Click one to fill it in.</p>
        <div className="mt-6 grid max-w-md gap-2">
          {DEMO.map(([e, r]) => (
            <button key={e} type="button" onClick={() => { setEmail(e); setPassword("Demo@1234"); }} className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-2.5 text-left text-sm hover:bg-white/20">
              <span>{r}</span><span className="text-teal-200">{e}</span>
            </button>
          ))}
        </div>
        <Link href="/shop/medicare" className="mt-8 text-sm text-teal-200 underline">Customer portal demo store →</Link>
      </div>
    </main>
  );
}
