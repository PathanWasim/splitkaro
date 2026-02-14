import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app">
            <nav className="navbar">
                <div className="nav-brand">
                    <Link to="/">💰 SplitKaro</Link>
                </div>
                <div className="nav-links">
                    {user && (
                        <>
                            <Link to="/" className="nav-link">Dashboard</Link>
                            <Link to="/profile" className="nav-link">Profile</Link>
                            <button onClick={handleLogout} className="btn btn-outline btn-sm">
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </nav>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
