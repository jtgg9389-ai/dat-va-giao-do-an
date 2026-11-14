import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import AdminLayout from './AdminLayout';
import describeError from '../utils/describeError';
import { roleLabels } from '../utils/labels';

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    api.get('/admin/stats')
      .then((res) => {
        if (!ignore) { setStats(res.data); setError(''); }
      })
      .catch((err) => {
        if (!ignore) setError(describeError(err, navigate, 'Không tải được số liệu tổng quan'));
      });
    return () => { ignore = true; };
  }, [reloadKey, navigate]);

  return (
    <AdminLayout title="Tổng quan">
      {error && (
        <div className="ad-alert" role="alert">
          <span>{error}</span>
          <button className="ad-btn small" onClick={() => { setError(''); setReloadKey((k) => k + 1); }}>
            Thử lại
          </button>
        </div>
      )}

      {!stats && !error && <p className="ad-muted">Đang tải...</p>}

      {stats && (
        <>
          <div className="ad-stats">
            <Link to="/admin/complaints" className="ad-stat">
              <div className="ad-stat-num">{stats.complaints.open}</div>
              <div className="ad-stat-label">Khiếu nại chờ xử lý</div>
              <div className="ad-stat-sub">Đang xem xét: {stats.complaints.inReview}</div>
            </Link>

            <Link to="/admin/partners" className="ad-stat">
              <div className="ad-stat-num">{stats.restaurants.pending}</div>
              <div className="ad-stat-label">Nhà hàng chờ duyệt</div>
              <div className="ad-stat-sub">Tổng số nhà hàng: {stats.restaurants.total}</div>
            </Link>

            <Link to="/admin/users" className="ad-stat">
              <div className="ad-stat-num">{stats.users.total}</div>
              <div className="ad-stat-label">Tổng số tài khoản</div>
              <div className="ad-stat-sub">
                {Object.entries(stats.users.byRole).map(([r, c]) => `${roleLabels[r]}: ${c}`).join(' · ')}
              </div>
            </Link>

            <div className="ad-stat">
              <div className="ad-stat-num">{stats.users.newThisWeek}</div>
              <div className="ad-stat-label">Tài khoản mới trong 7 ngày</div>
            </div>

            <Link to="/admin/users" className="ad-stat">
              <div className="ad-stat-num">{stats.users.locked}</div>
              <div className="ad-stat-label">Tài khoản đang bị khóa</div>
            </Link>
          </div>

          <p className="ad-note">
            Số đơn theo trạng thái, doanh thu và hoa hồng sẽ hiển thị ở đây khi hoàn thành module Đơn hàng.
          </p>
        </>
      )}
    </AdminLayout>
  );
}

export default AdminDashboard;