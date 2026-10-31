const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const clients = new Map();
function publish(user, event) { for (const socket of clients.get(String(user)) || []) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event)); }
function attachRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/api/ws', maxPayload: 16384 });
  wss.on('connection', socket => {
    let userId, expires = 0;
    const deadline = setTimeout(() => socket.close(1008, 'Authentication required'), 5000);
    socket.on('message', async raw => {
      if (userId) return;
      try {
        const input = JSON.parse(raw.toString());
        const payload = jwt.verify(input.token, process.env.JWT_SECRET);
        const user = await User.findById(payload.id).select('status');
        if (!user || user.status === 'locked' || !payload.exp) throw Error('Unauthorized');
        userId = user.id; expires = payload.exp * 1000; clearTimeout(deadline);
        if (!clients.has(userId)) clients.set(userId, new Set());
        clients.get(userId).add(socket); socket.send(JSON.stringify({ type: 'connected' }));
      } catch { socket.close(1008, 'Unauthorized'); }
    });
    const check = setInterval(async () => { try { if (userId) { const user = await User.findById(userId).select('status'); if (!user || user.status === 'locked' || Date.now() >= expires) socket.close(1008, 'Session ended'); } } catch { socket.close(1011); } }, 5000);
    socket.on('close', () => { clearTimeout(deadline); clearInterval(check); if (userId) { clients.get(userId)?.delete(socket); if (!clients.get(userId)?.size) clients.delete(userId); } });
    socket.on('error', () => socket.close());
  });
  return wss;
}
module.exports = { attachRealtime, publish };
