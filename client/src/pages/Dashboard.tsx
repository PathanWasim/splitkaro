import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { formatCurrency } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

interface GroupSummary {
    id: string;
    name: string;
    type: string;
    member_count: number;
    created_at: string;
}

interface DashboardSummary {
    totalOwedToYou: number;
    totalYouOwe: number;
    netBalance: number;
    activeGroups: number;
}

export default function Dashboard() {
    const [groups, setGroups] = useState<GroupSummary[]>([]);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupType, setNewGroupType] = useState('friends');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [groupsRes, summaryRes] = await Promise.all([
                api.get('/groups'),
                api.get('/dashboard/summary'),
            ]);
            setGroups(groupsRes.data.data.groups);
            setSummary(summaryRes.data.data);
        } catch (err) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/groups', { name: newGroupName, type: newGroupType });
            toast.success('Group created!');
            setShowCreateModal(false);
            setNewGroupName('');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create group');
        }
    };

    if (loading) return <div className="loading">Loading dashboard...</div>;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + New Group
                </button>
            </div>

            {summary && (
                <div className="summary-cards">
                    <div className="summary-card green">
                        <h3>Owed to You</h3>
                        <p className="amount">{formatCurrency(summary.totalOwedToYou)}</p>
                    </div>
                    <div className="summary-card red">
                        <h3>You Owe</h3>
                        <p className="amount">{formatCurrency(summary.totalYouOwe)}</p>
                    </div>
                    <div className={`summary-card ${summary.netBalance >= 0 ? 'green' : 'red'}`}>
                        <h3>Net Balance</h3>
                        <p className="amount">{formatCurrency(summary.netBalance)}</p>
                    </div>
                    <div className="summary-card blue">
                        <h3>Active Groups</h3>
                        <p className="amount">{summary.activeGroups}</p>
                    </div>
                </div>
            )}

            <h2>Your Groups</h2>
            {groups.length === 0 ? (
                <div className="empty-state">
                    <p>No groups yet. Create one to get started!</p>
                </div>
            ) : (
                <div className="groups-grid">
                    {groups.map((group) => (
                        <Link to={`/groups/${group.id}`} key={group.id} className="group-card">
                            <div className="group-card-header">
                                <span className="group-type-badge">{group.type}</span>
                            </div>
                            <h3>{group.name}</h3>
                            <p className="group-meta">{group.member_count} members</p>
                        </Link>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Group</h2>
                        <form onSubmit={handleCreateGroup}>
                            <div className="form-group">
                                <label htmlFor="groupName">Group Name</label>
                                <input
                                    id="groupName"
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g., Goa Trip 2026"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="groupType">Type</label>
                                <select
                                    id="groupType"
                                    value={newGroupType}
                                    onChange={(e) => setNewGroupType(e.target.value)}
                                >
                                    <option value="friends">Friends</option>
                                    <option value="trip">Trip</option>
                                    <option value="flat">Flat / Roommates</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
