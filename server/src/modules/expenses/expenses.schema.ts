import { z } from 'zod';

export const createExpenseSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive').max(10000000, 'Amount exceeds limit'),
        description: z.string().min(1, 'Description is required').max(255),
        paidBy: z.string().uuid('Invalid paidBy user ID'),
        splitType: z.enum(['equal', 'custom', 'percentage']),
        splits: z.array(z.object({
            userId: z.string().uuid('Invalid user ID in splits'),
            amount: z.number().optional(),       // for custom split
            percentage: z.number().optional(),    // for percentage split
        })).min(1, 'At least one split is required'),
    }),
});

export const adjustExpenseSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive'),
        description: z.string().min(1, 'Description is required').max(255),
        paidBy: z.string().uuid('Invalid paidBy user ID'),
        splitType: z.enum(['equal', 'custom', 'percentage']),
        splits: z.array(z.object({
            userId: z.string().uuid(),
            amount: z.number().optional(),
            percentage: z.number().optional(),
        })).min(1),
    }),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];
export type AdjustExpenseInput = z.infer<typeof adjustExpenseSchema>['body'];
