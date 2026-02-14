import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
    static async getSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const summary = await dashboardService.getUserSummary(req.user!.userId);
            res.json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    }

    static async getGroupAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const analytics = await dashboardService.getGroupAnalytics(req.params.groupId as string);
            res.json({ success: true, data: analytics });
        } catch (error) {
            next(error);
        }
    }

    static async exportGroupExpenses(req: Request, res: Response, next: NextFunction) {
        try {
            const csv = await dashboardService.exportGroupExpenses(req.params.groupId as string);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=expenses-${req.params.groupId}.csv`);
            res.send(csv);
        } catch (error) {
            next(error);
        }
    }
}
