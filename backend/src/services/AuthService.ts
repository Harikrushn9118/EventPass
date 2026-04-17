import { UserRepository } from '../repositories/UserRepository';
import { generateToken } from '../utils/jwt';
import bcrypt from 'bcrypt';
import { Role, UserRecord, createUserEntity } from '../models/user';
import { HttpError } from '../utils/httpError';
import { IUserRepository } from '../repositories/interfaces';

export class AuthService {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }

  async register(data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new HttpError('User already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password!, 10);
    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    const userEntity = createUserEntity({
      ...user,
      role: user.role as Role,
    } as UserRecord);
    const token = generateToken({ id: user.id, role: userEntity.getRole() });
    return { user: userEntity.toSafeProfile(), token };
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new HttpError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new HttpError('Invalid credentials', 401);
    }

    const userEntity = createUserEntity({
      ...user,
      role: user.role as Role,
    } as UserRecord);
    const token = generateToken({ id: user.id, role: userEntity.getRole() });
    return { user: userEntity.toSafeProfile(), token };
  }
}
