import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export function validate(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.issues.map(
                    (issue) => `${(issue as any).path.join('.')}: ${(issue as any).message}`
                );
                next(AppError.badRequest(messages.join('; ')));
            } else {
                next(error);
            }
        }
    };
}
