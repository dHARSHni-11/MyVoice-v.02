require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { initNotificationService } = require('./src/services/notificationService');
const { startSLACron } = require('./src/services/slaService');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

initNotificationService(io);
startSLACron();

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = { server, io };
