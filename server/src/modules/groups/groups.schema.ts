import { z } from 'zod';

export const createGroupSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Group name is required').max(100),
        type: z.enum(['trip', 'flat', 'friends', 'other']),
    }),
});

export const inviteToGroupSchema = z.object({
    body: z.object({
        email: z.string().email('Valid email is required'),
    }),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>['body'];
export type InviteToGroupInput = z.infer<typeof inviteToGroupSchema>['body'];
