import { query, queryOne, transaction } from '../../config/database';

export interface Expense {
    id: string;
    group_id: string;
    paid_by: string;
    amount: number;
    description: string;
    split_type: string;
    entry_type: 'original' | 'adjustment';
    parent_id: string | null;
    created_at: Date;
    payer_name?: string;
}

export interface ExpenseSplit {
    id: string;
    expense_id: string;
    user_id: string;
    amount: number;
    user_name?: string;
}

export class ExpensesRepository {
    async create(data: {
        groupId: string;
        paidBy: string;
        amount: number;
        description: string;
        splitType: string;
        entryType: 'original' | 'adjustment';
        parentId?: string;
        splits: { userId: string; amount: number }[];
    }): Promise<{ expense: Expense; splits: ExpenseSplit[] }> {
        return transaction(async (client) => {
            const expResult = await client.query(
                `INSERT INTO expenses (group_id, paid_by, amount, description, split_type, entry_type, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
                [data.groupId, data.paidBy, data.amount, data.description, data.splitType, data.entryType, data.parentId || null]
            );
            const expense = expResult.rows[0];

            const splits: ExpenseSplit[] = [];
            for (const split of data.splits) {
                const splitResult = await client.query(
                    `INSERT INTO expense_splits (expense_id, user_id, amount)
           VALUES ($1, $2, $3)
           RETURNING *`,
                    [expense.id, split.userId, split.amount]
                );
                splits.push(splitResult.rows[0]);
            }

            return { expense, splits };
        });
    }

    async findByGroupId(groupId: string, page: number = 1, limit: number = 20): Promise<{ expenses: Expense[]; total: number }> {
        const offset = (page - 1) * limit;

        const expenses = await query<Expense>(
            `SELECT e.*, u.name as payer_name
       FROM expenses e
       INNER JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2 OFFSET $3`,
            [groupId, limit, offset]
        );

        const countResult = await queryOne<{ count: number }>(
            'SELECT COUNT(*)::int as count FROM expenses WHERE group_id = $1',
            [groupId]
        );

        return { expenses, total: countResult?.count || 0 };
    }

    async findById(expenseId: string): Promise<Expense | null> {
        return queryOne<Expense>(
            `SELECT e.*, u.name as payer_name
       FROM expenses e
       INNER JOIN users u ON u.id = e.paid_by
       WHERE e.id = $1`,
            [expenseId]
        );
    }

    async getSplits(expenseId: string): Promise<ExpenseSplit[]> {
        return query<ExpenseSplit>(
            `SELECT es.*, u.name as user_name
       FROM expense_splits es
       INNER JOIN users u ON u.id = es.user_id
       WHERE es.expense_id = $1`,
            [expenseId]
        );
    }

    async getAdjustments(expenseId: string): Promise<Expense[]> {
        return query<Expense>(
            `SELECT e.*, u.name as payer_name
       FROM expenses e
       INNER JOIN users u ON u.id = e.paid_by
       WHERE e.parent_id = $1
       ORDER BY e.created_at`,
            [expenseId]
        );
    }

    /**
     * Compute net balance for each user in a group.
     * Net balance = total amount paid - total amount owed (from splits)
     */
    async getGroupBalances(groupId: string): Promise<{ user_id: string; user_name: string; net_balance: number }[]> {
        return query(
            `WITH paid AS (
        SELECT paid_by as user_id, SUM(amount) as total_paid
        FROM expenses
        WHERE group_id = $1
        GROUP BY paid_by
      ),
      owed AS (
        SELECT es.user_id, SUM(es.amount) as total_owed
        FROM expense_splits es
        INNER JOIN expenses e ON e.id = es.expense_id
        WHERE e.group_id = $1
        GROUP BY es.user_id
      ),
      settled_paid AS (
        SELECT payer_id as user_id, SUM(settled_amount) as total_settled_out
        FROM settlements
        WHERE group_id = $1 AND status IN ('partial', 'settled')
        GROUP BY payer_id
      ),
      settled_received AS (
        SELECT payee_id as user_id, SUM(settled_amount) as total_settled_in
        FROM settlements
        WHERE group_id = $1 AND status IN ('partial', 'settled')
        GROUP BY payee_id
      )
      SELECT
        gm.user_id,
        u.name as user_name,
        (COALESCE(p.total_paid, 0) - COALESCE(o.total_owed, 0)
         + COALESCE(sp.total_settled_out, 0) - COALESCE(sr.total_settled_in, 0)
        )::numeric(12,2) as net_balance
      FROM group_members gm
      INNER JOIN users u ON u.id = gm.user_id
      LEFT JOIN paid p ON p.user_id = gm.user_id
      LEFT JOIN owed o ON o.user_id = gm.user_id
      LEFT JOIN settled_paid sp ON sp.user_id = gm.user_id
      LEFT JOIN settled_received sr ON sr.user_id = gm.user_id
      WHERE gm.group_id = $1`,
            [groupId]
        );
    }
}
