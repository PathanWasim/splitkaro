import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';
import { queryOne } from '../../config/database';

const notificationsService = new NotificationsService();

export class NotificationsController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const notifications = await notificationsService.getUserNotifications(req.user!.userId);
            res.json({ success: true, data: { notifications } });
        } catch (error) {
            next(error);
        }
    }

    static async markAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            await notificationsService.markAsRead(req.params.id as string, req.user!.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    static async sendReminders(req: Request, res: Response, next: NextFunction) {
        try {
            const group = await queryOne<{ name: string }>(
                'SELECT name FROM groups WHERE id = $1',
                [req.params.groupId as string]
            );
            if (!group) {
                res.status(404).json({ success: false, error: 'Group not found' });
                return;
            }

            const result = await notificationsService.sendReminders(req.params.groupId as string, group.name);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}
