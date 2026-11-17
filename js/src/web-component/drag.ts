import type { PlanStore } from '../client/store';
import { canContain } from './rules';

type Position = 'before' | 'after' | 'inside';

interface Drop {
  el: HTMLElement;
  position: Position;
  parent: string | null;
  after: string | null;
}

interface DragState {
  id: string;
  el: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  started: boolean;
  ghost: HTMLElement | null;
  drop: Drop | null;
  frame: number;
}

export interface DragHost {
  readonly root: HTMLElement | ShadowRoot;
  readonly container: HTMLElement | null;
  readonly store: PlanStore | null;
  readonly readonly: boolean;
  move(id: string, parent: string | null, after: string | null): void;
}

/** Pixels the pointer must travel before a press becomes a drag. */
const THRESHOLD = 4;
/** Distance from the viewport edge where auto-scroll starts. */
const EDGE = 56;
const MAX_SCROLL = 14;

/**
 * Drag-and-drop reordering with pointer events, so mouse, touch and pen
 * all work (native HTML5 drag-and-drop does not work on touch screens).
 * Drags start from elements marked data-pb-drag-handle.
 *
 * The dragged block stays in place (dimmed) while a copy follows the
 * pointer; the drop position is shown with data-pb-drop="before|after|
 * inside" on the target block. Escape cancels.
 */
export class DragController {
  private state: DragState | null = null;

  constructor(private readonly host: DragHost) {}

  get dragging(): boolean {
    return this.state?.started ?? false;
  }

  readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const store = this.host.store;
    const handle = (event.target as Element | null)?.closest<HTMLElement>('[data-pb-drag-handle]');
    if (!handle || !store || this.host.readonly || this.state) return;

    const el = handle.closest<HTMLElement>('[data-pb-key]');
    const id = el?.dataset.pbId;
    if (!el || !id || !store.get(id)) return;

    event.preventDefault();
    try {
      handle.setPointerCapture?.(event.pointerId);
    } catch {
      // not supported for this pointer: window listeners still track it
    }

    this.state = {
      id,
      el,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      offsetX: 0,
      offsetY: 0,
      started: false,
      ghost: null,
      drop: null,
      frame: 0,
    };

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.cancel);
    window.addEventListener('keydown', this.onKeyDown, true);
  };

  readonly cancel = (): void => {
    this.finish(false);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const state = this.state;
    if (!state || event.pointerId !== state.pointerId) return;

    state.x = event.clientX;
    state.y = event.clientY;

    if (!state.started) {
      if (Math.hypot(state.x - state.startX, state.y - state.startY) < THRESHOLD) return;
      this.begin(state);
    }

    event.preventDefault();
    this.positionGhost(state);
    this.updateDrop(state);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.state && event.pointerId === this.state.pointerId) this.finish(true);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.state) {
      event.preventDefault();
      event.stopPropagation();
      this.finish(false);
    }
  };

  private begin(state: DragState): void {
    state.started = true;
    const rect = state.el.getBoundingClientRect();
    state.offsetX = state.startX - rect.left;
    state.offsetY = state.startY - rect.top;

    const ghost = state.el.cloneNode(true) as HTMLElement;
    // The copy must not look like a real block to queries or hit tests.
    for (const node of [ghost, ...ghost.querySelectorAll<HTMLElement>('*')]) {
      for (const attr of ['data-pb-key', 'data-pb-id', 'data-pb-action', 'data-pb-drag-handle', 'id', 'name']) node.removeAttribute(attr);
    }
    ghost.classList.add('pb-drag-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.width = `${rect.width}px`;
    state.ghost = ghost;

    state.el.dataset.pbDragging = '';
    this.host.container?.classList.add('pb-root--dragging');
    // Outside the re-rendered container, so updates mid-drag keep it.
    this.host.root.append(ghost);

    const loop = () => {
      if (!this.state?.started) return;
      this.autoScroll(this.state);
      this.state.frame = requestAnimationFrame(loop);
    };
    state.frame = requestAnimationFrame(loop);
  }

  private positionGhost(state: DragState): void {
    if (!state.ghost) return;
    state.ghost.style.transform = `translate(${state.x - state.offsetX}px, ${state.y - state.offsetY}px)`;
  }

  private autoScroll(state: DragState): void {
    const height = window.innerHeight;
    let delta = 0;
    if (state.y < EDGE) delta = -MAX_SCROLL * (1 - state.y / EDGE);
    else if (state.y > height - EDGE) delta = MAX_SCROLL * (1 - (height - state.y) / EDGE);
    if (delta !== 0) {
      window.scrollBy(0, delta);
      this.updateDrop(state);
    }
  }

  private updateDrop(state: DragState): void {
    const drop = this.findDrop(state);
    if (state.drop && (state.drop.el !== drop?.el || state.drop.position !== drop?.position)) {
      delete state.drop.el.dataset.pbDrop;
    }
    if (drop) drop.el.dataset.pbDrop = drop.position;
    state.drop = drop;
  }

  /**
   * From the block under the pointer outwards, the first place the dragged
   * block may go: next to a block (before/after by the pointer's half), or
   * at the end of a group it may go inside.
   */
  private findDrop(state: DragState): Drop | null {
    const store = this.host.store;
    const dragged = store?.get(state.id);
    if (!store || !dragged) return null;

    const root = this.host.root;
    const hit = (root instanceof ShadowRoot ? root : document).elementFromPoint(state.x, state.y);
    if (!hit || !(root instanceof ShadowRoot ? root.contains(hit) : root.contains(hit))) return null;

    let candidate = hit.closest<HTMLElement>('[data-pb-key]');

    while (candidate) {
      if (candidate === state.el || state.el.contains(candidate)) return null;

      const id = candidate.dataset.pbId!;
      const block = store.get(id);
      if (!block) return null;

      // Next to this block, in its parent.
      if (canContain(store, block.parent, dragged.type, dragged.id)) {
        const rect = candidate.getBoundingClientRect();
        const position: Position = state.y < rect.top + rect.height / 2 ? 'before' : 'after';
        return { el: candidate, position, parent: block.parent, after: this.afterFor(block.parent, id, position, dragged.id) };
      }

      // Inside this block (for links, inside the linked group).
      const target = store.resolve(id) ?? block;
      if (canContain(store, target.id, dragged.type, dragged.id)) {
        const last = store.children(target.id).filter((b) => b.id !== dragged.id).at(-1);
        return { el: candidate, position: 'inside', parent: target.id, after: last?.id ?? null };
      }

      candidate = candidate.parentElement?.closest<HTMLElement>('[data-pb-key]') ?? null;
    }

    return null;
  }

  private afterFor(parent: string | null, refId: string, position: Position, draggedId: string): string | null {
    if (position === 'after') return refId;
    const siblings = this.host.store!.children(parent).filter((b) => b.id !== draggedId);
    const index = siblings.findIndex((b) => b.id === refId);
    return index > 0 ? siblings[index - 1]!.id : null;
  }

  private finish(commit: boolean): void {
    const state = this.state;
    if (!state) return;
    this.state = null;

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.cancel);
    window.removeEventListener('keydown', this.onKeyDown, true);
    cancelAnimationFrame(state.frame);

    state.ghost?.remove();
    delete state.el.dataset.pbDragging;
    if (state.drop) delete state.drop.el.dataset.pbDrop;
    this.host.container?.classList.remove('pb-root--dragging');

    if (!commit || !state.started || !state.drop) return;

    const block = this.host.store?.get(state.id);
    if (!block) return;

    const { parent, after } = state.drop;
    const siblings = this.host.store!.children(block.parent);
    const currentAfter = siblings[siblings.findIndex((b) => b.id === block.id) - 1]?.id ?? null;

    if (parent !== block.parent || after !== currentAfter) {
      this.host.move(block.id, parent, after);
    }
  }
}
