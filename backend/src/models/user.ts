export enum Role {
  STUDENT = 'STUDENT',
  ORGANIZER = 'ORGANIZER',
}

export interface User {
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
