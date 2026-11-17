// Entry for the prebuilt script served by the Laravel package
// (resources/dist/plan-block.js). Defines <plan-block> and exposes
// window.PlanBlock for custom renderers and stores without a bundler.
import { HttpTransport, LivewireTransport, PlanStore, RejectedError, TransportError, ulid } from './client';
import { PlanBlockElement, defaultLabels, defineElement, h, parts, renderer } from './web-component';

const api = { PlanStore, HttpTransport, LivewireTransport, RejectedError, TransportError, PlanBlockElement, renderer, parts, h, defaultLabels, defineElement, ulid };

declare global {
  interface Window {
    PlanBlock: typeof api;
  }
}

window.PlanBlock = api;
