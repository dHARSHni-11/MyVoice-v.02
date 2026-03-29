require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { initNotificationService } = require('./src/services/notificationService');
const { startSLACron } = require('./src/services/slaService');
const { ensureSchema } = require('./src/models/ensureSchema');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ── CORS — support comma-separated FRONTEND_URL for Railway ──
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(u => u.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

async function bootstrap() {
  try {
    await ensureSchema();
    initNotificationService(io);
    startSLACron();

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      if (process.env.RAILWAY_ENVIRONMENT) {
        logger.info(`Railway environment: ${process.env.RAILWAY_ENVIRONMENT}`);
      }
    });
  } catch (err) {
    logger.error(`Fatal startup error: ${err.message}`);
    process.exit(1);
  }
}

bootstrap();

module.exports = { server, io };
