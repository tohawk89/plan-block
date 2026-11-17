import { applyCommand, childrenOf, type BlockMap } from '../src/client/optimistic';
import { ids, manifest, planResponse } from './helpers';

function blocks(): BlockMap {
  return new Map(planResponse().blocks.map((b) => [b.id, b]));
}

describe('optimistic updates', () => {
  it('check_all checks primaries only, never backups', () => {
    const map = blocks();
    applyCommand(map, { id: 'c', type: 'uncheck', block: ids.backup }, manifest());
    applyCommand(map, { id: 'c', type: 'include', block: ids.lunch }, manifest());
    applyCommand(map, { id: 'c', type: 'check_all', block: ids.day1 }, manifest());

    expect(map.get(ids.breakfast)?.checked).toBe(true);
    expect(map.get(ids.lunch)?.checked).toBe(true);
    expect(map.get(ids.backup)?.checked).toBe(false);
    expect(map.get(ids.note)?.checked).toBe(false); // notes are not checkable
  });

  it('uncheck_all also clears backups', () => {
    const map = blocks();
    applyCommand(map, { id: 'c', type: 'uncheck_all', block: ids.day1 }, manifest());

    expect(map.get(ids.backup)?.checked).toBe(false);
    expect(map.get(ids.breakfast)?.done).toBe(false);
  });

  it('a place stays done via its backup when unchecked', () => {
    const map = blocks();
    applyCommand(map, { id: 'c', type: 'check', block: ids.breakfast }, manifest());
    applyCommand(map, { id: 'c', type: 'uncheck', block: ids.breakfast }, manifest());

    expect(map.get(ids.breakfast)?.done).toBe(true);
  });

  it('deleting a source removes its children and links to it', () => {
    const map = blocks();
    applyCommand(map, { id: 'c', type: 'delete', block: ids.museum }, manifest());

    expect(map.has(ids.museum)).toBe(false);
    expect(map.has(ids.link)).toBe(false);
    expect(map.has(ids.pool)).toBe(true);
  });

  it('moves blocks using gapped positions', () => {
    const map = blocks();
    applyCommand(map, { id: 'c', type: 'move', block: ids.note, args: { after: null } }, manifest());
    expect(childrenOf(map, ids.day1).map((b) => b.id)).toEqual([ids.note, ids.breakfast, ids.lunch]);

    applyCommand(map, { id: 'c', type: 'move', block: ids.note, args: { parent: ids.day2, after: ids.link } }, manifest());
    expect(childrenOf(map, ids.day2).map((b) => b.id)).toEqual([ids.link, ids.note]);
  });

  it('fills field defaults on create', () => {
    const map = blocks();
    const m = manifest();
    m.types.place!.fields.push({ name: 'budget', type: 'number', label: 'Budget', required: false, default: 50 });
    applyCommand(map, { id: 'c', type: 'create', block: 'new', args: { type: 'place', parent: ids.day2, payload: { name: 'X' } } }, m);

    expect(map.get('new')?.payload).toEqual({ budget: 50, name: 'X' });
  });
});
