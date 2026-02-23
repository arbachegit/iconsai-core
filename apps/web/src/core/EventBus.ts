/**
 * EventBus - Typed Event System for Agent Communication
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Provides decoupled communication between agents and core components
 * using a publish/subscribe pattern with TypeScript type safety.
 */

import type { EventMap } from './types';

type EventCallback<T> = T extends void ? () => void : (data: T) => void;

interface EventSubscription {
  unsubscribe: () => void;
}

class EventBusClass {
  private listeners: Map<keyof EventMap, Set<EventCallback<unknown>>>;
  private debugMode: boolean;

  constructor() {
    this.listeners = new Map();
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  /**
   * Subscribe to an event
   * @param event - Event name from EventMap
   * @param callback - Handler function
   * @returns Subscription object with unsubscribe method
   */
  on<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const listeners = this.listeners.get(event)!;
    listeners.add(callback as EventCallback<unknown>);

    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to "${String(event)}", total listeners: ${listeners.size}`);
    }

    return {
      unsubscribe: () => {
        listeners.delete(callback as EventCallback<unknown>);
        if (this.debugMode) {
          console.log(`[EventBus] Unsubscribed from "${String(event)}", remaining: ${listeners.size}`);
        }
      },
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first call)
   * @param event - Event name from EventMap
   * @param callback - Handler function
   * @returns Subscription object with unsubscribe method
   */
  once<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): EventSubscription {
    const subscription = this.on(event, ((data: EventMap[K]) => {
      subscription.unsubscribe();
      (callback as EventCallback<EventMap[K]>)(data);
    }) as EventCallback<EventMap[K]>);

    return subscription;
  }

  /**
   * Emit an event with optional data
   * @param event - Event name from EventMap
   * @param data - Event data (optional for void events)
   */
  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    const listeners = this.listeners.get(event);

    if (this.debugMode) {
      console.log(`[EventBus] Emitting "${String(event)}"`, args[0] ?? '(no data)');
    }

    if (!listeners || listeners.size === 0) {
      return;
    }

    const data = args[0];
    listeners.forEach((callback) => {
      try {
        if (data !== undefined) {
          (callback as (data: unknown) => void)(data);
        } else {
          (callback as () => void)();
        }
      } catch (error) {
        console.error(`[EventBus] Error in listener for "${String(event)}":`, error);
      }
    });
  }

  /**
   * Remove all listeners for a specific event
   * @param event - Event name from EventMap
   */
  off<K extends keyof EventMap>(event: K): void {
    this.listeners.delete(event);
    if (this.debugMode) {
      console.log(`[EventBus] Removed all listeners for "${String(event)}"`);
    }
  }

  /**
   * Remove all listeners for all events
   */
  clear(): void {
    this.listeners.clear();
    if (this.debugMode) {
      console.log('[EventBus] Cleared all listeners');
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event - Event name from EventMap
   * @returns Number of listeners
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Enable or disable debug mode
   * @param enabled - Whether to enable debug logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

// Singleton instance
export const EventBus = new EventBusClass();

// React hook for EventBus subscriptions
import { useEffect, useRef } from 'react';

/**
 * React hook for subscribing to EventBus events
 * Automatically unsubscribes on component unmount
 */
export function useEventBus<K extends keyof EventMap>(
  event: K,
  callback: EventCallback<EventMap[K]>,
  deps: React.DependencyList = []
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const subscription = EventBus.on(event, ((data: EventMap[K]) => {
      callbackRef.current(data);
    }) as EventCallback<EventMap[K]>);

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

export default EventBus;
