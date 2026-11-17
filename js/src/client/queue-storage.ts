import type { Command } from './types';
import { ulid } from './ulid';

/** What the queue needs from localStorage (or a test double). */
export type QueueBackend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key'> & { readonly length: number };

/** The part of navigator.locks (Web Locks API) used here. */
export interface LockManagerLike {
  request(name: string, callback: () => Promise<unknown>): Promise<unknown>;
  query(): Promise<{ held?: Array<{ name?: string }>; pending?: Array<{ name?: string }> }>;
}

interface Entry {
  v: 2;
  /** Last time the owning editor wrote; used only without Web Locks. */
  heartbeat: number;
  commands: Command[];
}

export interface QueueStorageOptions {
  /** Without Web Locks, an entry not refreshed for this long belongs to a closed editor. */
  staleMs: number;
  locks: LockManagerLike | null;
}

/**
 * Saves one editor's unsent commands so they survive a reload, and picks up
 * commands left behind by editors that are gone.
 *
 * Every editor writes only its own entry (plan-block:queue:{plan}:{editor}),
 * so two tabs or two editors on one page never overwrite each other. An
 * editor counts as alive while it holds its Web Lock (kept even by throttled
 * background tabs); without Web Locks, while its entry's heartbeat is fresh.
 * Adoption runs under a shared lock, so two tabs starting at once do not
 * both take the same leftovers.
 */
export class QueueStorage {
  readonly editorId = ulid();
  private releaseLock: (() => void) | null = null;
  private stopped = false;

  constructor(
    private readonly backend: QueueBackend,
    private readonly planId: string,
    private readonly options: QueueStorageOptions,
  ) {}

  private get prefix(): string {
    return `plan-block:queue:${this.planId}:`;
  }

  private get ownKey(): string {
    return this.prefix + this.editorId;
  }

  /** Before v2 all editors of a plan shared this key. */
  private get legacyKey(): string {
    return `plan-block:queue:${this.planId}`;
  }

  /** Hold this editor's lock for as long as it lives. */
  start(): void {
    this.options.locks
      ?.request(lockName(this.planId, this.editorId), () => new Promise<void>((resolve) => (this.releaseLock = resolve)))
      .catch(() => {});
  }

  /**
   * Stop writing and release the lock. Anything still saved is picked up and
   * sent by another editor of the same plan (now or on the next page load).
   */
  stop(): void {
    this.stopped = true;
    this.releaseLock?.();
    this.releaseLock = null;
  }

  save(commands: Command[]): void {
    if (this.stopped) return;
    try {
      if (commands.length) {
        const entry: Entry = { v: 2, heartbeat: Date.now(), commands };
        this.backend.setItem(this.ownKey, JSON.stringify(entry));
      } else {
        this.backend.removeItem(this.ownKey);
      }
    } catch {
      // Storage full or blocked: the queue still lives in memory.
    }
  }

  /** Commands left by editors that are gone; their entries are removed. */
  async adoptOrphans(): Promise<Command[]> {
    const run = async (): Promise<Command[]> => {
      const alive = await this.liveEditors();
      const adopted: Command[] = [];

      for (const key of this.keys()) {
        if (key === this.ownKey) continue;

        const legacy = key === this.legacyKey;
        if (!legacy && !key.startsWith(this.prefix)) continue;

        const entry = parse(this.backend.getItem(key));
        const owner = legacy ? null : key.slice(this.prefix.length);

        if (entry && owner !== null) {
          const isAlive = alive ? alive.has(lockName(this.planId, owner)) : Date.now() - entry.heartbeat < this.options.staleMs;
          if (isAlive) continue;
        }

        if (entry) adopted.push(...entry.commands);
        try {
          this.backend.removeItem(key);
        } catch {
          // ignore
        }
      }

      return adopted;
    };

    if (this.stopped) return [];
    const locks = this.options.locks;
    if (!locks) return run();

    try {
      return (await locks.request(`plan-block:adopt:${this.planId}`, run)) as Command[];
    } catch {
      return [];
    }
  }

  /** Lock names of live editors, or null without Web Locks. */
  private async liveEditors(): Promise<Set<string> | null> {
    const locks = this.options.locks;
    if (!locks) return null;
    const state = await locks.query();
    // A lock still being requested also means its editor is alive.
    return new Set([...(state.held ?? []), ...(state.pending ?? [])].map((l) => l.name ?? ''));
  }

  private keys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < this.backend.length; i++) {
        const key = this.backend.key(i);
        if (key !== null) keys.push(key);
      }
    } catch {
      // ignore
    }
    return keys;
  }
}

function lockName(planId: string, editorId: string): string {
  return `plan-block:editor:${planId}:${editorId}`;
}

/** Accepts the v2 entry and the old plain-array format. */
function parse(raw: string | null): Entry | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return { v: 2, heartbeat: 0, commands: data as Command[] };
    if (data && Array.isArray(data.commands)) return data as Entry;
  } catch {
    // corrupt: treat as empty
  }
  return null;
}

export function defaultLocks(): LockManagerLike | null {
  try {
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManagerLike }).locks : undefined;
    return locks && typeof locks.request === 'function' && typeof locks.query === 'function' ? locks : null;
  } catch {
    return null;
  }
}
