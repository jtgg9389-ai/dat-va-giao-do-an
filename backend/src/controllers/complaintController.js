const mongoose = require('mongoose');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Complaint = require('../models/Complaint');

const OPEN_STATES = ['OPEN', 'IN_REVIEW'];
const MAX_OPEN = 10;
const MAX_MESSAGES = 50;

const serverError = (res, err) => {
  console.error(err);
  return res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
};

const cleanText = (v) => (typeof v === 'string' ? v.trim() : '');

// Gửi khiếu nại mới
exports.createComplaint = async (req, res) => {
  try {
    const body = req.body || {};
    const category = body.category === undefined ? 'other' : body.category;
    const subject = cleanText(body.subject);
    const description = cleanText(body.description);
    const orderCode = cleanText(body.orderCode);

    if (!Complaint.CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Loại khiếu nại không hợp lệ' });
    }
    if (subject.length < 5 || subject.length > 120) {
      return res.status(400).json({ message: 'Tiêu đề phải từ 5 đến 120 ký tự' });
    }
    if (description.length < 10 || description.length > 1000) {
      return res.status(400).json({ message: 'Nội dung phải từ 10 đến 1000 ký tự' });
    }
    if (orderCode.length > 30) {
      return res.status(400).json({ message: 'Mã đơn hàng không được quá 30 ký tự' });
    }

    const openCount = await Complaint.countDocuments({ reporter: req.user.id, status: { $in: OPEN_STATES } });
    if (openCount >= MAX_OPEN) {
      return res.status(429).json({ message: `Bạn đang có ${MAX_OPEN} khiếu nại chưa xử lý xong. Vui lòng chờ phản hồi trước khi gửi thêm.` });
    }

    const orderId = body.orderId || (mongoose.isValidObjectId(orderCode) ? orderCode : null);
    let order;
    if (orderId) {
      if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: 'Mã đơn không hợp lệ' });
      order = await Order.findById(orderId);
      const ownRestaurant = req.user.role === 'restaurant' && order && await Restaurant.exists({ _id: order.restaurant, owner: req.user.id });
      if (!order || (String(order.customer) !== req.user.id && String(order.driver) !== req.user.id && !ownRestaurant)) return res.status(404).json({ message: 'Không tìm thấy đơn thuộc quyền của bạn' });
    }
    const complaint = await Complaint.create({ reporter: req.user.id, category, subject, description, orderCode, ...(order ? { order: order._id } : {}) });
    if (order && category === 'payment') await Order.updateOne({ _id: order._id, 'settlement.reference': { $exists: false } }, { $set: { settlementHold: true } });
    res.status(201).json({ message: 'Đã gửi khiếu nại. Chúng tôi sẽ phản hồi sớm nhất có thể.', complaint });
  } catch (err) {
    return serverError(res, err);
  }
};

// Danh sách khiếu nại của chính mình
exports.listMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ reporter: req.user.id })
      .select('category subject status createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json({ complaints });
  } catch (err) {
    return serverError(res, err);
  }
};

// Chi tiết 1 khiếu nại (chỉ của mình)
exports.getMyComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });
    }

    const complaint = await Complaint.findOne({ _id: id, reporter: req.user.id }).select('-assignedAdmin');
    if (!complaint) return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });

    res.json({ complaint });
  } catch (err) {
    return serverError(res, err);
  }
};

// Gửi thêm tin nhắn vào khiếu nại đang mở
exports.addMyMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const text = cleanText(req.body?.text);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });
    }
    if (text.length < 1 || text.length > 1000) {
      return res.status(400).json({ message: 'Tin nhắn phải từ 1 đến 1000 ký tự' });
    }

    // Điều kiện gói trong 1 lệnh: đúng chủ, còn mở, chưa đạt giới hạn tin nhắn
    const complaint = await Complaint.findOneAndUpdate(
      {
        _id: id,
        reporter: req.user.id,
        status: { $in: OPEN_STATES },
        [`messages.${MAX_MESSAGES - 1}`]: { $exists: false },
      },
      { $push: { messages: { sender: req.user.id, senderRole: req.user.role, text, createdAt: new Date() } } },
      { new: true, runValidators: true }
    ).select('-assignedAdmin');

    if (!complaint) {
      const exists = await Complaint.exists({ _id: id, reporter: req.user.id });
      if (!exists) return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });
      return res.status(409).json({ message: 'Khiếu nại này đã đóng hoặc đã đạt giới hạn tin nhắn' });
    }

    res.json({ message: 'Đã gửi tin nhắn', complaint });
  } catch (err) {
    return serverError(res, err);
  }
};