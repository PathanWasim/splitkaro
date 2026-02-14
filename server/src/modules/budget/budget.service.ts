import { BudgetRepository } from './budget.repository';
import { AppError } from '../../utils/AppError';

export class BudgetService {
    private repo: BudgetRepository;

    constructor() {
        this.repo = new BudgetRepository();
    }

    private getCurrentMonthYear(): string {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    /**
     * Set (or update) the monthly budget for a group.
     * Defaults to the current month if monthYear is not provided.
     */
    async setBudget(groupId: string, monthlyLimit: number, monthYear?: string) {
        if (monthlyLimit <= 0) {
            throw AppError.badRequest('Monthly limit must be positive');
        }

        const target = monthYear || this.getCurrentMonthYear();
        return this.repo.upsert(groupId, target, monthlyLimit);
    }

    /**
     * Get budget status for a group (current month).
     * Returns null if no budget is set.
     */
    async getBudget(groupId: string, monthYear?: string) {
        const target = monthYear || this.getCurrentMonthYear();
        const budget = await this.repo.getForMonth(groupId, target);

        if (!budget) return null;

        const spent = await this.repo.getMonthlySpend(groupId, target);
        const monthlyLimit = parseFloat(String(budget.monthly_limit));
        const remaining = Math.round((monthlyLimit - spent) * 100) / 100;
        const percentUsed = monthlyLimit > 0 ? Math.round((spent / monthlyLimit) * 10000) / 100 : 0;

        return {
            monthlyLimit,
            spent,
            remaining,
            percentUsed,
            exceeded: spent > monthlyLimit,
            monthYear: target,
        };
    }
}
