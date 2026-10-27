"use client";
import { useCallback, useEffect, useState } from "react";
import { api, store } from "./api";

// Customer-portal session, scoped per pharmacy slug.
export function useShopAuth(slug: string) {
  const key = `shop:${slug}`;
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = store.get(key);
    if (!t) { setReady(true); return; }
    api("/portal/me", { token: t }).then((c) => { setToken(t); setCustomer(c); }).catch(() => store.del(key)).finally(() => setReady(true));
  }, [key]);

  const requestOtp = (phone: string, name?: string) => api(`/portal/${slug}/auth/request-otp`, { body: { phone, name } });
  const verify = useCallback(async (phone: string, code: string, consent?: any) => {
    const r = await api(`/portal/${slug}/auth/verify`, { body: { phone, code, consent } });
    store.set(key, r.token); setToken(r.token); setCustomer(r.customer);
  }, [slug, key]);
  const logout = () => { store.del(key); setToken(null); setCustomer(null); };
  const call = <T = any>(path: string, opts: { method?: string; body?: any } = {}) => api<T>(path, { ...opts, token });
  return { token, customer, ready, requestOtp, verify, logout, call, setCustomer };
}
