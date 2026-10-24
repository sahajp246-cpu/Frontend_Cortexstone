import type { ProposedAction } from './api/types';

// In-memory only: action arguments may be sensitive, so they never touch browser storage.
let pending: ProposedAction | null = null;
export const handoff = { set: (a: ProposedAction) => { pending = a; }, take: () => { const a = pending; pending = null; return a; } };
