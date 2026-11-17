import { createApp, defineComponent, h, nextTick } from 'vue';
import { PlanBlock, usePlanSnapshot, usePlanStore } from '../src/vue';
import { PlanStore } from '../src/client/store';
import type { PlanBlockElement } from '../src/web-component/element';
import { FakeTransport, ids, manifest, planResponse, settle } from './helpers';

const initial = () => ({ ...planResponse(), manifest: manifest() });

function mount(component: any, props: Record<string, unknown> = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(component, props) });
  app.mount(root);
  return { root, app };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Vue <PlanBlock>', () => {
  it('starts from `initial` without requests and emits ready with the store', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const onReady = vi.fn();
    const { root } = mount(PlanBlock, { initial: initial(), transport: new FakeTransport(), onReady });
    await settle();

    const el = root.querySelector('plan-block') as PlanBlockElement;
    expect(el.querySelector(`[data-pb-key="${ids.breakfast}"]`)?.textContent).toContain('Breakfast');
    expect(onReady).toHaveBeenCalledWith(el.store);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sets readonly, shadow and no-styles before the element connects', async () => {
    const { root } = mount(PlanBlock, { initial: initial(), transport: new FakeTransport(), readonly: true, shadow: true, noStyles: true });
    await settle();

    const el = root.querySelector('plan-block') as PlanBlockElement;
    expect(el.hasAttribute('readonly')).toBe(true);
    expect(el.hasAttribute('no-styles')).toBe(true);
    expect(el.shadowRoot?.querySelector(`[data-pb-key="${ids.breakfast}"]`)).not.toBeNull();
    expect(el.shadowRoot?.querySelector('[data-pb-action="delete"]')).toBeNull();
  });

  it('forwards commands and rejections as Vue events', async () => {
    const transport = new FakeTransport();
    const onCommand = vi.fn();
    const onError = vi.fn();
    const { root } = mount(PlanBlock, { initial: initial(), transport, onCommand, onError });
    await settle();
    const store = (root.querySelector('plan-block') as PlanBlockElement).store!;

    store.check(ids.breakfast);
    await settle();
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'check', block: ids.breakfast }));

    const { RejectedError } = await import('../src/client/transport');
    transport.handler = async (_, commands) => {
      throw new RejectedError({ command: commands[0]!.id, reason: 'nope', message: 'No.' });
    };
    store.uncheck(ids.breakfast);
    await settle();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'nope' }));
  });

  it('destroys the store it created on unmount, but not one passed in', async () => {
    const own = mount(PlanBlock, { initial: initial(), transport: new FakeTransport() });
    await settle();
    const created = (own.root.querySelector('plan-block') as PlanBlockElement).store!;
    const destroyCreated = vi.spyOn(created, 'destroy');
    own.app.unmount();
    expect(destroyCreated).toHaveBeenCalled();

    const passed = new PlanStore({ transport: new FakeTransport(), storage: null });
    const destroyPassed = vi.spyOn(passed, 'destroy');
    const theirs = mount(PlanBlock, { store: passed, initial: initial() });
    await settle();
    theirs.app.unmount();
    expect(destroyPassed).not.toHaveBeenCalled();
  });
});

describe('Vue usePlanStore / usePlanSnapshot', () => {
  it('drives a custom UI from the headless store', async () => {
    let api: ReturnType<typeof usePlanStore> | null = null;
    const Custom = defineComponent({
      setup() {
        api = usePlanStore({ initial: initial(), transport: new FakeTransport(), storage: null });
        return () =>
          h(
            'ul',
            api!.snapshot.value?.blocks
              .filter((b) => b.parent === ids.day1)
              .map((b) => h('li', { 'data-checked': String(b.checked) }, String(b.payload.name ?? b.payload.text))),
          );
      },
    });

    const { root, app } = mount(Custom);
    await nextTick();
    expect([...root.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Breakfast', 'Lunch', 'Bring cash']);

    api!.store.value!.check(ids.lunch);
    await nextTick();
    expect(root.querySelectorAll('li')[1]!.getAttribute('data-checked')).toBe('true');

    const destroy = vi.spyOn(api!.store.value!, 'destroy');
    app.unmount();
    expect(destroy).toHaveBeenCalled();
  });

  it('usePlanSnapshot follows an existing store', async () => {
    const store = new PlanStore({ transport: new FakeTransport(), storage: null });
    store.hydrate(initial());
    let snapshot: ReturnType<typeof usePlanSnapshot> | null = null;
    const Probe = defineComponent({
      setup() {
        snapshot = usePlanSnapshot(store);
        return () => h('span', snapshot!.value?.syncState);
      },
    });
    mount(Probe);

    expect(snapshot!.value?.plan?.title).toBe('Trip to JB');
    store.exclude(ids.breakfast);
    expect(snapshot!.value?.blocks.find((b) => b.id === ids.breakfast)?.excluded).toBe(true);
  });
});
