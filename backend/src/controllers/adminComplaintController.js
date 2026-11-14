const mongoose = require('mongoose');
const Order = require('../models/Order');
const Complaint = require('../models/Complaint');
const { logAudit } = require('../utils/audit');

const STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
const OPEN_STATES = ['OPEN', 'IN_REVIEW'];

const serverError = (res, err) => {
  console.error(err);
  return res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cleanText = (v) => (typeof v === 'string' ? v.trim() : '');

exports.listComplaints = async (req, res) => {
  try {
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = {};
    if (STATUSES.includes(status)) filter.status = status;
    if (q) filter.subject = new RegExp(escapeRegex(q), 'i');

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .select('category subject status createdAt reporter')
        .populate('reporter', 'name email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Complaint.countDocuments(filter),
    ]);

    res.json({ complaints, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return serverError(res, err);
  }
};

exports.getComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });
    }

    const complaint = await Complaint.findById(id)
      .populate('reporter', 'name email phone role')
      .populate('assignedAdmin', 'name')
      .populate('messages.sender', 'name');
    if (!complaint) return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });

    res.json({ complaint });
  } catch (err) {
    return serverError(res, err);
  }
};

// Trả lời và/hoặc đổi trạng thái. Khiếu nại đã đóng thì không sửa được nữa.
exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });
    }

    const { status, resolution, message } = req.body || {};
    const msg = cleanText(message);
    const set = { assignedAdmin: req.user.id };
    const update = { $set: set };

    if (status !== undefined) {
      if (!['IN_REVIEW', 'RESOLVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
      }
      set.status = status;
      if (status !== 'IN_REVIEW') {
        const result = cleanText(resolution);
        if (result.length < 5 || result.length > 500) {
          return res.status(400).json({ message: 'Vui lòng nhập kết luận xử lý (từ 5 đến 500 ký tự)' });
        }
        set.resolution = result;
        set.resolvedAt = new Date();
      }
    }

    if (msg.length > 1000) {
      return res.status(400).json({ message: 'Tin nhắn không được quá 1000 ký tự' });
    }
    if (msg) {
      update.$push = { messages: { sender: req.user.id, senderRole: 'admin', text: msg, createdAt: new Date() } };
    }
    if (status === undefined && !msg) {
      return res.status(400).json({ message: 'Không có thay đổi nào để lưu' });
    }

    const before = await Complaint.findById(id).select('status');
    if (!before) return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });
    if (!OPEN_STATES.includes(before.status)) {
      return res.status(409).json({ message: 'Khiếu nại này đã được đóng, không thể thay đổi' });
    }

    const complaint = await Complaint.findOneAndUpdate(
      { _id: id, status: { $in: OPEN_STATES } },
      update,
      { new: true, runValidators: true }
    );
    if (!complaint) {
      return res.status(409).json({ message: 'Khiếu nại vừa được cập nhật, vui lòng tải lại' });
    }

    if (complaint.order && !OPEN_STATES.includes(complaint.status)) {
      const openFinancial = await Complaint.exists({ order: complaint.order, category: 'payment', status: { $in: OPEN_STATES } });
      if (!openFinancial) await Order.updateOne({ _id: complaint.order }, { $set: { settlementHold: false } });
    }
    await logAudit({
      actor: req.user.id, action: 'COMPLAINT_UPDATE', entityType: 'complaint', entityId: id,
      before: before.status, after: complaint.status,
      reason: set.resolution || (msg ? 'Phản hồi cho người gửi' : ''),
    });

    res.json({ message: 'Đã cập nhật khiếu nại', complaint });
  } catch (err) {
    return serverError(res, err);
  }
};