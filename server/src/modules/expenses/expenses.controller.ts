import { Request, Response, NextFunction } from 'express';
import { ExpensesService } from './expenses.service';

const expensesService = new ExpensesService();

export class ExpensesController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await expensesService.createExpense(req.params.groupId as string, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const result = await expensesService.getExpenses(req.params.groupId as string, page, limit);
            res.json({ success: true, data: { ...result, page, limit } });
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await expensesService.getExpenseDetail(req.params.expenseId as string);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    static async adjust(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await expensesService.adjustExpense(
                req.params.groupId as string,
                req.params.expenseId as string,
                req.body
            );
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    static async getBalances(req: Request, res: Response, next: NextFunction) {
        try {
            const balances = await expensesService.getGroupBalances(req.params.groupId as string);
            res.json({ success: true, data: { balances } });
        } catch (error) {
            next(error);
        }
    }

    static async getOptimalSettlements(req: Request, res: Response, next: NextFunction) {
        try {
            const settlements = await expensesService.getOptimalSettlements(req.params.groupId as string);
            res.json({ success: true, data: { settlements } });
        } catch (error) {
            next(error);
        }
    }
}
