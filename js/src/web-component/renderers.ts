import type { PlanStore } from '../client/store';
import type { BlockData, FieldManifest, TypeManifest } from '../client/types';
import { h } from './h';
import type { Labels } from './labels';
import { canContain } from './rules';

export interface RenderContext {
  /** The block being rendered (the link block itself for links). */
  block: BlockData;
  /** What to show: the link's source, or the block itself. Read state from here. */
  target: BlockData;
  /** Manifest entry of the target's type. */
  type: TypeManifest | undefined;
  isLink: boolean;
  /** Container already holding the rendered children. Place it in your markup. */
  children: HTMLElement;
  /** True while this block's edit form is open. */
  editing: boolean;
  /** The plan cannot be changed at all (the readonly attribute). */
  readonly: boolean;
  /** "view" (normal: read and tick off) or "edit" (build and rearrange). Always "view" when readonly. */
  mode: 'view' | 'edit';
  /** Show editing controls: not readonly and in edit mode. */
  canEdit: boolean;
  store: PlanStore;
  labels: Labels;
  h: typeof h;
  /** Default building blocks, reusable in custom renderers. */
  parts: typeof parts;
}

/**
 * Returns the block's root element. Add data-pb-action="..." to any control;
 * the component handles it (check, uncheck, toggle-check, check-all, edit,
 * delete, exclude, include, move-up, move-down, add, link, cancel).
 */
export type Renderer = (ctx: RenderContext) => HTMLElement;

const registry = new Map<string, Renderer>();

/** Register or replace the renderer for a block type. */
export function renderer(type: string, fn: Renderer): void {
  registry.set(type, fn);
}

export function rendererFor(type: string): Renderer {
  return registry.get(type) ?? defaults[type] ?? genericItem;
}

// ---- Building blocks ----------------------------------------------------

function titleField(type: TypeManifest | undefined): FieldManifest | undefined {
  return type?.fields.find((f) => f.type === 'text') ?? type?.fields.find((f) => f.type === 'textarea');
}

function titleOf(ctx: RenderContext): string {
  const field = titleField(ctx.type);
  const value = field ? ctx.target.payload[field.name] : undefined;
  return typeof value === 'string' && value !== '' ? value : (ctx.type?.label ?? ctx.target.type);
}

function title(ctx: RenderContext, fallback?: string): HTMLElement {
  const text = fallback ?? titleOf(ctx);
  return !ctx.canEdit
    ? h('span', { class: 'pb-title' }, text)
    : h('button', { type: 'button', class: 'pb-title', 'data-pb-action': 'edit', title: ctx.labels.edit }, text);
}

function iconButton(action: string, label: string, glyph: string, extra: Record<string, string> = {}): HTMLElement {
  return h(
    'button',
    { type: 'button', class: `pb-button pb-button--ghost${action === 'delete' ? ' pb-button--danger' : ''}`, 'data-pb-action': action, 'aria-label': label, title: label, ...extra },
    h('span', { 'aria-hidden': 'true' }, glyph),
  );
}

/** One entry in a block's "⋯" menu. */
function menuItem(action: string, label: string, danger = false): HTMLElement {
  return h('button', { type: 'button', class: `pb-menu__item${danger ? ' pb-menu__item--danger' : ''}`, 'data-pb-action': action }, label);
}

/**
 * A small dropdown: a summary button and a list that opens below it.
 * Picking an entry closes it (the component handles that).
 */
function menu(summary: HTMLElement | string, label: string | null, items: (HTMLElement | null)[], extraClass = ''): HTMLElement {
  return h(
    'details',
    { class: `pb-menu${extraClass ? ` ${extraClass}` : ''}`, 'data-pb-menu': '' },
    h('summary', { class: 'pb-button pb-menu__summary', 'aria-label': label ?? undefined, title: label ?? undefined }, summary),
    h('div', { class: 'pb-menu__list' }, ...items),
  );
}

/** The "⋯" menu with edit, move, skip and delete. Edit mode only. */
function blockMenu(ctx: RenderContext, items: (HTMLElement | null)[]): HTMLElement {
  return menu(h('span', { 'aria-hidden': 'true' }, '⋯'), ctx.labels.moreActions, items, 'pb-menu--actions');
}

function itemActions(ctx: RenderContext, options: { linkable?: boolean } = {}): HTMLElement | null {
  if (!ctx.canEdit) return null;
  const { labels, block, store } = ctx;
  const days = store.children(null).filter((b) => b.type === 'timeline');
  const parent = block.parent ? store.get(block.parent) : undefined;
  const editable = (ctx.type?.fields.length ?? 0) > 0;

  return h(
    'div',
    { class: 'pb-actions' },
    options.linkable && parent?.type === 'pool' && days.length > 0
      ? h(
          'select',
          { class: 'pb-select', 'data-pb-action': 'link', 'aria-label': labels.addToDay },
          h('option', { value: '' }, labels.addToDay),
          ...days.map((day) => h('option', { value: day.id }, dayTitle(store, day, labels))),
        )
      : null,
    blockMenu(ctx, [
      editable ? menuItem('edit', labels.edit) : null,
      menuItem('move-up', labels.moveUp),
      menuItem('move-down', labels.moveDown),
      !ctx.type?.root ? menuItem(block.excluded ? 'include' : 'exclude', block.excluded ? labels.include : labels.exclude) : null,
      menuItem('delete', labels.delete, true),
    ]),
  );
}

/** Header actions of a day or ideas list. */
function groupActions(ctx: RenderContext): HTMLElement | null {
  if (!ctx.canEdit) return null;
  const { labels } = ctx;
  return h(
    'div',
    { class: 'pb-actions' },
    blockMenu(ctx, [menuItem('edit', labels.edit), menuItem('move-up', labels.moveUp), menuItem('move-down', labels.moveDown), menuItem('delete', labels.delete, true)]),
  );
}

/**
 * Add controls: one button when a single type fits, otherwise a "+ Add"
 * menu listing the types. Edit mode only.
 */
function addButtons(ctx: RenderContext, types: string[]): HTMLElement | null {
  if (!ctx.canEdit) return null;
  const allowed = types.filter((key) => canAdd(ctx, key));
  if (!allowed.length) return null;
  const label = (key: string) => ctx.store.type(key)?.label ?? key;
  const attrs = (key: string) => ({ type: 'button', 'data-pb-action': 'add', 'data-pb-type': key, 'data-pb-parent': ctx.target.id });

  if (allowed.length === 1) {
    return h('div', { class: 'pb-footer' }, h('button', { ...attrs(allowed[0]!), class: 'pb-button' }, ctx.labels.add(label(allowed[0]!))));
  }

  return h(
    'div',
    { class: 'pb-footer' },
    menu(
      ctx.labels.addMenu,
      null,
      allowed.map((key) => h('button', { ...attrs(key), class: 'pb-menu__item' }, label(key))),
      'pb-menu--add',
    ),
  );
}

function canAdd(ctx: RenderContext, key: string): boolean {
  return canContain(ctx.store, ctx.target.id, key);
}

/** Drag handle; also moves the block with the arrow keys when focused. */
function dragHandle(ctx: RenderContext): HTMLElement | null {
  if (!ctx.canEdit || ctx.editing) return null;
  return h(
    'button',
    { type: 'button', class: 'pb-drag-handle', 'data-pb-drag-handle': '', 'aria-label': ctx.labels.dragHandle, title: ctx.labels.dragHandle },
    h('span', { 'aria-hidden': 'true' }, '⠿'),
  );
}

function checkbox(ctx: RenderContext): HTMLElement | null {
  if (!ctx.type?.checkable) return null;
  return h('input', {
    type: 'checkbox',
    class: 'pb-check',
    'data-pb-action': 'toggle-check',
    '.checked': ctx.target.checked,
    'aria-label': ctx.labels.markDone(titleOf(ctx)),
    disabled: ctx.readonly,
  });
}

/** On a linked copy: where the original lives ("Also in Day 1"). */
function linkBadge(ctx: RenderContext): HTMLElement | null {
  if (!ctx.isLink) return null;
  const where = homeOf(ctx.store, ctx.target, ctx.labels);
  const text = where ? ctx.labels.linkedFrom(where) : ctx.labels.linked;
  return h('span', { class: 'pb-badge pb-badge--link', title: text }, `↗ ${text}`);
}

/** Name of the day or ideas list a block sits in (or is). */
function homeOf(store: PlanStore, block: BlockData, labels: Labels): string | null {
  let current: BlockData | undefined = block;
  const seen = new Set<string>();
  while (current?.parent && !seen.has(current.id)) {
    seen.add(current.id);
    current = store.get(current.parent);
  }
  if (!current) return null;
  if (current.type === 'timeline') return dayTitle(store, current, labels);
  if (current.type === 'pool') return typeof current.payload.label === 'string' && current.payload.label !== '' ? current.payload.label : labels.pool;
  return null;
}

/** Auto-generated edit form from the type's fields. */
function editForm(ctx: RenderContext): HTMLElement {
  const { labels, target } = ctx;
  return h(
    'form',
    { class: 'pb-form', 'data-pb-form': '' },
    ...(ctx.type?.fields ?? []).map((field) => fieldInput(field, target.payload[field.name])),
    h(
      'div',
      { class: 'pb-actions' },
      h('button', { type: 'submit', class: 'pb-button pb-button--primary' }, labels.save),
      h('button', { type: 'button', class: 'pb-button', 'data-pb-action': 'cancel' }, labels.cancel),
    ),
  );
}

function fieldInput(field: FieldManifest, value: unknown): HTMLElement {
  const common = { name: field.name, class: 'pb-input', required: field.required, 'data-pb-field': field.type };
  const current = value === null || value === undefined ? '' : String(value);
  let input: HTMLElement;

  switch (field.type) {
    case 'textarea':
      input = h('textarea', { ...common, rows: 3, maxlength: field.max }, current);
      break;
    case 'select':
      input = h(
        'select',
        common,
        field.required ? null : h('option', { value: '' }, '—'),
        ...(field.options ?? []).map((o) => h('option', { value: String(o.value), selected: String(o.value) === current }, o.label)),
      );
      break;
    case 'toggle':
      input = h('input', { name: field.name, type: 'checkbox', 'data-pb-field': 'toggle', '.checked': value === true || value === 1 || value === '1' });
      break;
    case 'number':
      input = h('input', { ...common, type: 'number', step: 'any', min: field.min, max: field.max, value: current });
      break;
    default:
      input = h('input', {
        ...common,
        type: field.type === 'text' ? 'text' : field.type,
        maxlength: field.type === 'text' || field.type === 'url' ? field.max : undefined,
        value: current,
      });
  }

  return h('label', { class: 'pb-field' }, field.label, input);
}

function dayTitle(store: PlanStore, day: BlockData, labels: Labels): string {
  const label = typeof day.payload.label === 'string' && day.payload.label !== '' ? ` · ${day.payload.label}` : '';
  const number = day.day?.number ?? store.children(null).filter((b) => b.type === 'timeline').indexOf(day) + 1;
  return labels.day(number) + label;
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(parsed);
}

export const parts = { title, titleOf, iconButton, menu, menuItem, blockMenu, itemActions, groupActions, addButtons, homeOf, dragHandle, checkbox, linkBadge, editForm, fieldInput, dayTitle, formatDate };

// ---- Default renderers --------------------------------------------------

const timeline: Renderer = (ctx) => {
  const { target, labels, store } = ctx;
  const progress = target.progress ?? { state: 'none', done: 0, total: 0 };
  const date = formatDate(target.day?.date ?? null);

  return h(
    'section',
    { class: 'pb-group pb-day' },
    h(
      'header',
      { class: 'pb-group__header' },
      dragHandle(ctx),
      h('input', {
        type: 'checkbox',
        class: 'pb-check',
        'data-pb-action': 'check-all',
        '.checked': progress.state === 'all',
        '.indeterminate': progress.state === 'some',
        'aria-label': labels.checkAll,
        disabled: ctx.readonly || progress.total === 0,
      }),
      h(
        'div',
        { class: 'pb-group__title' },
        ctx.editing ? null : title(ctx, dayTitle(store, target, labels)),
        date ? h('span', { class: 'pb-muted' }, date) : null,
        linkBadge(ctx),
      ),
      h('span', { class: 'pb-progress', 'data-state': progress.state }, labels.progress(progress.done, progress.total)),
      groupActions(ctx),
    ),
    ctx.editing ? h('div', { class: 'pb-children' }, editForm(ctx)) : null,
    ctx.children,
    addButtons(ctx, ['place', 'note', ...customTypes(ctx)]),
  );
};

const pool: Renderer = (ctx) => {
  const { target, labels } = ctx;
  const progress = target.progress ?? { state: 'none', done: 0, total: 0 };
  const label = typeof target.payload.label === 'string' && target.payload.label !== '' ? target.payload.label : labels.pool;

  return h(
    'section',
    { class: 'pb-group pb-pool' },
    h(
      'header',
      { class: 'pb-group__header' },
      dragHandle(ctx),
      h('div', { class: 'pb-group__title' }, ctx.editing ? null : title(ctx, label), linkBadge(ctx)),
      h('span', { class: 'pb-progress' }, labels.poolProgress(progress.done, progress.total)),
      groupActions(ctx),
    ),
    ctx.editing ? h('div', { class: 'pb-children' }, editForm(ctx)) : null,
    ctx.children,
    addButtons(ctx, ['place', 'note', ...customTypes(ctx)]),
  );
};

const place: Renderer = (ctx) => {
  const { target, labels } = ctx;
  const time = typeof target.payload.time === 'string' ? target.payload.time : null;
  const mapUrl = typeof target.payload.maps_url === 'string' ? target.payload.maps_url : null;
  const notes = typeof target.payload.notes === 'string' ? target.payload.notes : null;

  return h(
    'div',
    { class: 'pb-item' },
    h(
      'div',
      { class: 'pb-item__row' },
      dragHandle(ctx),
      checkbox(ctx),
      h(
        'div',
        { class: 'pb-item__main' },
        ctx.editing
          ? editForm(ctx)
          : h(
              'div',
              {},
              title(ctx),
              ' ',
              linkBadge(ctx),
              target.done && !target.checked ? h('span', { class: 'pb-badge pb-badge--done' }, labels.doneViaBackup) : null,
              time || mapUrl
                ? h('div', { class: 'pb-meta' }, time ? h('span', {}, time) : null, mapUrl ? h('a', { href: mapUrl, target: '_blank', rel: 'noopener noreferrer' }, labels.openMap) : null)
                : null,
              notes ? h('div', { class: 'pb-notes' }, notes) : null,
            ),
      ),
      ctx.editing ? null : itemActions(ctx, { linkable: true }),
    ),
    ctx.children,
    ctx.editing || ctx.isLink ? null : addButtons(ctx, ['backup', 'note']),
  );
};

const note: Renderer = (ctx) =>
  h(
    'div',
    { class: 'pb-item pb-note-item' },
    h(
      'div',
      { class: 'pb-item__row' },
      dragHandle(ctx),
      h('div', { class: 'pb-item__main' }, ctx.editing ? editForm(ctx) : h('div', { class: 'pb-note' }, title(ctx))),
      ctx.editing ? null : itemActions(ctx),
    ),
  );

/** Fallback for custom types: title, optional checkbox, edit form. */
const genericItem: Renderer = (ctx) =>
  h(
    'div',
    { class: 'pb-item' },
    h(
      'div',
      { class: 'pb-item__row' },
      dragHandle(ctx),
      checkbox(ctx),
      h('div', { class: 'pb-item__main' }, ctx.editing ? editForm(ctx) : h('div', {}, title(ctx), ' ', linkBadge(ctx))),
      ctx.editing ? null : itemActions(ctx, { linkable: true }),
    ),
    ctx.children,
  );

/** Registered custom content types that may go in this group. */
function customTypes(ctx: RenderContext): string[] {
  const builtIn = ['timeline', 'pool', 'link', 'place', 'backup', 'note'];
  return Object.keys(ctx.store.manifest?.types ?? {}).filter((key) => !builtIn.includes(key));
}

const defaults: Record<string, Renderer> = { timeline, pool, place, backup: place, note };
