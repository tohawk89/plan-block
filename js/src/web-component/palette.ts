import type { PlanStore } from '../client/store';
import type { BlockData, FieldManifest } from '../client/types';

/**
 * Default colours, matching Tohawk89\PlanBlock\Support\Palette on the
 * server: days take turns through DAY_ROTATION by day number, ideas lists
 * are gray. A colour stored in the block's "color" field wins.
 */
export const DAY_ROTATION = ['coral', 'teal', 'purple', 'amber', 'blue', 'pink', 'green'] as const;
export const POOL_DEFAULT = 'gray';

/** The type's colour field, if it has one. */
export function colorField(store: PlanStore, block: BlockData): FieldManifest | undefined {
  return store.type(block.type)?.fields.find((f) => f.name === 'color' && f.type === 'select');
}

/** Colour name to show for a block, or null for blocks without colours. */
export function colorOf(store: PlanStore, block: BlockData): string | null {
  const field = colorField(store, block);
  if (!field) return null;

  const stored = block.payload.color;
  if (typeof stored === 'string' && (field.options ?? []).some((o) => String(o.value) === stored)) return stored;

  if (block.type === 'timeline') {
    const number = block.day?.number ?? store.children(null).filter((b) => b.type === 'timeline').indexOf(block) + 1;
    return DAY_ROTATION[(Math.max(1, number) - 1) % DAY_ROTATION.length]!;
  }
  if (block.type === 'pool') return POOL_DEFAULT;
  return null;
}
