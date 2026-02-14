import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
    process.exit(1);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await pool.query(text, params);
    return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await pool.query(text, params);
    return (result.rows[0] as T) || null;
}

export async function transaction<T>(
    callback: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
