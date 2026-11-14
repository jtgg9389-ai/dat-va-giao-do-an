const AuditLog = require('../models/AuditLog');

// Ghi nhật ký thao tác quan trọng. Chỉ thêm mới, không sửa/xóa.
const logAudit = async ({ actor, action, entityType, entityId, before = '', after = '', reason = '' }) => {
  try {
    await AuditLog.create({ actor, action, entityType, entityId, before, after, reason });
  } catch (err) {
    console.error('Không ghi được audit log:', err.message);
  }
};

module.exports = { logAudit };