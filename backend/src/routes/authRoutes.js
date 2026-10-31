const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, changePassword, switchRole } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);

// Các route dưới đây bắt buộc phải đăng nhập
router.post('/switch-role', verifyToken, switchRole);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

module.exports = router;