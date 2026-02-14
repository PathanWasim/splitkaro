import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { pool } from './config/database';
import { initializeSocket } from './config/socket';

async function main() {
    try {
        // Test database connection
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        client.release();

        // Create HTTP server and attach Socket.IO
        const httpServer = createServer(app);
        initializeSocket(httpServer);

        // Start server
        httpServer.listen(env.PORT, () => {
            console.log(`
🚀 SplitKaro API Server
────────────────────────
📍 URL:         http://localhost:${env.PORT}
🏥 Health:      http://localhost:${env.PORT}/api/health
🔌 WebSocket:   ws://localhost:${env.PORT}
🌍 Environment: ${env.NODE_ENV}
────────────────────────
      `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

main();

