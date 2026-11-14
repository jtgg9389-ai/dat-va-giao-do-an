const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const { logAudit } = require('../utils/audit');

const serverError = (res, err) => {
  console.error(err);
  return res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cleanText = (v) => (typeof v === 'string' ? v.trim() : '');

exports.listRestaurants = async (req, res) => {
  try {
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = {};
    // Quán tạo từ trước khi có tính năng duyệt (chưa có trường này) cũng tính là chờ duyệt
    if (status === 'pending') filter.approvalStatus = { $nin: ['approved', 'rejected'] };
    else if (status === 'approved' || status === 'rejected') filter.approvalStatus = status;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { address: rx }];
    }

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .populate('owner', 'name email status')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Restaurant.countDocuments(filter),
    ]);

    res.json({ restaurants, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return serverError(res, err);
  }
};

// Duyệt hoặc từ chối/thu hồi duyệt (từ chối bắt buộc có lý do)
exports.reviewRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const decision = req.body?.decision;
    const reason = cleanText(req.body?.reason);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Không tìm thấy nhà hàng' });
    }
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'Quyết định không hợp lệ' });
    }
    if (reason.length > 300) {
      return res.status(400).json({ message: 'Lý do không được quá 300 ký tự' });
    }
    if (decision === 'reject' && reason.length < 5) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối (từ 5 đến 300 ký tự)' });
    }

    const current = await Restaurant.findById(id).select('approvalStatus');
    if (!current) return res.status(404).json({ message: 'Không tìm thấy nhà hàng' });

    const nextStatus = decision === 'approve' ? 'approved' : 'rejected';
    const beforeStatus = current.approvalStatus || 'pending';
    if (beforeStatus === nextStatus) {
      return res.status(409).json({ message: 'Nhà hàng đã ở trạng thái này rồi' });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      {
        $set: {
          approvalStatus: nextStatus,
          rejectReason: decision === 'reject' ? reason : '',
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    ).populate('owner', 'name email status');

    await logAudit({
      actor: req.user.id,
      action: decision === 'approve' ? 'RESTAURANT_APPROVE' : 'RESTAURANT_REJECT',
      entityType: 'restaurant', entityId: id,
      before: beforeStatus, after: nextStatus, reason,
    });

    res.json({ message: decision === 'approve' ? 'Đã duyệt nhà hàng' : 'Đã từ chối nhà hàng', restaurant });
  } catch (err) {
    return serverError(res, err);
  }
};