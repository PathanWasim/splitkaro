import { query, queryOne } from '../../config/database';

export interface AuditLog {
    id: string;
    actor_user_id: string;
    entity_type: string;
    entity_id: string | null;
    action: string;
    metadata: Record<string, any> | null;
    created_at: Date;
    actor_name?: string;
}

export interface CreateAuditLogData {
    actorUserId: string;
    entityType: 'group' | 'expense' | 'settlement' | 'auth';
    entityId?: string;
    action: string;
    metadata?: Record<string, any>;
}

export class AuditRepository {
    async create(data: CreateAuditLogData): Promise<void> {
        try {
            await queryOne(
                `INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    data.actorUserId,
                    data.entityType,
                    data.entityId || null,
                    data.action,
                    data.metadata ? JSON.stringify(data.metadata) : null,
                ]
            );
        } catch (error) {
            // Audit logging must NEVER block main operations
            console.error('[AUDIT] Failed to write audit log:', error);
        }
    }

    async findByGroupId(
        groupId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ logs: AuditLog[]; total: number }> {
        const offset = (page - 1) * limit;

        const [logs, countResult] = await Promise.all([
            query<AuditLog>(
                `SELECT al.*, u.name as actor_name
                 FROM audit_logs al
                 INNER JOIN users u ON u.id = al.actor_user_id
                 WHERE al.metadata->>'group_id' = $1
                 ORDER BY al.created_at DESC
                 LIMIT $2 OFFSET $3`,
                [groupId, limit, offset]
            ),
            queryOne<{ count: number }>(
                `SELECT COUNT(*)::int as count
                 FROM audit_logs
                 WHERE metadata->>'group_id' = $1`,
                [groupId]
            ),
        ]);

        return { logs, total: countResult?.count || 0 };
    }
}
