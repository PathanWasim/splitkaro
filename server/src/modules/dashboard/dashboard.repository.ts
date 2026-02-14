import { query, queryOne } from '../../config/database';

export class DashboardRepository {
    async getUserSummary(userId: string) {
        const result = await queryOne<{
            total_owed_to_you: number;
            total_you_owe: number;
            active_groups: number;
        }>(
            `WITH user_balances AS (
        SELECT
          e.group_id,
          (COALESCE(SUM(CASE WHEN e.paid_by = $1 THEN e.amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN es.user_id = $1 THEN es.amount ELSE 0 END), 0)) as net_balance
        FROM expenses e
        INNER JOIN expense_splits es ON es.expense_id = e.id
        INNER JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = $1
        GROUP BY e.group_id
      )
      SELECT
        COALESCE(SUM(CASE WHEN net_balance > 0 THEN net_balance ELSE 0 END), 0)::numeric(12,2) as total_owed_to_you,
        COALESCE(SUM(CASE WHEN net_balance < 0 THEN ABS(net_balance) ELSE 0 END), 0)::numeric(12,2) as total_you_owe,
        COUNT(DISTINCT group_id)::int as active_groups
      FROM user_balances`,
            [userId]
        );
        return result;
    }

    async getGroupAnalytics(groupId: string) {
        const monthly = await query(
            `SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(amount)::numeric(12,2) as total,
        COUNT(*)::int as expense_count
       FROM expenses
       WHERE group_id = $1 AND entry_type = 'original'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 12`,
            [groupId]
        );

        const topSpenders = await query(
            `SELECT u.name, SUM(e.amount)::numeric(12,2) as total_paid
       FROM expenses e
       INNER JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = $1 AND e.entry_type = 'original'
       GROUP BY u.id, u.name
       ORDER BY total_paid DESC`,
            [groupId]
        );

        return { monthly, topSpenders };
    }

    async getGroupExpensesForExport(groupId: string) {
        return query(
            `SELECT
        e.created_at as date,
        e.description,
        e.amount,
        u.name as paid_by,
        e.split_type,
        e.entry_type
       FROM expenses e
       INNER JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = $1
       ORDER BY e.created_at`,
            [groupId]
        );
    }
}
