import type { Command, CommandError, CommandSuccess, DeleteImpact, Manifest, PlanResponse } from './types';

/**
 * How the store talks to the server. Swap it for tests, Inertia, or a
 * custom backend.
 */
export interface Transport {
  loadPlan(): Promise<PlanResponse>;
  loadManifest(): Promise<Manifest>;
  /** Resolves on success; throws RejectedError (do not retry) or TransportError (retry). */
  send(baseVersion: number, commands: Command[]): Promise<CommandSuccess>;
  deleteImpact(blockId: string): Promise<DeleteImpact>;
}

/** The server refused the batch. Retrying will not help. */
export class RejectedError extends Error {
  constructor(public readonly error: CommandError) {
    super(error.message);
    this.name = 'RejectedError';
  }
}

/** Network failure or server error. Safe to retry. */
export class TransportError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'TransportError';
  }
}

export interface HttpTransportOptions {
  /** Route prefix, e.g. "/plan-block". */
  endpoint: string;
  /** Plan ULID. */
  plan: string;
  /** Defaults to the content of <meta name="csrf-token">. */
  csrfToken?: string | null;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

/**
 * Talks to the package's JSON routes using the browser session (cookies)
 * and Laravel's CSRF token.
 */
export class HttpTransport implements Transport {
  private readonly endpoint: string;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: HttpTransportOptions) {
    this.endpoint = options.endpoint.replace(/\/+$/, '');
    this.fetchFn = options.fetch ?? ((input, init) => fetch(input, init));
  }

  loadPlan(): Promise<PlanResponse> {
    return this.request('GET', `/plans/${this.options.plan}`);
  }

  loadManifest(): Promise<Manifest> {
    return this.request('GET', '/manifest');
  }

  send(baseVersion: number, commands: Command[]): Promise<CommandSuccess> {
    return this.request('POST', `/plans/${this.options.plan}/commands`, { base_version: baseVersion, commands });
  }

  deleteImpact(blockId: string): Promise<DeleteImpact> {
    return this.request('GET', `/plans/${this.options.plan}/blocks/${blockId}/delete-impact`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...this.options.headers,
    };

    const csrf = this.options.csrfToken !== undefined ? this.options.csrfToken : readCsrfToken();
    if (csrf) headers['X-CSRF-TOKEN'] = csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await this.fetchFn(this.endpoint + path, {
        method,
        headers,
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new TransportError(error instanceof Error ? error.message : 'Network error');
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const data = (await response.json().catch(() => null)) as { error?: CommandError; message?: string } | null;

    if (response.status === 422) {
      throw new RejectedError(data?.error ?? { reason: 'invalid_request', message: data?.message ?? 'The request was invalid.' });
    }

    const final: Record<number, CommandError> = {
      401: { reason: 'unauthenticated', message: 'You are signed out. Sign in again to keep editing.' },
      403: { reason: 'forbidden', message: 'You do not have permission to edit this plan.' },
      404: { reason: 'not_found', message: 'This plan no longer exists.' },
      419: { reason: 'session_expired', message: 'Your session expired. Reload the page to keep editing.' },
    };

    const rejection = final[response.status];
    if (rejection) throw new RejectedError(rejection);

    throw new TransportError(data?.message ?? `Server error (${response.status})`, response.status);
  }
}

function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? null;
}
