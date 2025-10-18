/**
 * BOC-20: Core Audio Infrastructure
 * Event-driven coordination bus for decoupling webhook processing from music generation
 *
 * IMPORTANT: AudioEventBus decouples webhook processing from audio generation
 * Webhook Handler publishes events → Services subscribe and respond
 */

import { EventCallback, UnsubscribeFn, Subscription } from '../types/index.js';

export class AudioEventBus {
  private subscribers: Map<string, Subscription[]>;

  constructor() {
    this.subscribers = new Map();
  }

  /**
   * Subscribe to an event
   * @param event Event name (e.g., 'webhook:github:push')
   * @param callback Function to call when event is published
   * @returns Unsubscribe function
   */
  public subscribe<T = any>(event: string, callback: EventCallback<T>): UnsubscribeFn {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    const id = Symbol('subscriber');
    const subscription: Subscription = { id, callback };

    this.subscribers.get(event)!.push(subscription);

    // Return unsubscribe function
    return () => this.unsubscribe(event, id);
  }

  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param subscriberId Subscriber ID to remove
   */
  private unsubscribe(event: string, subscriberId: symbol): void {
    const callbacks = this.subscribers.get(event);
    if (!callbacks) return;

    const index = callbacks.findIndex((sub) => sub.id === subscriberId);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }

    // Clean up empty event arrays
    if (callbacks.length === 0) {
      this.subscribers.delete(event);
    }
  }

  /**
   * Publish an event to all subscribers
   * @param event Event name
   * @param data Data to pass to subscribers
   */
  public async publish<T = any>(event: string, data?: T): Promise<void> {
    const callbacks = this.subscribers.get(event);
    if (!callbacks || callbacks.length === 0) {
      // No subscribers for this event
      return;
    }

    // Execute all callbacks
    // Use Promise.allSettled to ensure all callbacks run even if some fail
    const results = await Promise.allSettled(
      callbacks.map(({ callback }) =>
        Promise.resolve().then(() => callback(data))
      )
    );

    // Log any errors but don't throw
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Error in subscriber for event "${event}":`,
          result.reason
        );
      }
    });
  }

  /**
   * Publish an event synchronously (fire and forget)
   * Use when you don't need to wait for subscribers to complete
   */
  public publishSync<T = any>(event: string, data?: T): void {
    const callbacks = this.subscribers.get(event);
    if (!callbacks) return;

    callbacks.forEach(({ callback }) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in subscriber for event "${event}":`, error);
      }
    });
  }

  /**
   * Clear all subscribers for an event
   * @param event Event name to clear (if not provided, clears all)
   */
  public clear(event?: string): void {
    if (event) {
      this.subscribers.delete(event);
    } else {
      this.subscribers.clear();
    }
  }

  /**
   * Get the number of subscribers for an event
   */
  public getSubscriberCount(event: string): number {
    return this.subscribers.get(event)?.length || 0;
  }

  /**
   * Get all registered event names
   */
  public getEventNames(): string[] {
    return Array.from(this.subscribers.keys());
  }
}
