import '../src/web-component';
import type { PlanBlockElement } from '../src/web-component/element';
import { renderer } from '../src/web-component/renderers';
import { FakeTransport, ids, makeStore, manifest, planResponse, settle } from './helpers';

async function mount(options: { readonly?: boolean; transport?: FakeTransport; mode?: 'view' | 'edit' | null } = {}) {
  const { store, transport } = await makeStore(options.transport ?? new FakeTransport(), null);
  const el = document.createElement('plan-block') as PlanBlockElement;
  if (options.readonly) el.setAttribute('readonly', '');
  // Most tests exercise editing; null leaves the mode to the element.
  const mode = options.mode === undefined ? 'edit' : options.mode;
  if (mode) el.setAttribute('mode', mode);
  el.store = store;
  document.body.append(el);
  await settle();
  return { el, store, transport };
}

const q = (el: Element, selector: string) => el.querySelector<HTMLElement>(selector);
const block = (el: Element, id: string, scope = '') => q(el, `[data-pb-key="${scope}${id}"]`)!;

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('<plan-block>', () => {
  it('renders days with numbers and dates, pools and items', async () => {
    const { el } = await mount();

    const day1 = block(el, ids.day1);
    expect(day1.textContent).toContain('Day 1');
    expect(day1.querySelector('.pb-muted')?.textContent).toMatch(/1/);
    expect(block(el, ids.breakfast).textContent).toContain('Breakfast');
    expect(block(el, ids.breakfast).textContent).toContain('done via backup');
    expect(block(el, ids.lunch).hasAttribute('data-pb-excluded')).toBe(true);
    expect(block(el, ids.pool).textContent).toContain('1 of 1 done');
    expect(block(el, ids.day1).querySelector('.pb-progress')?.textContent).toBe('1/1');
  });

  it('shows links with the source state and a badge, mirroring children', async () => {
    const { el } = await mount();
    const link = block(el, ids.link);

    expect(link.dataset.pbType).toBe('place');
    expect(link.hasAttribute('data-pb-link')).toBe(true);
    expect(link.hasAttribute('data-pb-checked')).toBe(true);
    // The original lives in the ideas list.
    expect(link.textContent).toContain('Also in Ideas');
  });

  it('checks a place immediately and sends a check command', async () => {
    const { el, transport } = await mount();
    const events: string[] = [];
    el.addEventListener('plan-block:check', (e) => events.push((e as CustomEvent).detail.id));

    const box = block(el, ids.breakfast).querySelector<HTMLInputElement>('[data-pb-action="toggle-check"]')!;
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();

    expect(block(el, ids.breakfast).hasAttribute('data-pb-checked')).toBe(true);
    expect(transport.sent[0]!.commands[0]).toMatchObject({ type: 'check', block: ids.breakfast });
    expect(events).toEqual([ids.breakfast]);
  });

  it('checking a link checks its source everywhere', async () => {
    const { el } = await mount();
    const box = block(el, ids.link).querySelector<HTMLInputElement>('[data-pb-action="toggle-check"]')!;
    box.checked = false;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();

    expect(block(el, ids.museum).hasAttribute('data-pb-checked')).toBe(false);
    expect(block(el, ids.link).hasAttribute('data-pb-checked')).toBe(false);
  });

  it('uses the day checkbox for check_all / uncheck_all, indeterminate for "some"', async () => {
    const { el, store, transport } = await mount();
    const day1 = { ...store.get(ids.day1)!, progress: { state: 'some' as const, done: 1, total: 2 } };
    transport.handler = async (base, commands) => ({ ok: true, version: base + commands.length, full: false, blocks: [day1], deleted: [] });

    store.include(ids.lunch);
    await settle();

    const box = block(el, ids.day1).querySelector<HTMLInputElement>('[data-pb-action="check-all"]')!;
    expect(box.indeterminate).toBe(true);

    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    expect(transport.sent.at(-1)!.commands[0]).toMatchObject({ type: 'check_all', block: ids.day1 });
  });

  it('adds a place, opens its edit form, and saves changed fields', async () => {
    const { el, store, transport } = await mount();

    q(block(el, ids.day2), '[data-pb-action="add"][data-pb-type="place"]')!.click();
    await settle();

    const created = store.children(ids.day2).at(-1)!;
    expect(created.payload.name).toBe('New place');

    const form = q(block(el, created.id), '[data-pb-form]') as HTMLFormElement;
    expect(form).not.toBeNull();
    (form.elements.namedItem('name') as HTMLInputElement).value = 'Dinner';
    (form.elements.namedItem('time') as HTMLInputElement).value = '19:30';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle();

    expect(store.get(created.id)?.payload).toMatchObject({ name: 'Dinner', time: '19:30' });
    const commands = transport.sent.flatMap((s) => s.commands);
    expect(commands.map((c) => c.type)).toEqual(['create', 'update']);
    expect(commands[1]!.args).toEqual({ payload: { name: 'Dinner', time: '19:30' } });
    expect(q(block(el, created.id), '[data-pb-form]')).toBeNull();
  });

  it('warns before deleting a block that is linked elsewhere, and offers undo', async () => {
    const transport = new FakeTransport();
    transport.impact = { block: ids.museum, descendants: 0, links: [{ id: ids.link, source: ids.museum, parent: ids.day2, parent_type: 'timeline', day: { number: 2, date: '2026-12-02' } }] };
    const { el, transport: t } = await mount({ transport });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    q(block(el, ids.museum), '[data-pb-action="delete"]')!.click();
    await settle();

    expect(confirm).toHaveBeenCalledWith('This also appears in Day 2. Delete it everywhere?');
    expect(q(el, `[data-pb-key="${ids.museum}"]`)).toBeNull();
    expect(q(el, `[data-pb-key="${ids.link}"]`)).toBeNull();

    q(el, '.pb-toast [data-pb-action="restore"]')!.click();
    await settle();
    expect(t.sent.flatMap((s) => s.commands).map((c) => c.type)).toEqual(['delete', 'restore']);
  });

  it('does not delete when the warning is cancelled', async () => {
    const transport = new FakeTransport();
    transport.impact = { block: ids.museum, descendants: 0, links: [{ id: ids.link, source: ids.museum, parent: ids.day2, parent_type: 'timeline', day: { number: 2, date: null } }] };
    const { el } = await mount({ transport });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    q(block(el, ids.museum), '[data-pb-action="delete"]')!.click();
    await settle();

    expect(transport.sent).toHaveLength(0);
  });

  it('moves items with the up/down buttons', async () => {
    const { el, store } = await mount();
    q(block(el, ids.lunch), '[data-pb-action="move-up"]')!.click();
    await settle();

    expect(store.children(ids.day1).map((b) => b.id)).toEqual([ids.lunch, ids.breakfast, ids.note]);
  });

  it('links a pool item into a day from its menu', async () => {
    const { el, store } = await mount();
    const select = q(block(el, ids.museum), 'select[data-pb-action="link"]') as HTMLSelectElement;
    select.value = ids.day1;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();

    const added = store.children(ids.day1).at(-1)!;
    expect(added.type).toBe('link');
    expect(added.source).toBe(ids.museum);
  });

  it('closes the menu after picking an entry', async () => {
    const { el, store } = await mount();
    const menu = q(block(el, ids.lunch), 'details[data-pb-menu]') as HTMLDetailsElement;
    menu.open = true;

    // Lunch starts skipped.
    expect(q(menu, '[data-pb-action="include"]')!.textContent).toBe('Undo skip');
    q(menu, '[data-pb-action="include"]')!.click();
    await settle();

    expect(menu.open).toBe(false);
    expect(store.get(ids.lunch)?.excluded).toBe(false);
    expect(q(block(el, ids.lunch), '[data-pb-action="exclude"]')!.textContent).toBe('Skip');
  });

  it('closes an open menu on a click outside it', async () => {
    const { el } = await mount();
    const menu = q(block(el, ids.lunch), 'details[data-pb-menu]') as HTMLDetailsElement;
    menu.open = true;

    document.body.click();

    expect(menu.open).toBe(false);
  });

  it('groups several add choices under one "+ Add" menu', async () => {
    const { el } = await mount();
    const footer = [...block(el, ids.day2).children].find((c) => c.classList.contains('pb-footer')) as HTMLElement;

    expect(q(footer, 'summary')!.textContent).toBe('+ Add');
    expect([...footer.querySelectorAll('[data-pb-action="add"]')].map((b) => b.textContent)).toEqual(['Place', 'Note']);
  });

  it('hides editing controls when readonly', async () => {
    const { el } = await mount({ readonly: true });

    expect(q(el, '[data-pb-action="delete"]')).toBeNull();
    expect(q(el, '[data-pb-action="add"]')).toBeNull();
    expect(block(el, ids.breakfast).querySelector<HTMLInputElement>('[data-pb-action="toggle-check"]')!.disabled).toBe(true);
    expect(q(el, '[data-pb-action="mode"]')).toBeNull();
    expect(el.mode).toBe('view');
  });

  it('uses custom renderers, still wired to package actions', async () => {
    renderer('note', ({ target, h }) => h('p', { class: 'my-note' }, String(target.payload.text), h('button', { 'data-pb-action': 'delete' }, 'x')));
    const { el, transport } = await mount();

    const note = block(el, ids.note);
    expect(note.tagName).toBe('P');
    expect(note.classList.contains('my-note')).toBe(true);

    q(note, '[data-pb-action="delete"]')!.click();
    await settle();
    expect(transport.sent[0]!.commands[0]).toMatchObject({ type: 'delete', block: ids.note });
  });

  it('keeps unchanged block elements across updates', async () => {
    const { el, store } = await mount();
    const before = block(el, ids.museum);

    store.check(ids.breakfast);
    await settle();

    expect(block(el, ids.museum)).toBe(before);
  });

  it('starts from data embedded by <x-plan-block>, without requests, and replaces the server copy', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const ready = vi.fn();
    const el = document.createElement('plan-block') as PlanBlockElement;
    el.setAttribute('plan', '01jd00000000000000000000p1');
    el.addEventListener('plan-block:ready', ready);
    el.innerHTML =
      `<script type="application/json" data-pb-initial>${JSON.stringify({ ...planResponse(), manifest: manifest() })}</script>` +
      '<div class="pb-root" data-pb-fallback>server copy</div>';

    document.body.append(el);
    await settle();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(ready).toHaveBeenCalledOnce();
    expect(el.textContent).not.toContain('server copy');
    expect(el.querySelector('script[data-pb-initial]')).toBeNull();
    expect(block(el, ids.breakfast).textContent).toContain('Breakfast');
    expect(el.store?.version).toBe(12);
  });

  it('shows a rejected command as an error toast', async () => {
    const transport = new FakeTransport();
    const { el, store } = await mount({ transport });
    transport.handler = async (_, commands) => {
      const { RejectedError } = await import('../src/client/transport');
      throw new RejectedError({ command: commands[0]!.id, reason: 'not_found', message: 'Gone.' });
    };

    store.check(ids.breakfast);
    await settle();

    expect(q(el, '.pb-toast[data-kind="error"]')?.textContent).toContain('Gone.');
  });

  describe('normal and edit modes', () => {
    it('starts a plan with blocks in normal mode: no editing controls, ticking still works', async () => {
      const { el, transport } = await mount({ mode: null });

      expect(el.mode).toBe('view');
      expect(q(el, '[data-pb-action="mode"][data-pb-value="view"]')!.getAttribute('aria-pressed')).toBe('true');
      expect(q(el, '[data-pb-drag-handle]')).toBeNull();
      expect(q(el, '[data-pb-action="add"]')).toBeNull();
      expect(q(el, '[data-pb-menu]')).toBeNull();
      expect(q(block(el, ids.breakfast), '.pb-title')!.tagName).toBe('SPAN');

      const box = block(el, ids.breakfast).querySelector<HTMLInputElement>('[data-pb-action="toggle-check"]')!;
      expect(box.disabled).toBe(false);
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
      expect(transport.sent[0]!.commands[0]).toMatchObject({ type: 'check', block: ids.breakfast });
    });

    it('switches to edit mode, emits plan-block:mode, and remembers it for the plan', async () => {
      const { el, store } = await mount({ mode: null });
      const events: string[] = [];
      el.addEventListener('plan-block:mode', (e) => events.push((e as CustomEvent).detail.mode));

      q(el, '[data-pb-action="mode"][data-pb-value="edit"]')!.click();
      await settle();

      expect(el.mode).toBe('edit');
      expect(events).toEqual(['edit']);
      expect(q(el, '[data-pb-drag-handle]')).not.toBeNull();
      expect(q(el, '.pb-toolbar [data-pb-type="timeline"]')).not.toBeNull();
      expect(q(el, '[data-pb-action="mode"][data-pb-value="edit"]')!.getAttribute('aria-pressed')).toBe('true');
      expect(localStorage.getItem(`plan-block:mode:${store.plan!.id}`)).toBe('edit');

      // Another editor for the same plan starts where the user left off.
      const { el: second } = await mount({ mode: null });
      expect(second.mode).toBe('edit');
    });

    it('closes an open edit form when switching back to normal mode', async () => {
      const { el } = await mount();
      q(block(el, ids.breakfast), '.pb-title')!.click();
      await settle();
      expect(q(block(el, ids.breakfast), '[data-pb-form]')).not.toBeNull();

      el.setAttribute('mode', 'view');
      await settle();

      expect(q(block(el, ids.breakfast), '[data-pb-form]')).toBeNull();
      expect(q(el, '[data-pb-drag-handle]')).toBeNull();
    });

    it('starts an empty plan in edit mode and stays there after the first block', async () => {
      const empty = { ...planResponse(), blocks: [] };
      const { el, store } = await mount({ mode: null, transport: new FakeTransport(empty) });

      expect(el.mode).toBe('edit');
      expect(q(el, '.pb-empty')!.textContent).toContain('Add a day');

      q(el, '.pb-toolbar [data-pb-type="timeline"]')!.click();
      await settle();

      expect(store.children(null)).toHaveLength(1);
      expect(el.mode).toBe('edit');
    });
  });
});
