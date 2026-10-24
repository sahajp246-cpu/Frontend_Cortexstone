import { api } from '../app-context';
import { useLoad } from '../hooks';
import { LoadError, Loading } from '../states';
import { Badge, PageHeader } from '../ui';

export default function Integrations() {
  const { data, error, loading, reload } = useLoad(api.listConnectors);
  return (
    <div className="page">
      <PageHeader title="Integrations" sub="What Cortexstone can reach, and what it is allowed to do there."><Badge tone="warn">Simulated connections</Badge></PageHeader>
      <section className="panel" aria-label="Connectors">
        {loading ? <Loading what="connectors" /> : error ? <LoadError error={error} onRetry={() => void reload()} /> : (
          <ul className="list">{data?.map((c) => (
            <li key={c.id} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 280px' }}>
                <strong>{c.name}</strong> <Badge tone="warn">Simulated</Badge> {c.readOnly && <Badge>Read-only</Badge>}
                {c.account && <div className="muted">{c.account}</div>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{c.capabilities.map((cap) => <Badge key={cap} tone="info">{cap}</Badge>)}</div>
              </div>
              <button className="btn" disabled aria-describedby="conn-note">Disconnect</button>
            </li>))}</ul>
        )}
        <div className="body muted" id="conn-note" style={{ borderTop: '1px solid var(--border)' }}>
          Connecting and disconnecting are disabled: they need server-side OAuth and token storage, which the backend doesn't have yet. Provider tokens will stay on the server and never reach this browser.
        </div>
      </section>
    </div>
  );
}
