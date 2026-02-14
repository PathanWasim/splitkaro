import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { formatCurrency } from '../utils/formatCurrency';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function Settlements() {
    const { groupId } = useParams();
    const [searchParams] = useSearchParams();
    const [settlements, setSettlements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pre-fill from URL params (from "Settle" button in GroupDetail)
    const toUserId = searchParams.get('to');
    const toName = searchParams.get('toName');
    const suggestedAmount = searchParams.get('amount');

    useEffect(() => {
        fetchSettlements();
    }, [groupId]);

    const fetchSettlements = async () => {
        try {
            const res = await api.get(`/groups/${groupId}/settlements`);
            setSettlements(res.data.data.settlements);
        } catch {
            toast.error('Failed to load settlements');
        } finally {
            setLoading(false);
        }
    };

    const createSettlement = async () => {
        if (!toUserId || !suggestedAmount) return;
        try {
            const res = await api.post(`/groups/${groupId}/settlements`, {
                payeeId: toUserId,
                amount: parseFloat(suggestedAmount),
                idempotencyKey: uuidv4(),
            });
            const { upiLink } = res.data.data;
            toast.success('Settlement created!');

            if (upiLink) {
                window.open(upiLink, '_blank');
            }

            fetchSettlements();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create settlement');
        }
    };

    const recordPayment = async (settlementId: string, amount: number) => {
        try {
            await api.patch(`/groups/${groupId}/settlements/${settlementId}`, {
                amount,
                note: 'Payment recorded',
            });
            toast.success('Payment recorded!');
            fetchSettlements();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to record payment');
        }
    };

    if (loading) return <div className="loading">Loading settlements...</div>;

    return (
        <div className="settlements-page">
            <Link to={`/groups/${groupId}`} className="back-link">← Back to Group</Link>
            <h1>Settlements</h1>

            {/* Quick settle from URL params */}
            {toUserId && suggestedAmount && (
                <div className="settle-prompt">
                    <p>
                        Settle <strong>{formatCurrency(parseFloat(suggestedAmount))}</strong> with <strong>{toName}</strong>?
                    </p>
                    <button className="btn btn-primary" onClick={createSettlement}>
                        Create Settlement & Open UPI
                    </button>
                </div>
            )}

            {/* Existing Settlements */}
            <h2>Settlement History</h2>
            {settlements.length === 0 ? (
                <div className="empty-state"><p>No settlements yet</p></div>
            ) : (
                <div className="settlements-history">
                    {settlements.map((s) => (
                        <div key={s.id} className={`settlement-card status-${s.status}`}>
                            <div className="settlement-detail">
                                <p><strong>{s.payer_name}</strong> → <strong>{s.payee_name}</strong></p>
                                <p className="settlement-amounts">
                                    {formatCurrency(s.settled_amount)} / {formatCurrency(s.amount)}
                                </p>
                            </div>
                            <div className="settlement-status">
                                <span className={`status-badge ${s.status}`}>{s.status}</span>
                                {s.status !== 'settled' && (
                                    <button
                                        className="btn btn-sm btn-outline"
                                        onClick={() => recordPayment(s.id, s.amount - s.settled_amount)}
                                    >
                                        Mark Paid
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
