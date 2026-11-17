import { applyCommand, childrenOf, resolve, type BlockMap } from './optimistic';
import { HttpTransport, RejectedError, TransportError, type Transport } from './transport';
import type {
  BlockData,
  BlockId,
  Command,
  CommandError,
  CommandSuccess,
  CommandType,
  DeleteImpact,
  Manifest,
  PlanData,
  PlanResponse,
  TypeManifest,
} from './types';
import { ulid } from './ulid';

export interface PlanStoreOptions {
  transport: Transport;
  /** Where unsent commands survive a reload. Defaults to localStorage; null disables. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  /** Retry backoff for network errors, in ms. */
  retry?: { base: number; max: number };
}

export interface CreateOptions {
  parent?: BlockId | null;
  after?: BlockId | null;
  payload?: Record<string, unknown>;
  attachable?: { type: string; id: string | number };
  id?: BlockId;
}

export interface MoveOptions {
  /** Omit to stay in the same parent; null for the top level. */
  parent?: BlockId | null;
  /** Sibling to place after; null for first. */
  after: BlockId | null;
}

export type SyncState = 'idle' | 'saving' | 'offline';

/**
 * Events (all CustomEvent):
 *  - change   state changed (local or from the server)
 *  - command  detail: { command } — a command was issued
 *  - error    detail: { error, command } — the server rejected a command; it was rolled back
 *  - sync     detail: { state, pending } — saving / offline / idle
 */
export class PlanStore extends EventTarget {
  plan: PlanData | null = null;
  manifest: Manifest | null = null;
  syncState: SyncState = 'idle';

  private confirmed: BlockMap = new Map();
  private view: BlockMap = new Map();
  private pending: Command[] = [];
  private inflight: Command[] = [];
  private flushScheduled = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private destroyed = false;
  private readonly storage: PlanStoreOptions['storage'];
  private readonly retry: { base: number; max: number };
  private readonly onOnline = () => this.retryNow();

  constructor(private readonly options: PlanStoreOptions) {
    super();
    this.storage = options.storage !== undefined ? options.storage : safeLocalStorage();
    this.retry = options.retry ?? { base: 1000, max: 30000 };
    if (typeof window !== 'undefined') window.addEventListener('online', this.onOnline);
  }

  async load(): Promise<void> {
    const [response, manifest] = await Promise.all([this.options.transport.loadPlan(), this.options.transport.loadManifest()]);
    this.hydrate({ ...response, manifest });
  }

  /**
   * Start from data the server already put in the page (e.g. by the Blade
   * component), without any requests.
   */
  hydrate(data: PlanResponse & { manifest: Manifest }): void {
    this.plan = data.plan;
    this.manifest = data.manifest;
    this.confirmed = new Map(data.blocks.map((b) => [b.id, b]));
    this.pending = this.restoreQueue();
    this.recompute();
    this.emit('change');
    if (this.pending.length) this.scheduleFlush();
  }

  /**
   * Fetch the plan again (e.g. after it changed elsewhere), keeping any
   * unsent local changes on top.
   */
  async reload(): Promise<void> {
    const [response, manifest] = await Promise.all([this.options.transport.loadPlan(), this.options.transport.loadManifest()]);
    if (this.destroyed) return;
    this.plan = response.plan;
    this.manifest = manifest;
    this.confirmed = new Map(response.blocks.map((b) => [b.id, b]));
    this.recompute();
    this.emit('change');
  }

  destroy(): void {
    this.destroyed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (typeof window !== 'undefined') window.removeEventListener('online', this.onOnline);
  }

  // ---- Subscribing (framework adapters) --------------------------------

  private snapshotCache: PlanSnapshot | null = null;

  /**
   * Calls `listener` whenever state or sync status changes. Returns an
   * unsubscribe function. Shape matches React's useSyncExternalStore.
   */
  subscribe(listener: () => void): () => void {
    this.addEventListener('change', listener);
    this.addEventListener('sync', listener);
    return () => {
      this.removeEventListener('change', listener);
      this.removeEventListener('sync', listener);
    };
  }

  /** An immutable view of the state; a new object only after a change. */
  getSnapshot(): PlanSnapshot {
    return (this.snapshotCache ??= {
      plan: this.plan,
      blocks: this.all(),
      syncState: this.syncState,
      pendingCount: this.pendingCount,
    });
  }

  // ---- Reading ---------------------------------------------------------

  get version(): number {
    return this.plan?.version ?? 0;
  }

  get pendingCount(): number {
    return this.pending.length + this.inflight.length;
  }

  get(id: BlockId): BlockData | undefined {
    return this.view.get(id);
  }

  all(): BlockData[] {
    return [...this.view.values()];
  }

  /** Ordered children; null for the plan's top level. */
  children(parent: BlockId | null): BlockData[] {
    return childrenOf(this.view, parent);
  }

  /** A link's source, or the block itself. Use it to show a link's state. */
  resolve(id: BlockId): BlockData | undefined {
    return resolve(this.view, id);
  }

  type(key: string): TypeManifest | undefined {
    return this.manifest?.types[key];
  }

  // ---- Commands --------------------------------------------------------

  create(type: string, options: CreateOptions = {}): BlockId {
    const id = options.id ?? ulid();
    this.dispatch('create', id, {
      type,
      parent: options.parent ?? null,
      after: options.after ?? null,
      payload: options.payload ?? {},
      ...(options.attachable ? { attachable: options.attachable } : {}),
    });
    return id;
  }

  link(source: BlockId, parent: BlockId, after: BlockId | null = null): BlockId {
    const id = ulid();
    this.dispatch('link', id, { source, parent, after });
    return id;
  }

  update(id: BlockId, payload: Record<string, unknown>): void {
    this.dispatch('update', id, { payload });
  }

  move(id: BlockId, options: MoveOptions): void {
    this.dispatch('move', id, 'parent' in options ? { parent: options.parent ?? null, after: options.after } : { after: options.after });
  }

  check(id: BlockId): void {
    this.dispatch('check', id);
  }

  uncheck(id: BlockId): void {
    this.dispatch('uncheck', id);
  }

  /** Sets checked state explicitly (sends check or uncheck, never a toggle). */
  setChecked(id: BlockId, checked: boolean): void {
    this.dispatch(checked ? 'check' : 'uncheck', id);
  }

  checkAll(dayId: BlockId): void {
    this.dispatch('check_all', dayId);
  }

  uncheckAll(dayId: BlockId): void {
    this.dispatch('uncheck_all', dayId);
  }

  exclude(id: BlockId): void {
    this.dispatch('exclude', id);
  }

  include(id: BlockId): void {
    this.dispatch('include', id);
  }

  delete(id: BlockId): void {
    this.dispatch('delete', id);
  }

  restore(id: BlockId): void {
    this.dispatch('restore', id);
  }

  /** What deleting a block would also remove (links elsewhere). */
  deleteImpact(id: BlockId): Promise<DeleteImpact> {
    return this.options.transport.deleteImpact(id);
  }

  /** Sends queued commands now instead of on the next tick. */
  async flush(): Promise<void> {
    this.flushScheduled = false;
    if (this.destroyed || !this.plan || this.inflight.length || !this.pending.length) return;

    this.inflight = this.pending.splice(0);
    this.setSync('saving');

    let result: CommandSuccess;
    try {
      result = await this.options.transport.send(this.version, this.inflight);
    } catch (error) {
      if (error instanceof RejectedError) {
        this.handleRejection(error.error);
      } else {
        this.handleNetworkError(error);
      }
      return;
    }

    this.applyResult(result);
    this.inflight = [];
    this.retryAttempt = 0;
    this.persistQueue();
    this.recompute();
    this.emit('change');

    if (this.pending.length) {
      await this.flush();
    } else {
      this.setSync('idle');
    }
  }

  // ---- Internals -------------------------------------------------------

  private dispatch(type: CommandType, block: BlockId, args?: Record<string, unknown>): void {
    const command: Command = { id: ulid(), type, block, ...(args ? { args } : {}) };
    this.pending.push(command);
    this.persistQueue();
    applyCommand(this.view, command, this.manifest);
    this.emit('change');
    this.emit('command', { command });
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushScheduled || this.retryTimer) return;
    this.flushScheduled = true;
    // Commands issued in the same tick go out as one batch.
    queueMicrotask(() => void this.flush());
  }

  private applyResult(result: CommandSuccess): void {
    if (result.full) {
      this.confirmed = new Map(result.blocks.map((b) => [b.id, b]));
    } else {
      for (const block of result.blocks) this.confirmed.set(block.id, block);
      for (const id of result.deleted) this.confirmed.delete(id);
    }
    if (this.plan) this.plan = { ...this.plan, version: result.version };
  }

  /**
   * The whole batch was rolled back on the server. Drop the failing command
   * and resend the rest, so one bad command does not undo unrelated work.
   */
  private handleRejection(error: CommandError): void {
    const batch = this.inflight;
    this.inflight = [];

    // Signed out or session expired: keep the work queued (and saved) so it
    // is sent after the user signs in again or reloads. No auto-retry.
    if (error.reason === 'unauthenticated' || error.reason === 'session_expired') {
      this.pending = [...batch, ...this.pending];
      this.persistQueue();
      this.setSync('offline', error.message);
      this.emit('error', { error, command: null });
      return;
    }

    const failedIndex = batch.findIndex((c) => c.id === error.command);
    const failed = failedIndex >= 0 ? batch[failedIndex] : undefined;
    const retry = failed ? batch.filter((c) => c !== failed) : [];

    this.pending = [...retry, ...this.pending];
    this.persistQueue();
    this.recompute();
    this.emit('change');
    this.emit('error', { error, command: failed ?? null });

    if (this.pending.length) {
      void this.flush();
    } else {
      this.setSync('idle');
    }
  }

  private handleNetworkError(error: unknown): void {
    this.pending = [...this.inflight, ...this.pending];
    this.inflight = [];
    this.persistQueue();
    this.setSync('offline', error instanceof TransportError ? error.message : String(error));

    const delay = Math.min(this.retry.max, this.retry.base * 2 ** this.retryAttempt);
    this.retryAttempt++;
    this.retryTimer = setTimeout(() => this.retryNow(), delay);
  }

  private retryNow(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    void this.flush();
  }

  /** view = confirmed server state + every unconfirmed command, in order. */
  private recompute(): void {
    this.view = new Map(this.confirmed);
    for (const command of [...this.inflight, ...this.pending]) {
      applyCommand(this.view, command, this.manifest);
    }
  }

  private get storageKey(): string | null {
    return this.plan ? `plan-block:queue:${this.plan.id}` : null;
  }

  private persistQueue(): void {
    const key = this.storageKey;
    if (!this.storage || !key) return;
    const queue = [...this.inflight, ...this.pending];
    try {
      if (queue.length) this.storage.setItem(key, JSON.stringify(queue));
      else this.storage.removeItem(key);
    } catch {
      // storage full or blocked: the queue still lives in memory
    }
  }

  private restoreQueue(): Command[] {
    const key = this.storageKey;
    if (!this.storage || !key) return [];
    try {
      const saved = JSON.parse(this.storage.getItem(key) ?? '[]');
      return Array.isArray(saved) ? (saved as Command[]) : [];
    } catch {
      return [];
    }
  }

  private setSync(state: SyncState, message?: string): void {
    this.syncState = state;
    this.emit('sync', { state, pending: this.pendingCount, message });
  }

  private emit(type: string, detail: Record<string, unknown> = {}): void {
    if (type === 'change' || type === 'sync') this.snapshotCache = null;
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export interface PlanSnapshot {
  plan: PlanData | null;
  blocks: BlockData[];
  syncState: SyncState;
  pendingCount: number;
}

/** Plan, blocks and manifest as embedded by the server (Blade, Inertia props). */
export type InitialData = PlanResponse & { manifest: Manifest };

export interface CreatePlanStoreOptions {
  /** Plan ULID (needed for the HTTP transport). */
  plan?: string;
  /** API route prefix. Default "/plan-block". */
  endpoint?: string;
  /** Custom transport; overrides plan/endpoint. */
  transport?: Transport;
  storage?: PlanStoreOptions['storage'];
}

/** A store using the given transport, or the JSON API for `plan`. */
export function createPlanStore(options: CreatePlanStoreOptions): PlanStore {
  const transport =
    options.transport ??
    new HttpTransport({
      endpoint: options.endpoint ?? '/plan-block',
      plan: options.plan ?? '',
    });

  if (!options.transport && !options.plan) {
    throw new Error('createPlanStore needs a plan ULID or a transport.');
  }

  return new PlanStore({ transport, ...(options.storage !== undefined ? { storage: options.storage } : {}) });
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
