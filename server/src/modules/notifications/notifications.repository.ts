import { query, queryOne } from '../../config/database';

export interface Notification {
    id: string;
    user_id: string;
    group_id: string | null;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: Date;
}

export class NotificationsRepository {
    async findByUserId(userId: string): Promise<Notification[]> {
        return query<Notification>(
            `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
            [userId]
        );
    }

    async create(data: {
        userId: string;
        groupId?: string;
        type: string;
        title: string;
        message: string;
    }): Promise<Notification> {
        const result = await queryOne<Notification>(
            `INSERT INTO notifications (user_id, group_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [data.userId, data.groupId || null, data.type, data.title, data.message]
        );
        return result!;
    }

    async markAsRead(notificationId: string, userId: string): Promise<void> {
        await query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
            [notificationId, userId]
        );
    }

    async getUnpaidMembers(groupId: string): Promise<{ user_id: string; email: string; name: string; net_balance: number }[]> {
        return query(
            `WITH balances AS (
        SELECT
          gm.user_id,
          u.email,
          u.name,
          (COALESCE(SUM(CASE WHEN e.paid_by = gm.user_id THEN e.amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN es.user_id = gm.user_id THEN es.amount ELSE 0 END), 0)
          ) as net_balance
        FROM group_members gm
        INNER JOIN users u ON u.id = gm.user_id
        LEFT JOIN expenses e ON e.group_id = gm.group_id
        LEFT JOIN expense_splits es ON es.expense_id = e.id
        WHERE gm.group_id = $1
        GROUP BY gm.user_id, u.email, u.name
      )
      SELECT * FROM balances WHERE net_balance < -0.01`,
            [groupId]
        );
    }
}
