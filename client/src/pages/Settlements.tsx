import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/relativeTime';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function Settlements() {
    const { groupId } = useParams();
    const [searchParams] = useSearchParams();
    const [settlements, setSettlements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState(false);
    const [upiLink, setUpiLink] = useState<string | null>(null);
    const [noUpiReason, setNoUpiReason] = useState<string | null>(null);

    // Generate idempotency key ONCE per page load — prevents duplicate settlements
    const idempotencyKey = useRef(uuidv4());

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
        if (!toUserId || !suggestedAmount || creating || created) return;
        setCreating(true);
        try {
            const res = await api.post(`/groups/${groupId}/settlements`, {
                payeeId: toUserId,
                amount: parseFloat(suggestedAmount),
                idempotencyKey: idempotencyKey.current,
            });
            const data = res.data.data;
            toast.success('Settlement created');
            setCreated(true);

            if (data.upiLink) {
                setUpiLink(data.upiLink);
                window.location.href = data.upiLink;
            } else if (data.noUpiReason) {
                setNoUpiReason(data.noUpiReason);
            }

            fetchSettlements();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create settlement');
        } finally {
            setCreating(false);
        }
    };

    const copyUpiDetails = () => {
        if (!upiLink) return;
        navigator.clipboard.writeText(upiLink).then(() => {
            toast.success('UPI link copied to clipboard');
        }).catch(() => {
            window.prompt('Copy this UPI link:', upiLink);
        });
    };

    const openUpiLink = () => {
        if (upiLink) {
            window.location.href = upiLink;
        }
    };

    const recordPayment = async (settlementId: string, amount: number) => {
        try {
            await api.patch(`/groups/${groupId}/settlements/${settlementId}`, {
                amount,
                note: 'Payment recorded',
            });
            toast.success('Payment recorded');
            fetchSettlements();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to record payment');
        }
    };

    if (loading) {
        return (
            <div className="settlements-page">
                <div className="skeleton skeleton-text w-40" style={{ height: 14, marginBottom: 8 }} />
                <div className="skeleton skeleton-text w-60" style={{ height: 28, marginBottom: 32 }} />
                {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-row" style={{ height: 80, marginBottom: 12 }} />)}
            </div>
        );
    }

    return (
        <div className="settlements-page">
            <Link to={`/groups/${groupId}`} className="back-link">← Back to Group</Link>
            <h1>Settlements</h1>

            {toUserId && suggestedAmount && (
                <div className="settle-prompt">
                    {!created ? (
                        <>
                            <p>
                                Settle <strong>{formatCurrency(parseFloat(suggestedAmount))}</strong> with <strong>{toName}</strong>?
                            </p>
                            <div className="settle-actions">
                                <button
                                    className="btn btn-success btn-lg"
                                    onClick={createSettlement}
                                    disabled={creating}
                                >
                                    {creating ? 'Creating…' : 'Create Settlement & Pay via UPI'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="settle-success">✅ Settlement created for <strong>{formatCurrency(parseFloat(suggestedAmount))}</strong> with <strong>{toName}</strong></p>

                            {/* UPI actions after creation */}
                            {upiLink && (
                                <div className="upi-fallback">
                                    <p className="upi-fallback-text">Didn't open your UPI app?</p>
                                    <div className="upi-fallback-actions">
                                        <button className="btn btn-success btn-sm" onClick={openUpiLink}>
                                            Open UPI App
                                        </button>
                                        <button className="btn btn-outline btn-sm" onClick={copyUpiDetails}>
                                            Copy UPI Link
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* No UPI notice */}
                            {noUpiReason && (
                                <div className="upi-notice">
                                    <span className="upi-notice-icon">ℹ️</span>
                                    <span>{noUpiReason}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <h2>Settlement History</h2>
            {settlements.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state-icon">🤝</span>
                    <p>No settlements yet. Use the "Settle" button from the group page to begin.</p>
                </div>
            ) : (
                <div className="settlements-history">
                    {settlements.map((s) => (
                        <div key={s.id} className="settlement-card">
                            <div className="settlement-detail">
                                <p><strong>{s.payer_name}</strong> → <strong>{s.payee_name}</strong></p>
                                <p className="settlement-amounts">
                                    {formatCurrency(s.settled_amount)} of {formatCurrency(s.amount)} · {timeAgo(s.created_at)}
                                </p>
                            </div>
                            <div className="settlement-status">
                                <span className={`status-badge ${s.status}`}>{s.status}</span>
                                {s.status !== 'settled' ? (
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => recordPayment(s.id, s.amount - s.settled_amount)}
                                    >
                                        Mark Paid
                                    </button>
                                ) : (
                                    <button className="btn btn-sm btn-outline" disabled>
                                        Settled
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
