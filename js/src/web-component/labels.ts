/**
 * Every user-facing string. Override any of them with element.labels = {...}.
 */
export interface Labels {
  addDay: string;
  addPool: string;
  add: (typeLabel: string) => string;
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
  exclude: string;
  include: string;
  addToDay: string;
  linked: string;
  doneViaBackup: string;
  openMap: string;
  saving: string;
  offline: string;
  deleted: string;
  undo: string;
  dismiss: string;
  empty: string;
  loading: string;
  loadFailed: string;
  confirmDeleteLinked: (where: string) => string;
}

export const defaultLabels: Labels = {
  addDay: '+ Day',
  addPool: '+ Pool',
  add: (type) => `+ ${type}`,
  newItem: (type) => `New ${type.toLowerCase()}`,
  day: (n) => `Day ${n}`,
  pool: 'Pool',
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
  exclude: 'Skip (do not count)',
  include: 'Count again',
  addToDay: 'Add to day…',
  linked: 'linked',
  doneViaBackup: 'done via backup',
  openMap: 'Map',
  saving: 'Saving…',
  offline: 'Offline. Changes are saved on this device and will be sent when you reconnect.',
  deleted: 'Deleted.',
  undo: 'Undo',
  dismiss: 'Dismiss',
  empty: 'Nothing planned yet. Add a day or a pool to start.',
  loading: 'Loading plan…',
  loadFailed: 'Could not load this plan.',
  confirmDeleteLinked: (where) => `This also appears in ${where}. Delete it everywhere?`,
};
