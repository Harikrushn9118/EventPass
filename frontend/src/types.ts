export type Role = 'STUDENT' | 'ORGANIZER';
export type EventStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SessionState {
  user: UserProfile;
  token: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  maxCapacity: number;
  status: EventStatus;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  availableSeats?: number;
  isFull?: boolean;
  isRegistrationOpen?: boolean;
  _count?: {
    registrations: number;
  };
}

export interface TicketRecord {
  id: string;
  ticketUUID: string;
  attended: boolean;
  event: EventRecord;
}

export interface EventRegistration {
  id: string;
  ticketUUID: string;
  attended: boolean;
  registeredAt: string;
  user: Pick<UserProfile, 'id' | 'name' | 'email'>;
}

export interface RegisterFormState {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface LoginFormState {
  email: string;
  password: string;
}
