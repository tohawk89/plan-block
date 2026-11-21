import {
  defineComponent,
  h,
  isRef,
  onBeforeUnmount,
  onMounted,
  onScopeDispose,
  shallowRef,
  watch,
  type PropType,
  type Ref,
  type ShallowRef,
} from 'vue';
import { createPlanStore, type CreatePlanStoreOptions, type InitialData, type PlanSnapshot, type PlanStore } from '../client/store';
import type { Transport } from '../client/transport';
import type { Command, CommandError } from '../client/types';
import type { PlanBlockElement } from '../web-component/element';
import { defineElement, type Labels } from '../web-component';

export * from '../client';
export { renderer, parts, defaultLabels } from '../web-component';

defineElement();

type SyncDetail = { state: PlanSnapshot['syncState']; pending: number; message?: string };

/**
 * <PlanBlock :initial="planBlock" /> or <PlanBlock plan="01J..." />
 *
 * The plan editor as a Vue component. Pass `initial` (from
 * PlanBlock::initialData() in PHP, e.g. an Inertia prop) to show it
 * without requests, or `plan` to load it from the JSON API.
 */
export const PlanBlock = defineComponent({
  name: 'PlanBlock',
  props: {
    /** Plan ULID. Optional when `initial` is given. */
    plan: { type: String, default: undefined },
    /** API route prefix. */
    endpoint: { type: String, default: '/plan-block' },
    /** Plan data to start from (PlanBlock::initialData()). */
    initial: { type: Object as PropType<InitialData>, default: undefined },
    /** Use your own store instead of creating one. */
    store: { type: Object as PropType<PlanStore>, default: undefined },
    /** Custom transport, read when the store is created (plan/endpoint change). */
    transport: { type: Object as PropType<Transport>, default: undefined },
    readonly: { type: Boolean, default: false },
    /** Starting mode: "view" (normal) or "edit". Defaults to what the user last picked for this plan. */
    mode: { type: String as PropType<'view' | 'edit'>, default: undefined },
    shadow: { type: Boolean, default: false },
    noStyles: { type: Boolean, default: false },
    labels: { type: Object as PropType<Partial<Labels>>, default: undefined },
  },
  emits: {
    ready: (_store: PlanStore) => true,
    error: (_error: CommandError) => true,
    sync: (_detail: SyncDetail) => true,
    command: (_command: Command) => true,
  },
  setup(props, { emit, expose }) {
    const element = shallowRef<PlanBlockElement | null>(null);
    const store = shallowRef<PlanStore | null>(null);
    let owned = false;
    let cleanups: Array<() => void> = [];

    function disconnect(): void {
      cleanups.forEach((fn) => fn());
      cleanups = [];
      if (owned) store.value?.destroy();
      store.value = null;
      owned = false;
    }

    function connect(): void {
      const el = element.value;
      if (!el) return;
      disconnect();

      const s = props.store ?? createPlanStore({ plan: props.plan ?? props.initial?.plan.id, endpoint: props.endpoint, transport: props.transport });
      owned = !props.store;
      store.value = s;

      const listen = (target: EventTarget, type: string, fn: (event: CustomEvent) => void) => {
        const handler = (event: Event) => fn(event as CustomEvent);
        target.addEventListener(type, handler);
        cleanups.push(() => target.removeEventListener(type, handler));
      };
      listen(el, 'plan-block:ready', () => emit('ready', s));
      listen(el, 'plan-block:error', (e) => emit('error', e.detail.error));
      listen(el, 'plan-block:sync', (e) => emit('sync', e.detail));
      listen(s, 'command', (e) => emit('command', e.detail.command));

      if (props.labels) el.labels = props.labels;
      void el.useStore(s, { initial: props.initial });
    }

    onMounted(connect);
    // `transport` is read when the store is created, so a new object each
    // render does not re-create the store.
    watch(() => [props.plan, props.endpoint, props.store], connect);
    watch(
      () => props.labels,
      (labels) => {
        if (element.value && labels) element.value.labels = labels;
      },
      { deep: true },
    );
    onBeforeUnmount(disconnect);

    expose({ store, element });

    return () =>
      h('plan-block', {
        ref: element,
        readonly: props.readonly ? '' : undefined,
        mode: props.mode,
        shadow: props.shadow ? '' : undefined,
        'no-styles': props.noStyles ? '' : undefined,
      });
  },
});

/**
 * Live, read-only state of a store for your own templates. Updates on every
 * change and sync status change.
 */
export function usePlanSnapshot(store: PlanStore | Ref<PlanStore | null> | null): ShallowRef<PlanSnapshot | null> {
  const snapshot = shallowRef<PlanSnapshot | null>(null);
  let unsubscribe: (() => void) | null = null;

  const attach = (s: PlanStore | null) => {
    unsubscribe?.();
    unsubscribe = null;
    snapshot.value = s ? s.getSnapshot() : null;
    if (s) unsubscribe = s.subscribe(() => (snapshot.value = s.getSnapshot()));
  };

  if (isRef(store)) watch(store, attach, { immediate: true });
  else attach(store);

  onScopeDispose(() => unsubscribe?.());
  return snapshot;
}

/**
 * Create and own a store for a fully custom UI (no <plan-block> element).
 * Starts from `initial` if given, otherwise loads. Destroyed with the
 * component.
 */
export function usePlanStore(options: CreatePlanStoreOptions & { initial?: InitialData }): {
  store: ShallowRef<PlanStore | null>;
  snapshot: ShallowRef<PlanSnapshot | null>;
  error: ShallowRef<Error | null>;
} {
  const store = shallowRef<PlanStore | null>(null);
  const error = shallowRef<Error | null>(null);

  const s = createPlanStore({ ...options, plan: options.plan ?? options.initial?.plan.id });
  store.value = s;
  if (options.initial) s.hydrate(options.initial);
  else s.load().catch((e: unknown) => (error.value = e instanceof Error ? e : new Error(String(e))));

  onScopeDispose(() => s.destroy());

  return { store, snapshot: usePlanSnapshot(store), error };
}
