import { z } from 'zod';

export const createSettlementSchema = z.object({
    body: z.object({
        payeeId: z.string().uuid('Invalid payee ID'),
        amount: z.number().positive('Amount must be positive'),
        idempotencyKey: z.string().uuid('Invalid idempotency key'),
    }),
});

export const updateSettlementSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive'),
        note: z.string().max(500).optional(),
    }),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>['body'];
export type UpdateSettlementInput = z.infer<typeof updateSettlementSchema>['body'];
