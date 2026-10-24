import { useEffect, useState, type ComponentType } from 'react';
import { Brain, FileCheck2, LayoutDashboard, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, Plug, Settings as Cog, ShieldAlert, Workflow } from 'lucide-react';
import { HealthProvider, api, overall, useHealth } from './app-context';
import type { Feature } from './api/types';
import { Badge } from './ui';
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
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, feature: 'overview' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, feature: 'chat' },
  { id: 'memory', label: 'Memory', icon: Brain, feature: 'memory' },
  { id: 'jobs', label: 'Jobs & Workflows', icon: Workflow, feature: 'jobs' },
  { id: 'actions', label: 'Actions & Approvals', icon: FileCheck2, feature: 'actions' },
  { id: 'guardian', label: 'Guardian', icon: ShieldAlert, feature: 'guardian' },
  { id: 'integrations', label: 'Integrations', icon: Plug, feature: 'integrations' },
  { id: 'settings', label: 'Settings', icon: Cog },
];

const useRoute = () => {
  const get = () => location.hash.replace(/^#\//, '') || 'overview';
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => setR(get()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
};

const UNAVAILABLE: Record<string, { feature: Feature; title: string; sub: string; paths: string[]; note: string; page: ComponentType }> = {
  memory: { feature: 'memory', title: 'Memory', sub: 'Search what Cortexstone remembers, see where it came from, and forget it.', paths: ['GET /api/v1/memories', 'POST /api/v1/memories', 'DELETE /api/v1/memories/{id}'], note: 'The memory routes are not registered. Provenance must distinguish stated from inferred facts.', page: Memory },
  jobs: { feature: 'jobs', title: 'Jobs & Workflows', sub: 'Track background work, outcomes, and retries.', paths: ['GET /api/v1/jobs', 'GET /api/v1/jobs/{id}'], note: 'No job tables or routes exist yet.', page: Jobs },
  guardian: { feature: 'guardian', title: 'Guardian', sub: 'Security findings with severity and affected resources.', paths: ['GET /api/v1/findings', 'POST /api/v1/guardian/scan'], note: 'Scanning is not available. Guardian has no backend code beyond its README.', page: Guardian },
  integrations: { feature: 'integrations', title: 'Integrations', sub: 'GitHub and Google Calendar (read-only) and built-in Cortexstone Notes.', paths: ['GET /api/v1/connectors', 'POST /api/v1/connectors/{provider}/connect', 'GET /api/v1/notes'], note: 'Connector credentials stay server-side. The dashboard will only show connection state and capabilities.', page: Integrations },
};

function Page({ route }: { route: string }) {
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
  useEffect(() => { setOpen(false); }, [route]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem('cs.collapsed', c ? '0' : '1'); } catch { /* ignore */ } return !c; });
  const h = overall(snap);
  const healthTone = { checking: 'neutral', ok: 'ok', degraded: 'warn', unreachable: 'bad' }[h] as 'neutral' | 'ok' | 'warn' | 'bad';
  const healthText = api.mode === 'mock' ? 'Simulated health' : { checking: 'Checking API…', ok: 'API healthy', degraded: 'API degraded', unreachable: 'API unreachable' }[h];

  return (
    <div className={`app${collapsed ? ' collapsed' : ''}${open ? ' open' : ''}`}>
      <header className="top">
        <button className="btn icon only-m" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={18} /></button>
        <div className="brand only-m"><span className="mark" aria-hidden><i /><i /><i /></span>Cortexstone</div>
        <span className="muted hide-m">Remember · Act · Protect</span>
        <span className="grow" />
        <span title="Backend connectivity"><Badge tone={healthTone}><i className="pip" aria-hidden /><span className="t">{healthText}</span></Badge></span>
        <span role="status">{api.mode === 'live' ? <Badge tone="ok">Live</Badge> : <Badge tone="warn"><span className="hide-m">Demo · simulated data</span><span className="only-m">Demo</span></Badge>}</span>
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
    </div>
  );
}

export default function App() {
  if (config.error) return <main className="cfg"><h1>Configuration error</h1><p className="muted" style={{ marginTop: 8 }}>{config.error}</p><p className="muted" style={{ marginTop: 8 }}>Fix the value in <code>.env</code> and restart. Nothing was requested.</p></main>;
  return <ToastProvider><HealthProvider><Shell /></HealthProvider></ToastProvider>;
}
