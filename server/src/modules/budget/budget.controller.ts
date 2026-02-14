import { Request, Response, NextFunction } from 'express';
import { BudgetService } from './budget.service';

const budgetService = new BudgetService();

export class BudgetController {
    static async setBudget(req: Request, res: Response, next: NextFunction) {
        try {
            const groupId = req.params.groupId as string;
            const { monthlyLimit, monthYear } = req.body;

            const budget = await budgetService.setBudget(groupId, monthlyLimit, monthYear);
            res.status(200).json({ data: { budget } });
        } catch (err) {
            next(err);
        }
    }

    static async getBudget(req: Request, res: Response, next: NextFunction) {
        try {
            const groupId = req.params.groupId as string;
            const monthYear = req.query.monthYear as string | undefined;

            const budget = await budgetService.getBudget(groupId, monthYear);

            if (!budget) {
                return res.status(200).json({ data: { budget: null } });
            }

            res.status(200).json({ data: { budget } });
        } catch (err) {
            next(err);
        }
    }
}
