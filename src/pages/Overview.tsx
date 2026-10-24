import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowUpRight, CheckCheck, FileJson2, MessageSquareText, Radio, Search, ShieldCheck } from 'lucide-react';
import { api, useHealth } from '../app-context';
import type { CalendarEvent, Failure, GitHubRepository, MemoryRecord, Note, PolicyCheck, Result } from '../api/types';
import { Modal } from '../dialog';
import { Banner, BentoCard, Empty, PageHeader, fmtTime } from '../ui';

interface Feed<T> { data: T[]; error: Failure | null; loading: boolean }
const emptyFeed = <T,>(): Feed<T> => ({ data: [], error: null, loading: true });
const endpointStatus = (state?: string) => state === 'ok' ? 'Connected' : state === 'degraded' ? 'Degraded' : state === 'unreachable' ? 'Unreachable' : 'Checking';

function StatusLine({ label, path, state, detail, ms }: { label: string; path: string; state?: string; detail?: string; ms?: number }) {
  return (
    <div className="status-line">
      <span className={`status-indicator ${state ?? 'checking'}`} />
      <span className="status-name">{label}</span>
      <code>{path}</code>
      <span className={`status-text ${state ?? 'checking'}`}>{state ? endpointStatus(state) : 'Checking'}</span>
      <span className="mono latency">{ms === undefined ? '—' : `${ms} ms`}</span>
      {detail && <span className="status-detail">{detail}</span>}
      <span className="latency-track"><i style={{ width: `${ms === undefined ? 5 : Math.min(100, Math.max(8, ms / 4))}%` }} /></span>
    </div>
  );
}

export default function Overview() {
  const { snap, loading, refresh } = useHealth();
  const [prompt, setPrompt] = useState('');
  const [memories, setMemories] = useState<Feed<MemoryRecord>>(emptyFeed);
  const [repos, setRepos] = useState<Feed<GitHubRepository>>(emptyFeed);
  const [events, setEvents] = useState<Feed<CalendarEvent>>(emptyFeed);
  const [notes, setNotes] = useState<Feed<Note>>(emptyFeed);
  const [checks, setChecks] = useState<PolicyCheck[]>([]);
  const [inspect, setInspect] = useState<PolicyCheck | null>(null);
  const [now] = useState(() => Date.now());
  const start = useMemo(() => new Date(now).toISOString(), [now]);
  const end = useMemo(() => new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), [now]);

  useEffect(() => {
    const load = <T,>(promise: Promise<Result<T[]>>, setter: (value: Feed<T>) => void) => {
      void promise.then((result) => {
        if (!result.ok) { setter({ data: [], error: result, loading: false }); return; }
        if (!Array.isArray(result.data)) {
          setter({ data: [], error: { ok: false, kind: 'invalid', message: 'The API returned an unexpected list response.' }, loading: false });
          return;
        }
        setter({ data: result.data, error: null, loading: false });
      });
    };
    load(api.listMemories(), setMemories);
    load(api.listGithubRepos(), setRepos);
    load(api.listCalendarEvents(start, end, 'Asia/Kolkata'), setEvents);
    load(api.listNotes(), setNotes);
    setChecks(api.recentPolicyChecks());
  }, [start, end]);

  function openChat(event: FormEvent) {
    event.preventDefault();
    const query = prompt.trim();
    if (!query) return;
    location.hash = `#/chat?prompt=${encodeURIComponent(query)}`;
  }

  const health = snap?.health;
  const ready = snap?.ready;
  const principalCheck = snap?.principalCheck;
  const principalState = !snap ? 'CHECKING' : snap.principal?.authenticated ? 'AUTHENTICATED' : snap.principal ? 'NOT AUTHENTICATED' : 'UNAVAILABLE';

  return (
    <div className="page overview-page">
      <PageHeader title="Operations" sub="A live read on your workspace, access, and policy boundary." />

      <form className="quick-command bento-card" onSubmit={openChat}>
        <MessageSquareText size={18} aria-hidden />
        <label className="sr" htmlFor="quick-prompt">Ask Cortexstone</label>
        <input id="quick-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask Cortexstone anything…" />
        <span className="quick-hint">Open chat <kbd>↵</kbd></span>
        <button className="btn primary" type="submit" disabled={!prompt.trim()}><Search size={15} />Ask</button>
      </form>

      <div className="bento-grid">
        <BentoCard className="bento-telemetry" aria-labelledby="telemetry-title">
          <header className="bento-heading"><div><span className="eyebrow">PLATFORM</span><h2 id="telemetry-title">System telemetry</h2></div><button className="btn" onClick={refresh} disabled={loading}><Radio size={14} />{loading ? 'Checking' : 'Refresh'}</button></header>
          <div className="status-stack">
            <StatusLine label="Liveness" path="/health" state={health?.state} detail={health?.detail} ms={health?.ms} />
            <StatusLine label="Readiness" path="/ready" state={ready?.state} detail={ready?.detail} ms={ready?.ms} />
            <StatusLine label="Principal" path="/api/v1/me" state={principalCheck?.state} detail={principalCheck?.detail} ms={principalCheck?.ms} />
          </div>
          <div className="principal-strip">
            <span className="principal-avatar">{snap?.principal?.display_name.slice(0, 1) ?? '—'}</span>
            <div><span className="muted">Authenticated principal</span><strong>{snap?.principal?.display_name ?? (snap ? 'Unavailable' : 'Checking…')}</strong></div>
            <code>{snap?.principal?.id ?? 'no principal'}</code>
            <span className={`principal-state ${!snap ? 'checking' : snap.principal?.authenticated ? 'ok' : 'bad'}`}>{principalState}</span>
          </div>
        </BentoCard>

        <BentoCard className="bento-connectors" aria-labelledby="connectors-title">
          <header className="bento-heading"><div><span className="eyebrow">SURFACES</span><h2 id="connectors-title">Connector matrix</h2></div><a className="text-link" href="#/integrations">Explore <ArrowUpRight size={14} /></a></header>
          <div className="connector-matrix">
            <div className="connector-row"><span className="connector-mark github-mark">GH</span><div><strong>GitHub</strong><span className="muted">Read-only · repositories, issues, pulls, runs</span></div><span className="connector-count">{repos.data.length}<small>repos</small></span><span className={`connector-state ${repos.error ? 'error' : 'connected'}`}>{repos.loading ? 'CHECKING' : repos.error ? 'UNAVAILABLE' : 'READ ONLY'}</span></div>
            <div className="connector-row"><span className="connector-mark calendar-mark">◷</span><div><strong>Google Calendar</strong><span className="muted">Read-only · Asia/Kolkata</span></div><span className="connector-count">{events.data.length}<small>events</small></span><span className={`connector-state ${events.error ? 'error' : 'connected'}`}>{events.loading ? 'CHECKING' : events.error ? 'UNAVAILABLE' : 'READ ONLY'}</span></div>
            <div className="connector-row"><span className="connector-mark notes-mark">N</span><div><strong>Cortexstone Notes</strong><span className="muted">Built-in notes</span></div><span className="connector-count">{notes.data.length}<small>notes</small></span><span className={`connector-state ${notes.error ? 'error' : 'connected'}`}>{notes.loading ? 'CHECKING' : notes.error ? 'UNAVAILABLE' : 'CRUD'}</span></div>
          </div>
          {(repos.error || events.error || notes.error) && <p className="connector-warning">{[repos.error, events.error, notes.error].filter(Boolean).map((error) => error?.message).join(' ')}</p>}
        </BentoCard>

        <BentoCard className="bento-memory" aria-labelledby="memory-title">
          <header className="bento-heading"><div><span className="eyebrow">OWNER-SCOPED</span><h2 id="memory-title">Memory provenance</h2></div><a className="text-link" href="#/memory">All memory <ArrowUpRight size={14} /></a></header>
          {memories.loading ? <p className="body muted">Loading owner-scoped memories…</p> : memories.data.length ? (
            <ul className="provenance-list">{memories.data.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((memory, index) => (
              <li key={memory.id} style={{ '--stagger-index': index } as CSSProperties}>
                <div className="provenance-meta"><span className={`source-tag ${memory.inferred ? 'inferred' : 'user'}`}>{memory.inferred ? 'INFERRED' : 'USER'}</span><span className="confidence">{Math.round(memory.confidence * 100)}%</span></div>
                <p>{memory.content}</p>
                <div className="confidence-track"><i style={{ width: `${Math.round(memory.confidence * 100)}%` }} /></div>
                <time>{fmtTime(memory.createdAt)}</time>
              </li>
            ))}</ul>
          ) : <Empty title={memories.error ? 'Memory unavailable' : 'No memories yet'}>{memories.error?.message ?? 'Owner-scoped memories will appear here with their provenance.'}</Empty>}
        </BentoCard>

        <BentoCard className="bento-policy" aria-labelledby="policy-title">
          <header className="bento-heading"><div><span className="eyebrow">POLICY GATE</span><h2 id="policy-title">Validation checks</h2></div><a className="text-link" href="#/actions">Validate action <ArrowUpRight size={14} /></a></header>
          <Banner tone="warn" title="Policy validation only">POST /api/v1/actions/validate evaluates policy. It does not approve or execute actions.</Banner>
          {checks.length ? <ul className="policy-list">{checks.map((check, index) => (
            <li key={check.action.action_id} style={{ '--stagger-index': index } as CSSProperties}>
              <div className="policy-icon"><ShieldCheck size={16} /></div>
              <div className="policy-main"><strong>{check.action.tool_name}</strong><span>{check.action.target_ref}</span></div>
              <span className={`policy-outcome ${check.result.status}`}>{check.result.status.replace('_', ' ')}</span>
              <button className="btn icon" onClick={() => setInspect(check)} aria-label={`Inspect ${check.action.tool_name} validation JSON`}><FileJson2 size={15} /></button>
            </li>
          ))}</ul> : <Empty title="No checks in this session">Validated proposals show here. Each check is temporary and has no execution side effect.</Empty>}
          <div className="policy-footer"><CheckCheck size={14} /> No action is run from this view.</div>
        </BentoCard>
      </div>

      <Modal open={inspect !== null} title="Validation payload" onClose={() => setInspect(null)}>
        {inspect && <><p className="muted modal-intro">Policy validation is not execution. This JSON stays in this browser session.</p><pre>{JSON.stringify({ action: inspect.action, validation: inspect.result, validated_at: inspect.at }, null, 2)}</pre></>}
      </Modal>
    </div>
  );
}
