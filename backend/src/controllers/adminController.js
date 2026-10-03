const User = require('../models/User');

// Lấy danh sách TẤT CẢ người dùng (chỉ admin mới gọi được)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};

// Đổi vai trò của 1 người dùng
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['customer', 'restaurant', 'driver', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }

    const updated = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json({ message: 'Cập nhật vai trò thành công', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};

// Xoá 1 người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Không cho admin tự xoá chính mình (tránh mất quyền truy cập)
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Không thể tự xoá tài khoản của chính mình' });
    }

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json({ message: 'Xoá người dùng thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};