import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import groupsRoutes from './modules/groups/groups.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import settlementsRoutes from './modules/settlements/settlements.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import auditRoutes from './modules/audit/audit.routes';

const app = express();

// ─── Global Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(apiLimiter);

// ─── Health Check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    });
});

// ─── API Routes ──────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/groups', groupsRoutes);
app.use('/api/v1/groups/:groupId/expenses', expensesRoutes);
app.use('/api/v1/groups/:groupId/settlements', settlementsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// ─── Global Error Handler ────────────────────────────────────────────
app.use(errorHandler);

export default app;
