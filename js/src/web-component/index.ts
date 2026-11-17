import { PlanBlockElement } from './element';

export { PlanBlockElement } from './element';
export { renderer, parts } from './renderers';
export type { Renderer, RenderContext } from './renderers';
export { defaultLabels } from './labels';
export type { Labels } from './labels';
export { h } from './h';

/** Registers the custom element. Safe to call more than once. */
export function defineElement(tag = 'plan-block'): void {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
    customElements.define(tag, tag === 'plan-block' ? PlanBlockElement : class extends PlanBlockElement {});
  }
}

defineElement();
