import '../src/web-component';
import type { PlanBlockElement } from '../src/web-component/element';
import { FakeTransport, ids, makeStore, settle } from './helpers';

/**
 * happy-dom has no layout, so hit testing and element boxes are stubbed:
 * every block gets a 40px-high box at a fixed top, and elementFromPoint
 * returns whichever element the test says is under the pointer.
 */
async function mount() {
  const { store, transport } = await makeStore(new FakeTransport(), null);
  const el = document.createElement('plan-block') as PlanBlockElement;
  el.store = store;
  document.body.append(el);
  await settle();
  return { el, store, transport };
}

const block = (el: Element, id: string) => el.querySelector<HTMLElement>(`[data-pb-key="${id}"]`)!;
const handle = (el: Element, id: string) => block(el, id).querySelector<HTMLElement>('[data-pb-drag-handle]')!;

function box(target: HTMLElement, top: number, height = 40) {
  target.getBoundingClientRect = () => ({ top, height, left: 0, width: 300, bottom: top + height, right: 300, x: 0, y: top, toJSON() {} }) as DOMRect;
}

let under: Element | null = null;

function pointer(type: string, target: EventTarget, x: number, y: number) {
  target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, cancelable: true }));
}

/** Press on a handle, move over `over` at height y, and release. */
async function dragTo(el: PlanBlockElement, id: string, over: Element, y: number, release = true) {
  pointer('pointerdown', handle(el, id), 10, 0);
  under = over;
  pointer('pointermove', window, 10, y);
  if (release) pointer('pointerup', window, 10, y);
  await settle();
}

beforeEach(() => {
  vi.spyOn(document, 'elementFromPoint').mockImplementation(() => under);
});

afterEach(() => {
  under = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('drag and drop', () => {
  it('reorders within a day, dropping after the lower half of a block', async () => {
    const { el, store, transport } = await mount();
    box(block(el, ids.lunch), 100);

    await dragTo(el, ids.breakfast, block(el, ids.lunch), 130);

    expect(store.children(ids.day1).map((b) => b.id)).toEqual([ids.lunch, ids.breakfast, ids.note]);
    expect(transport.sent[0]!.commands[0]).toMatchObject({ type: 'move', block: ids.breakfast, args: { parent: ids.day1, after: ids.lunch } });
  });

  it('drops before a block over its upper half', async () => {
    const { el, store } = await mount();
    box(block(el, ids.breakfast), 100);

    await dragTo(el, ids.note, block(el, ids.breakfast), 105);

    expect(store.children(ids.day1).map((b) => b.id)).toEqual([ids.note, ids.breakfast, ids.lunch]);
  });

  it('moves a pool item into a day', async () => {
    const { el, store } = await mount();
    box(block(el, ids.link), 300);

    await dragTo(el, ids.museum, block(el, ids.link), 330);

    expect(store.get(ids.museum)?.parent).toBe(ids.day2);
    expect(store.children(ids.day2).map((b) => b.id)).toEqual([ids.link, ids.museum]);
  });

  it('drops a backup inside another place', async () => {
    const { el, store } = await mount();
    const lunchTitle = block(el, ids.lunch).querySelector('.pb-title')!;

    await dragTo(el, ids.backup, lunchTitle, 50);

    expect(store.get(ids.backup)?.parent).toBe(ids.lunch);
  });

  it('only moves days and pools at the top level', async () => {
    const { el, store } = await mount();
    box(block(el, ids.pool), 200);

    // Pointer over a place inside the pool: the nearest valid spot is next to the pool.
    // Upper half of the pool: before it.
    await dragTo(el, ids.day2, block(el, ids.museum), 205);

    expect(store.children(null).map((b) => b.id)).toEqual([ids.day1, ids.day2, ids.pool]);
  });

  it('shows where the block will land, and cancels with Escape', async () => {
    const { el, store, transport } = await mount();
    box(block(el, ids.lunch), 100);

    await dragTo(el, ids.breakfast, block(el, ids.lunch), 130, false);

    expect(block(el, ids.lunch).dataset.pbDrop).toBe('after');
    expect(block(el, ids.breakfast).hasAttribute('data-pb-dragging')).toBe(true);
    expect(el.querySelector('.pb-drag-ghost')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    pointer('pointerup', window, 10, 130);
    await settle();

    expect(block(el, ids.lunch).hasAttribute('data-pb-drop')).toBe(false);
    expect(el.querySelector('.pb-drag-ghost')).toBeNull();
    expect(store.children(ids.day1).map((b) => b.id)).toEqual([ids.breakfast, ids.lunch, ids.note]);
    expect(transport.sent).toHaveLength(0);
  });

  it('ignores a press without movement (a click is not a drag)', async () => {
    const { el, transport } = await mount();

    pointer('pointerdown', handle(el, ids.breakfast), 10, 0);
    pointer('pointerup', window, 11, 1);
    await settle();

    expect(transport.sent).toHaveLength(0);
  });

  it('does nothing when dropped on itself', async () => {
    const { el, transport } = await mount();

    await dragTo(el, ids.breakfast, block(el, ids.backup), 50);

    expect(transport.sent).toHaveLength(0);
  });

  it('moves with arrow keys on a focused handle, keeping focus', async () => {
    const { el, store } = await mount();
    const h = handle(el, ids.lunch);
    h.focus();

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    await settle();

    expect(store.children(ids.day1).map((b) => b.id)).toEqual([ids.lunch, ids.breakfast, ids.note]);
    expect(document.activeElement).toBe(handle(el, ids.lunch));
  });

  it('has no handles when readonly', async () => {
    const { store } = await makeStore(new FakeTransport(), null);
    const el = document.createElement('plan-block') as PlanBlockElement;
    el.setAttribute('readonly', '');
    el.store = store;
    document.body.append(el);
    await settle();

    expect(el.querySelector('[data-pb-drag-handle]')).toBeNull();
  });
});
