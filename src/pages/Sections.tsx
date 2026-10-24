import { api, API_BASE, overall, useHealth } from '../app-context';
import type { Feature } from '../api/types';
import { Badge, Banner, Empty, PageHeader, SupportBadge } from '../ui';

export function Section({ feature, title, sub, paths, note }: { feature: Feature; title: string; sub: string; paths: string[]; note: string }) {
  return (
    <div className="page">
      <PageHeader title={title} sub={sub}><SupportBadge s={api.support[feature]} /></PageHeader>
      <section className="panel">
        <Empty title={`${title} isn't connected yet`}>{note}</Empty>
        <div className="body" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="muted" style={{ marginBottom: 8 }}>Proposed endpoints (not registered, so the dashboard does not call them):</p>
          <ul className="list">{paths.map((p) => <li key={p}><code>{p}</code><Badge>Proposed</Badge></li>)}</ul>
        </div>
      </section>
    </div>
  );
}

export function SettingsPage() {
  const { snap } = useHealth();
  const rows: [string, React.ReactNode][] = [
    ['Data mode', api.mode === 'live' ? 'Live backend' : 'Sandbox · simulated API'],
    ['API base URL', API_BASE ? <code>{API_BASE}</code> : <span>Same origin (Vite dev proxy to the backend)</span>],
    ['Connection', api.mode === 'mock' ? <span className="muted">Not used in demo mode</span> : <Badge tone={overall(snap) === 'ok' ? 'ok' : overall(snap) === 'checking' ? 'neutral' : 'bad'}>{overall(snap)}</Badge>],
    ['Signed in as', <span className="muted">{snap?.principal?.authenticated ? `${snap.principal.display_name} · ${snap.principal.id}` : 'No authenticated principal returned by /api/v1/me.'}</span>],
    ['Theme', <span>Warm Obsidian with Signal Vermilion accents.</span>],
  ];
  return (
    <div className="page">
      <PageHeader title="Settings" sub="Connection and session details for this dashboard." />
      <section className="panel"><div className="scroll"><table><tbody>{rows.map(([k, v]) => <tr key={k}><th scope="row" style={{ width: 200 }}>{k}</th><td>{v}</td></tr>)}</tbody></table></div></section>
      <Banner title="Identity is server-side">The API derives the user from verified credentials. This dashboard never sends a user id, and holds no provider credentials or secrets.</Banner>
    </div>
  );
}
