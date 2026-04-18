/**
 * Observer Pattern — decouples event side-effects from core business logic.
 * Listeners can be registered to react to domain events (registration, check-in, etc.)
 * without the service knowing about them.
 */

export enum EventType {
  REGISTRATION_CREATED = 'REGISTRATION_CREATED',
  CHECK_IN_COMPLETED = 'CHECK_IN_COMPLETED',
  EVENT_CREATED = 'EVENT_CREATED',
  EVENT_STATUS_CHANGED = 'EVENT_STATUS_CHANGED',
}

export interface DomainEvent {
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export type EventListener = (event: DomainEvent) => void;

/**
 * EventEmitter — central hub for the Observer Pattern.
 * Services emit domain events; listeners react (logging, notifications, analytics).
 */
export class EventEmitter {
  private static instance: EventEmitter;
  private listeners: Map<EventType, EventListener[]> = new Map();

  /** Singleton Pattern — only one emitter in the application */
  static getInstance(): EventEmitter {
    if (!EventEmitter.instance) {
      EventEmitter.instance = new EventEmitter();
    }
    return EventEmitter.instance;
  }

  /** Subscribe a listener to a specific event type */
  on(type: EventType, listener: EventListener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  /** Remove a specific listener */
  off(type: EventType, listener: EventListener): void {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      existing.filter((l) => l !== listener)
    );
  }

  /** Emit an event to all registered listeners */
  emit(type: EventType, payload: Record<string, unknown>): void {
    const event: DomainEvent = {
      type,
      payload,
      timestamp: new Date(),
    };

    const listeners = this.listeners.get(type) ?? [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`[EventEmitter] Listener error for ${type}:`, error);
      }
    }
  }
}

/**
 * Built-in logging listener — logs all domain events for auditing.
 * Demonstrates how observers can be attached without modifying services.
 */
export function setupDefaultListeners(): void {
  const emitter = EventEmitter.getInstance();

  emitter.on(EventType.REGISTRATION_CREATED, (event) => {
    console.log(`[Audit] New registration: user=${event.payload.userId}, event=${event.payload.eventId}`);
  });

  emitter.on(EventType.CHECK_IN_COMPLETED, (event) => {
    console.log(`[Audit] Check-in: ticket=${event.payload.ticketUUID}, event=${event.payload.eventId}`);
  });

  emitter.on(EventType.EVENT_CREATED, (event) => {
    console.log(`[Audit] Event created: "${event.payload.title}" by organizer=${event.payload.organizerId}`);
  });

  emitter.on(EventType.EVENT_STATUS_CHANGED, (event) => {
    console.log(`[Audit] Event status changed: eventId=${event.payload.eventId}, ${event.payload.oldStatus} → ${event.payload.newStatus}`);
  });
}
