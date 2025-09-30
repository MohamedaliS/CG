import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserQueries } from '../database/queries';
import { User, CreateUserRequest, LoginRequest, AuthUser } from '../types/user';
import { CONSTANTS } from '../config/constants';

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  static async register(userData: CreateUserRequest): Promise<AuthUser> {
    // Check if user already exists
    const existingUser = await UserQueries.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

    // Create user
    const user = await UserQueries.create(
      userData.email,
      passwordHash,
      userData.organization_name
    );

    return this.sanitizeUser(user);
  }

  static async login(loginData: LoginRequest): Promise<AuthUser> {
    // Find user by email
    const user = await UserQueries.findByEmail(loginData.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(loginData.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await UserQueries.updateLastLogin(user.id);

    return this.sanitizeUser(user);
  }

  static async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await UserQueries.findById(userId);
    if (!user) {
      return null;
    }
    return this.sanitizeUser(user);
  }

  static async canGenerateCertificates(userId: string, count: number): Promise<boolean> {
    const user = await UserQueries.findById(userId);
    if (!user) {
      return false;
    }

    // Premium users have no limits
    if (user.is_premium) {
      return true;
    }

    // Check free tier limit
    return (user.certificate_count + count) <= CONSTANTS.FREE_TIER_LIMIT;
  }

  static async incrementCertificateCount(userId: string, count: number): Promise<void> {
    await UserQueries.updateCertificateCount(userId, count);
  }

  private static sanitizeUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      organization_name: user.organization_name,
      certificate_count: user.certificate_count,
      is_premium: user.is_premium,
    };
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
  }
}
