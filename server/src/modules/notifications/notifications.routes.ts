import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authMiddleware } from '../../middleware/auth';
import { groupAccess } from '../../middleware/groupAccess';

const router = Router();

router.use(authMiddleware);

router.get('/', NotificationsController.getAll);
router.patch('/:id/read', NotificationsController.markAsRead);
router.post('/remind/:groupId', groupAccess('admin'), NotificationsController.sendReminders);

export default router;
