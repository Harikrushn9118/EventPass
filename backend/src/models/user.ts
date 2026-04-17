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

  toSafeProfile() {
    return {
      id: this.data.id,
      name: this.data.name,
      email: this.data.email,
      role: this.getRole(),
    };
  }
}

export class Student extends User {
  constructor(data: UserRecord) {
    super(data);
  }

  getRole(): Role {
    return Role.STUDENT;
  }
}

export class Organizer extends User {
  constructor(data: UserRecord) {
    super(data);
  }

  getRole(): Role {
    return Role.ORGANIZER;
  }

  ownsEvent(organizerId: string) {
    return this.id === organizerId;
  }
}

export const createUserEntity = (user: UserRecord) =>
  user.role === Role.ORGANIZER ? new Organizer(user) : new Student(user);
