import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';

let io: Server | null = null;

interface SocketAuthPayload {
    userId: string;
    email: string;
}

export function initializeSocket(httpServer: HTTPServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // JWT Authentication middleware
    io.use((socket: Socket, next) => {
        try {
            const token =
                socket.handshake.auth.token ||
                socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const payload = jwt.verify(token, env.JWT_SECRET) as SocketAuthPayload;
            (socket as any).userId = payload.userId;
            (socket as any).email = payload.email;
            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = (socket as any).userId;
        console.log(`🔌 Socket connected: ${userId}`);

        // Join group rooms
        socket.on('join:group', (groupId: string) => {
            socket.join(`group:${groupId}`);
            console.log(`👥 User ${userId} joined room group:${groupId}`);
        });

        socket.on('leave:group', (groupId: string) => {
            socket.leave(`group:${groupId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${userId}`);
        });
    });

    return io;
}

/**
 * Get the Socket.IO server instance.
 * Returns null if not initialized (e.g., during tests).
 */
export function getIO(): Server | null {
    return io;
}

/**
 * Emit an event to all members of a group room.
 * Safe to call even if Socket.IO is not initialized.
 */
export function emitToGroup(groupId: string, event: string, payload: any): void {
    if (io) {
        io.to(`group:${groupId}`).emit(event, payload);
    }
}
