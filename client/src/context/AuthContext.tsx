import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

interface User {
    id: string;
    email: string;
    name: string;
    upi_id: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, upiId?: string) => Promise<void>;
    logout: () => void;
    updateProfile: (data: { name?: string; upiId?: string }) => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('splitkaro_token');
        const savedUser = localStorage.getItem('splitkaro_user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { user: u, token: t } = res.data.data;
        setUser(u);
        setToken(t);
        localStorage.setItem('splitkaro_token', t);
        localStorage.setItem('splitkaro_user', JSON.stringify(u));
    };

    const register = async (email: string, password: string, name: string, upiId?: string) => {
        const res = await api.post('/auth/register', { email, password, name, upiId });
        const { user: u, token: t } = res.data.data;
        setUser(u);
        setToken(t);
        localStorage.setItem('splitkaro_token', t);
        localStorage.setItem('splitkaro_user', JSON.stringify(u));
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('splitkaro_token');
        localStorage.removeItem('splitkaro_user');
    };

    const updateProfile = async (data: { name?: string; upiId?: string }) => {
        const res = await api.patch('/auth/me', data);
        const updatedUser = res.data.data.user;
        setUser(updatedUser);
        localStorage.setItem('splitkaro_user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, updateProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
