import { seedConnectors, seedFindings, seedJobs, seedMemories } from './mock-data';
import type { Api, DataMode, Failure, HealthSnapshot, Probe, ProposedAction, Result, ActionValidation, ChatResponse } from './types';

const TIMEOUT_MS = 8000;

function kindFor(status: number): Failure['kind'] {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404 || status === 405 || status === 501 || status === 503) return 'unavailable';
  if (status >= 500) return 'server';
  return 'invalid';
}

/** One place for HTTP. Only the server's envelope message is surfaced; raw bodies and stack traces never are. */
async function call<T>(base: string, path: string, init?: RequestInit): Promise<Result<T>> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(base + path, { ...init, signal: ctl.signal, headers: { 'Content-Type': 'application/json' } });
    const body: unknown = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: body as T };
    const env = body as { error?: { message?: unknown }; request_id?: unknown } | null;
    const message = typeof env?.error?.message === 'string' ? env.error.message : 'The request could not be completed.';
    const requestId = typeof env?.request_id === 'string' ? env.request_id : res.headers.get('X-Request-ID') ?? undefined;
    return { ok: false, kind: kindFor(res.status), message, status: res.status, requestId };
  } catch {
    return { ok: false, kind: 'network', message: 'Could not reach the API. Check that the backend is running and the base URL is correct.' };
  } finally {
    clearTimeout(timer);
  }
}

const notRegistered = (what: string): Failure => ({
  ok: false, kind: 'unavailable', message: `${what} is not registered on the backend yet, so the dashboard does not call it.`,
});
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hash = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

export function createApi(mode: DataMode, base: string): Api {
  if (mode === 'live') {
    const probe = async (path: string): Promise<Probe> => {
      const t = performance.now();
      const r = await call<unknown>(base, path);
      const ms = Math.round(performance.now() - t);
      if (r.ok) return { state: 'ok', ms };
      if (r.kind === 'network') return { state: 'unreachable', detail: r.message };
      return { state: 'degraded', ms, detail: r.status === 503 ? 'Not ready: a required dependency is unavailable.' : r.message };
    };
    return {
      mode,
      support: { health: 'live', actions: 'live', chat: 'unavailable', overview: 'unavailable', memory: 'unavailable', jobs: 'unavailable', guardian: 'unavailable', integrations: 'unavailable' },
      async health() {
        const [health, ready] = await Promise.all([probe('/health'), probe('/ready')]);
        return { ok: true, data: { health, ready, checkedAt: new Date().toISOString(), simulated: false } satisfies HealthSnapshot };
      },
      validateAction: (action) => call<ActionValidation>(base, '/api/v1/actions/validate', { method: 'POST', body: JSON.stringify({ action }) }),
      sendChat: async () => notRegistered('POST /api/v1/chat'),
      overview: async () => notRegistered('An approvals/activity endpoint'),
      listMemories: async () => notRegistered('GET /api/v1/memories'),
      forgetMemory: async () => notRegistered('DELETE /api/v1/memories/{id}'),
      listJobs: async () => notRegistered('A jobs endpoint'),
      listFindings: async () => notRegistered('A findings endpoint'),
      listConnectors: async () => notRegistered('GET /api/v1/connectors'),
    };
  }

  // ---- Mock mode: every record is simulated and labelled as such by the UI. ----
  const ok = (ms: number): Probe => ({ state: 'ok', ms });
  const memories = seedMemories();
  return {
    mode,
    support: { health: 'simulated', actions: 'simulated', chat: 'simulated', overview: 'simulated', memory: 'simulated', jobs: 'simulated', guardian: 'simulated', integrations: 'simulated' },
    async health() {
      await delay(200);
      return { ok: true, data: { health: ok(4), ready: ok(11), checkedAt: new Date().toISOString(), simulated: true } };
    },
    async validateAction(a: ProposedAction): Promise<Result<ActionValidation>> {
      await delay(350);
      const tool = a.tool_name.trim();
      if (!/^(notes|github)\./.test(tool)) return { ok: true, data: { status: 'deny', reason: 'unknown_tool', action_hash: null, risk: null } };
      if (tool.startsWith('notes.') || /\.(read|list)/.test(tool)) return { ok: true, data: { status: 'allow', reason: 'allowed', action_hash: hash(), risk: 'low' } };
      return { ok: true, data: { status: 'require_approval', reason: 'approval_required', action_hash: hash(), risk: 'medium' } };
    },
    async sendChat(message, conversationId): Promise<Result<ChatResponse>> {
      await delay(900);
      if (message.startsWith('/fail')) return { ok: false, kind: 'network', message: 'Simulated network failure. Retry to continue.' };
      const wantsAction = /delete|remove|clean/i.test(message);
      return { ok: true, data: {
        conversation_id: conversationId ?? 'sim-' + hash().slice(0, 8),
        answer: wantsAction
          ? 'I can delete that note. Because it is a destructive action, I am proposing it rather than doing it. It needs policy validation and your approval first.'
          : 'This is a simulated reply. In live mode the assistant answer appears here, kept separate from any proposed actions.',
        proposed_actions: wantsAction ? [{ action_id: crypto.randomUUID(), tool_name: 'notes.delete', target_ref: 'note_001', arguments: { reason: 'User requested cleanup' }, purpose: 'Delete the note you mentioned.', requested_at: new Date().toISOString() }] : [],
      } };
    },
    async overview() {
      await delay(250);
      const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
      return { ok: true, data: {
        approvals: [
          { id: 'sim-1', tool_name: 'notes.delete', target_ref: 'note_001', requested_at: ago(12) },
          { id: 'sim-2', tool_name: 'github.read_workflow_runs', target_ref: 'octo-org/sample-repo', requested_at: ago(95) },
        ],
        activity: [
          { id: 'a1', text: 'Validated notes.delete: needs approval', at: ago(12) },
          { id: 'a2', text: 'Validated notes.create: allowed', at: ago(41) },
          { id: 'a3', text: 'Memory recall answered a question about your Python preference', at: ago(180) },
        ],
      } };
    },
    async listMemories() { await delay(300); return { ok: true, data: memories.map((m) => ({ ...m })) }; },
    async forgetMemory(id) {
      await delay(400);
      const i = memories.findIndex((m) => m.id === id);
      if (i < 0) return { ok: false, kind: 'invalid', message: 'That memory no longer exists.' };
      memories.splice(i, 1);
      return { ok: true, data: undefined };
    },
    async listJobs() { await delay(300); return { ok: true, data: seedJobs() }; },
    async listFindings() { await delay(300); return { ok: true, data: seedFindings() }; },
    async listConnectors() { await delay(200); return { ok: true, data: seedConnectors() }; },
  };
}
