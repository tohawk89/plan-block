import type { PlanStore } from '../client/store';
import type { BlockData, FieldManifest, TypeManifest } from '../client/types';
import { h } from './h';
import type { Labels } from './labels';
import { CATEGORY_TIMES, colorField, colorOf } from './palette';
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
  /** A plan's options are unfolded (normal mode; edit mode always shows them). */
  expanded: boolean;
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

function itemActions(ctx: RenderContext, options: { linkable?: boolean; extra?: (HTMLElement | null)[] } = {}): HTMLElement | null {
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
      ...(options.extra ?? []),
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
    blockMenu(ctx, [
      menuItem('edit', labels.edit),
      colorSwatches(ctx),
      menuItem('move-up', labels.moveUp),
      menuItem('move-down', labels.moveDown),
      menuItem('delete', labels.delete, true),
    ]),
  );
}

/** One-click colour choices for a day or ideas list, shown in its menu. */
function colorSwatches(ctx: RenderContext): HTMLElement | null {
  const field = colorField(ctx.store, ctx.target);
  if (!field) return null;
  const current = colorOf(ctx.store, ctx.target);

  return h(
    'div',
    { class: 'pb-swatches', role: 'group', 'aria-label': ctx.labels.color },
    ...(field.options ?? []).map((option) =>
      h('button', {
        type: 'button',
        class: 'pb-swatch',
        'data-pb-action': 'color',
        'data-pb-color': String(option.value),
        'aria-label': option.label,
        title: option.label,
        'aria-pressed': String(current === String(option.value)),
      }),
    ),
  );
}

/** Progress as a small bar (decorative; the text next to it says the same). */
function meter(done: number, total: number): HTMLElement {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return h('span', { class: 'pb-meter', 'aria-hidden': 'true' }, h('span', { class: 'pb-meter__fill', style: `width: ${percent}%` }));
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
    ...(ctx.type?.fields ?? []).map((field) => fieldInput(field, target.payload[field.name], labels)),
    h(
      'div',
      { class: 'pb-actions' },
      h('button', { type: 'submit', class: 'pb-button pb-button--primary' }, labels.save),
      h('button', { type: 'button', class: 'pb-button', 'data-pb-action': 'cancel' }, labels.cancel),
    ),
  );
}

function fieldInput(field: FieldManifest, value: unknown, labels?: Labels): HTMLElement {
  if (field.type === 'select' && field.name === 'color') return colorInput(field, value, labels);
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

/** A colour field as a row of swatch radio buttons, with "Auto" first. */
function colorInput(field: FieldManifest, value: unknown, labels?: Labels): HTMLElement {
  const current = typeof value === 'string' ? value : '';
  const radio = (optionValue: string, label: string, extraClass: string) =>
    h('input', {
      type: 'radio',
      name: field.name,
      value: optionValue,
      class: `pb-swatch${extraClass ? ` ${extraClass}` : ''}`,
      'data-pb-color': optionValue || undefined,
      'aria-label': label,
      title: label,
      '.checked': current === optionValue,
    });

  return h(
    'fieldset',
    { class: 'pb-field pb-swatch-field' },
    h('legend', {}, field.label),
    h(
      'div',
      { class: 'pb-swatches' },
      field.required ? null : radio('', labels?.autoColor ?? 'Auto', 'pb-swatch--auto'),
      ...(field.options ?? []).map((o) => radio(String(o.value), o.label, '')),
    ),
  );
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

export const parts = { title, titleOf, iconButton, menu, menuItem, blockMenu, itemActions, groupActions, colorSwatches, meter, addButtons, groupAddButtons, optionRank, rankBadge, homeOf, dragHandle, checkbox, linkBadge, editForm, fieldInput, dayTitle, formatDate };

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
      meter(progress.done, progress.total),
      h('span', { class: 'pb-progress', 'data-state': progress.state }, labels.progress(progress.done, progress.total)),
      groupActions(ctx),
    ),
    ctx.editing ? h('div', { class: 'pb-children' }, editForm(ctx)) : null,
    ctx.children,
    groupAddButtons(ctx),
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
      meter(progress.done, progress.total),
      h('span', { class: 'pb-progress' }, labels.poolProgress(progress.done, progress.total)),
      groupActions(ctx),
    ),
    ctx.editing ? h('div', { class: 'pb-children' }, editForm(ctx)) : null,
    ctx.children,
    groupAddButtons(ctx),
  );
};

const place: Renderer = (ctx) => {
  const { target, labels } = ctx;
  const time = typeof target.payload.time === 'string' ? target.payload.time : null;
  const mapUrl = typeof target.payload.maps_url === 'string' ? target.payload.maps_url : null;
  const notes = typeof target.payload.notes === 'string' ? target.payload.notes : null;
  const backupNumber = target.type === 'backup' && target.parent ? ctx.store.children(target.parent).filter((b) => b.type === 'backup').findIndex((b) => b.id === target.id) + 1 : 0;
  const rank = optionRank(ctx.store, target);

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
              backupNumber > 0 ? h('span', { class: 'pb-badge pb-badge--backup' }, labels.backup(backupNumber)) : null,
              rank !== null ? rankBadge(rank, labels) : null,
              backupNumber > 0 || rank !== null ? ' ' : null,
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
      ctx.editing ? null : itemActions(ctx, { linkable: rank === null, extra: rank ? [menuItem('make-main', labels.makeMain)] : [] }),
    ),
    ctx.children,
    // A plan's options are already alternatives: no backups of backups.
    ctx.editing || ctx.isLink || rank !== null ? null : addButtons(ctx, ['backup', 'note']),
  );
};

/** Position among a plan's place options (0 = main), or null outside a plan. */
function optionRank(store: PlanStore, block: BlockData): number | null {
  const parent = block.parent ? store.get(block.parent) : undefined;
  if (!parent || store.type(parent.type)?.rule !== 'one' || block.type !== 'place') return null;
  const index = store.children(parent.id).filter((b) => b.type === 'place').findIndex((b) => b.id === block.id);
  return index < 0 ? null : index;
}

function rankBadge(rank: number, labels: Labels): HTMLElement {
  return rank === 0 ? h('span', { class: 'pb-badge pb-badge--main' }, `★ ${labels.main}`) : h('span', { class: 'pb-badge pb-badge--backup' }, labels.backup(rank));
}

/** Category of a plan, and its label from the manifest. */
function categoryOf(ctx: RenderContext, block: BlockData): { value: string; label: string } {
  const value = typeof block.payload.category === 'string' && block.payload.category !== '' ? block.payload.category : 'other';
  const field = ctx.store.type(block.type)?.fields.find((f) => f.name === 'category');
  const label = field?.options?.find((o) => String(o.value) === value)?.label ?? ctx.store.type(block.type)?.label ?? value;
  return { value, label };
}

/**
 * A plan (Breakfast, Lunch…) with ranked place options. Normal mode shows
 * the main choice, or the one picked, with the backups folded away; edit
 * mode lists every option and a box to add more by typing.
 */
const slot: Renderer = (ctx) => {
  const { target, labels, store } = ctx;
  const category = categoryOf(ctx, target);
  const titleText = typeof target.payload.title === 'string' && target.payload.title !== '' ? target.payload.title : category.label;
  const time = typeof target.payload.time === 'string' ? target.payload.time : null;
  const notes = typeof target.payload.notes === 'string' ? target.payload.notes : null;
  const options = store.children(target.id).filter((b) => b.type === 'place');
  const chosenIndex = options.findIndex((o) => o.checked);
  const chosen = chosenIndex >= 0 ? options[chosenIndex] : undefined;
  const main = options.find((o) => !o.excluded);
  const nameOf = (b: BlockData) => (typeof b.payload.name === 'string' && b.payload.name !== '' ? b.payload.name : (store.type(b.type)?.label ?? ''));
  const max = ctx.type?.children.max.place;
  const showOptions = ctx.canEdit || ctx.expanded;

  // The element owns this container; fold it in normal mode.
  ctx.children.hidden = !showOptions;

  const summary = chosen
    ? h('div', { class: 'pb-slot__summary pb-slot__summary--done' }, `✓ ${labels.wentTo(nameOf(chosen))}`, chosenIndex > 0 ? ' ' : null, chosenIndex > 0 ? h('span', { class: 'pb-badge pb-badge--backup' }, labels.backup(chosenIndex)) : null)
    : h('div', { class: 'pb-slot__summary' }, main ? nameOf(main) : h('span', { class: 'pb-muted' }, labels.noPlaceYet));

  const toggle =
    !ctx.canEdit && (options.length > 1 || chosen)
      ? h(
          'button',
          { type: 'button', class: 'pb-chip', 'data-pb-action': 'toggle-expand', 'aria-expanded': String(ctx.expanded) },
          ctx.expanded ? labels.hideOptions : options.length > 1 ? labels.backupCount(options.length - 1) : labels.showOptions,
          h('span', { 'aria-hidden': 'true' }, ctx.expanded ? ' ▴' : ' ▾'),
        )
      : null;

  const quickAdd =
    ctx.canEdit && !ctx.isLink && !ctx.editing && (max === undefined || options.length < max)
      ? h('input', {
          type: 'text',
          class: 'pb-input pb-quick-add',
          'data-pb-action': 'quick-add',
          placeholder: options.length ? labels.quickAddMore : labels.quickAddFirst,
          'aria-label': labels.addPlace,
          maxlength: store.type('place')?.fields.find((f) => f.name === 'name')?.max,
          enterkeyhint: 'done',
        })
      : null;

  return h(
    'div',
    { class: 'pb-item pb-slot', 'data-pb-category': category.value },
    h(
      'div',
      { class: 'pb-item__row' },
      dragHandle(ctx),
      h('input', {
        type: 'checkbox',
        class: 'pb-check',
        'data-pb-action': 'toggle-slot',
        '.checked': Boolean(chosen),
        'aria-label': labels.markDone(titleText),
        disabled: ctx.readonly || !main,
      }),
      h('span', { class: 'pb-slot__icon', 'aria-hidden': 'true' }),
      h(
        'div',
        { class: 'pb-item__main' },
        ctx.editing
          ? editForm(ctx)
          : h(
              'div',
              {},
              h('div', { class: 'pb-slot__heading' }, title(ctx, titleText), time ? h('span', { class: 'pb-muted' }, time) : null, linkBadge(ctx)),
              showOptions && !chosen ? null : summary,
              toggle,
              notes ? h('div', { class: 'pb-notes' }, notes) : null,
            ),
      ),
      ctx.editing ? null : itemActions(ctx, { linkable: true }),
    ),
    ctx.children,
    quickAdd,
  );
};

/**
 * "+ Add" for a day or ideas list: plan categories first (Breakfast,
 * Lunch…), then single places, notes and custom types.
 */
function groupAddButtons(ctx: RenderContext): HTMLElement | null {
  if (!ctx.canEdit) return null;
  const items: HTMLElement[] = [];
  const parent = ctx.target.id;

  if (canAdd(ctx, 'slot')) {
    const field = ctx.store.type('slot')?.fields.find((f) => f.name === 'category');
    for (const option of field?.options ?? []) {
      const value = String(option.value);
      const time = CATEGORY_TIMES[value];
      items.push(
        h(
          'button',
          {
            type: 'button',
            class: 'pb-menu__item pb-menu__item--plan',
            'data-pb-action': 'add',
            'data-pb-type': 'slot',
            'data-pb-parent': parent,
            'data-pb-payload': JSON.stringify(time ? { category: value, time } : { category: value }),
            'data-pb-focus': 'quick-add',
            'data-pb-category': value,
          },
          h('span', { class: 'pb-slot__icon', 'aria-hidden': 'true' }),
          option.label,
        ),
      );
    }
  }

  const others = ['place', 'note', ...customTypes(ctx)].filter((key) => canAdd(ctx, key));
  if (items.length && others.length) items.push(h('div', { class: 'pb-menu__divider', role: 'separator' }));
  for (const key of others) {
    items.push(h('button', { type: 'button', class: 'pb-menu__item', 'data-pb-action': 'add', 'data-pb-type': key, 'data-pb-parent': parent }, ctx.store.type(key)?.label ?? key));
  }

  return items.length ? h('div', { class: 'pb-footer' }, menu(ctx.labels.addMenu, null, items, 'pb-menu--add')) : null;
}

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
  const builtIn = ['timeline', 'pool', 'link', 'place', 'backup', 'note', 'slot'];
  return Object.keys(ctx.store.manifest?.types ?? {}).filter((key) => !builtIn.includes(key));
}

const defaults: Record<string, Renderer> = { timeline, pool, place, backup: place, note, slot };
