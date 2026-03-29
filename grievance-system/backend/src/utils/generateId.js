const generateTicketId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GRV-${timestamp}-${random}`;
};

module.exports = { generateTicketId };
