import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', AuditController.getGroupLogs);

export default router;
