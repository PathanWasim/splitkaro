import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

type EventCallback = (payload: any) => void;

interface UseSocketOptions {
    groupId?: string;
    onExpenseCreated?: EventCallback;
    onExpenseAdjusted?: EventCallback;
    onSettlementCreated?: EventCallback;
    onSettlementPaid?: EventCallback;
}

export function useSocket(options: UseSocketOptions = {}) {
    const socketRef = useRef<Socket | null>(null);
    const { groupId, onExpenseCreated, onExpenseAdjusted, onSettlementCreated, onSettlementPaid } =
        options;

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🔌 Socket connected');
            if (groupId) {
                socket.emit('join:group', groupId);
            }
        });

        socket.on('connect_error', (err) => {
            console.warn('Socket connection error:', err.message);
        });

        // Register event listeners
        if (onExpenseCreated) socket.on('expense:created', onExpenseCreated);
        if (onExpenseAdjusted) socket.on('expense:adjusted', onExpenseAdjusted);
        if (onSettlementCreated) socket.on('settlement:created', onSettlementCreated);
        if (onSettlementPaid) socket.on('settlement:paid', onSettlementPaid);

        return () => {
            if (groupId) {
                socket.emit('leave:group', groupId);
            }
            socket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]);

    const joinGroup = useCallback(
        (gId: string) => {
            socketRef.current?.emit('join:group', gId);
        },
        []
    );

    const leaveGroup = useCallback(
        (gId: string) => {
            socketRef.current?.emit('leave:group', gId);
        },
        []
    );

    return { socket: socketRef.current, joinGroup, leaveGroup };
}
