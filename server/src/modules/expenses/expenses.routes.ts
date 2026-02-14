import { Router } from 'express';
import { ExpensesController } from './expenses.controller';
import { authMiddleware } from '../../middleware/auth';
import { groupAccess } from '../../middleware/groupAccess';
import { validate } from '../../middleware/validate';
import { createExpenseSchema, adjustExpenseSchema } from './expenses.schema';

const router = Router({ mergeParams: true }); // mergeParams to access :groupId

// All routes require auth + group membership
router.use(authMiddleware, groupAccess());

router.post('/', validate(createExpenseSchema), ExpensesController.create);
router.get('/', ExpensesController.getAll);
router.get('/balances', ExpensesController.getBalances);
router.get('/settlements', ExpensesController.getOptimalSettlements);
router.get('/:expenseId', ExpensesController.getById);
router.post('/:expenseId/adjust', validate(adjustExpenseSchema), ExpensesController.adjust);

export default router;
