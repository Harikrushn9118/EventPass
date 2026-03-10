import { UserRepository } from '../repositories/UserRepository';
import { generateToken } from '../utils/jwt';
import bcrypt from 'bcrypt';
import { User, Role } from '../models/user';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      const error: any = new Error('User already exists');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(data.password!, 10);
    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    const token = generateToken({ id: user.id, role: user.role as Role });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      const error: any = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error: any = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken({ id: user.id, role: user.role as Role });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
  }
}
