const express = require('express');
const router = express.Router();
const {
  getMyRestaurant,
  saveMyRestaurant,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listRestaurants,
  getRestaurantDetail,
} = require('../controllers/restaurantController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Tất cả route đều yêu cầu đã đăng nhập
router.use(verifyToken);

const orders = require('../controllers/restaurantOrderController');
router.get('/mine/orders/stream', requireRole('restaurant'), orders.stream);
router.get('/mine/orders', requireRole('restaurant'), orders.list);
router.patch('/mine/orders/:orderId/status', requireRole('restaurant'), orders.updateStatus);
router.get('/mine/report', requireRole('restaurant'), orders.report);

// Dành cho tài khoản nhà hàng (phải đặt TRƯỚC route '/:id')
router.get('/mine', requireRole('restaurant'), getMyRestaurant);
router.put('/mine', requireRole('restaurant'), saveMyRestaurant);
router.post('/mine/menu', requireRole('restaurant'), addMenuItem);
router.put('/mine/menu/:itemId', requireRole('restaurant'), updateMenuItem);
router.delete('/mine/menu/:itemId', requireRole('restaurant'), deleteMenuItem);

// Dành cho mọi người đã đăng nhập (khách hàng xem quán)
router.get('/', listRestaurants);
router.get('/:id', getRestaurantDetail);

module.exports = router;