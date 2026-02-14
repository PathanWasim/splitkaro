import { AppError } from '../../utils/AppError';
import { SettlementsRepository } from './settlements.repository';
import { CreateSettlementInput, UpdateSettlementInput } from './settlements.schema';
import { generateUPILink } from '../../utils/upiLinkGenerator';
import { queryOne } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { emitToGroup } from '../../config/socket';

export class SettlementsService {
    private repo: SettlementsRepository;

    constructor() {
        this.repo = new SettlementsRepository();
    }

    async createSettlement(groupId: string, payerId: string, input: CreateSettlementInput) {
        // Prevent self-settlement
        if (payerId === input.payeeId) {
            throw AppError.badRequest('Cannot settle with yourself');
        }

        // Idempotency check
        const existing = await this.repo.findByIdempotencyKey(input.idempotencyKey);
        if (existing) {
            return existing; // Return existing settlement instead of creating duplicate
        }

        // Get payee info for UPI link
        const payee = await queryOne<{ name: string; upi_id: string | null }>(
            'SELECT name, upi_id FROM users WHERE id = $1',
            [input.payeeId]
        );

        if (!payee) {
            throw AppError.notFound('Payee not found');
        }

        // Generate UPI link if payee has UPI ID
        let upiLink: string | undefined;
        if (payee.upi_id) {
            upiLink = generateUPILink({
                payeeVPA: payee.upi_id,
                payeeName: payee.name,
                amount: input.amount,
                transactionNote: `SplitKaro Settlement`,
            });
        }

        const settlement = await this.repo.create({
            groupId,
            payerId,
            payeeId: input.payeeId,
            amount: input.amount,
            idempotencyKey: input.idempotencyKey,
            upiLink,
        });

        auditService.log({
            actorUserId: payerId,
            entityType: 'settlement',
            entityId: settlement.id,
            action: 'created',
            metadata: { group_id: groupId, amount: input.amount, payee_id: input.payeeId },
        });

        emitToGroup(groupId, 'settlement:created', { groupId, settlementId: settlement.id });

        return { settlement, upiLink };
    }

    async recordPayment(settlementId: string, userId: string, input: UpdateSettlementInput) {
        const settlement = await this.repo.findById(settlementId);
        if (!settlement) throw AppError.notFound('Settlement not found');

        // Only payer or payee can record payment
        if (settlement.payer_id !== userId && settlement.payee_id !== userId) {
            throw AppError.forbidden('Only the payer or payee can record payments');
        }

        if (settlement.status === 'settled') {
            throw AppError.badRequest('Settlement is already fully settled');
        }

        const remainingAmount = settlement.amount - settlement.settled_amount;
        if (input.amount > remainingAmount + 0.01) {
            throw AppError.badRequest(
                `Payment amount (${input.amount}) exceeds remaining balance (${remainingAmount})`
            );
        }

        const updated = await this.repo.recordPayment(settlementId, input.amount, input.note);

        auditService.log({
            actorUserId: userId,
            entityType: 'settlement',
            entityId: settlementId,
            action: 'settled',
            metadata: {
                group_id: settlement.group_id,
                amount: input.amount,
                new_status: updated.status,
                payer_id: settlement.payer_id,
                payee_id: settlement.payee_id,
            },
        });

        emitToGroup(settlement.group_id, 'settlement:paid', {
            groupId: settlement.group_id,
            settlementId,
            newStatus: updated.status,
            amount: input.amount,
        });

        return updated;
    }

    async getSettlements(groupId: string, status?: string) {
        return this.repo.findByGroupId(groupId, status);
    }

    async getHistory(groupId: string) {
        return this.repo.getHistory(groupId);
    }
}
