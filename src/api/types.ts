// Mirrors src/cortexstone/agent/schemas/actions.py and api/v1/schemas.py (verified against the code, not the draft contract).
export type DataMode = 'mock' | 'live';
export type PolicyStatus = 'allow' | 'deny' | 'require_approval';
export type PolicyReason =
  | 'allowed' | 'unknown_tool' | 'target_not_allowlisted' | 'permission_missing' | 'invalid_arguments'
  | 'approval_required' | 'approval_rejected' | 'approval_mismatch' | 'approval_expired';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ProposedAction {
  action_id: string;
  tool_name: string;
  target_ref: string;
  arguments: Record<string, unknown>;
  purpose: string;
  idempotency_key?: string | null;
  requested_at: string;
}
export interface ActionValidation { status: PolicyStatus; reason: PolicyReason; action_hash: string | null; risk: RiskLevel | null }
export interface ChatResponse { conversation_id: string | null; answer: string | null; proposed_actions: ProposedAction[] }

export type FailureKind = 'unavailable' | 'unauthenticated' | 'forbidden' | 'invalid' | 'network' | 'server';
export interface Failure { ok: false; kind: FailureKind; message: string; status?: number; requestId?: string }
export type Result<T> = { ok: true; data: T } | Failure;

export interface Probe { state: 'ok' | 'degraded' | 'unreachable'; detail?: string; ms?: number }
export interface HealthSnapshot { health: Probe; ready: Probe; checkedAt: string; simulated: boolean }

export interface PendingApproval { id: string; tool_name: string; target_ref: string; requested_at: string }
export interface ActivityItem { id: string; text: string; at: string }
export interface OverviewData { approvals: PendingApproval[]; activity: ActivityItem[] }

export type MemoryKind = 'fact' | 'episode' | 'skill';
export interface MemoryRecord { id: string; content: string; kind: MemoryKind; source: string; inferred: boolean; confidence: number; createdAt: string }
export type JobStatus = 'queued' | 'running' | 'retry_wait' | 'awaiting_approval' | 'succeeded' | 'failed' | 'cancelled';
export interface JobRecord { id: string; name: string; status: JobStatus; startedAt: string; durationS: number | null; attempts: number; outcome: string }
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export interface Finding { id: string; severity: Severity; title: string; resource: string; detail: string; status: 'open' | 'resolved'; foundAt: string }
export interface Connector { id: 'github' | 'google_calendar' | 'notes'; name: string; state: 'simulated'; capabilities: string[]; readOnly: boolean; account?: string }

export type Feature = 'health' | 'chat' | 'actions' | 'overview' | 'memory' | 'jobs' | 'guardian' | 'integrations';
export type Support = 'live' | 'simulated' | 'unavailable';

export interface Api {
  mode: DataMode;
  support: Record<Feature, Support>;
  health(): Promise<Result<HealthSnapshot>>;
  validateAction(action: ProposedAction): Promise<Result<ActionValidation>>;
  sendChat(message: string, conversationId: string | null): Promise<Result<ChatResponse>>;
  overview(): Promise<Result<OverviewData>>;
  listMemories(): Promise<Result<MemoryRecord[]>>;
  forgetMemory(id: string): Promise<Result<void>>;
  listJobs(): Promise<Result<JobRecord[]>>;
  listFindings(): Promise<Result<Finding[]>>;
  listConnectors(): Promise<Result<Connector[]>>;
}
