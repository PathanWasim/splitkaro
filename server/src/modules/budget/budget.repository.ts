import { queryOne } from '../../config/database';

export interface GroupBudget {
    id: string;
    group_id: string;
    monthly_limit: number;
    month_year: string;
    created_at: Date;
}

export class BudgetRepository {
    /**
     * Upsert: insert or update the monthly limit for a group+month.
     */
    async upsert(groupId: string, monthYear: string, monthlyLimit: number): Promise<GroupBudget> {
        const result = await queryOne<GroupBudget>(
            `INSERT INTO group_budgets (group_id, month_year, monthly_limit)
             VALUES ($1, $2, $3)
             ON CONFLICT (group_id, month_year)
             DO UPDATE SET monthly_limit = $3
             RETURNING *`,
            [groupId, monthYear, monthlyLimit]
        );
        return result!;
    }

    /**
     * Get the budget for a specific group and month.
     */
    async getForMonth(groupId: string, monthYear: string): Promise<GroupBudget | null> {
        return queryOne<GroupBudget>(
            `SELECT * FROM group_budgets WHERE group_id = $1 AND month_year = $2`,
            [groupId, monthYear]
        );
    }

    /**
     * Calculate total spend for a group in a given month.
     * Only counts original expenses (not adjustments).
     */
    async getMonthlySpend(groupId: string, monthYear: string): Promise<number> {
        const result = await queryOne<{ total: number }>(
            `SELECT COALESCE(SUM(amount), 0)::numeric(12,2) as total
             FROM expenses
             WHERE group_id = $1
               AND entry_type = 'original'
               AND TO_CHAR(created_at, 'YYYY-MM') = $2`,
            [groupId, monthYear]
        );
        return parseFloat(String(result?.total || 0));
    }
}
