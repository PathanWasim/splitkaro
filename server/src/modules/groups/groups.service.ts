import { AppError } from '../../utils/AppError';
import { GroupsRepository } from './groups.repository';
import { AuthRepository } from '../auth/auth.repository';
import { CreateGroupInput, InviteToGroupInput } from './groups.schema';
import { auditService } from '../audit/audit.service';

export class GroupsService {
    private repo: GroupsRepository;
    private authRepo: AuthRepository;

    constructor() {
        this.repo = new GroupsRepository();
        this.authRepo = new AuthRepository();
    }

    async createGroup(userId: string, input: CreateGroupInput) {
        const group = await this.repo.create({
            name: input.name,
            type: input.type,
            createdBy: userId,
        });

        auditService.log({
            actorUserId: userId,
            entityType: 'group',
            entityId: group.id,
            action: 'created',
            metadata: { group_id: group.id, name: input.name, type: input.type },
        });

        return group;
    }

    async getUserGroups(userId: string) {
        return this.repo.findByUserId(userId);
    }

    async getGroupDetail(groupId: string) {
        const group = await this.repo.findById(groupId);
        if (!group) throw AppError.notFound('Group not found');

        const members = await this.repo.getMembers(groupId);
        return { group, members };
    }

    async inviteMember(groupId: string, inviterId: string, input: InviteToGroupInput) {
        // Find user by email
        const user = await this.authRepo.findByEmail(input.email);
        if (!user) {
            throw AppError.notFound('No user found with this email. They must register first.');
        }

        // Check if already a member
        const members = await this.repo.getMembers(groupId);
        if (members.some((m) => m.user_id === user.id)) {
            throw AppError.conflict('User is already a member of this group');
        }

        const result = await this.repo.addMember(groupId, user.id);

        auditService.log({
            actorUserId: inviterId,
            entityType: 'group',
            entityId: groupId,
            action: 'invited',
            metadata: { group_id: groupId, affected_user_id: user.id, email: input.email },
        });

        return result;
    }

    async removeMember(groupId: string, userId: string, requesterId: string) {
        if (userId === requesterId) {
            // Check if sole admin
            const adminCount = await this.repo.getAdminCount(groupId);
            const members = await this.repo.getMembers(groupId);
            const requesterMember = members.find((m) => m.user_id === requesterId);

            if (requesterMember?.role === 'admin' && adminCount <= 1) {
                throw AppError.badRequest('Cannot remove yourself as the only admin. Transfer admin role first.');
            }
        }

        await this.repo.removeMember(groupId, userId);

        auditService.log({
            actorUserId: requesterId,
            entityType: 'group',
            entityId: groupId,
            action: 'removed',
            metadata: { group_id: groupId, affected_user_id: userId },
        });
    }
}
