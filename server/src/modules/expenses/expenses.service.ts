import { AppError } from '../../utils/AppError';
import { ExpensesRepository } from './expenses.repository';
import { CreateExpenseInput, AdjustExpenseInput } from './expenses.schema';
import { computeSettlements, BalanceEntry } from '../../utils/settlementEngine';
import { auditService } from '../audit/audit.service';
import { emitToGroup } from '../../config/socket';

export class ExpensesService {
    private repo: ExpensesRepository;

    constructor() {
        this.repo = new ExpensesRepository();
    }

    async createExpense(groupId: string, userId: string, input: CreateExpenseInput) {
        const splits = this.calculateSplits(input);

        const result = await this.repo.create({
            groupId,
            paidBy: input.paidBy,
            amount: input.amount,
            description: input.description,
            splitType: input.splitType,
            entryType: 'original',
            splits,
        });

        // Check budget and return warning if exceeded
        let budgetWarning: { exceeded: boolean; percentUsed: number; remaining: number } | undefined;
        try {
            const { BudgetService } = await import('../budget/budget.service');
            const budgetService = new BudgetService();
            const budget = await budgetService.getBudget(groupId);
            if (budget) {
                budgetWarning = {
                    exceeded: budget.exceeded,
                    percentUsed: budget.percentUsed,
                    remaining: budget.remaining,
                };
            }
        } catch {
            // Budget module not yet set up — silently skip
        }

        auditService.log({
            actorUserId: userId,
            entityType: 'expense',
            entityId: result.expense.id,
            action: 'created',
            metadata: { group_id: groupId, amount: input.amount, description: input.description },
        });

        emitToGroup(groupId, 'expense:created', { groupId, expense: result.expense });

        return { ...result, budgetWarning };
    }

    async getExpenses(groupId: string, page: number = 1, limit: number = 20) {
        return this.repo.findByGroupId(groupId, page, limit);
    }

    async getExpenseDetail(expenseId: string) {
        const expense = await this.repo.findById(expenseId);
        if (!expense) throw AppError.notFound('Expense not found');

        const splits = await this.repo.getSplits(expenseId);
        const adjustments = await this.repo.getAdjustments(expenseId);

        return { expense, splits, adjustments };
    }

    async adjustExpense(groupId: string, userId: string, expenseId: string, input: AdjustExpenseInput) {
        const original = await this.repo.findById(expenseId);
        if (!original) throw AppError.notFound('Original expense not found');
        if (original.group_id !== groupId) throw AppError.forbidden('Expense does not belong to this group');

        const splits = this.calculateSplits(input);

        // Reversal of original
        const reversal = await this.repo.create({
            groupId,
            paidBy: original.paid_by,
            amount: original.amount,
            description: `[REVERSAL] ${original.description}`,
            splitType: original.split_type,
            entryType: 'adjustment',
            parentId: expenseId,
            splits: (await this.repo.getSplits(expenseId)).map((s) => ({
                userId: s.user_id,
                amount: -s.amount,
            })),
        });

        // New corrected expense
        const corrected = await this.repo.create({
            groupId,
            paidBy: input.paidBy,
            amount: input.amount,
            description: `[CORRECTION] ${input.description}`,
            splitType: input.splitType,
            entryType: 'adjustment',
            parentId: expenseId,
            splits,
        });

        auditService.log({
            actorUserId: userId,
            entityType: 'expense',
            entityId: expenseId,
            action: 'adjusted',
            metadata: { group_id: groupId, amount: input.amount, original_expense_id: expenseId },
        });

        emitToGroup(groupId, 'expense:adjusted', { groupId, expenseId, reversal, corrected });

        return { reversal, corrected };
    }

    async getGroupBalances(groupId: string) {
        const balances = await this.repo.getGroupBalances(groupId);
        return balances.map((b) => ({
            userId: b.user_id,
            name: b.user_name,
            netBalance: parseFloat(String(b.net_balance)),
        }));
    }

    async getOptimalSettlements(groupId: string) {
        const balances = await this.getGroupBalances(groupId);
        const balanceEntries: BalanceEntry[] = balances.map((b) => ({
            userId: b.userId,
            name: b.name,
            netBalance: b.netBalance,
        }));

        return computeSettlements(balanceEntries);
    }

    /**
     * Calculate split amounts based on split type.
     * 
     * Rounding strategy (Splitwise standard):
     * - Equal: payer absorbs the rounding remainder
     * - Percentage: computed per-person, payer absorbs rounding drift
     * - Custom: validated to sum to total (with 1 paisa tolerance)
     */
    private calculateSplits(input: CreateExpenseInput | AdjustExpenseInput): { userId: string; amount: number }[] {
        const { amount, splitType, splits, paidBy } = input;

        if (splits.length === 0) {
            throw AppError.badRequest('At least one split participant is required');
        }

        let result: { userId: string; amount: number }[];

        switch (splitType) {
            case 'equal': {
                const perPerson = Math.floor((amount * 100) / splits.length) / 100;
                const totalDistributed = perPerson * splits.length;
                const remainder = Math.round((amount - totalDistributed) * 100) / 100;

                result = splits.map((s) => ({
                    userId: s.userId,
                    amount: perPerson,
                }));

                // Payer absorbs the rounding remainder (Splitwise standard)
                if (remainder !== 0) {
                    const payerIdx = result.findIndex(r => r.userId === paidBy);
                    const targetIdx = payerIdx >= 0 ? payerIdx : 0;
                    result[targetIdx].amount = Math.round((result[targetIdx].amount + remainder) * 100) / 100;
                }
                break;
            }

            case 'custom': {
                const totalSplit = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
                if (Math.abs(totalSplit - amount) > 0.01) {
                    throw AppError.badRequest(
                        `Custom split amounts (${totalSplit.toFixed(2)}) must equal the total amount (${amount.toFixed(2)})`
                    );
                }

                result = splits.map((s) => {
                    const splitAmt = s.amount || 0;
                    if (splitAmt < 0) throw AppError.badRequest('Split amounts cannot be negative');
                    return { userId: s.userId, amount: splitAmt };
                });
                break;
            }

            case 'percentage': {
                const totalPercentage = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
                if (Math.abs(totalPercentage - 100) > 0.01) {
                    throw AppError.badRequest(
                        `Percentages must sum to 100 (got ${totalPercentage.toFixed(2)})`
                    );
                }

                // Correct formula: amount * (percentage / 100), rounded to 2 decimals
                result = splits.map((s) => ({
                    userId: s.userId,
                    amount: Math.round(amount * (s.percentage || 0) / 100 * 100) / 100,
                }));

                // Payer absorbs rounding drift
                const sumComputed = result.reduce((s, r) => s + r.amount, 0);
                const drift = Math.round((amount - sumComputed) * 100) / 100;
                if (drift !== 0) {
                    const payerIdx = result.findIndex(r => r.userId === paidBy);
                    const targetIdx = payerIdx >= 0 ? payerIdx : 0;
                    result[targetIdx].amount = Math.round((result[targetIdx].amount + drift) * 100) / 100;
                }
                break;
            }

            default:
                throw AppError.badRequest('Invalid split type');
        }

        // Final safety: verify total matches (belt-and-suspenders)
        const finalTotal = result.reduce((sum, r) => sum + r.amount, 0);
        if (Math.abs(Math.round(finalTotal * 100) / 100 - amount) > 0.01) {
            throw AppError.badRequest(
                `Split calculation error: splits total ${finalTotal.toFixed(2)} ≠ expense amount ${amount.toFixed(2)}`
            );
        }

        return result;
    }
}
