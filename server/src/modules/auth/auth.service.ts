import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { AuthRepository, SafeUser } from './auth.repository';
import { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema';

const SALT_ROUNDS = 12;

export class AuthService {
    private repo: AuthRepository;

    constructor() {
        this.repo = new AuthRepository();
    }

    private generateToken(user: SafeUser): string {
        return jwt.sign(
            { userId: user.id, email: user.email },
            env.JWT_SECRET,
            { expiresIn: env.JWT_EXPIRES_IN as any }
        );
    }

    async register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
        // Check if email already exists
        const existing = await this.repo.findByEmail(input.email);
        if (existing) {
            throw AppError.conflict('An account with this email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

        // Create user
        const user = await this.repo.create({
            email: input.email,
            passwordHash,
            name: input.name,
            upiId: input.upiId,
        });

        const token = this.generateToken(user);
        return { user, token };
    }

    async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
        const user = await this.repo.findByEmail(input.email);
        if (!user) {
            throw AppError.unauthorized('Invalid email or password');
        }

        const isValid = await bcrypt.compare(input.password, user.password_hash);
        if (!isValid) {
            throw AppError.unauthorized('Invalid email or password');
        }

        // Return safe user (no password hash)
        const safeUser: SafeUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            upi_id: user.upi_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        const token = this.generateToken(safeUser);
        return { user: safeUser, token };
    }

    async getProfile(userId: string): Promise<SafeUser> {
        const user = await this.repo.findById(userId);
        if (!user) {
            throw AppError.notFound('User not found');
        }
        return user;
    }

    async updateProfile(userId: string, input: UpdateProfileInput): Promise<SafeUser> {
        return this.repo.update(userId, {
            name: input.name,
            upiId: input.upiId,
        });
    }
}
