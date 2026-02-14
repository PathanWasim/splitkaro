import { AuditRepository, CreateAuditLogData } from './audit.repository';

export class AuditService {
    private repo: AuditRepository;

    constructor() {
        this.repo = new AuditRepository();
    }

    /**
     * Fire-and-forget audit log entry.
     * Never awaited in calling code to avoid blocking business logic.
     */
    log(data: CreateAuditLogData): void {
        // Intentionally not awaited — fire and forget
        this.repo.create(data);
    }

    async getGroupAuditLogs(groupId: string, page: number = 1, limit: number = 20) {
        return this.repo.findByGroupId(groupId, page, limit);
    }
}

// Singleton instance for use across all services
export const auditService = new AuditService();
