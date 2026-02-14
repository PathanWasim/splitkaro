import { z } from 'zod';

export const createExpenseSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive').max(10000000, 'Amount exceeds limit'),
        description: z.string().min(1, 'Description is required').max(255),
        paidBy: z.string().uuid('Invalid paidBy user ID'),
        splitType: z.enum(['equal', 'custom', 'percentage']),
        splits: z.array(z.object({
            userId: z.string().uuid('Invalid user ID in splits'),
            amount: z.number().min(0, 'Split amount cannot be negative').optional(),
            percentage: z.number().min(0, 'Percentage cannot be negative').max(100).optional(),
        })).min(1, 'At least one split is required'),
    }).refine((data) => {
        if (data.splitType === 'custom') {
            const total = data.splits.reduce((sum, s) => sum + (s.amount || 0), 0);
            return Math.abs(total - data.amount) <= 0.01;
        }
        return true;
    }, { message: 'Custom split amounts must equal the total expense amount' })
        .refine((data) => {
            if (data.splitType === 'percentage') {
                const total = data.splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
                return Math.abs(total - 100) <= 0.01;
            }
            return true;
        }, { message: 'Percentages must sum to 100' }),
});

export const adjustExpenseSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive'),
        description: z.string().min(1, 'Description is required').max(255),
        paidBy: z.string().uuid('Invalid paidBy user ID'),
        splitType: z.enum(['equal', 'custom', 'percentage']),
        splits: z.array(z.object({
            userId: z.string().uuid(),
            amount: z.number().min(0).optional(),
            percentage: z.number().min(0).max(100).optional(),
        })).min(1),
    }),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];
export type AdjustExpenseInput = z.infer<typeof adjustExpenseSchema>['body'];
