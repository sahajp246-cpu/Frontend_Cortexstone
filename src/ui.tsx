import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import type { Support } from './api/types';

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'memory';
export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) => <span className={`badge ${tone}`}>{children}</span>;

export function SupportBadge({ s }: { s: Support }) {
  if (s === 'live') return <Badge tone="ok">Live API</Badge>;
  if (s === 'simulated') return <Badge tone="warn">Simulated</Badge>;
  return <Badge>Not available</Badge>;
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return <div className="head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="acts">{children}</div>}</div>;
}

export function Banner({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'bad'; title?: string; children: ReactNode }) {
  return (
    <div className={`banner ${tone === 'info' ? '' : tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      {tone === 'info' ? <Info size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
      <div>{title && <p><strong>{title}</strong></p>}<div className="muted">{children}</div></div>
    </div>
  );
}

export const Empty = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) =>
  <div className="empty"><h3>{title}</h3><p>{children}</p>{action}</div>;

export const fmtTime = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const short = (s: string, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
