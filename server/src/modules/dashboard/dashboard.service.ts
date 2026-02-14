import { DashboardRepository } from './dashboard.repository';
import { generateCSV } from '../../utils/csvExporter';

export class DashboardService {
    private repo: DashboardRepository;

    constructor() {
        this.repo = new DashboardRepository();
    }

    async getUserSummary(userId: string) {
        const summary = await this.repo.getUserSummary(userId);
        return {
            totalOwedToYou: parseFloat(String(summary?.total_owed_to_you || 0)),
            totalYouOwe: parseFloat(String(summary?.total_you_owe || 0)),
            netBalance: parseFloat(String(summary?.total_owed_to_you || 0)) - parseFloat(String(summary?.total_you_owe || 0)),
            activeGroups: summary?.active_groups || 0,
        };
    }

    async getGroupAnalytics(groupId: string) {
        return this.repo.getGroupAnalytics(groupId);
    }

    async exportGroupExpenses(groupId: string): Promise<string> {
        const expenses = await this.repo.getGroupExpensesForExport(groupId);
        const headers = ['Date', 'Description', 'Amount', 'Paid By', 'Split Type', 'Entry Type'];
        const rows = expenses.map((e: any) => [
            new Date(e.date).toISOString().split('T')[0],
            e.description,
            e.amount,
            e.paid_by,
            e.split_type,
            e.entry_type,
        ]);
        return generateCSV(headers, rows);
    }
}
