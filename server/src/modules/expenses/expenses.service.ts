import { AppError } from '../../utils/AppError';
import { ExpensesRepository } from './expenses.repository';
import { CreateExpenseInput, AdjustExpenseInput } from './expenses.schema';
import { computeSettlements, BalanceEntry } from '../../utils/settlementEngine';

export class ExpensesService {
    private repo: ExpensesRepository;

    constructor() {
        this.repo = new ExpensesRepository();
    }

    async createExpense(groupId: string, input: CreateExpenseInput) {
        const splits = this.calculateSplits(input);

        return this.repo.create({
            groupId,
            paidBy: input.paidBy,
            amount: input.amount,
            description: input.description,
            splitType: input.splitType,
            entryType: 'original',
            splits,
        });
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

    async adjustExpense(groupId: string, expenseId: string, input: AdjustExpenseInput) {
        // Verify original expense exists
        const original = await this.repo.findById(expenseId);
        if (!original) throw AppError.notFound('Original expense not found');
        if (original.group_id !== groupId) throw AppError.forbidden('Expense does not belong to this group');

        const splits = this.calculateSplits(input);

        // Create a reversal of the original expense
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
                amount: -s.amount, // negative to reverse
            })),
        });

        // Create new corrected expense
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
     * Handles rounding for equal splits by assigning remainder to first splitter.
     */
    private calculateSplits(input: CreateExpenseInput | AdjustExpenseInput): { userId: string; amount: number }[] {
        const { amount, splitType, splits } = input;

        switch (splitType) {
            case 'equal': {
                const perPerson = Math.floor((amount * 100) / splits.length) / 100;
                const remainder = Math.round((amount - perPerson * splits.length) * 100) / 100;

                return splits.map((s, i) => ({
                    userId: s.userId,
                    amount: i === 0 ? perPerson + remainder : perPerson,
                }));
            }

            case 'custom': {
                const totalSplit = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
                const tolerance = 0.01;
                if (Math.abs(totalSplit - amount) > tolerance) {
                    throw AppError.badRequest(
                        `Custom split amounts (${totalSplit}) must equal the total amount (${amount})`
                    );
                }

                return splits.map((s) => ({
                    userId: s.userId,
                    amount: s.amount || 0,
                }));
            }

            case 'percentage': {
                const totalPercentage = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
                if (Math.abs(totalPercentage - 100) > 0.01) {
                    throw AppError.badRequest(
                        `Percentages must sum to 100 (got ${totalPercentage})`
                    );
                }

                return splits.map((s) => ({
                    userId: s.userId,
                    amount: Math.round(amount * (s.percentage || 0)) / 100,
                }));
            }

            default:
                throw AppError.badRequest('Invalid split type');
        }
    }
}
