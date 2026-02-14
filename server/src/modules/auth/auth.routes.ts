import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimiter';
import { registerSchema, loginSchema, updateProfileSchema } from './auth.schema';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh', authLimiter, AuthController.refresh);
router.post('/logout', authMiddleware, AuthController.logout);
router.post('/logout-all', authMiddleware, AuthController.logoutAll);
router.get('/me', authMiddleware, AuthController.getProfile);
router.patch('/me', authMiddleware, validate(updateProfileSchema), AuthController.updateProfile);

export default router;
