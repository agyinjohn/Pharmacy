"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button, ErrorNote, Input, Logo } from "@/components/ui";
import AuthAside from "@/components/AuthAside";

const DEMO_PASSWORD = "Demo@1234";
const DEMO = [
  ["owner@demo.com", "Owner", "All branches"], ["manager@demo.com", "Branch manager", "Accra Central"], ["pharmacist@demo.com", "Pharmacist", "Verify and dispense"],
  ["cashier@demo.com", "Cashier", "Point of sale"], ["store@demo.com", "Store officer", "Stock and orders"], ["rider@demo.com", "Rider", "Deliveries"],
  ["accountant@demo.com", "Accountant", "Reports"], ["auditor@demo.com", "Auditor", "Read-only"],
];

export default function Login() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [show, setShow] = useState(false);
  const [code, setCode] = useState(""); const [needCode, setNeedCode] = useState(false);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (ready && user) router.replace("/app"); }, [ready, user, router]);

  const signIn = async (em: string, pw: string, tag: string) => {
    setBusy(tag); setError(null);
    try { await login(em, pw, code || undefined); router.replace("/app"); }
    catch (err: any) { if (err instanceof ApiError && err.details?.needs2fa) { setNeedCode(true); setError(code ? err.message : null); } else setError(err.message); }
    finally { setBusy(null); }
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); signIn(email, password, "form"); };
  const demo = (em: string) => { setEmail(em); setPassword(DEMO_PASSWORD); signIn(em, DEMO_PASSWORD, em); };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="lg:hidden"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your pharmacy workspace.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Input label="Email" type="email" required autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="relative">
              <Input label="Password" type={show ? "text" : "password"} required autoComplete="current-password" className="pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute bottom-2 right-2 rounded p-0.5 text-slate-400 hover:text-slate-700">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            {needCode && <Input label="Authenticator code" inputMode="numeric" autoFocus autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} hint="The 6-digit code from your authenticator app" />}
            <ErrorNote error={error} />
            <Button type="submit" size="lg" loading={busy === "form"} disabled={!!busy} className="w-full">Sign in</Button>
          </form>
          <p className="mt-6 text-sm text-slate-600">New pharmacy? <Link href="/signup" className="font-medium text-slate-900 underline underline-offset-4">Create a workspace</Link></p>

          <div className="mt-10 border-t border-slate-200 pt-6">
            <div className="flex items-baseline justify-between"><h2 className="text-sm font-medium text-slate-900">Try a demo account</h2><span className="text-xs text-slate-500">Signs you straight in</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO.map(([em, role, what]) => (
                <button key={em} type="button" disabled={!!busy} onClick={() => demo(em)} className="group rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-slate-400 disabled:opacity-60">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-900">{busy === em ? "Signing in…" : role}<ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" /></div>
                  <div className="text-xs text-slate-500">{what}</div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">All demo accounts use the password <code className="rounded bg-slate-100 px-1 py-0.5">{DEMO_PASSWORD}</code>. Shopping as a customer? <Link href="/shop/medicare" className="underline underline-offset-2 hover:text-slate-800">Open the demo store</Link>.</p>
          </div>
        </div>
      </div>
      <AuthAside />
    </main>
  );
}
