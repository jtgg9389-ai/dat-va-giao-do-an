const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Complaint = require('../models/Complaint');

exports.getStats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [byRoleRows, locked, newThisWeek, restaurantsTotal, restaurantsPending, complaintsOpen, complaintsInReview] =
      await Promise.all([
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
        User.countDocuments({ status: 'locked' }),
        User.countDocuments({ createdAt: { $gte: since } }),
        Restaurant.countDocuments(),
        Restaurant.countDocuments({ approvalStatus: { $nin: ['approved', 'rejected'] } }),
        Complaint.countDocuments({ status: 'OPEN' }),
        Complaint.countDocuments({ status: 'IN_REVIEW' }),
      ]);

    const byRole = { customer: 0, restaurant: 0, driver: 0, admin: 0 };
    byRoleRows.forEach((r) => {
      if (r._id in byRole) byRole[r._id] = r.count;
    });
    const total = Object.values(byRole).reduce((sum, n) => sum + n, 0);

    res.json({
      users: { total, byRole, locked, newThisWeek },
      restaurants: { total: restaurantsTotal, pending: restaurantsPending },
      complaints: { open: complaintsOpen, inReview: complaintsInReview },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
  }
};