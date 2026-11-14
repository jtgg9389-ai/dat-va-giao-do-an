const mongoose = require('mongoose');
const Driver = require('../models/DriverProfile');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { logAudit } = require('../utils/audit');

const Setting = mongoose.model(
  'AutoApprovalSetting',
  new mongoose.Schema({
    _id: { type: String, default: 'partners' },
    enabled: { type: Boolean, default: false },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }, { timestamps: true })
);

const text = (value, min) =>
  typeof value === 'string' && value.trim().length >= min;

const phone = value =>
  typeof value === 'string' &&
  /^[0-9]{9,11}$/.test(value.trim());

function eligible(kind, profile, user) {
  if (
    !user ||
    user.status !== 'active' ||
    user.role === 'admin'
  ) return false;

  if (
    !text(user.name, 2) ||
    !phone(user.phone) ||
    !text(user.address, 5)
  ) return false;

  if (
    profile.approvalStatus !== 'pending' ||
    profile.autoApprovalBlocked
  ) return false;

  // Hồ sơ đã được admin xem xét thì để admin xử lý.
  if (profile.reviewReason || profile.reviewedAt) return false;

  if (kind === 'driver') return true;

  const point = profile.location;

  return (
    text(profile.name, 2) &&
    text(profile.address, 5) &&
    phone(profile.phone) &&
    Number.isFinite(point?.latitude) &&
    Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point?.longitude) &&
    Math.abs(point.longitude) <= 180
  );
}

// Xếp hàng các lần quét và bật/tắt trong một backend.
let queue = Promise.resolve();

function serialize(task) {
  const next = queue.then(task);
  queue = next.catch(() => {});
  return next;
}

async function getSetting() {
  return (
    await Setting.findById('partners').lean()
  ) || { enabled: false };
}

async function scan() {
  const setting = await getSetting();
  if (!setting.enabled) return;

  const types = [
    ['driver', Driver, 'user'],
    ['restaurant', Restaurant, 'owner'],
  ];

  for (const [kind, Model, ownerField] of types) {
    const cursor = Model.find({
      approvalStatus: 'pending',
      autoApprovalBlocked: { $ne: true },
    }).lean().cursor();

    for await (const profile of cursor) {
      const user = await User.findById(profile[ownerField])
        .select('name phone address status role')
        .lean();

      if (!eligible(kind, profile, user)) continue;

      const reason = 'Tự duyệt theo điều kiện thông tin cơ bản v1';
      const now = new Date();

      const result = await Model.updateOne({
        _id: profile._id,
        approvalStatus: 'pending',
        autoApprovalBlocked: { $ne: true },

        // Bỏ qua nếu hồ sơ vừa thay đổi sau khi đọc.
        updatedAt: profile.updatedAt,
      }, {
        $set: {
          approvalStatus: 'approved',
          autoApproval: {
            at: now,
            reason,
            enabledBy: setting.changedBy,
          },
          ...(kind === 'driver'
            ? { reviewReason: reason }
            : {
                reviewedAt: now,
                reviewedBy: null,
                rejectReason: '',
              }),
        },
      });

      if (result.modifiedCount) {
        await logAudit({
          actor: setting.changedBy,
          action: 'PARTNER_AUTO_APPROVE',
          entityType: kind,
          entityId: profile._id,
          before: 'pending',
          after: 'approved',
          reason,
        });
      }
    }
  }
}

function setEnabled(enabled, actor) {
  return serialize(async () => {
    const before = await getSetting();

    const setting = await Setting.findByIdAndUpdate(
      'partners',
      { $set: { enabled, changedBy: actor } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    await logAudit({
      actor,
      action: 'AUTO_APPROVAL_SETTING',
      entityType: 'user',
      entityId: actor,
      before: String(before.enabled),
      after: String(enabled),
      reason: enabled
        ? 'Bật tự duyệt đối tác'
        : 'Tắt tự duyệt đối tác',
    });

    return setting;
  });
}

function startAutoApproval() {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      await serialize(scan);
    } catch (error) {
      console.error('Lỗi tự duyệt:', error.message);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, 10000);
  void tick();

  return () => clearInterval(timer);
}

module.exports = {
  getSetting,
  setEnabled,
  startAutoApproval,
  eligible,
};