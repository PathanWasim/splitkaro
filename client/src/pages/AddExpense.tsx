import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';

interface Member {
    user_id: string;
    user_name: string;
}

export default function AddExpense() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [members, setMembers] = useState<Member[]>([]);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [splitType, setSplitType] = useState('equal');
    const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (groupId) {
            api.get(`/groups/${groupId}`).then((res) => {
                const m = res.data.data.members;
                setMembers(m);
                setPaidBy(m[0]?.user_id || '');
                setSelectedMembers(m.map((mb: Member) => mb.user_id));
            });
        }
    }, [groupId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
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

            await api.post(`/groups/${groupId}/expenses`, {
                amount: parseFloat(amount),
                description,
                paidBy,
                splitType,
                splits,
            });

            toast.success('Expense added!');
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
    };

    return (
        <div className="add-expense">
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
                            <option key={m.user_id} value={m.user_id}>{m.user_name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="splitType">Split Type</label>
                    <select id="splitType" value={splitType} onChange={(e) => setSplitType(e.target.value)}>
                        <option value="equal">Equal</option>
                        <option value="custom">Custom Amounts</option>
                        <option value="percentage">Percentage</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Split Among</label>
                    <div className="member-checkboxes">
                        {members.map((m) => (
                            <label key={m.user_id} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectedMembers.includes(m.user_id)}
                                    onChange={() => toggleMember(m.user_id)}
                                />
                                {m.user_name}
                                {splitType !== 'equal' && selectedMembers.includes(m.user_id) && (
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="split-input"
                                        placeholder={splitType === 'percentage' ? '%' : '₹'}
                                        value={customSplits[m.user_id] || ''}
                                        onChange={(e) => setCustomSplits({ ...customSplits, [m.user_id]: e.target.value })}
                                    />
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Expense'}
                    </button>
                </div>
            </form>
        </div>
    );
}
