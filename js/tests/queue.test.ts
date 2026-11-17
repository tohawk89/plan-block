import { PlanStore } from '../src/client/store';
import type { LockManagerLike } from '../src/client/queue-storage';
import { TransportError } from '../src/client/transport';
import { FakeTransport, ids, MemoryStorage, savedQueues, settle } from './helpers';

/** Minimal Web Locks: exclusive, queued per name, visible to query(). */
class FakeLocks implements LockManagerLike {
  held = new Set<string>();
  private tails = new Map<string, Promise<unknown>>();

  request(name: string, callback: () => Promise<unknown>): Promise<unknown> {
    const run = (this.tails.get(name) ?? Promise.resolve()).then(async () => {
      this.held.add(name);
      try {
        return await callback();
      } finally {
        this.held.delete(name);
      }
    });
    this.tails.set(name, run.catch(() => {}));
    return run;
  }

  async query() {
    return { held: [...this.held].map((name) => ({ name })) };
  }
}

/** An "offline" transport: every send fails, so commands stay queued. */
function offline(): FakeTransport {
  const transport = new FakeTransport();
  transport.handler = async () => {
    throw new TransportError('offline');
  };
  return transport;
}

async function editor(storage: MemoryStorage, transport: FakeTransport, locks: LockManagerLike | null = null, staleMs = 60) {
  const store = new PlanStore({
    transport,
    storage,
    retry: { base: 10_000, max: 10_000 },
    persistence: { locks, intervalMs: 20, staleMs },
  });
  await store.load();
  return store;
}

const sentTypes = (t: FakeTransport) => t.sent.flatMap((s) => s.commands.map((c) => `${c.type}:${c.block}`));

describe('unsent changes across tabs and editors', () => {
  it.each([
    ['heartbeat', () => null],
    ['Web Locks', () => new FakeLocks()],
  ])('keeps each live editor’s queue separate (%s)', async (_, locks) => {
    const storage = new MemoryStorage();
    const lockManager = locks();
    const tabA = offline();
    const a = await editor(storage, tabA, lockManager);
    a.check(ids.breakfast);
    await settle();

    // Tab B opens while A is still alive and offline.
    const tabB = new FakeTransport();
    const b = await editor(storage, tabB, lockManager);
    b.check(ids.lunch);
    await settle(30);

    expect(Object.keys(savedQueues(storage))).toHaveLength(1); // only A's (B's was sent)
    expect(Object.values(savedQueues(storage))[0]).toEqual([expect.objectContaining({ type: 'check', block: ids.breakfast })]);
    expect(sentTypes(tabB)).toEqual([`check:${ids.lunch}`]); // B never sent A's work

    a.destroy();
    b.destroy();
  });

  it('a live editor picks up and sends what a closed editor left behind', async () => {
    const storage = new MemoryStorage();
    const locks = new FakeLocks();
    const closing = await editor(storage, offline(), locks);
    closing.check(ids.breakfast);
    closing.exclude(ids.note);
    await settle();

    const tabB = new FakeTransport();
    const b = await editor(storage, tabB, locks);
    await settle(30);
    expect(sentTypes(tabB)).toEqual([]); // first tab still open

    closing.destroy(); // tab closed: lock released, queue left in storage
    await settle(30);

    expect(sentTypes(tabB)).toEqual([`check:${ids.breakfast}`, `exclude:${ids.note}`]);
    expect(b.get(ids.breakfast)?.checked).toBe(true);
    expect(savedQueues(storage)).toEqual({});
    b.destroy();
  });

  it('without Web Locks, adopts entries whose heartbeat went stale', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'plan-block:queue:01jd00000000000000000000p1:01jdclosedtab0000000000000',
      JSON.stringify({ v: 2, heartbeat: Date.now() - 60_000, commands: [{ id: 'old1', type: 'check', block: ids.lunch }] }),
    );
    storage.setItem(
      'plan-block:queue:01jd00000000000000000000p1:01jdlivetab000000000000000',
      JSON.stringify({ v: 2, heartbeat: Date.now(), commands: [{ id: 'live1', type: 'check', block: ids.breakfast }] }),
    );

    // A realistic staleness limit: the "live" entry has no editor refreshing it here.
    const transport = new FakeTransport();
    const store = await editor(storage, transport, null, 30_000);
    await settle();

    expect(sentTypes(transport)).toEqual([`check:${ids.lunch}`]);
    expect(Object.keys(savedQueues(storage))).toEqual(['plan-block:queue:01jd00000000000000000000p1:01jdlivetab000000000000000']);
    store.destroy();
  });

  it('with Web Locks, a held lock means alive even if the heartbeat is old (throttled background tab)', async () => {
    const storage = new MemoryStorage();
    const locks = new FakeLocks();
    const background = await editor(storage, offline(), locks);
    background.check(ids.breakfast);
    await settle();

    // Simulate a long-throttled tab: its heartbeat is ancient, but it still holds its lock.
    for (const [key, value] of storage.items) {
      storage.items.set(key, JSON.stringify({ ...JSON.parse(value), heartbeat: 0 }));
    }

    const transport = new FakeTransport();
    const other = await editor(storage, transport, locks);
    await settle(30);

    expect(sentTypes(transport)).toEqual([]);
    background.destroy();
    other.destroy();
  });

  it('two editors starting at once adopt leftovers only once', async () => {
    const storage = new MemoryStorage();
    const locks = new FakeLocks();
    storage.setItem(
      'plan-block:queue:01jd00000000000000000000p1:01jdclosedtab0000000000000',
      JSON.stringify({ v: 2, heartbeat: 0, commands: [{ id: 'orphan1', type: 'check', block: ids.lunch }] }),
    );

    const t1 = new FakeTransport();
    const t2 = new FakeTransport();
    const [s1, s2] = await Promise.all([editor(storage, t1, locks), editor(storage, t2, locks)]);
    await settle(30);

    expect([...sentTypes(t1), ...sentTypes(t2)]).toEqual([`check:${ids.lunch}`]);
    s1.destroy();
    s2.destroy();
  });

  it('two editors of the same plan on one page do not share a queue', async () => {
    const storage = new MemoryStorage();
    const a = await editor(storage, offline());
    const b = await editor(storage, offline());

    a.check(ids.breakfast);
    b.check(ids.lunch);
    await settle();

    const queues = Object.values(savedQueues(storage));
    expect(queues).toHaveLength(2);
    expect(queues.flat()).toEqual(
      expect.arrayContaining([expect.objectContaining({ block: ids.breakfast }), expect.objectContaining({ block: ids.lunch })]),
    );
    a.destroy();
    b.destroy();
  });
});
