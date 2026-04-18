import { v4 as uuidv4 } from 'uuid';

/**
 * Strategy Pattern — defines a contract for ticket ID generation.
 * Different implementations can be swapped without changing the service code.
 */
export interface ITicketStrategy {
  generate(): string;
}

/**
 * Default strategy: UUID v4 ticket generation.
 * Produces cryptographically random, unguessable ticket identifiers.
 */
export class UUIDTicketStrategy implements ITicketStrategy {
  generate(): string {
    return uuidv4();
  }
}

/**
 * Alternative strategy: Prefixed ticket with event/date context.
 * Useful for debugging or event-specific ticket batches.
 */
export class PrefixedTicketStrategy implements ITicketStrategy {
  constructor(private readonly prefix: string = 'EP') {}

  generate(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().split('-')[0].toUpperCase();
    return `${this.prefix}-${timestamp}-${random}`;
  }
}
