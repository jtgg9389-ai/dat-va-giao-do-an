const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const stats = require('../controllers/adminStatsController');
const partners = require('../controllers/adminPartnerController');
const complaints = require('../controllers/adminComplaintController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Mọi route trong file này yêu cầu: đã đăng nhập + vai trò admin
router.use(verifyToken, requireRole('admin'));

router.get('/stats', stats.getStats);

router.get('/users', admin.listUsers);
router.get('/users/:userId', admin.getUserDetail);
router.patch('/users/:userId/lock', admin.lockUser);
router.patch('/users/:userId/unlock', admin.unlockUser);
router.patch('/users/:userId/role', admin.updateUserRole);

router.get('/restaurants', partners.listRestaurants);
router.patch('/restaurants/:id/review', partners.reviewRestaurant);

router.get('/complaints', complaints.listComplaints);
router.get('/complaints/:id', complaints.getComplaint);
router.patch('/complaints/:id', complaints.updateComplaint);

module.exports = router;