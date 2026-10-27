"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button, ErrorNote, Input, Select, Textarea } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";

export default function DemoForm() {
  const [f, setF] = useState({ name: "", email: "", phone: "", pharmacy: "", branches: "1", message: "" });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState("busy"); setError(null);
    try { await api("/auth/leads", { body: f }); setState("done"); }
    catch (err: any) { setError(err.message); setState("idle"); }
  };

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        <h3 className="text-xl font-semibold text-slate-900">Thanks, we will be in touch</h3>
        <p className="max-w-sm text-sm text-slate-600">We will contact you within one working day to schedule a walkthrough for your pharmacy.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Input label="Your name" required value={f.name} onChange={set("name")} autoComplete="name" />
      <Input label="Work email" type="email" required value={f.email} onChange={set("email")} autoComplete="email" />
      <Input label="Phone / WhatsApp" value={f.phone} onChange={set("phone")} autoComplete="tel" />
      <Input label="Pharmacy name" value={f.pharmacy} onChange={set("pharmacy")} />
      <Select label="How many branches?" value={f.branches} onChange={set("branches")} className="sm:col-span-2">
        <option value="1">Just one</option><option value="2-5">2 - 5</option><option value="6-20">6 - 20</option><option value="20+">More than 20</option>
      </Select>
      <div className="sm:col-span-2"><Textarea label="Anything we should know? (optional)" rows={3} value={f.message} onChange={set("message")} /></div>
      <div className="sm:col-span-2 space-y-3">
        <ErrorNote error={error} />
        <Button type="submit" size="lg" loading={state === "busy"} className="w-full">Request a demo</Button>
      </div>
    </form>
  );
}
