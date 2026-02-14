import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { AuthRepository, SafeUser } from './auth.repository';
import { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema';
import { auditService } from '../audit/audit.service';
import { query, queryOne } from '../../config/database';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;

export class AuthService {
    private repo: AuthRepository;

    constructor() {
        this.repo = new AuthRepository();
    }

    private generateAccessToken(user: SafeUser): string {
        return jwt.sign(
            { userId: user.id, email: user.email },
            env.JWT_SECRET,
            { expiresIn: env.JWT_EXPIRES_IN as any }
        );
    }

    private async generateRefreshToken(userId: string): Promise<string> {
        // Generate a cryptographically random token
        const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

        // Hash before storing (never store raw tokens)
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Calculate expiry
        const expiresAt = new Date();
        const days = parseInt(env.REFRESH_TOKEN_EXPIRES_IN) || 7;
        expiresAt.setDate(expiresAt.getDate() + days);

        // Store hashed token
        await queryOne(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [userId, tokenHash, expiresAt.toISOString()]
        );

        return rawToken;
    }

    private async issueTokens(user: SafeUser): Promise<{ accessToken: string; refreshToken: string }> {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id);
        return { accessToken, refreshToken };
    }

    async register(input: RegisterInput): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
        const existing = await this.repo.findByEmail(input.email);
        if (existing) {
            throw AppError.conflict('An account with this email already exists');
        }

        const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

        const user = await this.repo.create({
            email: input.email,
            passwordHash,
            name: input.name,
            upiId: input.upiId,
        });

        const tokens = await this.issueTokens(user);

        auditService.log({
            actorUserId: user.id,
            entityType: 'auth',
            entityId: user.id,
            action: 'created',
            metadata: { email: user.email },
        });

        return { user, ...tokens };
    }

    async login(input: LoginInput): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
        const user = await this.repo.findByEmail(input.email);
        if (!user) {
            throw AppError.unauthorized('Invalid email or password');
        }

        const isValid = await bcrypt.compare(input.password, user.password_hash);
        if (!isValid) {
            throw AppError.unauthorized('Invalid email or password');
        }

        const safeUser: SafeUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            upi_id: user.upi_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        const tokens = await this.issueTokens(safeUser);

        auditService.log({
            actorUserId: safeUser.id,
            entityType: 'auth',
            entityId: safeUser.id,
            action: 'verified',
            metadata: { email: safeUser.email },
        });

        return { user: safeUser, ...tokens };
    }

    async refreshAccessToken(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        // Hash the incoming token for lookup
        const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

        const stored = await queryOne<{
            id: string;
            user_id: string;
            expires_at: Date;
        }>(
            'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1',
            [tokenHash]
        );

        if (!stored) {
            throw AppError.unauthorized('Invalid refresh token');
        }

        if (new Date(stored.expires_at) < new Date()) {
            // Clean up expired token
            await queryOne('DELETE FROM refresh_tokens WHERE id = $1', [stored.id]);
            throw AppError.unauthorized('Refresh token expired');
        }

        // Rotate: delete old token, issue new pair
        await queryOne('DELETE FROM refresh_tokens WHERE id = $1', [stored.id]);

        const user = await this.repo.findById(stored.user_id);
        if (!user) {
            throw AppError.unauthorized('User no longer exists');
        }

        return this.issueTokens(user);
    }

    async logout(rawRefreshToken: string): Promise<void> {
        const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        await queryOne('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    }

    async logoutAllDevices(userId: string): Promise<void> {
        await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
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
