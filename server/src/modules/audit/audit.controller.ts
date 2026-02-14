import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { AppError } from '../../utils/AppError';
import { queryOne } from '../../config/database';

const auditService = new AuditService();

export class AuditController {
    static async getGroupLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const groupId = req.query.groupId as string;
            if (!groupId) {
                throw AppError.badRequest('groupId query parameter is required');
            }

            // Verify user is admin of this group
            const membership = await queryOne<{ role: string }>(
                'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
                [groupId, req.user!.userId]
            );

            if (!membership) {
                throw AppError.forbidden('You are not a member of this group');
            }
            if (membership.role !== 'admin') {
                throw AppError.forbidden('Only group admins can view audit logs');
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

            const result = await auditService.getGroupAuditLogs(groupId, page, limit);

            res.json({
                success: true,
                data: {
                    logs: result.logs,
                    pagination: {
                        page,
                        limit,
                        total: result.total,
                        totalPages: Math.ceil(result.total / limit),
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }
}
