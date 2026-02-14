import { Router } from 'express';
import { SettlementsController } from './settlements.controller';
import { authMiddleware } from '../../middleware/auth';
import { groupAccess } from '../../middleware/groupAccess';
import { validate } from '../../middleware/validate';
import { createSettlementSchema, updateSettlementSchema } from './settlements.schema';

const router = Router({ mergeParams: true });

router.use(authMiddleware, groupAccess());

router.post('/', validate(createSettlementSchema), SettlementsController.create);
router.patch('/:settlementId', validate(updateSettlementSchema), SettlementsController.recordPayment);
router.get('/', SettlementsController.getAll);
router.get('/history', SettlementsController.getHistory);

export default router;
