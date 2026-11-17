import { RejectedError, TransportError, type Transport } from './transport';
import type { Command, CommandError, CommandSuccess, DeleteImpact, Manifest, PlanResponse } from './types';

/** The part of Livewire's $wire this transport uses (Livewire 3 and 4). */
export interface LivewireWire {
  $call(method: string, ...params: unknown[]): Promise<unknown>;
}

type PlanData = PlanResponse & { manifest: Manifest };

/**
 * Sends commands through the <livewire:plan-block> component instead of the
 * JSON API: $wire.$call('runCommands', ...). Accepts the $wire object or a
 * function resolving it later (Livewire may start after the editor).
 */
export class LivewireTransport implements Transport {
  private planData: Promise<PlanData> | null = null;

  constructor(
    private readonly wire: LivewireWire | (() => Promise<LivewireWire>),
    private readonly timeoutMs = 30000,
  ) {}

  async loadPlan(): Promise<PlanResponse> {
    const { plan, blocks } = await this.loadPlanData();
    return { plan, blocks };
  }

  async loadManifest(): Promise<Manifest> {
    return (await this.loadPlanData()).manifest;
  }

  async send(baseVersion: number, commands: Command[]): Promise<CommandSuccess> {
    const result = (await this.call('runCommands', commands, baseVersion)) as CommandSuccess | { ok: false; error: CommandError };
    if (!result.ok) throw new RejectedError(result.error);
    return result;
  }

  deleteImpact(blockId: string): Promise<DeleteImpact> {
    return this.call('deleteImpact', blockId) as Promise<DeleteImpact>;
  }

  /** One request serves both loadPlan() and loadManifest(). */
  private loadPlanData(): Promise<PlanData> {
    this.planData ??= (this.call('planData') as Promise<PlanData>).finally(() => {
      queueMicrotask(() => (this.planData = null));
    });
    return this.planData;
  }

  private async call(method: string, ...params: unknown[]): Promise<unknown> {
    const wire = typeof this.wire === 'function' ? await this.wire() : this.wire;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        wire.$call(method, ...params),
        // Livewire 3 can leave the promise pending when a request fails.
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new TransportError('Livewire request timed out')), this.timeoutMs);
        }),
      ]);
    } catch (error) {
      throw toTransportError(error);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Livewire 4 rejects with { status, body, json }; status is null on network errors. */
function toTransportError(error: unknown): Error {
  if (error instanceof RejectedError || error instanceof TransportError) return error;

  const status = typeof error === 'object' && error !== null && 'status' in error ? (error as { status: number | null }).status : null;

  const final: Record<number, CommandError> = {
    401: { reason: 'unauthenticated', message: 'You are signed out. Sign in again to keep editing.' },
    403: { reason: 'forbidden', message: 'You do not have permission to edit this plan.' },
    404: { reason: 'not_found', message: 'This plan no longer exists.' },
    419: { reason: 'session_expired', message: 'Your session expired. Reload the page to keep editing.' },
  };

  const rejection = status !== null ? final[status] : undefined;
  if (rejection) return new RejectedError(rejection);

  return new TransportError(status ? `Server error (${status})` : error instanceof Error ? error.message : 'Network error', status ?? undefined);
}
