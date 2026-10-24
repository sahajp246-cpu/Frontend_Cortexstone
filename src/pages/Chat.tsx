import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { api } from '../app-context';
import { handoff } from '../handoff';
import type { ProposedAction } from '../api/types';
import { Badge, Banner, PageHeader } from '../ui';

interface Msg { id: string; role: 'user' | 'assistant'; text: string; actions?: ProposedAction[]; status?: 'sending' | 'failed'; error?: string }

function promptFromHash() {
  const query = location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query).get('prompt') ?? '';
}

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState(promptFromHash);
  const [busy, setBusy] = useState(false);
  const [conv, setConv] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const enabled = api.support.chat !== 'unavailable';
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy]);
  useEffect(() => {
    const onHashChange = () => {
      const prompt = promptFromHash();
      if (prompt) setDraft(prompt);
    };
    addEventListener('hashchange', onHashChange);
    return () => removeEventListener('hashchange', onHashChange);
  }, []);

  async function deliver(id: string, text: string) {
    setBusy(true);
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, status: 'sending', error: undefined } : x)));
    const r = await api.sendChat(text, conv);
    setBusy(false);
    if (!r.ok) { setMsgs((m) => m.map((x) => (x.id === id ? { ...x, status: 'failed', error: r.message } : x))); return; }
    setConv(r.data.conversation_id ?? conv);
    setMsgs((m) => [...m.map((x) => (x.id === id ? { ...x, status: undefined } : x)), { id: crypto.randomUUID(), role: 'assistant', text: r.data.answer ?? '', actions: r.data.proposed_actions }]);
  }
  function send() {
    const text = draft.trim();
    if (!text || busy || !enabled) return;
    const id = crypto.randomUUID();
    setMsgs((m) => [...m, { id, role: 'user', text }]);
    setDraft('');
    void deliver(id, text);
  }
  function review(a: ProposedAction) { handoff.set(a); location.hash = '#/actions'; }

  return (
    <div className="page chat">
      <PageHeader title="Chat" sub="Ask, recall, and propose. Anything that changes something outside Cortexstone is proposed, never done." />
      {!enabled && (
        <Banner tone="warn" title="Chat isn't available yet">
          The backend defines chat schemas but registers no <code>/api/v1/chat</code> route, so nothing is sent from here. Switch to demo mode to preview the experience.
        </Banner>
      )}
      <div className="log" role="log" aria-live="polite" aria-label="Conversation">
        {msgs.length === 0 && (
          <div className="empty"><h3>Start a conversation</h3><p>{enabled ? 'Try “delete old note_001” to see how proposed actions stay separate from the answer.' : 'Your conversation will appear here once chat is connected.'}</p></div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="who">{m.role === 'user' ? 'You' : 'Cortexstone'}</div>
            {m.text && <div className="bubble">{m.text}</div>}
            {m.status === 'failed' && (
              <Banner tone="bad" title="Message not delivered">
                {m.error} <button className="btn" onClick={() => void deliver(m.id, m.text)} disabled={busy}><RefreshCw size={14} aria-hidden />Retry</button>
              </Banner>
            )}
            {m.actions?.map((a) => (
              <div key={a.action_id} className="proposal">
                <div><Badge tone="info">Proposed · not executed</Badge></div>
                <div><code>{a.tool_name}</code> <span className="muted">on {a.target_ref}</span></div>
                {a.purpose && <div className="muted">{a.purpose}</div>}
                <pre>{JSON.stringify(a.arguments, null, 2)}</pre>
                <div><button className="btn" onClick={() => review(a)}>Review in Actions</button></div>
              </div>
            ))}
          </div>
        ))}
        {busy && <div className="msg assistant" aria-label="Cortexstone is replying"><div className="typing" aria-hidden><i /><i /><i /></div><span className="sr">Cortexstone is replying</span></div>}
        <div ref={end} />
      </div>
      <div className="composer">
        <label htmlFor="msg" className="sr">Message</label>
        <textarea id="msg" rows={1} value={draft} disabled={!enabled} maxLength={10000}
          placeholder={enabled ? 'Message Cortexstone' : 'Chat is not available yet'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn primary" onClick={send} disabled={!enabled || busy || !draft.trim()} aria-label="Send message"><Send size={16} aria-hidden />Send</button>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>Enter to send, Shift+Enter for a new line. Assistant text is rendered as plain text.</div>
    </div>
  );
}
