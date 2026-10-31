require('dotenv').config();
const http = require('node:http');
const mongoose = require('mongoose');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { attachRealtime } = require('./src/services/realtime');
const { startWorker } = require('./src/services/orderFlow');
const PORT = process.env.PORT || 5000;
connectDB().then(async () => {
  await Promise.all(['Order', 'DriverProfile', 'Notification', 'Review', 'FinancialAdjustment'].map(name => require('./src/models/' + name).init()));
  const server = http.createServer(app);
  const wss = attachRealtime(server);
  const stopWorker = startWorker();
  server.listen(PORT, () => console.log(`Server đang chạy tại http://localhost:${PORT}; Swagger: /api-docs/`));
  let closing = false;
  const close = () => {
    if (closing) return; closing = true;
    stopWorker(); wss.clients.forEach(c => c.terminate()); wss.close();
    server.close(() => mongoose.disconnect());
  };
  process.on('SIGTERM', close); process.on('SIGINT', close);
}).catch(async err => { console.error('Không khởi động được backend:', err.message); await mongoose.disconnect(); process.exitCode = 1; });
