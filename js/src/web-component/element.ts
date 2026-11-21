import { PlanStore, type InitialData } from '../client/store';
import { LivewireTransport, type LivewireWire } from '../client/livewire-transport';
import { connectRealtime, echoSource, type EchoLike, type RealtimeSource } from '../client/realtime';
import { HttpTransport, type Transport } from '../client/transport';
import type { BlockData, CommandError, FieldManifest, Manifest, PlanResponse } from '../client/types';
import { h } from './h';
import { DragController, type DragHost } from './drag';
import { defaultLabels, type Labels } from './labels';
import { parts, rendererFor, type RenderContext } from './renderers';
import css from './styles.css';

interface CacheEntry {
  signature: string;
  el: HTMLElement;
  children: HTMLElement;
}

interface Toast {
  message: string;
  kind: 'info' | 'error';
  action?: { label: string; name: string; id: string };
}

let documentStylesAdopted = false;

/**
 * <plan-block plan="01J..." endpoint="/plan-block"></plan-block>
 *
 * Attributes: plan, endpoint (default "/plan-block"), readonly, mode
 * ("view" or "edit": the starting mode), shadow (render in Shadow DOM),
 * no-styles (skip the default stylesheet).
 * Properties: store (inject your own PlanStore), labels (override strings),
 * mode (current mode; setting it switches and remembers it for this plan).
 *
 * Emits (bubbling, composed): plan-block:<command> (e.g. plan-block:check,
 * plan-block:check-all, plan-block:delete), plan-block:error, plan-block:sync,
 * plan-block:ready, plan-block:mode.
 */
export class PlanBlockElement extends HTMLElement {
  static observedAttributes = ['plan', 'endpoint', 'readonly', 'mode'];

  private _store: PlanStore | null = null;
  private ownsStore = false;
  private _labels: Labels = defaultLabels;
  private root: HTMLElement | ShadowRoot = this;
  private container: HTMLElement | null = null;
  private cache = new Map<string, CacheEntry>();
  private editingKey: string | null = null;
  private focusEditor = false;
  private readonly drag = new DragController(this.dragHost());
  private toast: Toast | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private renderScheduled = false;
  private state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  private listening = false;
  /** Chosen mode; null until resolved for the current plan. */
  private _mode: Mode | null = null;
  private focusModeToggle = false;

  get store(): PlanStore | null {
    return this._store;
  }

  /** Inject a store (e.g. with a custom transport). Call before or after connecting. */
  set store(store: PlanStore | null) {
    this.detachStore();
    this._store = store;
    this.ownsStore = false;
    if (store) {
      this.attachStore(store);
      this.state = store.plan ? 'ready' : 'idle';
      this.scheduleRender();
    }
  }

  /**
   * Where live updates come from. Defaults to Laravel Echo (window.Echo).
   * Set before the store is ready, or null to turn live updates off.
   */
  realtime: RealtimeSource | null | undefined = undefined;
  private stopRealtime: (() => void) | null = null;

  get labels(): Labels {
    return this._labels;
  }

  set labels(labels: Partial<Labels>) {
    this._labels = { ...defaultLabels, ...labels };
    this.cache.clear();
    this.persistent.clear();
    this.scheduleRender();
  }

  get isReadOnly(): boolean {
    return this.hasAttribute('readonly');
  }

  /**
   * "view" (normal: read and tick off) or "edit" (add, rearrange, delete).
   * Starts from the mode attribute, else what this browser last used for
   * the plan, else edit for an empty plan and view otherwise. Always
   * "view" when readonly.
   */
  get mode(): Mode {
    if (this.isReadOnly) return 'view';
    return this._mode ?? this.initialMode();
  }

  set mode(mode: Mode) {
    if (mode !== 'view' && mode !== 'edit') return;
    const changed = mode !== this.mode;
    this._mode = mode;
    this.rememberMode(mode);
    if (this.getAttribute('mode') !== mode) this.setAttribute('mode', mode);
    if (!changed) return;
    if (mode === 'view') this.editingKey = null;
    this.cache.clear();
    this.scheduleRender();
    this.emit('mode', { mode });
  }

  /** Editing controls are shown: not readonly and in edit mode. */
  get canEdit(): boolean {
    return !this.isReadOnly && this.mode === 'edit';
  }

  private initialMode(): Mode {
    const attr = this.getAttribute('mode');
    if (attr === 'view' || attr === 'edit') return attr;
    const store = this._store;
    if (!store?.plan) return 'view';
    const stored = readStoredMode(store.plan.id);
    // Resolve once per plan, so adding the first block does not flip it.
    this._mode = stored ?? (store.children(null).length === 0 ? 'edit' : 'view');
    return this._mode;
  }

  private rememberMode(mode: Mode): void {
    const plan = this._store?.plan?.id;
    if (!plan) return;
    try {
      localStorage.setItem(`plan-block:mode:${plan}`, mode);
    } catch {
      // Storage unavailable (private mode, sandbox): the mode lasts this page only.
    }
  }

  connectedCallback(): void {
    window.addEventListener('plan-block-refresh', this.onRefresh);
    document.addEventListener('click', this.onDocumentClick);
    if (this.hasAttribute('shadow') && !this.shadowRoot) {
      this.root = this.attachShadow({ mode: 'open' });
    }
    if (!this.hasAttribute('no-styles')) this.adoptStyles();
    if (!this.listening) this.listen();

    if (!this._store && this.getAttribute('plan')) {
      // If the script ran before the page finished parsing, the embedded
      // data inside this element may not exist yet: wait for it.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.isConnected && !this._store && void this.boot(), { once: true });
      } else {
        void this.boot();
      }
    } else {
      this.scheduleRender();
      // Moved back into the page with a ready store: listen again.
      if (this._store?.plan) this.connectRealtime();
    }
  }

  disconnectedCallback(): void {
    this.disconnectRealtime();
    window.removeEventListener('plan-block-refresh', this.onRefresh);
    document.removeEventListener('click', this.onDocumentClick);
    this.drag.cancel();
    if (this.ownsStore) {
      this._store?.destroy();
      this.detachStore();
      this._store = null;
      this.state = 'idle';
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this.isConnected) return;
    if ((name === 'plan' || name === 'endpoint') && this.ownsStore) {
      this._store?.destroy();
      this.detachStore();
      this._store = null;
      void this.boot();
    } else {
      if (name === 'mode' && (newValue === 'view' || newValue === 'edit') && newValue !== this._mode) {
        this._mode = newValue;
        if (newValue === 'view') this.editingKey = null;
      }
      this.cache.clear();
      this.scheduleRender();
    }
  }

  // ---- Lifecycle -------------------------------------------------------

  private async boot(): Promise<void> {
    const plan = this.getAttribute('plan');
    if (!plan) return;

    // Data embedded by <x-plan-block> means no requests are needed.
    await this.useStore(new PlanStore({ transport: this.createTransport(plan) }), {
      initial: this.readInitialData() ?? undefined,
      owned: true,
    });
  }

  /**
   * Show this store: start from `initial` data if given, otherwise load it
   * (showing loading and failure states). Used by the Vue and React
   * wrappers. With `owned`, the element destroys the store when removed.
   */
  async useStore(store: PlanStore, options: { initial?: InitialData; owned?: boolean } = {}): Promise<void> {
    if (this._store && this._store !== store && this.ownsStore) this._store.destroy();
    this.detachStore();
    this._store = store;
    this.ownsStore = options.owned ?? false;
    this.attachStore(store);

    if (options.initial) {
      store.hydrate(options.initial);
      this.state = 'ready';
      this.render();
      this.connectRealtime();
      this.emit('ready', { plan: store.plan });
      return;
    }

    if (store.plan) {
      this.state = 'ready';
      this.render();
      this.connectRealtime();
      return;
    }

    this.state = 'loading';
    this.render();

    try {
      await store.load();
      if (this._store !== store) return;
      this.state = 'ready';
      this.connectRealtime();
      this.emit('ready', { plan: store.plan });
    } catch (error) {
      if (this._store !== store) return;
      this.state = 'failed';
      this.emit('error', { error: { reason: 'load_failed', message: error instanceof Error ? error.message : String(error) } });
    }
    this.render();
  }

  /**
   * transport="livewire": commands go through the enclosing
   * <livewire:plan-block> component. Otherwise the JSON API.
   */
  private createTransport(plan: string): Transport {
    if (this.getAttribute('transport') === 'livewire') {
      let host: Element | null = this.parentElement;
      while (host && !host.hasAttribute('wire:id')) host = host.parentElement;
      const id = host?.getAttribute('wire:id') ?? '';
      return new LivewireTransport(() => waitForLivewire(id));
    }

    return new HttpTransport({ endpoint: this.getAttribute('endpoint') ?? '/plan-block', plan });
  }

  /**
   * Reload when the server says the plan changed elsewhere, e.g. from PHP:
   * $this->dispatch('plan-block-refresh', plan: $plan->ulid).
   */
  private readonly onRefresh = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const plan = Array.isArray(detail) ? detail[0]?.plan : detail?.plan;
    if (this._store?.plan && (!plan || plan === this._store.plan.id)) {
      void this._store.reload().catch(() => this.showToast({ message: this._labels.loadFailed, kind: 'error' }));
    }
  };

  private readInitialData(): (PlanResponse & { manifest: Manifest }) | null {
    const script = ownChildren(this, 'script[data-pb-initial]')[0];
    if (!script?.textContent) return null;
    try {
      return JSON.parse(script.textContent);
    } catch {
      return null;
    } finally {
      script.remove();
    }
  }

  private readonly onChange = () => {
    if (this._store?.plan) this.state = 'ready';
    this.scheduleRender();
  };

  private readonly onCommand = (event: Event) => {
    const { command } = (event as CustomEvent).detail;
    this.emit(command.type.replace(/_/g, '-'), { id: command.block, command });
  };

  private readonly onError = (event: Event) => {
    const { error } = (event as CustomEvent<{ error: CommandError }>).detail;
    this.showToast({ message: error.message, kind: 'error' });
    this.emit('error', (event as CustomEvent).detail);
  };

  private readonly onSync = (event: Event) => {
    this.emit('sync', (event as CustomEvent).detail);
    this.scheduleRender();
  };

  private attachStore(store: PlanStore): void {
    store.addEventListener('change', this.onChange);
    store.addEventListener('command', this.onCommand);
    store.addEventListener('error', this.onError);
    store.addEventListener('sync', this.onSync);
  }

  /**
   * Live updates from other tabs and devices: on when the server has
   * broadcasting enabled and a source exists (the `realtime` property, or
   * Laravel Echo on window). realtime="off" turns it off.
   */
  private connectRealtime(): void {
    this.disconnectRealtime();
    const store = this._store;
    if (!store?.plan || this.realtime === null || this.getAttribute('realtime') === 'off' || !this.isConnected) return;

    const echo = (globalThis as { Echo?: EchoLike }).Echo;
    const source = this.realtime !== undefined ? this.realtime : echo ? echoSource(echo) : null;
    if (source) this.stopRealtime = connectRealtime(store, source);
  }

  private disconnectRealtime(): void {
    this.stopRealtime?.();
    this.stopRealtime = null;
  }

  private detachStore(): void {
    this.disconnectRealtime();
    const store = this._store;
    if (!store) return;
    store.removeEventListener('change', this.onChange);
    store.removeEventListener('command', this.onCommand);
    store.removeEventListener('error', this.onError);
    store.removeEventListener('sync', this.onSync);
    this.cache.clear();
    this._mode = null;
  }

  private adoptStyles(): void {
    const target = this.root instanceof ShadowRoot ? this.root : document;
    if (target === document && documentStylesAdopted) return;

    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
    } catch {
      const style = h('style', { 'data-plan-block': '' }, css);
      if (target === document) document.head.append(style);
      else (target as ShadowRoot).prepend(style);
    }

    if (target === document) documentStylesAdopted = true;
  }

  // ---- Rendering -------------------------------------------------------

  private scheduleRender(): void {
    if (this.renderScheduled || !this.isConnected) return;
    this.renderScheduled = true;
    queueMicrotask(() => {
      this.renderScheduled = false;
      this.render();
    });
  }

  /** Renders now. Normally batched automatically. */
  render(): void {
    if (!this.container) {
      // Replace the server-rendered copy from <x-plan-block>.
      for (const node of ownChildren(this, '[data-pb-fallback]')) node.remove();
      this.container = h('div', { class: 'pb-root' });
      this.root.append(this.container);
    }

    const store = this._store;
    const labels = this._labels;

    if (!store || this.state === 'loading' || this.state === 'idle') {
      this.container.replaceChildren(h('div', { class: 'pb-empty' }, labels.loading));
      return;
    }

    if (this.state === 'failed' || !store.plan) {
      this.container.replaceChildren(h('div', { class: 'pb-empty', role: 'alert' }, labels.loadFailed));
      return;
    }

    const focus = this.captureFocus();
    const seen = new Set<string>();
    const top = store.children(null).map((block) => this.renderBlock(block, '', seen, 0));

    for (const key of this.cache.keys()) {
      if (!seen.has(key)) this.cache.delete(key);
    }

    const list = this.ensure('list', () => h('div', { class: 'pb-list' }));
    const mode = this.mode;
    const emptyText = this.isReadOnly ? labels.emptyReadonly : mode === 'edit' ? labels.empty : labels.emptyView;
    syncChildren(list, top.length ? top : [h('div', { class: 'pb-empty' }, emptyText)]);

    const toolbar = this.isReadOnly ? null : this.ensure(`toolbar-${mode}`, () => this.toolbar(mode));
    this.container.dataset.pbMode = mode;

    const status = h(
      'div',
      { class: 'pb-status', role: 'status', 'aria-live': 'polite', 'data-state': store.syncState },
      store.syncState === 'saving' ? labels.saving : store.syncState === 'offline' ? labels.offline : '',
    );

    const toast = this.toast
      ? h(
          'div',
          { class: 'pb-toast', role: this.toast.kind === 'error' ? 'alert' : 'status', 'data-kind': this.toast.kind },
          h('span', {}, this.toast.message),
          h(
            'div',
            { class: 'pb-actions' },
            this.toast.action
              ? h('button', { type: 'button', class: 'pb-button', 'data-pb-action': this.toast.action.name, 'data-pb-target': this.toast.action.id }, this.toast.action.label)
              : null,
            h('button', { type: 'button', class: 'pb-button', 'data-pb-action': 'dismiss' }, labels.dismiss),
          ),
        )
      : null;

    syncChildren(this.container, [toolbar, list, status, toast].filter((n): n is HTMLElement => n !== null));

    if (this.focusModeToggle && toolbar) {
      this.focusModeToggle = false;
      toolbar.querySelector<HTMLElement>('[data-pb-action="mode"][aria-pressed="true"]')?.focus();
    }

    if (this.focusEditor && this.editingKey) {
      this.focusEditor = false;
      const field = this.root.querySelector<HTMLElement>(`[data-pb-key="${cssEscape(this.editingKey)}"] [data-pb-form] .pb-input`);
      field?.focus();
    }

    this.restoreFocus(focus);
  }

  /**
   * Which control has focus, as block key + control, so focus can move to
   * the replacement when a block's element is re-created (e.g. after a
   * keyboard move is confirmed by the server).
   */
  private captureFocus(): { key: string; selector: string; el: Element } | null {
    const active = (this.root instanceof ShadowRoot ? this.root : document).activeElement;
    if (!active || !this.container?.contains(active)) return null;
    const key = active.closest<HTMLElement>('[data-pb-key]')?.dataset.pbKey;
    if (!key) return null;
    const action = (active as HTMLElement).dataset?.pbAction;
    const selector = active.hasAttribute('data-pb-drag-handle') ? '[data-pb-drag-handle]' : action ? `[data-pb-action="${cssEscape(action)}"]` : null;
    return selector ? { key, selector, el: active } : null;
  }

  private restoreFocus(focus: { key: string; selector: string; el: Element } | null): void {
    if (!focus) return;
    const active = (this.root instanceof ShadowRoot ? this.root : document).activeElement;
    if (active === focus.el) return;

    // Moved but kept (reordering drops focus too): focus it again.
    if (focus.el.isConnected) {
      (focus.el as HTMLElement).focus();
      return;
    }

    const blockEl = this.root.querySelector<HTMLElement>(`[data-pb-key="${cssEscape(focus.key)}"]`);
    // The control itself, not the same control of a nested block.
    const match = [...(blockEl?.querySelectorAll<HTMLElement>(focus.selector) ?? [])].find((c) => c.closest('[data-pb-key]') === blockEl);
    match?.focus();
  }

  /** Add buttons (edit mode) and the normal / edit switch. */
  private toolbar(mode: Mode): HTMLElement {
    const labels = this._labels;
    const modeButton = (value: Mode, text: string) =>
      h('button', { type: 'button', class: 'pb-button pb-mode__option', 'data-pb-action': 'mode', 'data-pb-value': value, 'aria-pressed': String(mode === value) }, text);

    return h(
      'div',
      { class: 'pb-toolbar' },
      mode === 'edit' ? h('button', { type: 'button', class: 'pb-button', 'data-pb-action': 'add', 'data-pb-type': 'timeline', 'data-pb-parent': '' }, labels.addDay) : null,
      mode === 'edit' ? h('button', { type: 'button', class: 'pb-button', 'data-pb-action': 'add', 'data-pb-type': 'pool', 'data-pb-parent': '' }, labels.addPool) : null,
      h('div', { class: 'pb-mode', role: 'group', 'aria-label': labels.mode }, modeButton('view', labels.viewMode), modeButton('edit', labels.editMode)),
    );
  }

  private persistent = new Map<string, HTMLElement>();

  private ensure(name: string, create: () => HTMLElement): HTMLElement {
    let el = this.persistent.get(name);
    if (!el) {
      el = create();
      this.persistent.set(name, el);
    }
    return el;
  }

  /**
   * Renders a block, reusing its previous element when nothing it shows has
   * changed, so focus and scroll survive updates. `scope` keeps mirrored
   * copies (children shown through a link) separate from the originals.
   */
  private renderBlock(block: BlockData, scope: string, seen: Set<string>, depth: number): HTMLElement {
    const store = this._store!;
    const key = scope + block.id;
    const isLink = block.type === 'link';
    const target = (isLink ? store.resolve(block.id) : block) ?? block;
    const type = store.type(target.type);
    const editing = this.editingKey === key;
    seen.add(key);

    const signature = JSON.stringify([
      block,
      isLink ? target : null,
      editing,
      this.isReadOnly,
      this.mode,
      // Controls whose availability depends on siblings or days.
      block.parent ? store.children(block.parent).length : 0,
      store.children(target.id).map((c) => c.type).join(),
      // Day and ideas-list names (the link badge and "Add to day" use them).
      store.children(null).map((d) => d.id + (d.payload.label ?? '')).join(),
    ]);

    let entry = this.cache.get(key);

    if (!entry || entry.signature !== signature) {
      const children = entry?.children ?? h('div', { class: 'pb-children', 'data-pb-children': '' });
      const ctx: RenderContext = { block, target, type, isLink, children, editing, readonly: this.isReadOnly, mode: this.mode, canEdit: this.canEdit, store, labels: this._labels, h, parts };
      const el = rendererFor(target.type)(ctx);

      el.classList.add('pb-block');
      el.dataset.pbId = block.id;
      el.dataset.pbKey = key;
      el.dataset.pbType = target.type;
      toggleData(el, 'pbLink', isLink);
      toggleData(el, 'pbChecked', target.checked);
      toggleData(el, 'pbDone', target.done);
      toggleData(el, 'pbExcluded', block.excluded);

      entry = { signature, el, children };
      this.cache.set(key, entry);
    }

    const childScope = isLink ? `${key}>` : scope;
    const kids = depth > 20 ? [] : store.children(target.id).map((child) => this.renderBlock(child, childScope, seen, depth + 1));
    syncChildren(entry.children, kids);

    return entry.el;
  }

  // ---- Interaction -----------------------------------------------------

  /** Live view of this element for the drag controller. */
  private dragHost(): DragHost {
    const el = this;
    return {
      get root() {
        return el.root;
      },
      get container() {
        return el.container;
      },
      get store() {
        return el._store;
      },
      get readonly() {
        return !el.canEdit;
      },
      move: (id, parent, after) => el._store?.move(id, { parent, after }),
    };
  }

  private listen(): void {
    this.listening = true;
    this.root.addEventListener('click', (event) => this.onClick(event as MouseEvent));
    this.root.addEventListener('change', (event) => this.onInputChange(event));
    this.root.addEventListener('submit', (event) => this.onSubmit(event as SubmitEvent));
    this.root.addEventListener('pointerdown', (event) => this.drag.onPointerDown(event as PointerEvent));
    this.root.addEventListener('keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Escape') {
        const open = (event.target as Element | null)?.closest<HTMLDetailsElement>('details[data-pb-menu][open]');
        if (open) {
          open.open = false;
          open.querySelector<HTMLElement>('summary')?.focus();
          return;
        }
      }
      if (key === 'Escape' && this.editingKey) {
        this.editingKey = null;
        this.scheduleRender();
        return;
      }

      // Arrow keys on a focused drag handle move the block.
      const handle = (event.target as Element | null)?.closest<HTMLElement>('[data-pb-drag-handle]');
      const blockEl = handle?.closest<HTMLElement>('[data-pb-key]');
      if ((key === 'ArrowUp' || key === 'ArrowDown') && blockEl?.dataset.pbId && this.canEdit) {
        event.preventDefault();
        this.shift(blockEl.dataset.pbId, key === 'ArrowUp' ? -1 : 1);
      }
    });
  }

  private actionTarget(event: Event): { action: string; el: HTMLElement; id: string | null; key: string | null } | null {
    const el = (event.target as Element | null)?.closest<HTMLElement>('[data-pb-action]');
    if (!el || !this.root.contains(el)) return null;
    const blockEl = el.closest<HTMLElement>('[data-pb-key]');
    return { action: el.dataset.pbAction!, el, id: blockEl?.dataset.pbId ?? null, key: blockEl?.dataset.pbKey ?? null };
  }

  /** A click outside a menu closes it. */
  private readonly onDocumentClick = (event: MouseEvent) => {
    const path = event.composedPath();
    for (const menu of this.root.querySelectorAll<HTMLDetailsElement>('details[data-pb-menu][open]')) {
      if (!path.includes(menu)) menu.open = false;
    }
  };

  private onClick(event: MouseEvent): void {
    const hit = this.actionTarget(event);
    const store = this._store;
    if (!hit || !store) return;
    const { action, el, id, key } = hit;

    // Picking an entry closes its menu.
    const menu = el.closest<HTMLDetailsElement>('details[data-pb-menu]');
    if (menu && action !== 'link') menu.open = false;

    // Checkbox actions are handled on "change".
    if (action === 'toggle-check' || action === 'check-all' || action === 'link') return;

    switch (action) {
      case 'mode':
        this.focusModeToggle = true;
        this.mode = el.dataset.pbValue as Mode;
        return;
      case 'add':
        return this.add(el.dataset.pbType!, el.dataset.pbParent || null, key);
      case 'edit':
        this.editingKey = key;
        this.focusEditor = true;
        return this.scheduleRender();
      case 'cancel':
        this.editingKey = null;
        return this.scheduleRender();
      case 'dismiss':
        return this.showToast(null);
      case 'restore':
        store.restore(el.dataset.pbTarget ?? id!);
        return this.showToast(null);
    }

    if (!id) return;

    switch (action) {
      case 'check':
        return store.check(id);
      case 'uncheck':
        return store.uncheck(id);
      case 'exclude':
        return store.exclude(id);
      case 'include':
        return store.include(id);
      case 'move-up':
      case 'move-down':
        return this.shift(id, action === 'move-up' ? -1 : 1);
      case 'delete':
        void this.confirmDelete(id);
        return;
    }
  }

  private onInputChange(event: Event): void {
    const hit = this.actionTarget(event);
    const store = this._store;
    if (!hit?.id || !store) return;
    const input = hit.el as HTMLInputElement;

    if (hit.action === 'toggle-check') {
      store.setChecked(hit.id, input.checked);
    } else if (hit.action === 'check-all') {
      if (input.checked) store.checkAll(hit.id);
      else store.uncheckAll(hit.id);
    } else if (hit.action === 'link') {
      const day = (hit.el as HTMLSelectElement).value;
      if (day) {
        store.link(hit.id, day, store.children(day).at(-1)?.id ?? null);
        (hit.el as HTMLSelectElement).value = '';
      }
    }
  }

  private onSubmit(event: SubmitEvent): void {
    const form = (event.target as Element | null)?.closest<HTMLFormElement>('[data-pb-form]');
    if (!form || !this._store) return;
    event.preventDefault();

    const blockEl = form.closest<HTMLElement>('[data-pb-key]');
    const block = blockEl?.dataset.pbId ? this._store.resolve(blockEl.dataset.pbId) : undefined;
    const type = block ? this._store.type(block.type) : undefined;
    if (!block || !type) return;

    const changes: Record<string, unknown> = {};
    for (const field of type.fields) {
      const value = readField(form, field);
      const current = block.payload[field.name] ?? null;
      if (value !== current) changes[field.name] = value;
    }

    if (Object.keys(changes).length) this._store.update(block.id, changes);
    this.editingKey = null;
    this.scheduleRender();
  }

  private add(typeKey: string, parent: string | null, parentKey: string | null): void {
    const store = this._store!;
    const type = store.type(typeKey);
    const titleField = type?.fields.find((f) => f.type === 'text' || f.type === 'textarea');
    const payload = titleField?.required ? { [titleField.name]: this._labels.newItem(type?.label ?? typeKey) } : {};
    const after = store.children(parent).at(-1)?.id ?? null;
    const id = store.create(typeKey, { parent, after, payload });

    if (titleField) {
      // Same scope as the parent's children so the right copy opens.
      const parentEl = parentKey ? this.cache.get(parentKey) : undefined;
      const scope = parentKey && parent && parentEl?.el.dataset.pbLink !== undefined ? `${parentKey}>` : parentKey && parent ? parentKey.slice(0, -parent.length) : '';
      this.editingKey = scope + id;
      this.focusEditor = true;
    }
  }

  private shift(id: string, direction: -1 | 1): void {
    const store = this._store!;
    const block = store.get(id);
    if (!block) return;
    const siblings = store.children(block.parent);
    const index = siblings.findIndex((b) => b.id === id);

    if (direction === -1 && index > 0) {
      store.move(id, { after: index >= 2 ? siblings[index - 2]!.id : null });
    } else if (direction === 1 && index < siblings.length - 1) {
      store.move(id, { after: siblings[index + 1]!.id });
    }
  }

  private async confirmDelete(id: string): Promise<void> {
    const store = this._store!;
    let where: string[] = [];

    try {
      const impact = await store.deleteImpact(id);
      where = [...new Set(impact.links.map((l) => (l.day ? this._labels.day(l.day.number) : this._labels.pool)))];
    } catch {
      // Not saved yet or offline: nothing linked on the server to warn about.
    }

    if (where.length && !window.confirm(this._labels.confirmDeleteLinked(where.join(', ')))) return;

    store.delete(id);
    this.showToast({ message: this._labels.deleted, kind: 'info', action: { label: this._labels.undo, name: 'restore', id } });
  }

  private showToast(toast: Toast | null): void {
    this.toast = toast;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (toast) this.toastTimer = setTimeout(() => this.showToast(null), toast.kind === 'error' ? 8000 : 6000);
    this.scheduleRender();
  }

  private emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(`plan-block:${name}`, { detail, bubbles: true, composed: true }));
  }
}

export type Mode = 'view' | 'edit';

function readStoredMode(plan: string): Mode | null {
  try {
    const value = localStorage.getItem(`plan-block:mode:${plan}`);
    return value === 'view' || value === 'edit' ? value : null;
  } catch {
    return null;
  }
}

function readField(form: HTMLFormElement, field: FieldManifest): unknown {
  const input = form.elements.namedItem(field.name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  if (!input) return null;
  if (field.type === 'toggle') return (input as HTMLInputElement).checked;
  const value = input.value.trim();
  if (value === '') return null;
  return field.type === 'number' ? Number(value) : value;
}

/** Replace children only when they differ, so untouched nodes keep focus. */
function syncChildren(parent: HTMLElement, children: HTMLElement[]): void {
  const current = parent.children;
  if (current.length === children.length && children.every((child, i) => current[i] === child)) return;
  parent.replaceChildren(...children);
}

interface LivewireGlobal {
  find(id: string): LivewireWire | undefined;
}

/**
 * Resolves the $wire of a Livewire component, waiting if Livewire has not
 * started yet (its script often runs after ours) or after wire:navigate.
 */
function waitForLivewire(id: string, timeoutMs = 10000): Promise<LivewireWire> {
  const find = () => (window as unknown as { Livewire?: LivewireGlobal }).Livewire?.find(id);

  return new Promise((resolve, reject) => {
    const found = find();
    if (found) return resolve(found);

    const started = Date.now();
    const check = () => {
      const wire = find();
      if (wire) {
        cleanup();
        resolve(wire);
      } else if (Date.now() - started > timeoutMs) {
        cleanup();
        reject(new Error(`Livewire component ${id || '(none)'} not found. Is <plan-block transport="livewire"> inside <livewire:plan-block>?`));
      }
    };
    const timer = setInterval(check, 50);
    const cleanup = () => {
      clearInterval(timer);
      document.removeEventListener('livewire:initialized', check);
    };
    document.addEventListener('livewire:initialized', check);
  });
}

/** Direct children matching a selector (no reliance on :scope support). */
function ownChildren(el: Element, selector: string): HTMLElement[] {
  return Array.from(el.children).filter((child): child is HTMLElement => child.matches(selector));
}

function toggleData(el: HTMLElement, name: string, on: boolean): void {
  if (on) el.dataset[name] = '';
  else delete el.dataset[name];
}

/**
 * Escape for use inside a double-quoted attribute selector value. (Not
 * CSS.escape: that escapes leading digits, which every ULID has, and some
 * selector engines mis-handle those escapes inside quotes.)
 */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}
