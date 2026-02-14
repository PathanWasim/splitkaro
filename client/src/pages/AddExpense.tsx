import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

interface Member {
    user_id: string;
    user_name: string;
}

export default function AddExpense() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
    const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [showCustomize, setShowCustomize] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (groupId) {
            api.get(`/groups/${groupId}`).then((res) => {
                const m = res.data.data.members;
                setMembers(m);
                const currentUserMember = m.find((mb: Member) => mb.user_id === user?.id);
                setPaidBy(currentUserMember?.user_id || m[0]?.user_id || '');
                setSelectedMembers(m.map((mb: Member) => mb.user_id));
            });
        }
    }, [groupId, user?.id]);

    /**
     * Auto-calculate: when a user types a value for one member,
     * distribute the remainder equally among the other empty fields.
     * For 2 members: typing 60% auto-fills the other as 40%.
     */
    const handleSplitChange = (userId: string, value: string) => {
        const newSplits = { ...customSplits, [userId]: value };

        const enteredValue = parseFloat(value);
        if (!isNaN(enteredValue)) {
            const otherMembers = selectedMembers.filter(id => id !== userId);
            if (otherMembers.length > 0) {
                if (splitType === 'percentage') {
                    const remaining = 100 - enteredValue;
                    // Count how many others have been manually edited (non-empty, non-auto)
                    const othersWithValues = otherMembers.filter(id => customSplits[id] && customSplits[id] !== '');
                    if (othersWithValues.length === 0 || otherMembers.length === 1) {
                        // Auto-fill all others equally
                        const perOther = Math.round(remaining / otherMembers.length * 100) / 100;
                        let distributed = 0;
                        otherMembers.forEach((id, i) => {
                            if (i === otherMembers.length - 1) {
                                newSplits[id] = String(Math.round((remaining - distributed) * 100) / 100);
                            } else {
                                newSplits[id] = String(perOther);
                                distributed += perOther;
                            }
                        });
                    }
                } else if (splitType === 'custom') {
                    const totalAmount = parseFloat(amount);
                    if (totalAmount > 0) {
                        const remaining = totalAmount - enteredValue;
                        const othersWithValues = otherMembers.filter(id => customSplits[id] && customSplits[id] !== '');
                        if (othersWithValues.length === 0 || otherMembers.length === 1) {
                            const perOther = Math.round(remaining / otherMembers.length * 100) / 100;
                            let distributed = 0;
                            otherMembers.forEach((id, i) => {
                                if (i === otherMembers.length - 1) {
                                    newSplits[id] = String(Math.round((remaining - distributed) * 100) / 100);
                                } else {
                                    newSplits[id] = String(perOther);
                                    distributed += perOther;
                                }
                            });
                        }
                    }
                }
            }
        }

        setCustomSplits(newSplits);
    };

    // Compute split preview
    const splitPreview = useMemo(() => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0 || selectedMembers.length === 0) return [];

        if (splitType === 'equal') {
            const perPerson = Math.floor((amt * 100) / selectedMembers.length) / 100;
            const totalDistributed = perPerson * selectedMembers.length;
            const remainder = Math.round((amt - totalDistributed) * 100) / 100;

            return selectedMembers.map((userId) => {
                const member = members.find(m => m.user_id === userId);
                const share = userId === paidBy ? perPerson + remainder : perPerson;
                return { name: member?.user_name || 'Unknown', amount: share };
            });
        }

        if (splitType === 'custom') {
            return selectedMembers.map((userId) => {
                const member = members.find(m => m.user_id === userId);
                return { name: member?.user_name || 'Unknown', amount: parseFloat(customSplits[userId] || '0') };
            });
        }

        if (splitType === 'percentage') {
            return selectedMembers.map((userId) => {
                const member = members.find(m => m.user_id === userId);
                const pct = parseFloat(customSplits[userId] || '0');
                return { name: member?.user_name || 'Unknown', amount: Math.round(amt * pct / 100 * 100) / 100 };
            });
        }

        return [];
    }, [amount, splitType, selectedMembers, customSplits, members, paidBy]);

    // Validation
    const validationError = useMemo(() => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) return null;
        if (selectedMembers.length === 0) return 'Select at least one person to split with';

        if (splitType === 'custom') {
            const total = selectedMembers.reduce((sum, uid) => sum + parseFloat(customSplits[uid] || '0'), 0);
            const diff = Math.abs(total - amt);
            if (diff > 0.01) return `Custom amounts total ${formatCurrency(total)}, but expense is ${formatCurrency(amt)}`;
        }

        if (splitType === 'percentage') {
            const total = selectedMembers.reduce((sum, uid) => sum + parseFloat(customSplits[uid] || '0'), 0);
            if (Math.abs(total - 100) > 0.01) return `Percentages total ${total.toFixed(1)}%, must be 100%`;
        }

        return null;
    }, [amount, splitType, selectedMembers, customSplits]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setLoading(true);

        try {
            const splits = selectedMembers.map((userId) => {
                const split: any = { userId };
                if (splitType === 'custom') {
                    split.amount = parseFloat(customSplits[userId] || '0');
                } else if (splitType === 'percentage') {
                    split.percentage = parseFloat(customSplits[userId] || '0');
                }
                return split;
            });

            const res = await api.post(`/groups/${groupId}/expenses`, {
                amount: parseFloat(amount),
                description,
                paidBy,
                splitType,
                splits,
            });

            if (res.data?.data?.budgetWarning?.exceeded) {
                toast('⚠️ Monthly budget exceeded!', { icon: '🔴', duration: 5000 });
            } else if (res.data?.data?.budgetWarning?.percentUsed > 80) {
                toast(`Budget ${res.data.data.budgetWarning.percentUsed.toFixed(0)}% used`, { icon: '🟡', duration: 4000 });
            }

            toast.success('Expense added');
            navigate(`/groups/${groupId}`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (userId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
        // Clear custom split for toggled member
        const newSplits = { ...customSplits };
        delete newSplits[userId];
        setCustomSplits(newSplits);
    };

    const handleCustomizeToggle = () => {
        if (showCustomize) {
            setSplitType('equal');
            setCustomSplits({});
        }
        setShowCustomize(!showCustomize);
    };

    return (
        <div className="add-expense">
            <Link to={`/groups/${groupId}`} className="back-link" style={{ marginBottom: 8, display: 'inline-block' }}>← Back to Group</Link>
            <h1>Add Expense</h1>
            <form onSubmit={handleSubmit} className="expense-form">
                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <input
                        id="description"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Dinner at restaurant"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="amount">Amount (₹)</label>
                    <input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="paidBy">Paid By</label>
                    <select id="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                        {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                                {m.user_name}{m.user_id === user?.id ? ' (You)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Equal split default */}
                {!showCustomize && (
                    <div className="split-info">
                        <p className="split-helper-text">
                            Split equally among {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                        </p>
                        <button type="button" className="btn btn-outline btn-sm" onClick={handleCustomizeToggle}>
                            Customize split
                        </button>
                    </div>
                )}

                {/* Progressive disclosure: customization */}
                {showCustomize && (
                    <div className="customize-panel">
                        <div className="form-group">
                            <label htmlFor="splitType">Split Type</label>
                            <select id="splitType" value={splitType} onChange={(e) => { setSplitType(e.target.value as any); setCustomSplits({}); }}>
                                <option value="equal">Equal</option>
                                <option value="custom">Custom Amounts (₹)</option>
                                <option value="percentage">Percentage (%)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={{ margin: 0 }}>Split Among</label>
                                <button type="button" className="btn btn-outline btn-sm" onClick={handleCustomizeToggle}>
                                    Reset to equal
                                </button>
                            </div>
                            <div className="member-checkboxes">
                                {members.map((m) => (
                                    <label key={m.user_id} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={selectedMembers.includes(m.user_id)}
                                            onChange={() => toggleMember(m.user_id)}
                                        />
                                        <span className="checkbox-name">{m.user_name}{m.user_id === user?.id ? ' (You)' : ''}</span>
                                        {splitType !== 'equal' && selectedMembers.includes(m.user_id) && (
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="split-input"
                                                placeholder={splitType === 'percentage' ? '%' : '₹'}
                                                value={customSplits[m.user_id] || ''}
                                                onChange={(e) => handleSplitChange(m.user_id, e.target.value)}
                                            />
                                        )}
                                    </label>
                                ))}
                            </div>
                            {splitType === 'percentage' && (
                                <p className="split-helper-text" style={{ marginTop: 8 }}>
                                    Enter one value — the rest auto-fills
                                </p>
                            )}
                            {splitType === 'custom' && parseFloat(amount) > 0 && (
                                <p className="split-helper-text" style={{ marginTop: 8 }}>
                                    Enter one amount — the rest auto-fills to reach {formatCurrency(parseFloat(amount))}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Validation error */}
                {validationError && (
                    <div className="split-error">{validationError}</div>
                )}

                {/* Split preview */}
                {splitPreview.length > 0 && parseFloat(amount) > 0 && (
                    <div className="split-preview">
                        <p className="split-preview-title">Split Preview</p>
                        {splitPreview.map((sp, i) => (
                            <div key={i} className="split-preview-row">
                                <span>{sp.name}</span>
                                <span className="split-preview-amount">{formatCurrency(sp.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="form-actions">
                    <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading || !!validationError}>
                        {loading ? 'Adding…' : 'Add Expense'}
                    </button>
                </div>
            </form>
        </div>
    );
}
