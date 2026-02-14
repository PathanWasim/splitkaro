import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        name: z.string().min(1, 'Name is required').max(100),
        upiId: z.string().max(100).optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'),
    }),
});

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        upiId: z.string().max(100).optional(),
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
