const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const User = require('../models/User');
const serverError = (res, err) => {
  console.error(err);
  return res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
};

const findOwnRestaurant = (userId) => Restaurant.findOne({ owner: userId });

// Kiểm tra dữ liệu món ăn. Trả về { error } hoặc { data }.
// partial = true: chỉ kiểm tra các trường được gửi lên (dùng khi cập nhật)
const validateMenuItem = (body, partial = false) => {
  const { name, description, price, category, available } = body;
  const data = {};

  if (name !== undefined || !partial) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      return { error: 'Tên món phải có ít nhất 2 ký tự' };
    }
    data.name = name.trim();
  }

  if (price !== undefined || !partial) {
    const p = Number(price);
    if (price === undefined || price === null || price === '' || !Number.isFinite(p) || p < 0 || p > 100000000) {
      return { error: 'Giá món không hợp lệ' };
    }
    data.price = Math.round(p);
  }

  if (description !== undefined) {
    if (typeof description !== 'string' || description.length > 300) {
      return { error: 'Mô tả món không được quá 300 ký tự' };
    }
    data.description = description.trim();
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || category.length > 50) {
      return { error: 'Danh mục không được quá 50 ký tự' };
    }
    data.category = category.trim() || 'Khác';
  }

  if (available !== undefined) {
    if (typeof available !== 'boolean') return { error: 'Trạng thái món phải là true hoặc false' };
    data.available = available;
  }

  return { data };
};

// ===== DÀNH CHO NHÀ HÀNG =====

// Lấy quán của mình kèm thực đơn
exports.getMyRestaurant = async (req, res) => {
  try {
    const restaurant = await findOwnRestaurant(req.user.id);
    if (!restaurant) return res.json({ restaurant: null, menu: [] });

    const menu = await MenuItem.find({ restaurant: restaurant._id }).sort({ category: 1, createdAt: 1 });
    res.json({ restaurant, menu });
  } catch (err) {
    return serverError(res, err);
  }
};

// Tạo quán (lần đầu) hoặc cập nhật thông tin quán
exports.saveMyRestaurant = async (req, res) => {
  try {
    const { name, description, address, phone, isOpen } = req.body || {};
    const existing = await findOwnRestaurant(req.user.id);
    const update = {};

    // Lần đầu tạo quán thì bắt buộc có tên và địa chỉ
    if (name !== undefined || !existing) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ message: 'Tên nhà hàng phải có ít nhất 2 ký tự' });
      }
      update.name = name.trim();
    }

    if (address !== undefined || !existing) {
      if (typeof address !== 'string' || address.trim().length < 5) {
        return res.status(400).json({ message: 'Địa chỉ phải có ít nhất 5 ký tự' });
      }
      update.address = address.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || (phone && !/^\d{9,11}$/.test(phone))) {
        return res.status(400).json({ message: 'Số điện thoại phải gồm 9-11 chữ số' });
      }
      update.phone = phone;
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 500) {
        return res.status(400).json({ message: 'Mô tả không được quá 500 ký tự' });
      }
      update.description = description.trim();
    }

    if (isOpen !== undefined) update.isOpen = Boolean(isOpen);

    const restaurant = await Restaurant.findOneAndUpdate(
      { owner: req.user.id },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Lưu thông tin nhà hàng thành công', restaurant });
  } catch (err) {
    return serverError(res, err);
  }
};

// Thêm món
exports.addMenuItem = async (req, res) => {
  try {
    const restaurant = await findOwnRestaurant(req.user.id);
    if (!restaurant) {
      return res.status(400).json({ message: 'Vui lòng tạo thông tin nhà hàng trước khi thêm món' });
    }

    const { error, data } = validateMenuItem(req.body || {});
    if (error) return res.status(400).json({ message: error });

    const item = await MenuItem.create({ ...data, restaurant: restaurant._id });
    res.status(201).json({ message: 'Thêm món thành công', item });
  } catch (err) {
    return serverError(res, err);
  }
};

// Sửa món (kể cả đổi trạng thái còn/hết món)
exports.updateMenuItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    }

    const restaurant = await findOwnRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ message: 'Bạn chưa có nhà hàng' });

    const { error, data } = validateMenuItem(req.body || {}, true);
    if (error) return res.status(400).json({ message: error });

    // Điều kiện restaurant đảm bảo chỉ sửa được món của chính quán mình
    const item = await MenuItem.findOneAndUpdate(
      { _id: itemId, restaurant: restaurant._id },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy món ăn' });

    res.json({ message: 'Cập nhật món thành công', item });
  } catch (err) {
    return serverError(res, err);
  }
};

// Xóa món
exports.deleteMenuItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    }

    const restaurant = await findOwnRestaurant(req.user.id);
    if (!restaurant) return res.status(404).json({ message: 'Bạn chưa có nhà hàng' });

    const item = await MenuItem.findOneAndDelete({ _id: itemId, restaurant: restaurant._id });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy món ăn' });

    res.json({ message: 'Xóa món thành công' });
  } catch (err) {
    return serverError(res, err);
  }
};
// ===== DÀNH CHO KHÁCH HÀNG (chỉ thấy quán đã duyệt và chủ quán không bị khóa) =====

const publicFilter = async () => {
  const lockedOwners = await User.distinct('_id', { status: 'locked' });
  return { approvalStatus: 'approved', owner: { $nin: lockedOwners } };
};

// Danh sách nhà hàng
exports.listRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find(await publicFilter())
      .select('name description address phone isOpen')
      .sort({ isOpen: -1, name: 1 });
    res.json({ restaurants });
  } catch (err) {
    return serverError(res, err);
  }
};

// Chi tiết 1 nhà hàng kèm thực đơn
exports.getRestaurantDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Không tìm thấy nhà hàng' });
    }

    const restaurant = await Restaurant.findOne({ _id: id, ...(await publicFilter()) })
      .select('name description address phone isOpen');
    if (!restaurant) return res.status(404).json({ message: 'Không tìm thấy nhà hàng' });

    const menu = await MenuItem.find({ restaurant: id }).sort({ category: 1, createdAt: 1 });
    res.json({ restaurant, menu });
  } catch (err) {
    return serverError(res, err);
  }
};