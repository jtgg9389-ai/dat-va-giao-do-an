const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, deleteUser } = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// TẤT CẢ route trong file này đều yêu cầu: đã đăng nhập + role = admin
router.use(verifyToken, requireRole('admin'));

router.get('/users', getAllUsers);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);

module.exports = router;