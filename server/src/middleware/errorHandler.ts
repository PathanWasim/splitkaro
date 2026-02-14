import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // Handle known error types
    if ((err as any).statusCode) {
        res.status((err as any).statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // Postgres unique constraint violation
    if ((err as any).code === '23505') {
        res.status(409).json({
            success: false,
            error: 'Resource already exists',
        });
        return;
    }

    // Postgres foreign key violation
    if ((err as any).code === '23503') {
        res.status(400).json({
            success: false,
            error: 'Referenced resource does not exist',
        });
        return;
    }

    console.error('❌ Unhandled error:', err);

    res.status(500).json({
        success: false,
        error: env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
}
