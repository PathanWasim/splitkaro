import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/relativeTime';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface GroupInfo {
    id: string;
    name: string;
    type: string;
}

interface Member {
    user_id: string;
    user_name: string;
    user_email: string;
    role: string;
}

interface Expense {
    id: string;
    amount: number;
    description: string;
    payer_name: string;
    split_type: string;
    entry_type: string;
    created_at: string;
}

interface Balance {
    userId: string;
    name: string;
    netBalance: number;
}

interface SettlementSuggestion {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
}

interface AuditLog {
    id: string;
    actor_user_id: string;
    entity_type: string;
    action: string;
    metadata: Record<string, any>;
    created_at: string;
}

interface BudgetStatus {
    monthlyLimit: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    exceeded: boolean;
    monthYear: string;
}

type TabType = 'expenses' | 'balances' | 'settlements' | 'activity';

function describeAuditAction(log: AuditLog): { text: string; actionClass: string } {
    const m = log.metadata || {};
    const actor = m.actor_name || m.userName || 'Someone';

    switch (log.action) {
        case 'expense.created':
            return {
                text: `${actor} added an expense "${m.description || ''}" for ${formatCurrency(m.amount || 0)}`,
                actionClass: 'action-created',
            };
        case 'expense.adjusted':
            return {
                text: `${actor} adjusted an expense to ${formatCurrency(m.newAmount || 0)}`,
                actionClass: 'action-adjusted',
            };
        case 'settlement.created':
            return {
                text: `${actor} initiated a settlement of ${formatCurrency(m.amount || 0)}`,
                actionClass: 'action-created',
            };
        case 'settlement.paid':
            return {
                text: `${actor} recorded a payment of ${formatCurrency(m.paidAmount || 0)}`,
                actionClass: 'action-settled',
            };
        case 'group.member_invited':
            return {
                text: `${actor} invited ${m.invitedEmail || 'a member'}`,
                actionClass: 'action-invited',
            };
        case 'group.member_removed':
            return {
                text: `${actor} removed a member from the group`,
                actionClass: 'action-removed',
            };
        case 'group.created':
            return {
                text: `${actor} created this group`,
                actionClass: 'action-created',
            };
        default:
            return {
                text: `${actor} performed ${log.action.replace(/\./g, ' ')}`,
                actionClass: '',
            };
    }
}

export default function GroupDetail() {
    const { groupId } = useParams();
    const { user } = useAuth();
    const [group, setGroup] = useState<GroupInfo | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<Balance[]>([]);
    const [settlements, setSettlements] = useState<SettlementSuggestion[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('expenses');
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(false);
    const [budget, setBudget] = useState<BudgetStatus | null>(null);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [budgetInput, setBudgetInput] = useState('');

    const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin';

    const fetchGroupData = useCallback(async () => {
        try {
            const [groupRes, expensesRes, balancesRes, settlementsRes] = await Promise.all([
                api.get(`/groups/${groupId}`),
                api.get(`/groups/${groupId}/expenses`),
                api.get(`/groups/${groupId}/expenses/balances`),
                api.get(`/groups/${groupId}/expenses/settlements`),
            ]);
            setGroup(groupRes.data.data.group);
            setMembers(groupRes.data.data.members);
            setExpenses(expensesRes.data.data.expenses);
            setBalances(balancesRes.data.data.balances);
            setSettlements(settlementsRes.data.data.settlements);
        } catch {
            toast.error('Failed to load group');
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    const fetchActivity = useCallback(async () => {
        if (!groupId) return;
        setActivityLoading(true);
        try {
            const res = await api.get(`/audit-logs?groupId=${groupId}`);
            setAuditLogs(res.data.data.logs || []);
        } catch {
            // User might not be admin — silently ignore
            setAuditLogs([]);
        } finally {
            setActivityLoading(false);
        }
    }, [groupId]);

    const fetchBudget = useCallback(async () => {
        if (!groupId) return;
        try {
            const res = await api.get(`/groups/${groupId}/budget`);
            setBudget(res.data.data.budget);
        } catch {
            // No budget set
        }
    }, [groupId]);

    useEffect(() => {
        if (groupId) {
            fetchGroupData();
            fetchBudget();
        }
    }, [groupId, fetchGroupData, fetchBudget]);

    useEffect(() => {
        if (activeTab === 'activity' && auditLogs.length === 0) {
            fetchActivity();
        }
    }, [activeTab, fetchActivity, auditLogs.length]);

    useSocket({
        groupId,
        onExpenseCreated: () => { toast('💰 New expense added', { icon: '↗' }); fetchGroupData(); },
        onExpenseAdjusted: () => { toast('📝 Expense adjusted'); fetchGroupData(); },
        onSettlementCreated: () => { toast('🤝 New settlement created'); fetchGroupData(); },
        onSettlementPaid: () => { toast('✅ Settlement updated'); fetchGroupData(); },
    });

    const handleInvite = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/groups/${groupId}/invite`, { email: inviteEmail });
            toast.success('Member invited');
            setInviteEmail('');
            setShowInvite(false);
            fetchGroupData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to invite');
        }
    };

    const handleExport = async () => {
        try {
            const res = await api.get(`/dashboard/groups/${groupId}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `expenses-${groupId}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported');
        } catch {
            toast.error('Export failed');
        }
    };

    if (loading) {
        return (
            <div className="group-detail">
                <div className="skeleton skeleton-text w-40" style={{ height: 14, marginBottom: 8 }} />
                <div className="skeleton skeleton-text w-60" style={{ height: 28, marginBottom: 24 }} />
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: 80, height: 28, borderRadius: 100 }} />)}
                </div>
                <div className="skeleton" style={{ height: 40, marginBottom: 24 }} />
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-row" />)}
            </div>
        );
    }

    if (!group) {
        return (
            <div className="empty-state">
                <span className="empty-state-icon">🔍</span>
                <p>Group not found</p>
            </div>
        );
    }

    return (
        <div className="group-detail">
            <div className="group-detail-header">
                <div>
                    <Link to="/" className="back-link">← Dashboard</Link>
                    <h1>{group.name}</h1>
                    <span className="group-type-badge">{group.type}</span>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline btn-sm" onClick={handleExport}>Export CSV</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowInvite(true)}>Invite</button>
                    <Link to={`/groups/${groupId}/add-expense`} className="btn btn-primary btn-sm">+ Expense</Link>
                </div>
            </div>

            <div className="members-bar">
                {members.map((m) => (
                    <span key={m.user_id} className="member-chip">
                        {m.user_name}{m.role === 'admin' ? ' ★' : ''}
                    </span>
                ))}
            </div>

            {/* Budget Bar */}
            {budget && (
                <div className={`budget-bar ${budget.percentUsed > 80 ? (budget.exceeded ? 'exceeded' : 'warning') : ''}`}>
                    <div className="budget-bar-info">
                        <span>{formatCurrency(budget.remaining)} remaining this month</span>
                        <span className="budget-bar-percent">{budget.percentUsed.toFixed(0)}% of {formatCurrency(budget.monthlyLimit)}</span>
                    </div>
                    <div className="budget-bar-track">
                        <div className="budget-bar-fill" style={{ width: `${Math.min(budget.percentUsed, 100)}%` }} />
                    </div>
                </div>
            )}
            {!budget && isAdmin && (
                <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={() => setShowBudgetModal(true)}>
                    Set Monthly Budget
                </button>
            )}
            {budget && isAdmin && (
                <button className="btn btn-outline btn-sm" style={{ marginBottom: 16, marginLeft: 8 }} onClick={() => { setBudgetInput(String(budget.monthlyLimit)); setShowBudgetModal(true); }}>
                    Edit Budget
                </button>
            )}

            <div className="tabs">
                {(['expenses', 'balances', 'settlements'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
                {isAdmin && (
                    <button
                        className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        Activity
                    </button>
                )}
            </div>

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
                <div className="expenses-list">
                    {expenses.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-state-icon">📋</span>
                            <p>No expenses yet. Tap "+ Expense" to add the first one.</p>
                        </div>
                    ) : (
                        expenses.map((exp) => (
                            <div key={exp.id} className={`expense-item ${exp.entry_type === 'adjustment' ? 'adjustment' : ''}`}>
                                <div className="expense-info">
                                    <h4>{exp.description}</h4>
                                    <p>Paid by {exp.payer_name} · {exp.split_type}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="expense-amount">{formatCurrency(exp.amount)}</div>
                                    <span className="expense-date">{timeAgo(exp.created_at)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Balances Tab */}
            {activeTab === 'balances' && (
                <div className="balances-list">
                    {balances.length === 0 ? (
                        <div className="empty-state"><p>No balances to show</p></div>
                    ) : (
                        balances.map((b) => (
                            <div key={b.userId} className="balance-item">
                                <span className="balance-name">{b.name}</span>
                                <span className={`balance-amount ${b.netBalance >= 0 ? 'positive' : 'negative'}`}>
                                    {b.netBalance >= 0 ? '+' : ''}{formatCurrency(b.netBalance)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Settlements Tab */}
            {activeTab === 'settlements' && (
                <div className="settlements-list">
                    {settlements.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-state-icon">✅</span>
                            <p>All settled up!</p>
                        </div>
                    ) : (
                        settlements.map((s, i) => (
                            <div key={i} className="settlement-item">
                                <div className="settlement-info">
                                    <span>{s.fromName}</span>
                                    <span className="settlement-arrow">→</span>
                                    <span>{s.toName}</span>
                                </div>
                                <span className="settlement-amount">{formatCurrency(s.amount)}</span>
                                <Link
                                    to={`/groups/${groupId}/settle?to=${s.to}&amount=${s.amount}&toName=${s.toName}`}
                                    className="btn btn-primary btn-sm"
                                >
                                    Settle
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Activity Tab (Admin Only) */}
            {activeTab === 'activity' && (
                <div>
                    {activityLoading ? (
                        <div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="skeleton skeleton-row" />
                            ))}
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-state-icon">📜</span>
                            <p>No activity recorded yet</p>
                        </div>
                    ) : (
                        <div className="activity-feed">
                            {auditLogs.map((log) => {
                                const { text, actionClass } = describeAuditAction(log);
                                return (
                                    <div key={log.id} className={`activity-item ${actionClass}`}>
                                        <div className="activity-meta">{timeAgo(log.created_at)}</div>
                                        <div className="activity-content" dangerouslySetInnerHTML={{ __html: text }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Invite Modal */}
            {showInvite && (
                <div className="modal-overlay" onClick={() => setShowInvite(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Invite Member</h2>
                        <form onSubmit={handleInvite}>
                            <div className="form-group">
                                <label htmlFor="inviteEmail">Email Address</label>
                                <input
                                    id="inviteEmail"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="friend@example.com"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowInvite(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Invite</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Budget Modal */}
            {showBudgetModal && (
                <div className="modal-overlay" onClick={() => setShowBudgetModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{budget ? 'Edit Monthly Budget' : 'Set Monthly Budget'}</h2>
                        <form onSubmit={async (e: FormEvent) => {
                            e.preventDefault();
                            const limit = parseFloat(budgetInput);
                            if (!limit || limit <= 0) { toast.error('Enter a valid amount'); return; }
                            try {
                                await api.post(`/groups/${groupId}/budget`, { monthlyLimit: limit });
                                toast.success('Budget saved');
                                setShowBudgetModal(false);
                                fetchBudget();
                            } catch (err: any) {
                                toast.error(err.response?.data?.error || 'Failed to save budget');
                            }
                        }}>
                            <div className="form-group">
                                <label htmlFor="budgetLimit">Monthly Limit (₹)</label>
                                <input
                                    id="budgetLimit"
                                    type="number"
                                    step="100"
                                    min="1"
                                    value={budgetInput}
                                    onChange={(e) => setBudgetInput(e.target.value)}
                                    placeholder="e.g., 5000"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowBudgetModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
