import { useEffect, useState } from 'react';
import { api } from '../app-context';
import { handoff } from '../handoff';
import type { ActionValidation, Failure, PolicyReason, PolicyStatus, ProposedAction } from '../api/types';
import { Badge, Banner, Empty, PageHeader, fmtTime, short } from '../ui';

const STATUS: Record<PolicyStatus, [string, 'ok' | 'bad' | 'warn']> = { allow: ['Allowed by policy', 'ok'], deny: ['Denied', 'bad'], require_approval: ['Needs approval', 'warn'] };
const REASON: Record<PolicyReason, string> = {
  allowed: 'Policy permits this action.', unknown_tool: 'No tool with this name is registered.', target_not_allowlisted: 'The target is not on the allowlist.',
  permission_missing: 'The required permission has not been granted.', invalid_arguments: 'The arguments do not match what the tool accepts.',
  approval_required: 'A person must approve this exact action before it can run.', approval_rejected: 'The approval was rejected.',
  approval_mismatch: 'The approval does not match this action.', approval_expired: 'The approval has expired.',
};
interface Entry { action: ProposedAction; result: ActionValidation; at: string }

export default function Actions() {
  const [tool, setTool] = useState(''); const [target, setTarget] = useState(''); const [purpose, setPurpose] = useState(''); const [args, setArgs] = useState('{}');
  const [busy, setBusy] = useState(false); const [formErr, setFormErr] = useState<string | null>(null); const [fail, setFail] = useState<Failure | null>(null);
  const [latest, setLatest] = useState<Entry | null>(null); const [history, setHistory] = useState<Entry[]>([]);

  useEffect(() => {
    const a = handoff.take();
    if (!a) return;
    setTool(a.tool_name); setTarget(a.target_ref); setPurpose(a.purpose); setArgs(JSON.stringify(a.arguments, null, 2));
  }, []);

  async function validate() {
    if (busy) return;
    setFormErr(null); setFail(null);
    let parsed: unknown;
    try { parsed = JSON.parse(args || '{}'); } catch { setFormErr('Arguments must be valid JSON.'); return; }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) { setFormErr('Arguments must be a JSON object.'); return; }
    if (!tool.trim() || !target.trim()) { setFormErr('Tool and target are required.'); return; }
    const action: ProposedAction = { action_id: crypto.randomUUID(), tool_name: tool.trim(), target_ref: target.trim(), arguments: parsed as Record<string, unknown>, purpose: purpose.trim(), requested_at: new Date().toISOString() };
    setBusy(true);
    const r = await api.validateAction(action);
    setBusy(false);
    if (!r.ok) { setFail(r); return; }
    const entry = { action, result: r.data, at: new Date().toISOString() };
    setLatest(entry); setHistory((h) => [entry, ...h]);
  }

  const sim = api.mode === 'mock';
  return (
    <div className="page">
      <PageHeader title="Actions & approvals" sub="Propose an action and see what policy says. Validation checks policy only." />

      <section className="panel" aria-labelledby="h-prop">
        <header><h2 id="h-prop">Propose an action</h2></header>
        <div className="body form">
          <div className="field"><label htmlFor="tool">Tool</label><input id="tool" value={tool} onChange={(e) => setTool(e.target.value)} placeholder="notes.delete" autoComplete="off" /></div>
          <div className="field"><label htmlFor="target">Target</label><input id="target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="note_001" autoComplete="off" /></div>
          <div className="field full"><label htmlFor="purpose">Purpose</label><input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={1000} placeholder="Why this action is needed" /></div>
          <div className="field full"><label htmlFor="args">Arguments (JSON object)</label><textarea id="args" className="mono" rows={5} value={args} onChange={(e) => setArgs(e.target.value)} spellCheck={false} /></div>
          {formErr && <div className="full"><Banner tone="bad">{formErr}</Banner></div>}
          <div className="full"><button className="btn primary" onClick={() => void validate()} disabled={busy}>{busy ? 'Validating…' : 'Validate against policy'}</button></div>
        </div>
      </section>

      {fail && (
        <Banner tone={fail.kind === 'unavailable' || fail.kind === 'unauthenticated' || fail.kind === 'forbidden' ? 'warn' : 'bad'}
          title={fail.kind === 'unauthenticated' ? 'Sign-in required' : fail.kind === 'forbidden' ? 'Not permitted' : fail.kind === 'network' ? 'API unreachable' : fail.status === 503 ? 'Validation is unavailable' : 'Validation failed'}>
          <p>{fail.message}</p>
          {fail.status === 503 && <p>The backend fails closed when no trusted principal is configured. The dashboard doesn't supply an identity, and shouldn't.</p>}
          {fail.requestId && <p>Request ID: <code>{fail.requestId}</code></p>}
        </Banner>
      )}

      {latest && (
        <section className="panel" aria-labelledby="h-res" aria-live="polite">
          <header><h2 id="h-res">Policy result</h2></header>
          <div className="body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge tone={STATUS[latest.result.status][1]}>{STATUS[latest.result.status][0]}</Badge>
              {latest.result.risk && <Badge tone={latest.result.risk === 'low' ? 'ok' : latest.result.risk === 'medium' ? 'warn' : 'bad'}>{latest.result.risk} risk</Badge>}
              <span>{REASON[latest.result.reason]}</span>
            </div>
            {latest.result.action_hash && <div className="muted">Action hash <code>{short(latest.result.action_hash, 20)}</code></div>}
            <Banner>Validation only. This action has not been approved and has not been run.</Banner>
          </div>
        </section>
      )}

      <div className="grid2">
        <section className="panel" aria-labelledby="h-hist">
          <header><h2 id="h-hist">Proposals from this tab</h2></header>
          {history.length === 0 ? <Empty title="Nothing validated yet">Proposals you validate appear here for this browser session only. This is not an approval queue.</Empty> : (
            <div className="scroll"><table><thead><tr><th>Tool</th><th>Target</th><th>Policy</th><th>When</th></tr></thead><tbody>
              {history.map((e) => <tr key={e.action.action_id}><td><code>{e.action.tool_name}</code></td><td>{short(e.action.target_ref, 28)}</td><td><Badge tone={STATUS[e.result.status][1]}>{STATUS[e.result.status][0]}</Badge></td><td className="muted">{fmtTime(e.at)}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
        <section className="panel" aria-labelledby="h-exec">
          <header><h2 id="h-exec">Approvals & execution history</h2><Badge>Not available</Badge></header>
          <Empty title="No execution record exists">The backend has no approval or execution endpoints. Nothing is shown as approved, run, or verified until it can be confirmed.</Empty>
        </section>
      </div>
    </div>
  );
}
