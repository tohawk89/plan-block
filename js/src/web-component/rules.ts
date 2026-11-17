import type { PlanStore } from '../client/store';

/**
 * Whether a block of type `childType` may go inside `parentId` (null = the
 * plan's top level). Mirrors the server's placement rules so the UI only
 * offers valid moves; the server still decides.
 *
 * @param moving the block being moved, if any: it is not counted against
 *               limits and cannot go inside itself.
 */
export function canContain(store: PlanStore, parentId: string | null, childType: string, moving?: string): boolean {
  const child = store.type(childType);
  if (!child) return false;

  if (parentId === null) return child.root;

  const parent = store.get(parentId);
  const parentType = parent ? store.type(parent.type) : undefined;
  if (!parent || !parentType) return false;

  if (moving && (parentId === moving || isInside(store, parentId, moving))) return false;

  const rules = parentType.children;
  const permitted = rules.allow.includes(childType) || (rules.any_content && !child.structural);
  const parentAllowed = child.parents === null || child.parents.includes(parent.type);
  if (!permitted || !parentAllowed) return false;

  const max = rules.max[childType];
  if (max === undefined) return true;

  const count = store.children(parentId).filter((b) => b.type === childType && b.id !== moving).length;
  return count < max;
}

/** Whether `id` is nested (at any depth) under `ancestor`. */
function isInside(store: PlanStore, id: string, ancestor: string): boolean {
  let current = store.get(id);
  const seen = new Set<string>();
  while (current?.parent && !seen.has(current.id)) {
    if (current.parent === ancestor) return true;
    seen.add(current.id);
    current = store.get(current.parent);
  }
  return false;
}
