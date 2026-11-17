import type { BlockData, BlockId, Command, Manifest } from './types';

const GAP = 1024;

export type BlockMap = Map<BlockId, BlockData>;

/**
 * Applies a command's immediate, visible effect to a copy of the state so
 * the UI responds before the server does. Only stored fields change here
 * (checked, payload, position...). Derived values such as group progress
 * come from the server response, so that logic lives in one place.
 *
 * Never mutates existing block objects: replaces them.
 */
export function applyCommand(blocks: BlockMap, command: Command, manifest: Manifest | null): void {
  const args = command.args ?? {};

  switch (command.type) {
    case 'create':
    case 'link': {
      if (blocks.has(command.block)) return;
      const parent = (args.parent as BlockId | undefined) ?? null;
      const type = command.type === 'link' ? 'link' : String(args.type);
      const typeManifest = manifest?.types[type];
      const defaults: Record<string, unknown> = {};
      for (const field of typeManifest?.fields ?? []) {
        if (field.default !== undefined && field.default !== null) defaults[field.name] = field.default;
      }
      blocks.set(command.block, {
        id: command.block,
        type,
        parent,
        order: orderAfter(blocks, parent, (args.after as BlockId | undefined) ?? null, null),
        source: command.type === 'link' ? ((args.source as BlockId | undefined) ?? null) : null,
        attachable: (args.attachable as BlockData['attachable'] | undefined) ?? null,
        payload: { ...defaults, ...((args.payload as Record<string, unknown> | undefined) ?? {}) },
        checked: false,
        checked_at: null,
        checked_by: null,
        excluded: false,
        done: false,
        progress: typeManifest && (typeManifest.rule === 'all' || typeManifest.rule === 'count') ? { state: 'none', done: 0, total: 0 } : null,
        day: null,
      });
      return;
    }

    case 'update': {
      const block = blocks.get(command.block);
      if (!block) return;
      blocks.set(block.id, { ...block, payload: { ...block.payload, ...((args.payload as Record<string, unknown>) ?? {}) } });
      return;
    }

    case 'move': {
      const block = blocks.get(command.block);
      if (!block) return;
      const parent = 'parent' in args ? ((args.parent as BlockId | null) ?? null) : block.parent;
      blocks.set(block.id, {
        ...block,
        parent,
        order: orderAfter(blocks, parent, (args.after as BlockId | null | undefined) ?? null, block.id),
      });
      return;
    }

    case 'check':
    case 'uncheck': {
      const target = resolve(blocks, command.block);
      if (target) setChecked(blocks, target, command.type === 'check', manifest);
      return;
    }

    case 'check_all':
    case 'uncheck_all': {
      const day = resolve(blocks, command.block);
      if (!day) return;
      const check = command.type === 'check_all';
      for (const child of childrenOf(blocks, day.id)) {
        if (child.excluded) continue;
        const target = resolve(blocks, child.id);
        if (!target) continue;
        // Unchecking goes deepest first, so a place no longer looks done via a backup.
        const targets = check ? [target] : [...descendantsOf(blocks, target.id).reverse(), target];
        for (const item of targets) {
          if (item.type !== 'link' && manifest?.types[item.type]?.checkable) setChecked(blocks, item, check, manifest);
        }
      }
      return;
    }

    case 'exclude':
    case 'include': {
      const block = blocks.get(command.block);
      if (block) blocks.set(block.id, { ...block, excluded: command.type === 'exclude' });
      return;
    }

    case 'delete': {
      const block = blocks.get(command.block);
      if (!block) return;
      const doomed = new Set<BlockId>([block.id, ...descendantsOf(blocks, block.id).map((b) => b.id)]);
      for (const other of blocks.values()) {
        if (other.source && doomed.has(other.source)) doomed.add(other.id);
      }
      for (const id of doomed) blocks.delete(id);
      return;
    }

    case 'restore':
      return; // the data is gone locally; the server response brings it back
  }
}

/** A link's source, or the block itself. */
export function resolve(blocks: BlockMap, id: BlockId): BlockData | undefined {
  const block = blocks.get(id);
  if (block?.source) return blocks.get(block.source) ?? block;
  return block;
}

export function childrenOf(blocks: BlockMap, parent: BlockId | null): BlockData[] {
  const list: BlockData[] = [];
  for (const block of blocks.values()) {
    if (block.parent === parent) list.push(block);
  }
  return list.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function descendantsOf(blocks: BlockMap, id: BlockId): BlockData[] {
  const result: BlockData[] = [];
  const stack = [id];
  const seen = new Set<BlockId>();
  while (stack.length) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const child of childrenOf(blocks, current)) {
      result.push(child);
      stack.push(child.id);
    }
  }
  return result;
}

function setChecked(blocks: BlockMap, block: BlockData, checked: boolean, manifest: Manifest | null): void {
  const rule = manifest?.types[block.type]?.rule ?? 'none';
  const anyChildDone = rule === 'any' && childrenOf(blocks, block.id).some((c) => !c.excluded && c.done);
  blocks.set(block.id, {
    ...block,
    checked,
    checked_at: checked ? new Date().toISOString() : null,
    done: checked || anyChildDone,
  });
}

/** Same gapped placement as the server; only for display until confirmed. */
function orderAfter(blocks: BlockMap, parent: BlockId | null, after: BlockId | null, moving: BlockId | null): number {
  const siblings = childrenOf(blocks, parent).filter((b) => b.id !== moving);
  if (after === null) {
    const first = siblings[0];
    return first ? first.order / 2 : GAP;
  }
  const index = siblings.findIndex((b) => b.id === after);
  const prev = siblings[index];
  if (!prev) return (siblings.at(-1)?.order ?? 0) + GAP;
  const next = siblings[index + 1];
  return next ? (prev.order + next.order) / 2 : prev.order + GAP;
}
