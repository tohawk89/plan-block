import '../src/web-component';
import { LivewireTransport, type LivewireWire } from '../src/client/livewire-transport';
import { RejectedError, TransportError } from '../src/client/transport';
import type { PlanBlockElement } from '../src/web-component/element';
import { ids, manifest, planResponse, settle } from './helpers';

function fakeWire(handlers: Record<string, (...args: any[]) => unknown>): LivewireWire & { calls: Array<[string, unknown[]]> } {
  const calls: Array<[string, unknown[]]> = [];
  return {
    calls,
    async $call(method: string, ...params: unknown[]) {
      calls.push([method, params]);
      const handler = handlers[method];
      if (!handler) throw new Error(`no handler for ${method}`);
      return handler(...params);
    },
  };
}

describe('LivewireTransport', () => {
  it('sends commands through $wire.$call("runCommands")', async () => {
    const wire = fakeWire({ runCommands: () => ({ ok: true, version: 13, full: false, blocks: [], deleted: [] }) });
    const transport = new LivewireTransport(wire);

    const result = await transport.send(12, [{ id: 'c1', type: 'check', block: ids.breakfast }]);

    expect(result.version).toBe(13);
    expect(wire.calls).toEqual([['runCommands', [[{ id: 'c1', type: 'check', block: ids.breakfast }], 12]]]);
  });

  it('turns returned rejections into RejectedError', async () => {
    const error = { command: 'c1', reason: 'not_checkable', message: 'No.' };
    const transport = new LivewireTransport(fakeWire({ runCommands: () => ({ ok: false, error }) }));

    await expect(transport.send(1, [])).rejects.toEqual(new RejectedError(error));
  });

  it('maps Livewire request failures: auth problems are final, others retry', async () => {
    const failing = (status: number | null) =>
      new LivewireTransport(
        fakeWire({
          runCommands: () => {
            throw { status, body: '', json: null };
          },
        }),
      );

    await expect(failing(419).send(1, [])).rejects.toMatchObject({ error: { reason: 'session_expired' } });
    await expect(failing(403).send(1, [])).rejects.toBeInstanceOf(RejectedError);
    await expect(failing(500).send(1, [])).rejects.toBeInstanceOf(TransportError);
    await expect(failing(null).send(1, [])).rejects.toBeInstanceOf(TransportError);
  });

  it('times out when Livewire never answers', async () => {
    const transport = new LivewireTransport(fakeWire({ runCommands: () => new Promise(() => {}) }), 20);

    await expect(transport.send(1, [])).rejects.toBeInstanceOf(TransportError);
  });

  it('loads plan and manifest with a single planData call', async () => {
    const wire = fakeWire({ planData: () => ({ ...planResponse(), manifest: manifest() }) });
    const transport = new LivewireTransport(wire);

    const [plan, m] = await Promise.all([transport.loadPlan(), transport.loadManifest()]);

    expect(plan.plan.id).toBe('01jd00000000000000000000p1');
    expect(Object.keys(m.types)).toContain('place');
    expect(wire.calls.map(([method]) => method)).toEqual(['planData']);
  });

  it('waits for $wire when given a resolver', async () => {
    let resolveWire!: (wire: LivewireWire) => void;
    const transport = new LivewireTransport(() => new Promise((resolve) => (resolveWire = resolve)));
    const sending = transport.send(1, []);

    resolveWire(fakeWire({ runCommands: () => ({ ok: true, version: 2, full: false, blocks: [], deleted: [] }) }));

    await expect(sending).resolves.toMatchObject({ version: 2 });
  });
});

describe('<plan-block transport="livewire">', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).Livewire;
    localStorage.clear();
  });

  function mountInLivewire(wireId = 'lw-1') {
    const host = document.createElement('div');
    host.setAttribute('wire:id', wireId);
    host.innerHTML =
      `<plan-block plan="01jd00000000000000000000p1" transport="livewire">` +
      `<script type="application/json" data-pb-initial>${JSON.stringify({ ...planResponse(), manifest: manifest() })}</script>` +
      `</plan-block>`;
    document.body.append(host);
    return host.querySelector('plan-block') as PlanBlockElement;
  }

  it('renders from embedded data before Livewire starts, then sends through $wire', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const el = mountInLivewire();
    await settle();

    // Livewire not started yet: the editor already works locally.
    expect(el.querySelector(`[data-pb-key="${ids.breakfast}"]`)).not.toBeNull();
    el.store!.check(ids.breakfast);
    await settle();

    const wire = fakeWire({ runCommands: (commands: unknown[], base: number) => ({ ok: true, version: base + commands.length, full: false, blocks: [], deleted: [] }) });
    (window as any).Livewire = { find: (id: string) => (id === 'lw-1' ? wire : undefined) };
    await settle(60);

    expect(wire.calls[0]?.[0]).toBe('runCommands');
    expect(el.store!.version).toBe(13);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reloads when the server dispatches plan-block-refresh for this plan', async () => {
    const changed = planResponse();
    changed.blocks = changed.blocks.filter((b) => b.id !== ids.note);
    const wire = fakeWire({ planData: () => ({ ...changed, manifest: manifest() }) });
    (window as any).Livewire = { find: () => wire };

    const el = mountInLivewire();
    await settle();
    expect(el.store!.get(ids.note)).toBeDefined();

    window.dispatchEvent(new CustomEvent('plan-block-refresh', { detail: { plan: 'someone-else' } }));
    await settle();
    expect(wire.calls).toHaveLength(0);

    window.dispatchEvent(new CustomEvent('plan-block-refresh', { detail: { plan: '01jd00000000000000000000p1' } }));
    await settle();
    expect(el.store!.get(ids.note)).toBeUndefined();
  });
});
