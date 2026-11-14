const express = require('express');
const router = express.Router();
const c = require('../controllers/complaintController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Khách hàng, nhà hàng, tài xế được gửi khiếu nại; admin xử lý ở /api/admin/complaints
router.use(verifyToken, requireRole('customer', 'restaurant', 'driver'));

router.post('/', c.createComplaint);
router.get('/', c.listMyComplaints);
router.get('/:id', c.getMyComplaint);
router.post('/:id/messages', c.addMyMessage);

module.exports = router;