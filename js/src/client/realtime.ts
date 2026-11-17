import type { PlanStore } from './store';
import type { RemoteChange } from './types';

/**
 * Where broadcast changes come from. Laravel Echo is supported out of the
 * box (echoSource); implement this to use anything else.
 */
export interface RealtimeSource {
  /**
   * Listen on a private channel. `onReconnect` runs after the connection
   * drops and comes back (messages may have been missed). Returns a
   * function that stops listening.
   */
  subscribe(channel: string, event: string, onMessage: (change: RemoteChange) => void, onReconnect: () => void): () => void;
}

/** The parts of Laravel Echo used here. */
export interface EchoLike {
  private(channel: string): {
    listen(event: string, callback: (data: unknown) => void): unknown;
    stopListening(event: string, callback?: (data: unknown) => void): unknown;
  };
  connector?: {
    pusher?: {
      connection?: {
        state?: string;
        bind(event: string, cb: (states: { previous: string; current: string }) => void): void;
        unbind(event: string, cb?: unknown): void;
      };
    };
  };
}

/** Use Laravel Echo (Reverb, Pusher, Ably via Pusher protocol, ...). */
export function echoSource(echo: EchoLike): RealtimeSource {
  return {
    subscribe(channel, event, onMessage, onReconnect) {
      const handler = (data: unknown) => onMessage(data as RemoteChange);
      // The leading dot tells Echo the name is not namespaced (broadcastAs).
      const subscription = echo.private(channel);
      subscription.listen(`.${event}`, handler);

      // Pusher-protocol connections (Reverb, Pusher): reload after the
      // connection comes back, since messages may have been missed.
      const connection = echo.connector?.pusher?.connection;
      // Only a connection that was up and then dropped can have missed messages.
      let wasConnected = connection?.state === 'connected';
      let dropped = false;
      const onStateChange = (states: { previous: string; current: string }) => {
        if (states.current === 'connected') {
          if (wasConnected && dropped) onReconnect();
          wasConnected = true;
          dropped = false;
        } else if (wasConnected) {
          dropped = true;
        }
      };
      connection?.bind('state_change', onStateChange);

      return () => {
        subscription.stopListening(`.${event}`, handler);
        connection?.unbind('state_change', onStateChange);
      };
    },
  };
}

/**
 * Feed broadcast changes for the store's plan into the store. Does nothing
 * (returns a no-op) when the server has realtime turned off. Reloads after
 * a reconnect, since messages may have been missed.
 */
export function connectRealtime(store: PlanStore, source: RealtimeSource): () => void {
  const realtime = store.manifest?.realtime;
  if (!realtime?.enabled || !store.plan) return () => {};

  return source.subscribe(
    realtime.channel_prefix + store.plan.id,
    realtime.event,
    (change) => store.applyRemote(change),
    () => void store.reload().catch(() => {}),
  );
}
