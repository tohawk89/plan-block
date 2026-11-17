import '../src/web-component';
import { connectRealtime, echoSource, type EchoLike, type RealtimeSource } from '../src/client/realtime';
import { PlanStore } from '../src/client/store';
import type { BlockData, RemoteChange } from '../src/client/types';
import type { PlanBlockElement } from '../src/web-component/element';
import { FakeTransport, ids, manifest, planResponse, settle } from './helpers';

const PLAN = '01jd00000000000000000000p1';

function data(realtime = true) {
  const m = manifest();
  m.realtime = { enabled: realtime, channel_prefix: 'plan-block.plans.', event: 'plan-block.changed' };
  return { ...planResponse(), manifest: m };
}

function storeWith(transport = new FakeTransport(), realtime = true) {
  const store = new PlanStore({ transport, storage: null });
  store.hydrate(data(realtime));
  return store;
}

const block = (store: PlanStore, id: string, changes: Partial<BlockData>): BlockData => ({ ...store.get(id)!, ...changes });

/** A source the test can push messages into. */
class FakeSource implements RealtimeSource {
  channels: string[] = [];
  push: ((c: RemoteChange) => void) | null = null;
  reconnect: (() => void) | null = null;
  stopped = 0;

  subscribe(channel: string, _event: string, onMessage: (c: RemoteChange) => void, onReconnect: () => void) {
    this.channels.push(channel);
    this.push = onMessage;
    this.reconnect = onReconnect;
    return () => this.stopped++;
  }
}

describe('store.applyRemote', () => {
  it('applies the next version directly', () => {
    const store = storeWith();
    const result = store.applyRemote({
      plan: PLAN,
      version: 13,
      previous_version: 12,
      blocks: [block(store, ids.lunch, { checked: true, excluded: false })],
      deleted: [ids.note],
    });

    expect(result).toBe('applied');
    expect(store.version).toBe(13);
    expect(store.get(ids.lunch)?.checked).toBe(true);
    expect(store.get(ids.note)).toBeUndefined();
  });

  it('ignores versions it already has and other plans', () => {
    const store = storeWith();
    expect(store.applyRemote({ plan: PLAN, version: 12, previous_version: 11, blocks: [] })).toBe('ignored');
    expect(store.applyRemote({ plan: 'someone-else', version: 99, previous_version: 12, blocks: [] })).toBe('ignored');
    expect(store.version).toBe(12);
  });

  it('reloads after a gap or a message without blocks', async () => {
    const transport = new FakeTransport();
    const reloadSpy = vi.spyOn(transport, 'loadPlan');
    const store = storeWith(transport);

    expect(store.applyRemote({ plan: PLAN, version: 15, previous_version: 14, blocks: [] })).toBe('reloading');
    expect(store.applyRemote({ plan: PLAN, version: 13, previous_version: 12 })).toBe('reloading');
    await settle();
    expect(reloadSpy).toHaveBeenCalledTimes(2);
  });

  it('keeps unsent local changes on top of a remote change', async () => {
    const transport = new FakeTransport();
    transport.handler = () => new Promise(() => {}); // our request never returns
    const store = storeWith(transport);
    store.exclude(ids.breakfast);
    await settle();

    store.applyRemote({ plan: PLAN, version: 13, previous_version: 12, blocks: [block(store, ids.breakfast, { checked: true, excluded: false })] });

    expect(store.get(ids.breakfast)).toMatchObject({ checked: true, excluded: true });
  });
});

describe('connectRealtime', () => {
  it('subscribes to the plan channel only when the server has realtime on', () => {
    const on = new FakeSource();
    connectRealtime(storeWith(), on);
    expect(on.channels).toEqual([`plan-block.plans.${PLAN}`]);

    const off = new FakeSource();
    connectRealtime(storeWith(new FakeTransport(), false), off);
    expect(off.channels).toEqual([]);
  });

  it('reloads after a reconnect', async () => {
    const transport = new FakeTransport();
    const reloadSpy = vi.spyOn(transport, 'loadPlan');
    const source = new FakeSource();
    connectRealtime(storeWith(transport), source);

    source.reconnect!();
    await settle();
    expect(reloadSpy).toHaveBeenCalledOnce();
  });
});

describe('echoSource', () => {
  function fakeEcho(state = 'connected') {
    const listeners = new Map<string, (data: unknown) => void>();
    const stateHandlers: Array<(s: { previous: string; current: string }) => void> = [];
    const echo: EchoLike & { emit: (e: string, d: unknown) => void; setState: (p: string, c: string) => void; channel?: string } = {
      private(channel) {
        echo.channel = channel;
        return {
          listen: (event, cb) => listeners.set(event, cb),
          stopListening: (event) => listeners.delete(event),
        };
      },
      connector: {
        pusher: {
          connection: {
            state,
            bind: (_e, cb) => stateHandlers.push(cb),
            unbind: (_e, cb) => stateHandlers.splice(stateHandlers.indexOf(cb as never), 1),
          },
        },
      },
      emit: (e, d) => listeners.get(e)?.(d),
      setState: (previous, current) => stateHandlers.forEach((h) => h({ previous, current })),
    };
    return echo;
  }

  it('listens on the private channel with the dotted event name', () => {
    const echo = fakeEcho();
    const onMessage = vi.fn();
    echoSource(echo).subscribe('plan-block.plans.x', 'plan-block.changed', onMessage, () => {});

    echo.emit('.plan-block.changed', { version: 2 });
    expect(echo.channel).toBe('plan-block.plans.x');
    expect(onMessage).toHaveBeenCalledWith({ version: 2 });
  });

  it('calls onReconnect only after an established connection drops and returns', () => {
    const fresh = fakeEcho('connecting');
    const firstConnect = vi.fn();
    echoSource(fresh).subscribe('c', 'e', () => {}, firstConnect);
    fresh.setState('connecting', 'connected');
    expect(firstConnect).not.toHaveBeenCalled();

    const live = fakeEcho('connected');
    const onReconnect = vi.fn();
    echoSource(live).subscribe('c', 'e', () => {}, onReconnect);
    live.setState('connected', 'unavailable');
    live.setState('unavailable', 'connected');
    expect(onReconnect).toHaveBeenCalledOnce();
  });

  it('stops listening when unsubscribed', () => {
    const echo = fakeEcho();
    const onMessage = vi.fn();
    const stop = echoSource(echo).subscribe('c', 'plan-block.changed', onMessage, () => {});
    stop();
    echo.emit('.plan-block.changed', {});
    expect(onMessage).not.toHaveBeenCalled();
  });
});

describe('<plan-block> live updates', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete (globalThis as { Echo?: unknown }).Echo;
  });

  async function mount(setup?: (el: PlanBlockElement) => void, realtime = true) {
    const el = document.createElement('plan-block') as PlanBlockElement;
    setup?.(el);
    document.body.append(el);
    await el.useStore(new PlanStore({ transport: new FakeTransport(), storage: null }), { initial: data(realtime) });
    await settle();
    return el;
  }

  it('shows changes from other tabs and devices', async () => {
    const source = new FakeSource();
    const el = await mount((e) => (e.realtime = source));

    source.push!({ plan: PLAN, version: 13, previous_version: 12, blocks: [block(el.store!, ids.lunch, { checked: true, excluded: false })] });
    await settle();

    expect(el.querySelector(`[data-pb-key="${ids.lunch}"]`)?.hasAttribute('data-pb-checked')).toBe(true);
  });

  it('uses window.Echo by default, and stops when removed', async () => {
    const subscribe = vi.fn(() => () => {});
    const stopListening = vi.fn();
    (globalThis as { Echo?: EchoLike }).Echo = { private: () => ({ listen: subscribe, stopListening }) };

    const el = await mount();
    expect(subscribe).toHaveBeenCalledWith('.plan-block.changed', expect.any(Function));

    el.remove();
    expect(stopListening).toHaveBeenCalled();
  });

  it('can be turned off', async () => {
    const source = new FakeSource();
    await mount((e) => {
      e.realtime = source;
      e.setAttribute('realtime', 'off');
    });
    expect(source.channels).toEqual([]);

    const other = new FakeSource();
    await mount((e) => (e.realtime = null));
    expect(other.channels).toEqual([]);
  });
});
