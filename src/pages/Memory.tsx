import { useMemo, useState } from 'react';
import { api } from '../app-context';
import type { MemoryRecord } from '../api/types';
import { useLoad } from '../hooks';
import { ConfirmDialog } from '../dialog';
import { useToast } from '../toast';
import { LoadError, Loading } from '../states';
import { Badge, Empty, PageHeader, fmtTime } from '../ui';

export default function Memory() {
  const { data, error, loading, reload, setData } = useLoad(api.listMemories);
  const toast = useToast();
  const [q, setQ] = useState(''); const [prov, setProv] = useState<'all' | 'stated' | 'inferred'>('all'); const [kind, setKind] = useState('all');
  const [target, setTarget] = useState<MemoryRecord | null>(null); const [busy, setBusy] = useState(false);
  const rows = useMemo(() => (data ?? []).filter((m) =>
    (prov === 'all' || (prov === 'inferred') === m.inferred) && (kind === 'all' || m.kind === kind) && m.content.toLowerCase().includes(q.trim().toLowerCase())), [data, q, prov, kind]);

  async function forget() {
    if (!target || busy || !data) return;
    setBusy(true);
    const r = await api.forgetMemory(target.id);
    setBusy(false);
    if (!r.ok) { toast('bad', `Couldn't forget this memory. ${r.message}`); return; }
    setData(data.filter((m) => m.id !== target.id));
    setTarget(null);
    toast('ok', 'Memory forgotten.');
  }

  return (
    <div className="page">
      <PageHeader title="Memory" sub="What Cortexstone remembers, where it came from, and how sure it is."><Badge tone="warn">Simulated data</Badge></PageHeader>
      <section className="panel" aria-label="Memories">
        <div className="toolbar">
          <div className="search"><label htmlFor="mq" className="sr">Search memories</label><input id="mq" type="search" placeholder="Search memories" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <label className="sr" htmlFor="mp">Provenance</label>
          <select id="mp" value={prov} onChange={(e) => setProv(e.target.value as typeof prov)}><option value="all">All provenance</option><option value="stated">Stated by you</option><option value="inferred">Inferred</option></select>
          <label className="sr" htmlFor="mk">Kind</label>
          <select id="mk" value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">All kinds</option><option value="fact">Fact</option><option value="episode">Episode</option><option value="skill">Skill</option></select>
        </div>
        {loading ? <Loading what="memories" /> : error ? <LoadError error={error} onRetry={() => void reload()} /> : rows.length === 0 ? (
          (data ?? []).length === 0 ? <Empty title="Nothing remembered yet">Facts you share in chat will appear here with their source.</Empty>
            : <Empty title="No memories match" action={<button className="btn" onClick={() => { setQ(''); setProv('all'); setKind('all'); }}>Clear filters</button>}>Try a different search or clear the filters.</Empty>
        ) : (
          <div className="scroll"><table>
            <thead><tr><th>Memory</th><th>Provenance</th><th>Confidence</th><th>Added</th></tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.id}>
                <td style={{ minWidth: 220 }}><div>{m.content}</div><div className="muted">{m.kind} · {m.source}</div>
                  <button className="btn danger" style={{ marginTop: 8 }} onClick={() => setTarget(m)} aria-label={`Forget memory: ${m.content}`}>Forget</button></td>
                <td>{m.inferred ? <Badge tone="memory">Inferred</Badge> : <Badge tone="ok">Stated by you</Badge>}</td>
                <td className="mono">{Math.round(m.confidence * 100)}%{m.inferred && <div className="muted">may be wrong</div>}</td>
                <td className="muted">{fmtTime(m.createdAt)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
      <ConfirmDialog open={target !== null} title="Forget this memory?" confirmLabel="Forget memory" busy={busy} onConfirm={() => void forget()} onCancel={() => setTarget(null)}>
        <p>{target?.content}</p><p className="muted" style={{ marginTop: 8 }}>Cortexstone will stop using it in answers. This can't be undone from the dashboard.</p>
      </ConfirmDialog>
    </div>
  );
}
