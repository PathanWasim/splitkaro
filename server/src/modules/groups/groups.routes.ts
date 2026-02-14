import { Router } from 'express';
import { GroupsController } from './groups.controller';
import { authMiddleware } from '../../middleware/auth';
import { groupAccess } from '../../middleware/groupAccess';
import { validate } from '../../middleware/validate';
import { createGroupSchema, inviteToGroupSchema } from './groups.schema';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/', validate(createGroupSchema), GroupsController.create);
router.get('/', GroupsController.getAll);
router.get('/:groupId', groupAccess(), GroupsController.getById);
router.post('/:groupId/invite', groupAccess('admin'), validate(inviteToGroupSchema), GroupsController.invite);
router.delete('/:groupId/members/:userId', groupAccess('admin'), GroupsController.removeMember);

export default router;
