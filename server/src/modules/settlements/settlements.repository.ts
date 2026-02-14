import { query, queryOne, transaction } from '../../config/database';

export interface Settlement {
    id: string;
    group_id: string;
    payer_id: string;
    payee_id: string;
    amount: number;
    status: 'pending' | 'partial' | 'settled';
    idempotency_key: string;
    upi_link: string | null;
    settled_amount: number;
    created_at: Date;
    updated_at: Date;
    payer_name?: string;
    payee_name?: string;
}

export interface SettlementHistoryEntry {
    id: string;
    settlement_id: string;
    amount: number;
    payment_method: string;
    note: string | null;
    created_at: Date;
}

export class SettlementsRepository {
    async create(data: {
        groupId: string;
        payerId: string;
        payeeId: string;
        amount: number;
        idempotencyKey: string;
        upiLink?: string;
    }): Promise<Settlement> {
        const result = await queryOne<Settlement>(
            `INSERT INTO settlements (group_id, payer_id, payee_id, amount, idempotency_key, upi_link)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [data.groupId, data.payerId, data.payeeId, data.amount, data.idempotencyKey, data.upiLink || null]
        );
        return result!;
    }

    async findByIdempotencyKey(key: string): Promise<Settlement | null> {
        return queryOne<Settlement>(
            'SELECT * FROM settlements WHERE idempotency_key = $1',
            [key]
        );
    }

    async findById(id: string): Promise<Settlement | null> {
        return queryOne<Settlement>(
            `SELECT s.*, u1.name as payer_name, u2.name as payee_name
       FROM settlements s
       INNER JOIN users u1 ON u1.id = s.payer_id
       INNER JOIN users u2 ON u2.id = s.payee_id
       WHERE s.id = $1`,
            [id]
        );
    }

    async findByGroupId(groupId: string, status?: string): Promise<Settlement[]> {
        let sql = `SELECT s.*, u1.name as payer_name, u2.name as payee_name
       FROM settlements s
       INNER JOIN users u1 ON u1.id = s.payer_id
       INNER JOIN users u2 ON u2.id = s.payee_id
       WHERE s.group_id = $1`;
        const params: any[] = [groupId];

        if (status) {
            sql += ' AND s.status = $2';
            params.push(status);
        }

        sql += ' ORDER BY s.created_at DESC';
        return query<Settlement>(sql, params);
    }

    async recordPayment(settlementId: string, amount: number, note?: string): Promise<Settlement> {
        return transaction(async (client) => {
            // Record history entry
            await client.query(
                `INSERT INTO settlement_history (settlement_id, amount, note)
         VALUES ($1, $2, $3)`,
                [settlementId, amount, note || null]
            );

            // Update settlement
            const result = await client.query(
                `UPDATE settlements
         SET settled_amount = settled_amount + $1,
             status = CASE
               WHEN settled_amount + $1 >= amount THEN 'settled'
               ELSE 'partial'
             END,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
                [amount, settlementId]
            );

            return result.rows[0];
        });
    }

    async deletePending(settlementId: string): Promise<boolean> {
        const result = await queryOne<{ id: string }>(
            `DELETE FROM settlements WHERE id = $1 AND status = 'pending' RETURNING id`,
            [settlementId]
        );
        return !!result;
    }

    async getHistory(groupId: string): Promise<SettlementHistoryEntry[]> {
        return query(
            `SELECT sh.*
       FROM settlement_history sh
       INNER JOIN settlements s ON s.id = sh.settlement_id
       WHERE s.group_id = $1
       ORDER BY sh.created_at DESC`,
            [groupId]
        );
    }
}
