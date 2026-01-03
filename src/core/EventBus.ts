import type {
  GameEventType,
  GameEventPayload,
  EventHandler,
  EventSubscription,
} from './types';

/**
 * Central event bus for game-wide pub/sub communication.
 * All game systems communicate through events for loose coupling.
 */
export class EventBus {
  private handlers: Map<GameEventType, Set<EventHandler<GameEventPayload>>> = new Map();

  /**
   * Subscribe to an event type.
   * @param event - The event type to listen for
   * @param handler - Function to call when event is emitted
   * @returns Subscription object with unsubscribe method
   */
  on<T extends GameEventPayload>(
    event: GameEventType,
    handler: EventHandler<T>
  ): EventSubscription {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const handlers = this.handlers.get(event)!;
    handlers.add(handler as EventHandler<GameEventPayload>);

    return {
      unsubscribe: () => {
        handlers.delete(handler as EventHandler<GameEventPayload>);
      },
    };
  }

  /**
   * Subscribe to an event type, but only receive it once.
   * @param event - The event type to listen for
   * @param handler - Function to call when event is emitted
   * @returns Subscription object with unsubscribe method
   */
  once<T extends GameEventPayload>(
    event: GameEventType,
    handler: EventHandler<T>
  ): EventSubscription {
    const wrappedHandler: EventHandler<T> = (payload) => {
      subscription.unsubscribe();
      handler(payload);
    };

    const subscription = this.on(event, wrappedHandler);
    return subscription;
  }

  /**
   * Emit an event to all subscribers.
   * @param event - The event type to emit
   * @param payload - Data to pass to handlers
   */
  emit<T extends GameEventPayload>(event: GameEventType, payload: T): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    // Create a copy to avoid issues if handlers modify the set
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }

  /**
   * Remove all handlers for a specific event type.
   * @param event - The event type to clear
   */
  clear(event: GameEventType): void {
    this.handlers.delete(event);
  }

  /**
   * Remove all handlers for all event types.
   */
  clearAll(): void {
    this.handlers.clear();
  }

  /**
   * Get the number of handlers for an event type.
   * Useful for debugging.
   */
  getHandlerCount(event: GameEventType): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}
