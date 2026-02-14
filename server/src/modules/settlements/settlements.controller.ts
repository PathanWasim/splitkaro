import { Request, Response, NextFunction } from 'express';
import { SettlementsService } from './settlements.service';

const settlementsService = new SettlementsService();

export class SettlementsController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await settlementsService.createSettlement(
                req.params.groupId as string,
                req.user!.userId,
                req.body
            );
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    static async recordPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const settlement = await settlementsService.recordPayment(
                req.params.settlementId as string,
                req.user!.userId,
                req.body
            );
            res.json({ success: true, data: { settlement } });
        } catch (error) {
            next(error);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const status = req.query.status as string | undefined;
            const settlements = await settlementsService.getSettlements(req.params.groupId as string, status);
            res.json({ success: true, data: { settlements } });
        } catch (error) {
            next(error);
        }
    }

    static async getHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const history = await settlementsService.getHistory(req.params.groupId as string);
            res.json({ success: true, data: { history } });
        } catch (error) {
            next(error);
        }
    }
}
