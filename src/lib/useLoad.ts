"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Small data-loading hook: runs fn on mount and whenever deps change; exposes reload().
export function useLoad<T>(fn: () => Promise<T>, deps: any[] = [], enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const ref = useRef(fn); ref.current = fn;
  const seq = useRef(0);
  const run = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError(null);
    try { const d = await ref.current(); if (id === seq.current) setData(d); }
    catch (e: any) { if (id === seq.current) setError(e.message); }
    finally { if (id === seq.current) setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) run(); }, [enabled, ...deps]);
  return { data, error, loading, reload: run, setData };
}
