/**
 * Every user-facing string. Override any of them with element.labels = {...}.
 */
export interface Labels {
  addDay: string;
  addPool: string;
  add: (typeLabel: string) => string;
  /** The "+ Add" button that opens a list of block types. */
  addMenu: string;
  /** Mode switch: group name and its two buttons. */
  mode: string;
  viewMode: string;
  editMode: string;
  /** The "⋯" button that opens a block's actions. */
  moreActions: string;
  newItem: (typeLabel: string) => string;
  day: (n: number) => string;
  pool: string;
  checkAll: string;
  markDone: (name: string) => string;
  progress: (done: number, total: number) => string;
  poolProgress: (done: number, total: number) => string;
  edit: string;
  save: string;
  cancel: string;
  delete: string;
  moveUp: string;
  moveDown: string;
  dragHandle: string;
  exclude: string;
  include: string;
  addToDay: string;
  linked: string;
  /** Badge on a linked copy: where the original lives. */
  linkedFrom: (where: string) => string;
  doneViaBackup: string;
  openMap: string;
  saving: string;
  offline: string;
  deleted: string;
  undo: string;
  dismiss: string;
  empty: string;
  /** Empty plan in normal mode. */
  emptyView: string;
  /** Empty plan for readonly viewers. */
  emptyReadonly: string;
  loading: string;
  loadFailed: string;
  confirmDeleteLinked: (where: string) => string;
}

export const defaultLabels: Labels = {
  addDay: '+ Day',
  addPool: '+ Ideas',
  add: (type) => `+ ${type}`,
  addMenu: '+ Add',
  mode: 'Mode',
  viewMode: 'Normal',
  editMode: 'Edit',
  moreActions: 'More actions',
  newItem: (type) => `New ${type.toLowerCase()}`,
  day: (n) => `Day ${n}`,
  pool: 'Ideas',
  checkAll: 'Check all items',
  markDone: (name) => `Mark "${name}" done`,
  progress: (done, total) => `${done}/${total}`,
  poolProgress: (done, total) => `${done} of ${total} done`,
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  moveUp: 'Move up',
  moveDown: 'Move down',
  dragHandle: 'Drag to move (or focus and use the arrow keys)',
  exclude: 'Skip',
  include: 'Undo skip',
  addToDay: 'Add to day…',
  linked: 'linked',
  linkedFrom: (where) => `Also in ${where}`,
  doneViaBackup: 'done via backup',
  openMap: 'Map',
  saving: 'Saving…',
  offline: 'Offline. Changes are saved on this device and will be sent when you reconnect.',
  deleted: 'Deleted.',
  undo: 'Undo',
  dismiss: 'Dismiss',
  empty: 'Nothing planned yet. Add a day, or an ideas list for places you might visit.',
  emptyView: 'Nothing planned yet. Switch to Edit to start.',
  emptyReadonly: 'Nothing planned yet.',
  loading: 'Loading plan…',
  loadFailed: 'Could not load this plan.',
  confirmDeleteLinked: (where) => `This also appears in ${where}. Delete it everywhere?`,
};
