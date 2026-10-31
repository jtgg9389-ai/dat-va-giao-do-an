const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

const app = express();
app.use(cors());
app.use(express.json());

require('./config/apiDocs')(app);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/complaints', complaintRoutes);

app.post('/api/orders', require('./middleware/authMiddleware').verifyToken, require('./middleware/authMiddleware').requireRole('customer'), require('./controllers/restaurantOrderController').create);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
});

module.exports = app;