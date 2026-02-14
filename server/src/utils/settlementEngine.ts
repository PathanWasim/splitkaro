export interface BalanceEntry {
    userId: string;
    name: string;
    netBalance: number; // positive = owed money, negative = owes money
}

export interface SettlementTransaction {
    from: string;     // debtor userId
    fromName: string;
    to: string;       // creditor userId
    toName: string;
    amount: number;
}

/**
 * Settlement Engine
 * 
 * Computes minimum transactions to settle all debts within a group.
 * Uses a greedy net-balance approach:
 * 1. Calculate net balance for each user
 * 2. Separate into creditors (+) and debtors (-)
 * 3. Greedily match largest debtor with largest creditor
 * 
 * Time Complexity: O(n log n) where n = number of users
 * This is a near-optimal heuristic — the true minimum is NP-hard.
 */
export function computeSettlements(balances: BalanceEntry[]): SettlementTransaction[] {
    const creditors: BalanceEntry[] = [];
    const debtors: BalanceEntry[] = [];

    for (const b of balances) {
        if (b.netBalance > 0.01) {
            creditors.push({ ...b });
        } else if (b.netBalance < -0.01) {
            debtors.push({ ...b, netBalance: Math.abs(b.netBalance) });
        }
    }

    // Sort descending by amount
    creditors.sort((a, b) => b.netBalance - a.netBalance);
    debtors.sort((a, b) => b.netBalance - a.netBalance);

    const settlements: SettlementTransaction[] = [];
    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        const transferAmount = Math.min(creditor.netBalance, debtor.netBalance);

        // Round to 2 decimal places to avoid floating-point drift
        const roundedAmount = Math.round(transferAmount * 100) / 100;

        if (roundedAmount > 0) {
            settlements.push({
                from: debtor.userId,
                fromName: debtor.name,
                to: creditor.userId,
                toName: creditor.name,
                amount: roundedAmount,
            });
        }

        creditor.netBalance -= transferAmount;
        debtor.netBalance -= transferAmount;

        if (creditor.netBalance < 0.01) i++;
        if (debtor.netBalance < 0.01) j++;
    }

    return settlements;
}
