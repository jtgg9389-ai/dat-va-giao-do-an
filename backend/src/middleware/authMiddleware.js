const jwt = require('jsonwebtoken');
const { rolesOf } = require('../utils/accountRoles');
const User = require('../models/User');

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }

  try {
    const user = await User.findById(decoded.id).select('email role roles activeRole status lockReason');
    if (!user) {
      return res.status(401).json({ message: 'Tài khoản không còn tồn tại' });
    }
    if (user.status === 'locked') {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa', locked: true, reason: user.lockReason });
    }
    const activeRole = decoded.activeRole || user.role;
    if (!rolesOf(user).includes(activeRole) || (user.activeRole && user.activeRole !== activeRole)) {
      return res.status(401).json({ message: 'Chế độ tài khoản đã đổi. Hãy tải lại trang hoặc đăng nhập lại.' });
    }
    req.authExpiresAt = decoded.exp * 1000;
    req.user = { id: user._id.toString(), role: activeRole, email: user.email };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};

exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  };
};