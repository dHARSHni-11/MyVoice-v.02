let ioInstance;

function initNotificationService(io) {
  ioInstance = io;
  io.on('connection', (socket) => {
    socket.on('join-admin', () => socket.join('admin-room'));
    socket.on('join-officer', (officerId) => socket.join(`officer-${officerId}`));
  });
}

function broadcastUpdate(grievanceId, data) {
  if (!ioInstance) return;
  ioInstance.to('admin-room').emit('grievance-update', { grievanceId, ...data });
}

function notifyOfficer(officerId, data) {
  if (!ioInstance) return;
  ioInstance.to(`officer-${officerId}`).emit('new-assignment', data);
}

module.exports = { initNotificationService, broadcastUpdate, notifyOfficer };
