"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, store } from "./api";

export type Branch = { _id: string; name: string; code: string; [k: string]: any };
export type User = { _id: string; name: string; email: string; role: string; branches: string[]; [k: string]: any };

type Ctx = {
  ready: boolean; token: string | null; user: User | null; org: any; branches: Branch[];
  branch: Branch | null; setBranchId: (id: string) => void;
  login: (email: string, password: string, code?: string) => Promise<void>;
  mustSetupTwoStep: boolean; refresh: () => Promise<void>;
  signup: (body: any) => Promise<void>;
  logout: () => void;
  call: <T = any>(path: string, opts?: { method?: string; body?: any; branch?: string | null }) => Promise<T>;
  can: (...roles: string[]) => boolean;
};
const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchIdState] = useState<string | null>(null);
  const [must2fa, setMust2fa] = useState(false);

  const apply = useCallback((s: any) => {
    setToken(s.token); setUser(s.user); setOrg(s.org); setBranches(s.branches); setMust2fa(!!s.mustSetupTwoStep);
    store.set("token", s.token);
    const saved = store.get("branch");
    setBranchIdState(s.branches.find((b: Branch) => b._id === saved)?._id || s.branches[0]?._id || null);
  }, []);

  useEffect(() => {
    const t = store.get("token");
    if (!t) { setReady(true); return; }
    api("/auth/me", { token: t }).then((s) => apply({ ...s, token: t })).catch(() => store.del("token")).finally(() => setReady(true));
  }, [apply]);

  const setBranchId = (id: string) => { setBranchIdState(id); store.set("branch", id); };
  const branch = useMemo(() => branches.find((b) => b._id === branchId) || null, [branches, branchId]);

  const value: Ctx = {
    ready, token, user, org, branches, branch, setBranchId,
    login: async (email, password, code) => apply(await api("/auth/login", { body: { email, password, code } })),
    mustSetupTwoStep: must2fa,
    refresh: async () => { if (token) apply({ ...(await api("/auth/me", { token })), token }); },
    signup: async (body) => apply(await api("/auth/register", { body })),
    logout: () => { store.del("token"); setToken(null); setUser(null); setOrg(null); setBranches([]); },
    call: (path, opts = {}) => api(path, { ...opts, token, branch: opts.branch === undefined ? branchId : opts.branch }),
    can: (...roles) => !!user && (user.role === "owner" || roles.includes(user.role)),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
