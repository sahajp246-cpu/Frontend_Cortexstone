import { useEffect, useMemo, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Brain, FileCheck2, LayoutDashboard, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, Plug, Search, Settings as Cog, ShieldAlert, Workflow } from 'lucide-react';
import { HealthProvider, api, useHealth } from './app-context';
import type { Feature } from './api/types';
import { Modal } from './dialog';
import Overview from './pages/Overview';
import Chat from './pages/Chat';
import Actions from './pages/Actions';
import Memory from './pages/Memory';
import Jobs from './pages/Jobs';
import Guardian from './pages/Guardian';
import Integrations from './pages/Integrations';
import { ToastProvider } from './toast';
import { config } from './config';
import { Section, SettingsPage } from './pages/Sections';

const NAV: { id: string; label: string; icon: typeof Cog; feature?: Feature }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat', icon: MessageSquare, feature: 'chat' },
  { id: 'memory', label: 'Memory', icon: Brain, feature: 'memory' },
  { id: 'jobs', label: 'Jobs & Workflows', icon: Workflow, feature: 'jobs' },
  { id: 'actions', label: 'Actions & Approvals', icon: FileCheck2, feature: 'actions' },
  { id: 'guardian', label: 'Guardian', icon: ShieldAlert, feature: 'guardian' },
  { id: 'integrations', label: 'Integrations', icon: Plug, feature: 'integrations' },
  { id: 'settings', label: 'Settings', icon: Cog },
];

const useRoute = () => {
  const get = () => (location.hash.replace(/^#\//, '').split('?')[0] || 'overview');
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => setR(get()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
};

const UNAVAILABLE: Record<string, { feature: Feature; title: string; sub: string; paths: string[]; note: string; page: ComponentType }> = {
  jobs: { feature: 'jobs', title: 'Jobs & Workflows', sub: 'Track background work, outcomes, and retries.', paths: ['GET /api/v1/jobs', 'GET /api/v1/jobs/{id}'], note: 'No job tables or routes exist yet.', page: Jobs },
  guardian: { feature: 'guardian', title: 'Guardian', sub: 'Security findings with severity and affected resources.', paths: ['GET /api/v1/findings', 'POST /api/v1/guardian/scan'], note: 'Scanning is not available. Guardian has no backend code beyond its README.', page: Guardian },
};

function Page({ route }: { route: string }) {
  if (route === 'integrations') return <Integrations />;
  const u = UNAVAILABLE[route];
  if (u) return api.support[u.feature] === 'unavailable' ? <Section {...u} /> : <u.page />;
  switch (route) {
    case 'chat': return <Chat />;
    case 'actions': return <Actions />;
    case 'settings': return <SettingsPage />;
    default: return <Overview />;
  }
}

function Shell() {
  const route = useRoute();
  const { snap } = useHealth();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('cs.collapsed') === '1'; } catch { return false; } });
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  useEffect(() => { setOpen(false); }, [route]);
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    addEventListener('keydown', onKeyDown);
    return () => removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => { if (!paletteOpen) setPaletteQuery(''); }, [paletteOpen]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem('cs.collapsed', c ? '0' : '1'); } catch { /* ignore */ } return !c; });
  const matches = useMemo(() => NAV.filter(({ label, id }) => `${label} ${id}`.toLowerCase().includes(paletteQuery.trim().toLowerCase())), [paletteQuery]);
  useEffect(() => { setPaletteIndex(0); }, [paletteQuery]);
  const navigateTo = (id: string) => { location.hash = `#/${id}`; setPaletteOpen(false); };
  const onPaletteKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && matches.length) { event.preventDefault(); setPaletteIndex((index) => (index + 1) % matches.length); }
    if (event.key === 'ArrowUp' && matches.length) { event.preventDefault(); setPaletteIndex((index) => (index + matches.length - 1) % matches.length); }
    if (event.key === 'Enter' && matches[paletteIndex]) { event.preventDefault(); navigateTo(matches[paletteIndex].id); }
  };
  const health = snap?.health;
  const ready = snap?.ready;
  const latency = health?.ms ?? ready?.ms;

  return (
    <div className={`app${collapsed ? ' collapsed' : ''}${open ? ' open' : ''}`}>
      <header className="top">
        <button className="btn icon only-m" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={18} /></button>
        <div className="brand only-m"><span className="mark" aria-hidden><i /><i /><i /></span>Cortexstone</div>
        <button className="command-trigger hide-m" onClick={() => setPaletteOpen(true)} aria-keyshortcuts="Control+K Meta+K"><Search size={15} /><span>Jump to…</span><kbd>⌘ K / Ctrl K</kbd></button>
        <span className="grow" />
        <div className={`telemetry-capsule ${api.mode === 'live' ? 'live' : 'sandbox'}`} role="status" aria-label={api.mode === 'live' ? 'Live backend telemetry' : 'Sandbox simulated API telemetry'}>
          <span className="telemetry-label">{api.mode === 'live' ? '● LIVE BACKEND · /api/v1' : '◈ SANDBOX · SIMULATED API'}</span>
          <span className={`telemetry-pulse ${health?.state ?? 'checking'}`} />
          <span className="telemetry-bars" aria-label={latency === undefined ? 'Latency unavailable' : `Health latency ${latency} milliseconds`}>
            {[health?.ms, ready?.ms, snap?.principalCheck.ms].map((value, index) => <i key={index} style={{ height: `${value === undefined ? 3 : Math.max(3, Math.min(13, 3 + value / 5))}px` }} />)}
          </span>
          <span className="telemetry-ms mono">{latency === undefined ? '— ms' : `${latency} ms`}</span>
        </div>
      </header>
      <div className="scrim" onClick={() => setOpen(false)} />
      <nav className="side" aria-label="Primary">
        <div className="brand"><span className="mark" aria-hidden><i /><i /><i /></span><b>Cortexstone</b></div>
        {NAV.map(({ id, label, icon: Icon, feature }) => {
          const s = feature ? api.support[feature] : undefined;
          const status = s === 'live' ? 'live data' : s === 'simulated' ? 'simulated data' : s ? 'not available yet' : '';
          return (
            <a key={id} href={`#/${id}`} className="nav" aria-current={route === id ? 'page' : undefined} title={label} aria-label={status ? `${label}, ${status}` : label}>
              <Icon size={18} aria-hidden /><span className="lbl">{label}</span>
            </a>
          );
        })}
        <span className="spacer" />
        <button className="btn hide-m" onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /><span className="lbl">Collapse</span></>}
        </button>
      </nav>
      <main className="main" id="main"><Page route={route} /></main>
      <Modal open={paletteOpen} title="Jump to" onClose={() => setPaletteOpen(false)}>
        <div className="palette-search"><Search size={16} /><input autoFocus value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} onKeyDown={onPaletteKeyDown} placeholder="Search pages…" aria-label="Search pages" /></div>
        <nav className="palette-results" aria-label="Page shortcuts">
          {matches.map(({ id, label, icon: Icon }, index) => (
            <a key={id} href={`#/${id}`} className={`palette-result ${paletteIndex === index ? 'selected' : ''}`} onClick={() => setPaletteOpen(false)} aria-current={route === id ? 'page' : undefined}>
              <Icon size={16} /><span>{label}</span><kbd>↵</kbd>
            </a>
          ))}
          {matches.length === 0 && <p className="muted palette-empty">No matching pages.</p>}
        </nav>
      </Modal>
    </div>
  );
}

export default function App() {
  if (config.error) return <main className="cfg"><h1>Configuration error</h1><p className="muted" style={{ marginTop: 8 }}>{config.error}</p><p className="muted" style={{ marginTop: 8 }}>Fix the value in <code>.env</code> and restart. Nothing was requested.</p></main>;
  return <ToastProvider><HealthProvider><Shell /></HealthProvider></ToastProvider>;
}
