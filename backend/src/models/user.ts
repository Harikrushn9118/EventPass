export enum Role {
  STUDENT = 'STUDENT',
  ORGANIZER = 'ORGANIZER',
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  id: string;
  role: Role;
}

/**
 * Abstract base class demonstrating Abstraction and Encapsulation.
 * Shared identity logic lives here; subclasses extend role-specific behaviour through Polymorphism.
 */
export abstract class User {
  protected constructor(protected readonly data: UserRecord) {}

  get id() {
    return this.data.id;
  }

  get name() {
    return this.data.name;
  }

  get email() {
    return this.data.email;
  }

  abstract getRole(): Role;

  /** Template Method — subclasses share the same safe-profile shape */
  toSafeProfile() {
    return {
      id: this.data.id,
      name: this.data.name,
      email: this.data.email,
      role: this.getRole(),
    };
  }

  /** Polymorphic permission check — overridden per role */
  abstract canRegisterForEvent(): boolean;
  abstract canCreateEvent(): boolean;
  abstract canCheckInAttendees(): boolean;
}

/**
 * Student subclass — can register for events, cannot create or check-in.
 * Demonstrates Inheritance and Polymorphism.
 */
export class Student extends User {
  constructor(data: UserRecord) {
    super(data);
  }

  getRole(): Role {
    return Role.STUDENT;
  }

  canRegisterForEvent(): boolean {
    return true;
  }

  canCreateEvent(): boolean {
    return false;
  }

  canCheckInAttendees(): boolean {
    return false;
  }

  /** Student-specific behaviour: check if already registered */
  hasTicketFor(eventId: string, registeredEventIds: string[]): boolean {
    return registeredEventIds.includes(eventId);
  }
}

/**
 * Organizer subclass — can create events and check-in attendees but cannot register.
 * Demonstrates Inheritance and Polymorphism.
 */
export class Organizer extends User {
  constructor(data: UserRecord) {
    super(data);
  }

  getRole(): Role {
    return Role.ORGANIZER;
  }

  canRegisterForEvent(): boolean {
    return false;
  }

  canCreateEvent(): boolean {
    return true;
  }

  canCheckInAttendees(): boolean {
    return true;
  }

  /** Organizer-specific: verify ownership of an event */
  ownsEvent(organizerId: string) {
    return this.id === organizerId;
  }
}

/**
 * Factory function — creates the correct User subclass based on role.
 * Demonstrates Factory Pattern.
 */
export const createUserEntity = (user: UserRecord) =>
  user.role === Role.ORGANIZER ? new Organizer(user) : new Student(user);
