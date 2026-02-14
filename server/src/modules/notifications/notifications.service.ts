import { NotificationsRepository } from './notifications.repository';
import { sendEmail } from '../../config/email';

export class NotificationsService {
    private repo: NotificationsRepository;

    constructor() {
        this.repo = new NotificationsRepository();
    }

    async getUserNotifications(userId: string) {
        return this.repo.findByUserId(userId);
    }

    async markAsRead(notificationId: string, userId: string) {
        await this.repo.markAsRead(notificationId, userId);
    }

    async createNotification(data: {
        userId: string;
        groupId?: string;
        type: string;
        title: string;
        message: string;
    }) {
        return this.repo.create(data);
    }

    async sendReminders(groupId: string, groupName: string) {
        const unpaidMembers = await this.repo.getUnpaidMembers(groupId);

        const results = await Promise.allSettled(
            unpaidMembers.map(async (member) => {
                const amount = Math.abs(member.net_balance);

                // Create in-app notification
                await this.repo.create({
                    userId: member.user_id,
                    groupId,
                    type: 'payment_reminder',
                    title: 'Payment Reminder',
                    message: `You owe ₹${amount.toFixed(2)} in the group "${groupName}". Please settle your balance.`,
                });

                // Send email (non-blocking)
                await sendEmail({
                    to: member.email,
                    subject: `SplitKaro: Payment Reminder for ${groupName}`,
                    html: `
            <h2>Payment Reminder</h2>
            <p>Hi ${member.name},</p>
            <p>You have an outstanding balance of <strong>₹${amount.toFixed(2)}</strong>
               in the group <strong>${groupName}</strong>.</p>
            <p>Please settle your balance at your earliest convenience.</p>
            <p>— SplitKaro</p>
          `,
                });

                return member.email;
            })
        );

        return {
            sent: results.filter((r) => r.status === 'fulfilled').length,
            failed: results.filter((r) => r.status === 'rejected').length,
            total: unpaidMembers.length,
        };
    }
}
