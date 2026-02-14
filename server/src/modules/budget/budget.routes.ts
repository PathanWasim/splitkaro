import { Router } from 'express';
import { BudgetController } from './budget.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const setBudgetSchema = z.object({
    body: z.object({
        monthlyLimit: z.number().positive('Monthly limit must be positive'),
        monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM').optional(),
    }),
});

// POST /groups/:groupId/budget
router.post('/', authMiddleware, validate(setBudgetSchema), BudgetController.setBudget);

// GET /groups/:groupId/budget
router.get('/', authMiddleware, BudgetController.getBudget);

export default router;
