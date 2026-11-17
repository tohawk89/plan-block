import { RejectedError, TransportError } from '../src/client/transport';
import type { CommandSuccess } from '../src/client/types';
import { deferred, FakeTransport, ids, makeStore, MemoryStorage, planResponse, settle } from './helpers';

describe('PlanStore', () => {
  it('loads the plan and orders children', async () => {
    const { store } = await makeStore();

    expect(store.plan?.title).toBe('Trip to JB');
    expect(store.children(null).map((b) => b.id)).toEqual([ids.day1, ids.pool, ids.day2]);
    expect(store.children(ids.day1).map((b) => b.id)).toEqual([ids.breakfast, ids.lunch, ids.note]);
    expect(store.resolve(ids.link)?.id).toBe(ids.museum);
  });

  it('applies commands immediately and batches same-tick commands into one request', async () => {
    const { store, transport } = await makeStore();
    const reply = deferred<CommandSuccess>();
    transport.handler = () => reply.promise;

    store.check(ids.breakfast);
    store.include(ids.lunch);

    expect(store.get(ids.breakfast)?.checked).toBe(true);
    expect(store.get(ids.lunch)?.excluded).toBe(false);

    await settle();
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]!.commands.map((c) => c.type)).toEqual(['check', 'include']);
    expect(transport.sent[0]!.baseVersion).toBe(12);
    expect(store.syncState).toBe('saving');

    reply.resolve({ ok: true, version: 14, full: false, blocks: [], deleted: [] });
    await settle();
    expect(store.version).toBe(14);
    expect(store.syncState).toBe('idle');
  });

  it('takes derived values like day progress from the server response', async () => {
    const { store, transport } = await makeStore();
    const day1 = { ...store.get(ids.day1)!, progress: { state: 'some' as const, done: 1, total: 2 }, done: false };
    transport.handler = async () => ({ ok: true, version: 13, full: false, blocks: [day1], deleted: [] });

    store.include(ids.lunch);
    await settle();

    expect(store.get(ids.day1)?.progress).toEqual({ state: 'some', done: 1, total: 2 });
  });

  it('checks the source when a link is checked', async () => {
    const { store } = await makeStore();
    store.uncheck(ids.link);

    expect(store.get(ids.museum)?.checked).toBe(false);
    expect(store.resolve(ids.link)?.checked).toBe(false);
  });

  it('rolls back a rejected command, reports it, and resends the rest of the batch', async () => {
    const { store, transport } = await makeStore();
    const errors: unknown[] = [];
    store.addEventListener('error', (e) => errors.push((e as CustomEvent).detail.error));

    const accept = transport.handler;
    transport.handler = async (base, commands) => {
      const bad = commands.find((c) => c.type === 'check' && c.block === ids.lunch);
      if (bad) throw new RejectedError({ command: bad.id, reason: 'not_booked', message: 'Book it first.' });
      return accept(base, commands);
    };

    store.check(ids.lunch);
    store.check(ids.breakfast);
    expect(store.get(ids.lunch)?.checked).toBe(true);

    await settle();

    expect(store.get(ids.lunch)?.checked).toBe(false);
    expect(store.get(ids.breakfast)?.checked).toBe(true);
    expect(errors).toEqual([{ command: expect.any(String), reason: 'not_booked', message: 'Book it first.' }]);
    expect(transport.sent.map((s) => s.commands.length)).toEqual([2, 1]);
  });

  it('keeps commands on network errors, saves them, and retries', async () => {
    const storage = new MemoryStorage();
    const { store, transport } = await makeStore(new FakeTransport(), storage);
    let fail = true;
    transport.handler = async (base, commands) => {
      if (fail) throw new TransportError('offline');
      return { ok: true, version: base + commands.length, full: false, blocks: [], deleted: [] };
    };

    store.check(ids.breakfast);
    await settle();

    expect(store.syncState).toBe('offline');
    expect(store.get(ids.breakfast)?.checked).toBe(true);
    expect(JSON.parse(storage.getItem(`plan-block:queue:${store.plan!.id}`)!)).toHaveLength(1);

    fail = false;
    await settle(20);

    expect(store.syncState).toBe('idle');
    expect(store.pendingCount).toBe(0);
    expect(storage.getItem(`plan-block:queue:${store.plan!.id}`)).toBeNull();
  });

  it('sends commands saved by a previous page load', async () => {
    const storage = new MemoryStorage();
    storage.setItem('plan-block:queue:01jd00000000000000000000p1', JSON.stringify([{ id: 'x1', type: 'check', block: ids.breakfast }]));

    const { store, transport } = await makeStore(new FakeTransport(), storage);
    expect(store.get(ids.breakfast)?.checked).toBe(true);

    await settle();
    expect(transport.sent[0]?.commands).toEqual([{ id: 'x1', type: 'check', block: ids.breakfast }]);
  });

  it('keeps work queued when the session expired', async () => {
    const storage = new MemoryStorage();
    const { store, transport } = await makeStore(new FakeTransport(), storage);
    transport.handler = async () => {
      throw new RejectedError({ reason: 'session_expired', message: 'Reload.' });
    };

    store.check(ids.breakfast);
    await settle();

    expect(store.syncState).toBe('offline');
    expect(store.get(ids.breakfast)?.checked).toBe(true);
    expect(storage.getItem(`plan-block:queue:${store.plan!.id}`)).not.toBeNull();
  });

  it('replaces everything when the server says the client was stale', async () => {
    const { store, transport } = await makeStore();
    const fresh = planResponse().blocks.filter((b) => b.id !== ids.note);
    transport.handler = async () => ({ ok: true, version: 20, full: true, blocks: fresh, deleted: [] });

    store.check(ids.breakfast);
    await settle();

    expect(store.get(ids.note)).toBeUndefined();
    expect(store.version).toBe(20);
  });

  it('creates blocks with client ids that later commands can use', async () => {
    const { store, transport } = await makeStore();
    const id = store.create('place', { parent: ids.day2, after: ids.link, payload: { name: 'Dinner' } });
    store.check(id);

    expect(id).toMatch(/^[0-9a-hjkmnp-tv-z]{26}$/);
    expect(store.children(ids.day2).map((b) => b.id)).toEqual([ids.link, id]);
    expect(store.get(id)?.checked).toBe(true);

    await settle();
    expect(transport.sent[0]!.commands.map((c) => [c.type, c.block])).toEqual([
      ['create', id],
      ['check', id],
    ]);
  });
});
