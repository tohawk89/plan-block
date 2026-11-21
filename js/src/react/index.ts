import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { createPlanStore, type CreatePlanStoreOptions, type InitialData, type PlanSnapshot, type PlanStore } from '../client/store';
import type { Transport } from '../client/transport';
import type { Command, CommandError } from '../client/types';
import type { PlanBlockElement } from '../web-component/element';
import { defineElement, type Labels } from '../web-component';

export * from '../client';
export { renderer, parts, defaultLabels } from '../web-component';

defineElement();

type SyncDetail = { state: PlanSnapshot['syncState']; pending: number; message?: string };

export interface PlanBlockProps {
  /** Plan ULID. Optional when `initial` is given. */
  plan?: string;
  /** API route prefix. Default "/plan-block". */
  endpoint?: string;
  /** Plan data to start from (PlanBlock::initialData(), e.g. an Inertia prop). Read once. */
  initial?: InitialData;
  /** Use your own store instead of creating one. */
  store?: PlanStore;
  /** Custom transport for the created store. Read when the store is created (plan/endpoint change). */
  transport?: Transport;
  readonly?: boolean;
  /** Starting mode: "view" (normal) or "edit". Defaults to what the user last picked for this plan. */
  mode?: 'view' | 'edit';
  shadow?: boolean;
  noStyles?: boolean;
  labels?: Partial<Labels>;
  className?: string;
  style?: CSSProperties;
  onReady?: (store: PlanStore) => void;
  onError?: (error: CommandError) => void;
  onSync?: (detail: SyncDetail) => void;
  onCommand?: (command: Command) => void;
}

export interface PlanBlockHandle {
  readonly store: PlanStore | null;
  readonly element: PlanBlockElement | null;
}

/**
 * <PlanBlock initial={planBlock} /> or <PlanBlock plan="01J..." />
 *
 * The plan editor as a React component (React 18 and 19). Events and
 * properties are wired through a ref, so no custom-element support is
 * needed from React itself.
 */
export const PlanBlock = forwardRef<PlanBlockHandle, PlanBlockProps>(function PlanBlock(props, ref) {
  const elementRef = useRef<PlanBlockElement | null>(null);
  const storeRef = useRef<PlanStore | null>(null);
  const latest = useRef(props);
  latest.current = props;
  // Initial data only matters when the store is (re)created.
  const initial = useRef(props.initial);
  initial.current = props.initial;

  useImperativeHandle(ref, () => ({
    get store() {
      return storeRef.current;
    },
    get element() {
      return elementRef.current;
    },
  }));

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const owned = !props.store;
    const s = props.store ?? createPlanStore({ plan: props.plan ?? initial.current?.plan.id, endpoint: props.endpoint, transport: latest.current.transport });
    storeRef.current = s;

    const offs: Array<() => void> = [];
    const listen = (target: EventTarget, type: string, fn: (event: CustomEvent) => void) => {
      const handler = (event: Event) => fn(event as CustomEvent);
      target.addEventListener(type, handler);
      offs.push(() => target.removeEventListener(type, handler));
    };
    listen(el, 'plan-block:ready', () => latest.current.onReady?.(s));
    listen(el, 'plan-block:error', (e) => latest.current.onError?.(e.detail.error));
    listen(el, 'plan-block:sync', (e) => latest.current.onSync?.(e.detail));
    listen(s, 'command', (e) => latest.current.onCommand?.(e.detail.command));

    if (latest.current.labels) el.labels = latest.current.labels;
    void el.useStore(s, { initial: initial.current });

    return () => {
      offs.forEach((off) => off());
      if (owned) s.destroy();
      storeRef.current = null;
    };
    // transport is read from `latest` so an inline `new Transport()` does not
    // re-create the store on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.plan, props.endpoint, props.store]);

  useEffect(() => {
    if (elementRef.current && props.labels) elementRef.current.labels = props.labels;
  }, [props.labels]);

  return createElement('plan-block', {
    ref: elementRef,
    className: props.className,
    style: props.style,
    // Present-or-absent attributes; '' / undefined works in React 18 and 19.
    readonly: props.readonly ? '' : undefined,
    mode: props.mode,
    shadow: props.shadow ? '' : undefined,
    'no-styles': props.noStyles ? '' : undefined,
  });
});

/** Live, read-only state of a store; re-renders on every change. */
export function usePlanSnapshot(store: PlanStore | null): PlanSnapshot | null {
  const subscribe = useCallback((onChange: () => void) => (store ? store.subscribe(onChange) : () => {}), [store]);
  const get = () => (store ? store.getSnapshot() : null);
  return useSyncExternalStore(subscribe, get, get);
}

/**
 * Create and own a store for a fully custom UI (no <plan-block> element).
 * Starts from `initial` if given, otherwise loads. Re-created when plan or
 * endpoint change (other options are read at creation); destroyed on unmount.
 */
export function usePlanStore(options: CreatePlanStoreOptions & { initial?: InitialData }): {
  store: PlanStore | null;
  snapshot: PlanSnapshot | null;
  error: Error | null;
} {
  const [store, setStore] = useState<PlanStore | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // Read when the store is created, so inline objects do not re-create it.
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const { initial, ...rest } = latest.current;
    const s = createPlanStore({ ...rest, plan: rest.plan ?? initial?.plan.id });
    setError(null);
    if (initial) s.hydrate(initial);
    else s.load().catch((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))));
    setStore(s);
    return () => s.destroy();
  }, [options.plan, options.endpoint]);

  return { store, snapshot: usePlanSnapshot(store), error };
}
