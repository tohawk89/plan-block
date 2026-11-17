import { act, createElement, createRef, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PlanBlock, usePlanStore, type PlanBlockHandle } from '../src/react';
import { PlanStore } from '../src/client/store';
import type { PlanBlockElement } from '../src/web-component/element';
import { FakeTransport, ids, manifest, planResponse, settle } from './helpers';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const initial = () => ({ ...planResponse(), manifest: manifest() });

let root: Root | null = null;
let container: HTMLElement;

async function render(element: any) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(StrictMode, null, element)));
  await act(async () => settle());
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('React <PlanBlock>', () => {
  it('starts from `initial` without requests, under StrictMode', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const onReady = vi.fn();
    const ref = createRef<PlanBlockHandle>();

    await render(createElement(PlanBlock, { ref, initial: initial(), transport: new FakeTransport(), onReady, className: 'trip' }));

    const el = container.querySelector('plan-block') as PlanBlockElement;
    expect(el.classList.contains('trip')).toBe(true);
    expect(el.querySelector(`[data-pb-key="${ids.breakfast}"]`)?.textContent).toContain('Breakfast');
    expect(ref.current?.store).toBe(el.store);
    expect(ref.current?.element).toBe(el);
    expect(onReady).toHaveBeenLastCalledWith(el.store);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sets readonly, shadow and no-styles as attributes before connecting', async () => {
    await render(createElement(PlanBlock, { initial: initial(), transport: new FakeTransport(), readonly: true, shadow: true, noStyles: true }));

    const el = container.querySelector('plan-block') as PlanBlockElement;
    expect(el.getAttribute('readonly')).toBe('');
    expect(el.hasAttribute('no-styles')).toBe(true);
    expect(el.shadowRoot?.querySelector(`[data-pb-key="${ids.breakfast}"]`)).not.toBeNull();
    expect(el.shadowRoot?.querySelector('[data-pb-action="delete"]')).toBeNull();
  });

  it('calls onCommand and onError, always with the latest callbacks', async () => {
    const transport = new FakeTransport();
    const first = vi.fn();
    const second = vi.fn();
    const onError = vi.fn();
    const ref = createRef<PlanBlockHandle>();

    await render(createElement(PlanBlock, { ref, initial: initial(), transport, onCommand: first, onError }));
    await act(async () => root!.render(createElement(StrictMode, null, createElement(PlanBlock, { ref, initial: initial(), transport, onCommand: second, onError }))));

    await act(async () => {
      ref.current!.store!.check(ids.breakfast);
      await settle();
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(expect.objectContaining({ type: 'check', block: ids.breakfast }));

    const { RejectedError } = await import('../src/client/transport');
    transport.handler = async (_, commands) => {
      throw new RejectedError({ command: commands[0]!.id, reason: 'nope', message: 'No.' });
    };
    await act(async () => {
      ref.current!.store!.uncheck(ids.breakfast);
      await settle();
    });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'nope' }));
  });

  it('does not destroy a store passed in', async () => {
    const store = new PlanStore({ transport: new FakeTransport(), storage: null });
    const destroy = vi.spyOn(store, 'destroy');

    await render(createElement(PlanBlock, { store, initial: initial() }));
    await act(async () => root!.unmount());
    root = null;

    expect(destroy).not.toHaveBeenCalled();
  });
});

describe('React usePlanStore', () => {
  it('drives a custom UI and re-renders on changes', async () => {
    let api: ReturnType<typeof usePlanStore> | null = null;
    function Custom() {
      api = usePlanStore({ initial: initial(), transport: new FakeTransport(), storage: null });
      const items = api.snapshot?.blocks.filter((b) => b.parent === ids.day1) ?? [];
      return createElement(
        'ul',
        null,
        items.map((b) => createElement('li', { key: b.id, 'data-checked': String(b.checked) }, String(b.payload.name ?? b.payload.text))),
      );
    }

    await render(createElement(Custom));
    expect([...container.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Breakfast', 'Lunch', 'Bring cash']);

    await act(async () => api!.store!.check(ids.lunch));
    expect(container.querySelectorAll('li')[1]!.getAttribute('data-checked')).toBe('true');
  });
});
