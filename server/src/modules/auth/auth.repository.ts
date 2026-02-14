import { queryOne } from '../../config/database';

export interface User {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    upi_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export type SafeUser = Omit<User, 'password_hash'>;

export class AuthRepository {
    async findByEmail(email: string): Promise<User | null> {
        return queryOne<User>(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
    }

    async findById(id: string): Promise<SafeUser | null> {
        return queryOne<SafeUser>(
            'SELECT id, email, name, upi_id, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );
    }

    async create(data: {
        email: string;
        passwordHash: string;
        name: string;
        upiId?: string;
    }): Promise<SafeUser> {
        const result = await queryOne<SafeUser>(
            `INSERT INTO users (email, password_hash, name, upi_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, upi_id, created_at, updated_at`,
            [data.email, data.passwordHash, data.name, data.upiId || null]
        );
        return result!;
    }

    async update(id: string, data: { name?: string; upiId?: string }): Promise<SafeUser> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.upiId !== undefined) {
            fields.push(`upi_id = $${paramIndex++}`);
            values.push(data.upiId);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await queryOne<SafeUser>(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, name, upi_id, created_at, updated_at`,
            values
        );
        return result!;
    }
}
