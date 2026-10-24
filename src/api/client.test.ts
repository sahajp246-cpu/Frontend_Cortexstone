import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './client';

afterEach(() => vi.unstubAllGlobals());
const sample = { action_id: 'x', tool_name: 'github.create_issue', target_ref: 'r', arguments: {}, purpose: '', requested_at: '' };

describe('live mode', () => {
  it('never calls the unregistered chat route', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f);
    const r = await createApi('live', '').sendChat('hi', null);
    expect(f).not.toHaveBeenCalled();
    expect(r.ok).toBe(false);
  });
  it('maps the real 503 envelope without leaking the body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'service_unavailable', message: 'Not configured.' }, request_id: 'r1', trace: 'SECRET' }), { status: 503 })));
    const r = await createApi('live', '').validateAction(sample);
    expect(r).toMatchObject({ ok: false, kind: 'unavailable', status: 503, requestId: 'r1', message: 'Not configured.' });
    expect(JSON.stringify(r)).not.toContain('SECRET');
  });
  it('reports network failure honestly instead of falling back to mock', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('down'); }));
    const h = await createApi('live', '').health();
    expect(h.ok && h.data.health.state).toBe('unreachable');
    expect(h.ok && h.data.simulated).toBe(false);
  });
});

describe('mock mode', () => {
  it('validation reports a policy outcome, never approval or execution', async () => {
    const r = await createApi('mock', '').validateAction(sample);
    expect(r.ok && r.data.status).toBe('require_approval');
  });
});

describe('memory', () => {
  it('forgetting removes the record for the session; live mode never calls the missing route', async () => {
    const mock = createApi('mock', '');
    const before = await mock.listMemories();
    expect(before.ok && before.data.length).toBeGreaterThan(1);
    expect((await mock.forgetMemory('m1')).ok).toBe(true);
    const after = await mock.listMemories();
    expect(after.ok && after.data.some((m) => m.id === 'm1')).toBe(false);
    expect((await mock.forgetMemory('m1')).ok).toBe(false);
    const f = vi.fn(); vi.stubGlobal('fetch', f);
    const live = await createApi('live', '').forgetMemory('m1');
    expect(live.ok).toBe(false); expect(f).not.toHaveBeenCalled();
  });
});
