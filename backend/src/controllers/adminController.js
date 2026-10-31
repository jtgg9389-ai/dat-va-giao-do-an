const mongoose = require('mongoose');
const Driver = require('../models/DriverProfile');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../utils/audit');

const ROLES = ['customer', 'restaurant', 'driver', 'admin'];
const REASON_ERROR = 'Vui lòng nhập lý do (từ 5 đến 300 ký tự)';

const serverError = (res, err) => {
  console.error(err);
  return res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cleanText = (v) => (typeof v === 'string' ? v.trim() : '');
const isValidReason = (r) => r.length >= 5 && r.length <= 300;

// Thống kê tổng quan
exports.getStats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [byRoleRows, locked, newThisWeek] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.countDocuments({ status: 'locked' }),
      User.countDocuments({ createdAt: { $gte: since } }),
    ]);

    const byRole = { customer: 0, restaurant: 0, driver: 0, admin: 0 };
    byRoleRows.forEach((r) => {
      if (r._id in byRole) byRole[r._id] = r.count;
    });
    const total = Object.values(byRole).reduce((sum, n) => sum + n, 0);

    res.json({ users: { total, byRole, locked, newThisWeek } });
  } catch (err) {
    return serverError(res, err);
  }
};

// Danh sách người dùng: tìm kiếm, lọc, phân trang
exports.listUsers = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const role = String(req.query.role || '');
    const status = String(req.query.status || '');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = {};
    if (ROLES.includes(role)) filter.role = role;
    if (status === 'locked') filter.status = 'locked';
    if (status === 'active') filter.status = { $ne: 'locked' };
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return serverError(res, err);
  }
};

// Chi tiết 1 người dùng kèm lịch sử thao tác
exports.getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const user = await User.findById(userId).select('-password').populate('lockedBy', 'name');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const audits = await AuditLog.find({ entityType: 'user', entityId: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('actor', 'name');

    res.json({ user, audits });
  } catch (err) {
    return serverError(res, err);
  }
};

// Khóa tài khoản
exports.lockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const reason = cleanText(req.body?.reason);

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    if (!isValidReason(reason)) return res.status(400).json({ message: REASON_ERROR });
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Không thể tự khóa tài khoản của chính mình' });
    }

    const target = await User.findById(userId).select('role status');
    if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (target.role === 'admin') {
      return res.status(403).json({ message: 'Không thể khóa tài khoản quản trị viên' });
    }
    if (target.status === 'locked') {
      return res.status(409).json({ message: 'Tài khoản này đã bị khóa trước đó' });
    }

    const updated = await User.findOneAndUpdate(
      { _id: userId, status: { $ne: 'locked' }, role: { $ne: 'admin' } },
      { $set: { status: 'locked', lockReason: reason, lockedAt: new Date(), lockedBy: req.user.id } },
      { new: true }
    ).select('-password');
    if (!updated) {
      return res.status(409).json({ message: 'Trạng thái tài khoản vừa thay đổi, vui lòng tải lại danh sách' });
    }

    await logAudit({
      actor: req.user.id, action: 'USER_LOCK', entityType: 'user', entityId: userId,
      before: 'active', after: 'locked', reason,
    });
    res.json({ message: 'Đã khóa tài khoản', user: updated });
  } catch (err) {
    return serverError(res, err);
  }
};

// Mở khóa tài khoản
exports.unlockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const reason = cleanText(req.body?.reason);

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    if (!isValidReason(reason)) return res.status(400).json({ message: REASON_ERROR });

    const target = await User.findById(userId).select('status');
    if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (target.status !== 'locked') {
      return res.status(409).json({ message: 'Tài khoản này đang hoạt động bình thường' });
    }

    const updated = await User.findOneAndUpdate(
      { _id: userId, status: 'locked' },
      { $set: { status: 'active', lockReason: '', lockedAt: null, lockedBy: null } },
      { new: true }
    ).select('-password');
    if (!updated) {
      return res.status(409).json({ message: 'Trạng thái tài khoản vừa thay đổi, vui lòng tải lại danh sách' });
    }

    await logAudit({
      actor: req.user.id, action: 'USER_UNLOCK', entityType: 'user', entityId: userId,
      before: 'locked', after: 'active', reason,
    });
    res.json({ message: 'Đã mở khóa tài khoản', user: updated });
  } catch (err) {
    return serverError(res, err);
  }
};

// Đổi vai trò (bắt buộc có lý do, có ghi nhật ký)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const role = req.body?.role;
    const reason = cleanText(req.body?.reason);

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    if (!ROLES.includes(role)) return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    if (!isValidReason(reason)) return res.status(400).json({ message: REASON_ERROR });
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Không thể tự đổi vai trò của chính mình' });
    }

    const target = await User.findById(userId).select('role');
    if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (target.role === role) {
      return res.status(400).json({ message: 'Người dùng đã có vai trò này' });
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: { role, activeRole: role, roles: role === 'admin' ? [] : [role] } }, { new: true }).select('-password');

    if (role !== 'driver') await Driver.updateOne({ user: userId }, { $set: { online: false, approvalStatus: 'pending' } });
    if (role !== 'restaurant') await Restaurant.updateOne({ owner: userId }, { $set: { approvalStatus: 'pending' } });
    await logAudit({
      actor: req.user.id, action: 'USER_ROLE_CHANGE', entityType: 'user', entityId: userId,
      before: target.role, after: role, reason,
    });
    res.json({ message: 'Đã đổi vai trò', user: updated });
  } catch (err) {
    return serverError(res, err);
  }
};