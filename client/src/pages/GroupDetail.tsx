import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

interface GroupDetail {
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

export default function GroupDetail() {
    const { groupId } = useParams();
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<Balance[]>([]);
    const [settlements, setSettlements] = useState<SettlementSuggestion[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlements'>('expenses');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (groupId) fetchGroupData();
    }, [groupId]);

    const fetchGroupData = async () => {
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
        } catch (err) {
            toast.error('Failed to load group');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/groups/${groupId}/invite`, { email: inviteEmail });
            toast.success('Member invited!');
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
            toast.success('CSV exported!');
        } catch {
            toast.error('Export failed');
        }
    };

    if (loading) return <div className="loading">Loading group...</div>;
    if (!group) return <div className="loading">Group not found</div>;

    return (
        <div className="group-detail">
            <div className="group-detail-header">
                <div>
                    <Link to="/" className="back-link">← Back to Dashboard</Link>
                    <h1>{group.name}</h1>
                    <span className="group-type-badge">{group.type}</span>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline btn-sm" onClick={handleExport}>📥 Export CSV</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowInvite(true)}>👥 Invite</button>
                    <Link to={`/groups/${groupId}/add-expense`} className="btn btn-primary btn-sm">+ Add Expense</Link>
                </div>
            </div>

            {/* Members */}
            <div className="members-bar">
                {members.map((m) => (
                    <span key={m.user_id} className="member-chip">
                        {m.user_name} {m.role === 'admin' && '⭐'}
                    </span>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
                    Expenses
                </button>
                <button className={`tab ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>
                    Balances
                </button>
                <button className={`tab ${activeTab === 'settlements' ? 'active' : ''}`} onClick={() => setActiveTab('settlements')}>
                    Settlements
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'expenses' && (
                <div className="expenses-list">
                    {expenses.length === 0 ? (
                        <div className="empty-state"><p>No expenses yet</p></div>
                    ) : (
                        expenses.map((exp) => (
                            <div key={exp.id} className={`expense-item ${exp.entry_type === 'adjustment' ? 'adjustment' : ''}`}>
                                <div className="expense-info">
                                    <h4>{exp.description}</h4>
                                    <p>Paid by {exp.payer_name} · {exp.split_type} split</p>
                                    <span className="expense-date">{formatDate(exp.created_at)}</span>
                                </div>
                                <div className="expense-amount">{formatCurrency(exp.amount)}</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'balances' && (
                <div className="balances-list">
                    {balances.map((b) => (
                        <div key={b.userId} className="balance-item">
                            <span className="balance-name">{b.name}</span>
                            <span className={`balance-amount ${b.netBalance >= 0 ? 'positive' : 'negative'}`}>
                                {b.netBalance >= 0 ? 'gets back' : 'owes'} {formatCurrency(Math.abs(b.netBalance))}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'settlements' && (
                <div className="settlements-list">
                    {settlements.length === 0 ? (
                        <div className="empty-state"><p>All settled up! 🎉</p></div>
                    ) : (
                        settlements.map((s, i) => (
                            <div key={i} className="settlement-item">
                                <div className="settlement-info">
                                    <span className="settlement-from">{s.fromName}</span>
                                    <span className="settlement-arrow">→</span>
                                    <span className="settlement-to">{s.toName}</span>
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
        </div>
    );
}
