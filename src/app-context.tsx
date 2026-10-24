import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createApi } from './api/client';
import { config } from './config';
import type { HealthSnapshot } from './api/types';

export const API_BASE = config.apiBase;
export const api = createApi(config.mode, config.apiBase);

interface H { snap: HealthSnapshot | null; loading: boolean; refresh: () => void }
const Ctx = createContext<H>({ snap: null, loading: false, refresh: () => {} });
export const useHealth = () => useContext(Ctx);

export function overall(s: HealthSnapshot | null): 'checking' | 'ok' | 'degraded' | 'unreachable' {
  if (!s) return 'checking';
  if (s.health.state === 'unreachable') return 'unreachable';
  return [s.health, s.ready].every((p) => p.state === 'ok') ? 'ok' : 'degraded';
}

export function HealthProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await api.health();
    setLoading(false);
    if (r.ok) setSnap(r.data);
  }, []);
  useEffect(() => {
    void refresh();
    if (api.mode !== 'live') return;
    const id = setInterval(() => void refresh(), 30000);
    return () => clearInterval(id);
  }, [refresh]);
  const value = useMemo(() => ({ snap, loading, refresh: () => void refresh() }), [snap, loading, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
