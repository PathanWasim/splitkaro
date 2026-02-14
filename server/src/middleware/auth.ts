import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface AuthPayload {
    userId: string;
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            throw AppError.unauthorized('Missing or invalid authorization header');
        }

        const token = header.split(' ')[1];
        const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
        req.user = payload;
        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            next(AppError.unauthorized('Invalid or expired token'));
        }
    }
}
