import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../config/database';
import { AppError } from '../utils/AppError';

/**
 * Middleware that verifies the authenticated user is a member of the group
 * specified in req.params.groupId. Attaches the member's role to the request.
 */
export interface GroupMember {
    id: string;
    role: 'admin' | 'member';
}

declare global {
    namespace Express {
        interface Request {
            groupMember?: GroupMember;
        }
    }
}

export function groupAccess(requiredRole?: 'admin') {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const groupId = req.params.groupId as string;
            const userId = req.user?.userId;

            if (!groupId || !userId) {
                throw AppError.badRequest('Group ID and authentication are required');
            }

            const member = await queryOne<GroupMember>(
                'SELECT id, role FROM group_members WHERE group_id = $1 AND user_id = $2',
                [groupId, userId]
            );

            if (!member) {
                throw AppError.forbidden('You are not a member of this group');
            }

            if (requiredRole === 'admin' && member.role !== 'admin') {
                throw AppError.forbidden('Admin access required');
            }

            req.groupMember = member;
            next();
        } catch (error) {
            next(error);
        }
    };
}
