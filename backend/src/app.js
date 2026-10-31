const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '3mb' }));

require('./config/apiDocs')(app);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/complaints', complaintRoutes);

app.post('/api/orders', require('./middleware/authMiddleware').verifyToken, require('./middleware/authMiddleware').requireRole('customer'), require('./controllers/restaurantOrderController').create);

app.use('/api', require('./routes/flowRoutes'));

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Dữ liệu quá lớn. Ảnh món tối đa 2 MB.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON không hợp lệ' });
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
});

module.exports = app;