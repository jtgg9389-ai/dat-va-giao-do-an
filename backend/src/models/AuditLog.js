const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  before: { type: String, default: '' },
  after: { type: String, default: '' },
  reason: { type: String, default: '' },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);