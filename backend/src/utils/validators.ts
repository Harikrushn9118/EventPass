import { EventStatus } from '@prisma/client';
import { HttpError } from './httpError';
import { Role } from '../models/user';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  date: Date;
  venue: string;
  maxCapacity: number;
}

export interface CheckInInput {
  ticketUUID: string;
  eventId: string;
}

export const validateRegisterInput = (payload: unknown): RegisterInput => {
  const body = payload as Record<string, unknown>;

  if (!isNonEmptyString(body?.name)) {
    throw new HttpError('Name is required', 400);
  }

  if (!isNonEmptyString(body?.email) || !body.email.includes('@')) {
    throw new HttpError('A valid email is required', 400);
  }

  if (!isNonEmptyString(body?.password) || body.password.length < 6) {
    throw new HttpError('Password must be at least 6 characters long', 400);
  }

  if (body?.role !== Role.STUDENT && body?.role !== Role.ORGANIZER) {
    throw new HttpError('Role must be either STUDENT or ORGANIZER', 400);
  }

  return {
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    password: body.password,
    role: body.role,
  };
};

export const validateLoginInput = (payload: unknown): LoginInput => {
  const body = payload as Record<string, unknown>;

  if (!isNonEmptyString(body?.email) || !isNonEmptyString(body?.password)) {
    throw new HttpError('Email and password are required', 400);
  }

  return {
    email: body.email.trim().toLowerCase(),
    password: body.password,
  };
};

export const validateCreateEventInput = (payload: unknown): CreateEventInput => {
  const body = payload as Record<string, unknown>;

  if (!isNonEmptyString(body?.title)) {
    throw new HttpError('Event title is required', 400);
  }

  if (!isNonEmptyString(body?.description)) {
    throw new HttpError('Event description is required', 400);
  }

  if (!isNonEmptyString(body?.venue)) {
    throw new HttpError('Event venue is required', 400);
  }

  const parsedDate = new Date(String(body?.date ?? ''));
  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpError('A valid event date is required', 400);
  }

  const maxCapacity = Number(body?.maxCapacity);
  if (!Number.isInteger(maxCapacity) || maxCapacity <= 0) {
    throw new HttpError('Max capacity must be a positive integer', 400);
  }

  return {
    title: body.title.trim(),
    description: body.description.trim(),
    date: parsedDate,
    venue: body.venue.trim(),
    maxCapacity,
  };
};

export const validateEventId = (eventId: unknown): string => {
  if (!isNonEmptyString(eventId)) {
    throw new HttpError('Event ID is required', 400);
  }

  return eventId.trim();
};

export const validateEventStatus = (status: unknown): EventStatus => {
  if (!isNonEmptyString(status) || !(status in EventStatus)) {
    throw new HttpError('Status must be UPCOMING, ONGOING, COMPLETED, or CANCELLED', 400);
  }

  return status as EventStatus;
};

export const validateRegistrationInput = (payload: unknown): { eventId: string } => {
  const body = payload as Record<string, unknown>;

  return {
    eventId: validateEventId(body?.eventId),
  };
};

export const validateCheckInInput = (payload: unknown): CheckInInput => {
  const body = payload as Record<string, unknown>;

  if (!isNonEmptyString(body?.ticketUUID)) {
    throw new HttpError('Ticket UUID is required', 400);
  }

  return {
    ticketUUID: body.ticketUUID.trim(),
    eventId: validateEventId(body?.eventId),
  };
};
