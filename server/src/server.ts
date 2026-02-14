import app from './app';
import { env } from './config/env';
import { pool } from './config/database';

async function main() {
    try {
        // Test database connection
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        client.release();

        // Start server
        app.listen(env.PORT, () => {
            console.log(`
🚀 SplitKaro API Server
────────────────────────
📍 URL:         http://localhost:${env.PORT}
🏥 Health:      http://localhost:${env.PORT}/api/health
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
