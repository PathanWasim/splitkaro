import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middleware/auth';
import { groupAccess } from '../../middleware/groupAccess';

const router = Router();

router.use(authMiddleware);

router.get('/summary', DashboardController.getSummary);
router.get('/groups/:groupId/analytics', groupAccess(), DashboardController.getGroupAnalytics);
router.get('/groups/:groupId/export', groupAccess(), DashboardController.exportGroupExpenses);

export default router;
