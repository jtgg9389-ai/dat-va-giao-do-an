const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { rolesOf, sessionUser, MODES } = require('../utils/accountRoles');
const Order = require('../models/Order');
const Driver = require('../models/DriverProfile');
const User = require('../models/User');

function createSession(user, activeRole) {
  const token = jwt.sign(
    { id: user._id, email: user.email, role: activeRole, activeRole },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { token, user: sessionUser(user, activeRole) };
}

// Kiểm tra định dạng email hợp lệ
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// ĐĂNG KÝ
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body || {};

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Họ tên phải có ít nhất 2 ký tự' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email không đúng định dạng' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const validRoles = ['customer', 'restaurant', 'driver'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }
    if (phone && !/^\d{9,11}$/.test(phone)) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email đã được sử dụng' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: role || 'customer',
    });

    res.status(201).json({ message: 'Đăng ký thành công', userId: newUser._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};

// ĐĂNG NHẬP
// ĐĂNG NHẬP (bằng tên đăng nhập hoặc email)
exports.login = async (req, res) => {
  try {
    const body = req.body || {};
    // Nhận cả "identifier" (mới) lẫn "email" (cũ) để không làm hỏng bản giao diện cũ
    const raw = typeof body.identifier === 'string' ? body.identifier : body.email;
    const identifier = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập (hoặc email) và mật khẩu' });
    }

    // Có dấu @ thì tìm theo email, ngược lại tìm theo tên đăng nhập
    const user = await User.findOne(identifier.includes('@') ? { email: identifier } : { username: identifier });
    const wrong = { message: 'Tên đăng nhập, email hoặc mật khẩu không đúng' };

    if (!user) return res.status(401).json(wrong);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json(wrong);

    if (user.status === 'locked') {
      return res.status(403).json({
        message: `Tài khoản đã bị khóa. Lý do: ${user.lockReason || 'vi phạm quy định'}. Vui lòng liên hệ quản trị viên.`,
      });
    }

    res.json({
      message: 'Đăng nhập thành công',
      ...createSession(user, user.activeRole || user.role),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};
// LẤY THÔNG TIN CÁ NHÂN
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json({ user: { ...user.toObject(), accountRole: user.role, role: req.user.role, roles: rolesOf(user) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};

// CẬP NHẬT THÔNG TIN CÁ NHÂN (chỉ cập nhật các trường được gửi lên)
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, gender, birthday, address } = req.body || {};
    const update = {};

    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({ message: 'Họ tên phải có ít nhất 2 ký tự' });
      }
      update.name = name.trim();
    }

    if (phone !== undefined) {
      if (phone && !/^\d{9,11}$/.test(phone)) {
        return res.status(400).json({ message: 'Số điện thoại phải gồm 9-11 chữ số' });
      }
      update.phone = phone;
    }

    if (gender !== undefined) {
      if (!['', 'male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ message: 'Giới tính không hợp lệ' });
      }
      update.gender = gender;
    }

    if (birthday !== undefined) {
      if (birthday) {
        const d = new Date(birthday);
        if (isNaN(d.getTime()) || d > new Date()) {
          return res.status(400).json({ message: 'Ngày sinh không hợp lệ' });
        }
        update.birthday = d;
      } else {
        update.birthday = null;
      }
    }

    if (address !== undefined) {
      if (address.length > 200) {
        return res.status(400).json({ message: 'Địa chỉ không được quá 200 ký tự' });
      }
      update.address = address.trim();
    }

    const updated = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
    res.json({ message: 'Cập nhật thành công', user: { ...updated.toObject(), accountRole: updated.role, role: req.user.role, roles: rolesOf(updated) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};

// ĐỔI MẬT KHẨU
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};
// Account identity and partner approvals remain unchanged; only the session mode changes.
exports.switchRole = async (req, res) => {
  const target = req.body?.role;
  if (!MODES.includes(target)) return res.status(400).json({ message: 'Chỉ chuyển giữa khách hàng, tài xế và nhà hàng' });
  const user = await User.findById(req.user.id);
  if (!user || user.role === 'admin') return res.status(403).json({ message: 'Tài khoản admin không dùng chức năng chuyển chế độ đối tác' });
  // Serialize mode changes with offer acceptance/availability by first making the
  // driver unavailable. Driver offer acceptance also rechecks the active mode.
  if (req.user.role === 'driver' && target !== 'driver') {
    await Driver.updateOne({ user: user._id }, { $set: { online: false } });
    if (await Order.exists({ driver: user._id, status: { $in: ['CONFIRMED','PREPARING','READY_FOR_PICKUP','PICKED_UP','DELIVERING'] } })) return res.status(409).json({ message: 'Bạn đang có cuốc chưa hoàn tất. Hãy giao xong hoặc liên hệ admin trước khi chuyển chế độ.' });
  }
  const updated = await User.findOneAndUpdate(
    { _id: user._id, status: { $ne: 'locked' }, role: user.role, activeRole: user.activeRole ?? null },
    { $set: { activeRole: target }, $addToSet: { roles: { $each: [user.role, target] } } },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(409).json({ message: 'Chế độ vừa thay đổi ở cửa sổ khác; hãy đăng nhập lại.' });
  if (target === 'driver') {
    try { await Driver.updateOne({ user: user._id }, req.user.role !== 'driver' ? { $set: { online: false } } : { $setOnInsert: { online: false } }, { upsert: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
  }
  res.json({ ...createSession(updated, target), message: 'Đã chuyển chế độ tài khoản' });
};
