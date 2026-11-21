import '../src/web-component';
import type { PlanStore } from '../src/client/store';
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
    expect([...footer.querySelectorAll('[data-pb-action="add"]')].map((b) => b.textContent)).toEqual([
      'Breakfast',
      'Lunch',
      'Dinner',
      'Activity',
      'Stay',
      'Travel',
      'Other',
      'Place',
      'Note',
    ]);
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

  describe('colours', () => {
    it('gives days turns through the palette and ideas lists gray', async () => {
      const { el } = await mount();

      expect(block(el, ids.day1).dataset.pbColor).toBe('coral');
      expect(block(el, ids.day2).dataset.pbColor).toBe('teal');
      expect(block(el, ids.pool).dataset.pbColor).toBe('gray');
      expect(block(el, ids.breakfast).dataset.pbColor).toBeUndefined();
    });

    it('sets a day colour from its menu in one click', async () => {
      const { el, store, transport } = await mount();
      const swatch = q(block(el, ids.day1), '.pb-menu--actions [data-pb-action="color"][data-pb-color="blue"]')!;
      expect(q(block(el, ids.day1), '[data-pb-action="color"][aria-pressed="true"]')!.dataset.pbColor).toBe('coral');

      swatch.click();
      await settle();

      expect(store.get(ids.day1)?.payload.color).toBe('blue');
      expect(block(el, ids.day1).dataset.pbColor).toBe('blue');
      expect(transport.sent.at(-1)!.commands[0]).toMatchObject({ type: 'update', block: ids.day1, args: { payload: { color: 'blue' } } });
    });

    it('shows the colour as swatches in the edit form, with Auto to go back to the default', async () => {
      const { el, store } = await mount();
      store.update(ids.day1, { color: 'pink' });
      await settle();

      q(block(el, ids.day1), '.pb-menu--actions [data-pb-action="edit"]')!.click();
      await settle();

      const form = q(block(el, ids.day1), '[data-pb-form]') as HTMLFormElement;
      const radios = [...form.querySelectorAll<HTMLInputElement>('input[name="color"]')];
      expect(radios.map((r) => r.value)).toEqual(['', 'coral', 'amber', 'green', 'teal', 'blue', 'purple', 'pink', 'gray']);
      expect(radios.find((r) => r.checked)?.value).toBe('pink');

      radios[0]!.checked = true;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await settle();

      expect(store.get(ids.day1)?.payload.color).toBeNull();
      expect(block(el, ids.day1).dataset.pbColor).toBe('coral');
    });

    it('numbers backups and marks finished days', async () => {
      const { el } = await mount();

      expect(q(block(el, ids.backup), '.pb-badge--backup')!.textContent).toBe('Backup 1');
      // The main place has no badge: the only one inside it is its backup's.
      expect(block(el, ids.breakfast).querySelectorAll('.pb-badge--backup')).toHaveLength(1);
      // Day 1 is 1/1 done in the fixture.
      expect(block(el, ids.day1).hasAttribute('data-pb-complete')).toBe(true);
      expect(q(block(el, ids.day1), '.pb-meter__fill')!.getAttribute('style')).toContain('100%');
    });
  });

  describe('plans with ranked options', () => {
    /** Breakfast on Day 2 with Kedai A (main), B and C. */
    async function breakfast(store: PlanStore) {
      const slot = store.create('slot', { parent: ids.day2, after: store.children(ids.day2).at(-1)?.id ?? null, payload: { category: 'breakfast', time: '08:00' } });
      const a = store.create('place', { parent: slot, after: null, payload: { name: 'Kedai A' } });
      const b = store.create('place', { parent: slot, after: a, payload: { name: 'Kedai B' } });
      const c = store.create('place', { parent: slot, after: b, payload: { name: 'Kedai C' } });
      await settle();
      return { slot, a, b, c };
    }

    const optionNames = (el: Element, slot: string) => [...block(el, slot).querySelectorAll('.pb-children [data-pb-type="place"] .pb-title')].map((t) => t.textContent);
    const ranks = (el: Element, slot: string) => [...block(el, slot).querySelectorAll('.pb-children .pb-badge--main, .pb-children .pb-badge--backup')].map((b) => b.textContent);

    it('adds a plan from the day menu and goes straight to typing places', async () => {
      const { el, store } = await mount();

      q(block(el, ids.day2), '[data-pb-action="add"][data-pb-type="slot"][data-pb-category="breakfast"]')!.click();
      await settle();

      const slot = store.children(ids.day2).at(-1)!;
      expect(slot).toMatchObject({ type: 'slot', payload: { category: 'breakfast', time: '08:00' } });
      const box = q(block(el, slot.id), '[data-pb-action="quick-add"]') as HTMLInputElement;
      expect(document.activeElement).toBe(box);
      expect(box.placeholder).toContain('Where?');

      for (const name of ['Kedai A', 'Kedai B', '  ']) {
        const input = q(block(el, slot.id), '[data-pb-action="quick-add"]') as HTMLInputElement;
        input.value = name;
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await settle();
      }

      expect(store.children(slot.id).map((b) => b.payload.name)).toEqual(['Kedai A', 'Kedai B']);
      expect(document.activeElement).toBe(q(block(el, slot.id), '[data-pb-action="quick-add"]'));
      expect(ranks(el, slot.id)).toEqual(['★ Main', 'Backup 1']);
    });

    it('makes a backup the main choice', async () => {
      const { el, store } = await mount();
      const { slot, c } = await breakfast(store);

      q(block(el, c), '[data-pb-action="make-main"]')!.click();
      await settle();

      expect(optionNames(el, slot)).toEqual(['Kedai C', 'Kedai A', 'Kedai B']);
      expect(ranks(el, slot)).toEqual(['★ Main', 'Backup 1', 'Backup 2']);
      expect(q(block(el, c), '[data-pb-action="make-main"]')).toBeNull();
    });

    it('keeps one choice: ticking an option unticks the others', async () => {
      const { el, store } = await mount();
      const { a, b } = await breakfast(store);
      const tick = (id: string) => {
        const box = block(el, id).querySelector<HTMLInputElement>('[data-pb-action="toggle-check"]')!;
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
      };

      tick(a);
      tick(b);
      await settle();

      expect(store.get(a)?.checked).toBe(false);
      expect(store.get(b)?.checked).toBe(true);
    });

    it('in normal mode shows the main choice, folds the backups, and says which was used', async () => {
      const { el, store } = await mount();
      const { slot, b } = await breakfast(store);
      el.mode = 'view';
      await settle();

      const children = [...block(el, slot).children].find((c) => c.classList.contains('pb-children')) as HTMLElement;
      expect(children.hidden).toBe(true);
      expect(q(block(el, slot), '.pb-slot__summary')!.textContent).toBe('Kedai A');
      expect(q(block(el, slot), '[data-pb-action="quick-add"]')).toBeNull();
      const chip = q(block(el, slot), '[data-pb-action="toggle-expand"]')!;
      expect(chip.textContent).toContain('2 backups');

      chip.click();
      await settle();
      expect(children.hidden).toBe(false);
      expect(q(block(el, slot), '[data-pb-action="toggle-expand"]')!.getAttribute('aria-expanded')).toBe('true');

      store.check(b);
      await settle();
      expect(q(block(el, slot), '.pb-slot__summary')!.textContent).toBe('✓ Went to Kedai B Backup 1');
    });

    it('ticks the main option from the plan checkbox, and clears the choice when unticked', async () => {
      const { el, store } = await mount();
      const { slot, a, c } = await breakfast(store);
      const box = () => block(el, slot).querySelector<HTMLInputElement>('[data-pb-action="toggle-slot"]')!;

      box().checked = true;
      box().dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
      expect(store.get(a)?.checked).toBe(true);

      store.check(c);
      await settle();
      expect(box().checked).toBe(true);

      box().checked = false;
      box().dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
      expect([a, c].map((id) => store.get(id)?.checked)).toEqual([false, false]);
    });

    it('check all on a day ticks each plan\'s main option', async () => {
      const { el, store, transport } = await mount();
      const { a, b } = await breakfast(store);

      const dayBox = block(el, ids.day2).querySelector<HTMLInputElement>('[data-pb-action="check-all"]')!;
      dayBox.checked = true;
      dayBox.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();

      expect(store.get(a)?.checked).toBe(true);
      expect(store.get(b)?.checked).toBe(false);
      expect(transport.sent.at(-1)!.commands[0]).toMatchObject({ type: 'check_all', block: ids.day2 });
    });
  });
});
