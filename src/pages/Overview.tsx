import { useEffect, useState } from 'react';
import { Brain, FileCheck2, MessageSquare, RefreshCw, ShieldAlert } from 'lucide-react';
import { api, API_BASE, overall, useHealth } from '../app-context';
import type { OverviewData, Failure, Probe } from '../api/types';
import { Badge, Banner, Empty, PageHeader, SupportBadge, fmtTime } from '../ui';

const probeBadge = (p: Probe) => p.state === 'ok' ? <Badge tone="ok">Healthy</Badge> : p.state === 'degraded' ? <Badge tone="warn">Degraded</Badge> : <Badge tone="bad">Unreachable</Badge>;

function Pillar({ color, icon, name, support, href, children }: { color: string; icon: React.ReactNode; name: string; support: 'live' | 'simulated' | 'unavailable'; href: string; children: string }) {
  return (
    <section className="pillar" style={{ ['--c' as string]: color }}>
      <h2>{icon}{name}</h2><div><SupportBadge s={support} /></div><p>{children}</p><a href={href}>Open {name === 'Act' ? 'Actions' : name === 'Remember' ? 'Memory' : 'Guardian'}</a>
    </section>
  );
}

export default function Overview() {
  const { snap, loading, refresh } = useHealth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [err, setErr] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => { void api.overview().then((r) => { if (r.ok) setData(r.data); else setErr(r); setBusy(false); }); }, []);
  const sim = api.support.overview === 'simulated';

  return (
    <div className="page">
      <PageHeader title="Overview" sub="Your assistant's memory, actions, and protection at a glance.">
        <a className="btn primary" href="#/chat"><MessageSquare size={16} aria-hidden />Ask Cortexstone</a>
        <a className="btn" href="#/actions"><FileCheck2 size={16} aria-hidden />Validate an action</a>
      </PageHeader>

      {api.mode === 'live' && overall(snap) === 'unreachable' && (
        <Banner tone="bad" title="Can't reach the API">
          Requests to {API_BASE || 'this origin (via the Vite dev proxy)'} failed. Start the backend with <code>docker compose up --build</code> and recheck.
        </Banner>
      )}

      <div className="panel pillars">
        <Pillar color="var(--memory)" icon={<Brain size={20} aria-hidden />} name="Remember" support={api.support.memory} href="#/memory">{api.mode === 'mock' ? 'Browse what Cortexstone remembers, where it came from, and forget it. Simulated data.' : 'Memory has no HTTP routes yet, so nothing is stored or shown from the dashboard.'}</Pillar>
        <Pillar color="var(--accent)" icon={<FileCheck2 size={20} aria-hidden />} name="Act" support={api.support.actions} href="#/actions">Check a proposed action against policy. Validation never approves or runs anything.</Pillar>
        <Pillar color="var(--warn)" icon={<ShieldAlert size={20} aria-hidden />} name="Protect" support={api.support.guardian} href="#/guardian">{api.mode === 'mock' ? 'Review simulated security findings. Scanning itself is not available.' : 'Guardian findings and scanning. Scanning is not available yet.'}</Pillar>
      </div>

      <div className="grid2">
        <section className="panel" aria-labelledby="h-health">
          <header><h2 id="h-health">System health</h2>
            <button className="btn" onClick={refresh} disabled={loading}><RefreshCw size={14} aria-hidden />{loading ? 'Checking…' : 'Recheck'}</button></header>
          <div className="scroll"><table>
            <thead><tr><th>Check</th><th>Endpoint</th><th>Status</th><th>Latency</th></tr></thead>
            <tbody>
              {snap ? ([['Liveness', '/health', snap.health], ['Readiness', '/ready', snap.ready]] as const).map(([n, path, p]) => (
                <tr key={path}><td>{n}</td><td><code>{path}</code></td>
                  <td>{probeBadge(p)}{p.detail && <div className="muted">{p.detail}</div>}</td><td className="mono">{p.ms !== undefined ? `${p.ms} ms` : '–'}</td></tr>
              )) : <tr><td colSpan={4} className="muted">Checking…</td></tr>}
            </tbody>
          </table></div>
          {snap && <div className="body muted">Last checked {fmtTime(snap.checkedAt)}{snap.simulated && ' · simulated results'}</div>}
        </section>

        <section className="panel" aria-labelledby="h-appr">
          <header><h2 id="h-appr">Pending approvals</h2></header>
          {busy ? <div className="body muted">Loading…</div> : data ? (
            <ul className="list">{data.approvals.map((a) => <li key={a.id}><span><code>{a.tool_name}</code><div className="muted">{a.target_ref}</div></span><span className="muted">{fmtTime(a.requested_at)}</span></li>)}</ul>
          ) : <Empty title="Approvals can't be listed yet">{err?.message}</Empty>}
        </section>
      </div>

      <section className="panel" aria-labelledby="h-act">
        <header><h2 id="h-act">Recent activity</h2></header>
        {busy ? <div className="body muted">Loading…</div> : data ? (
          <ul className="list">{data.activity.map((a) => <li key={a.id}><span>{a.text}</span><span className="muted">{fmtTime(a.at)}</span></li>)}</ul>
        ) : <Empty title="No activity feed yet">The backend has no audit or activity endpoint. Nothing is shown rather than guessing.</Empty>}
      </section>
    </div>
  );
}
