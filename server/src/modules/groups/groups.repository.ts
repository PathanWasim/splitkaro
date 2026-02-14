import { query, queryOne, transaction } from '../../config/database';

export interface Group {
    id: string;
    name: string;
    type: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}

export interface GroupMemberRow {
    id: string;
    group_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: Date;
    user_name?: string;
    user_email?: string;
    user_upi_id?: string;
}

export class GroupsRepository {
    async create(data: { name: string; type: string; createdBy: string }): Promise<Group> {
        return transaction(async (client) => {
            // Create the group
            const groupResult = await client.query(
                `INSERT INTO groups (name, type, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
                [data.name, data.type, data.createdBy]
            );
            const group = groupResult.rows[0];

            // Add creator as admin
            await client.query(
                `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
                [group.id, data.createdBy]
            );

            return group;
        });
    }

    async findByUserId(userId: string): Promise<(Group & { member_count: number })[]> {
        return query(
            `SELECT g.*, COUNT(gm2.id)::int as member_count
       FROM groups g
       INNER JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       INNER JOIN group_members gm2 ON gm2.group_id = g.id
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
            [userId]
        );
    }

    async findById(groupId: string): Promise<Group | null> {
        return queryOne<Group>(
            'SELECT * FROM groups WHERE id = $1',
            [groupId]
        );
    }

    async getMembers(groupId: string): Promise<GroupMemberRow[]> {
        return query(
            `SELECT gm.*, u.name as user_name, u.email as user_email, u.upi_id as user_upi_id
       FROM group_members gm
       INNER JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at`,
            [groupId]
        );
    }

    async addMember(groupId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<GroupMemberRow> {
        const result = await queryOne<GroupMemberRow>(
            `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [groupId, userId, role]
        );
        return result!;
    }

    async removeMember(groupId: string, userId: string): Promise<void> {
        await query(
            'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );
    }

    async getAdminCount(groupId: string): Promise<number> {
        const result = await queryOne<{ count: number }>(
            `SELECT COUNT(*)::int as count FROM group_members
       WHERE group_id = $1 AND role = 'admin'`,
            [groupId]
        );
        return result?.count || 0;
    }

    async getMemberCount(groupId: string): Promise<number> {
        const result = await queryOne<{ count: number }>(
            'SELECT COUNT(*)::int as count FROM group_members WHERE group_id = $1',
            [groupId]
        );
        return result?.count || 0;
    }
}
