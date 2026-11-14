export const roleLabels = {
  customer: 'Khách hàng',
  restaurant: 'Nhà hàng',
  driver: 'Tài xế',
  admin: 'Quản trị viên',
};

export const statusLabels = { active: 'Hoạt động', locked: 'Đã khóa' };

export const auditActionLabels = {
  USER_LOCK: 'Khóa tài khoản',
  USER_UNLOCK: 'Mở khóa tài khoản',
  USER_ROLE_CHANGE: 'Đổi vai trò',
};

export const complaintStatusLabels = {
  OPEN: 'Chờ xử lý',
  IN_REVIEW: 'Đang xem xét',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Không chấp nhận',
};

export const categoryLabels = {
  order: 'Đơn hàng',
  payment: 'Thanh toán',
  restaurant: 'Nhà hàng',
  driver: 'Tài xế',
  app: 'Ứng dụng',
  other: 'Khác',
};

export const approvalLabels = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối' };

export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN') : '');
export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');