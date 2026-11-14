import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import AdminLayout from './AdminLayout';
import ReasonDialog from './ReasonDialog';
import describeError from '../utils/describeError';
import { approvalLabels, formatDate } from '../utils/labels';

function AdminPartners() {
  const navigate = useNavigate();

  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey = `${q}|${status}|${page}|${reloadKey}`;
  const loading = loadedKey !== requestKey;

  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let ignore = false;
    api.get('/admin/restaurants', { params: { q, status, page } })
      .then((res) => {
        if (!ignore) { setData(res.data); setError(''); }
      })
      .catch((err) => {
        if (!ignore) setError(describeError(err, navigate, 'Không tải được danh sách nhà hàng'));
      })
      .finally(() => {
        if (!ignore) setLoadedKey(requestKey);
      });
    return () => { ignore = true; };
  }, [q, status, page, reloadKey, requestKey, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const submitSearch = (e) => {
    e.preventDefault();
    setQ(qInput.trim());
    setPage(1);
  };

  const changeStatus = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const openDialog = (restaurant, decision) => {
    setDialog({ restaurant, decision });
    setDialogError('');
  };

  const closeDialog = () => {
    if (!dialogBusy) setDialog(null);
  };

  const confirmDialog = async (reason) => {
    const { restaurant, decision } = dialog;
    setDialogBusy(true);
    setDialogError('');
    try {
      await api.patch(`/admin/restaurants/${restaurant._id}/review`, { decision, reason });
      setDialog(null);
      setToast(decision === 'approve' ? `Đã duyệt "${restaurant.name}"` : `Đã từ chối "${restaurant.name}"`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setDialogError(describeError(err, navigate));
    } finally {
      setDialogBusy(false);
    }
  };

  const dialogConfig = dialog && (dialog.decision === 'approve'
    ? {
        title: `Duyệt nhà hàng "${dialog.restaurant.name}"?`,
        message: 'Quán sẽ hiển thị với khách hàng và có thể nhận đơn.',
        confirmLabel: 'Duyệt',
        danger: false,
        requireReason: false,
      }
    : {
        title: `${dialog.restaurant.approvalStatus === 'approved' ? 'Thu hồi duyệt' : 'Từ chối'} nhà hàng "${dialog.restaurant.name}"?`,
        message: 'Quán sẽ bị ẩn khỏi khách hàng. Chủ quán sẽ thấy lý do này trong trang quản lý.',
        confirmLabel: dialog.restaurant.approvalStatus === 'approved' ? 'Thu hồi duyệt' : 'Từ chối',
        danger: true,
        requireReason: true,
      });

  return (
    <AdminLayout title="Duyệt nhà hàng">
      {toast && <div className="ad-toast" role="status">{toast}</div>}

      <form className="ad-filters" onSubmit={submitSearch}>
        <input
          className="ad-input grow"
          placeholder="Tìm theo tên quán hoặc địa chỉ..."
          aria-label="Tìm kiếm nhà hàng"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <button className="ad-btn" type="submit">Tìm</button>

        <select className="ad-input" aria-label="Lọc theo trạng thái duyệt" value={status} onChange={changeStatus}>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Đã từ chối</option>
          <option value="">Tất cả</option>
        </select>
      </form>

      {error && (
        <div className="ad-alert" role="alert">
          <span>{error}</span>
          <button className="ad-btn small" onClick={() => setReloadKey((k) => k + 1)}>Thử lại</button>
        </div>
      )}

      {!data && !error && <p className="ad-muted">Đang tải...</p>}

      {data && !error && (
        <div className="ad-card" style={{ opacity: loading ? 0.6 : 1 }}>
          {data.restaurants.length === 0 ? (
            <p className="ad-muted" style={{ padding: 20 }}>Không có nhà hàng nào ở trạng thái này.</p>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Nhà hàng</th>
                    <th>Chủ quán</th>
                    <th>Trạng thái</th>
                    <th>Tạo lúc</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {data.restaurants.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <strong>{r.name}</strong>
                        <div className="ad-sub">{r.address}</div>
                        {r.phone && <div className="ad-sub">SĐT: {r.phone}</div>}
                      </td>
                      <td>
                        {r.owner?.name || 'Không rõ'}
                        <div className="ad-sub">{r.owner?.email}</div>
                        {r.owner?.status === 'locked' && <span className="ad-chip locked">Chủ quán bị khóa</span>}
                      </td>
                      <td>
                        <span className={`ad-chip ${r.approvalStatus}`}>{approvalLabels[r.approvalStatus]}</span>
                        {r.approvalStatus === 'rejected' && r.rejectReason && (
                          <div className="ad-sub">Lý do: {r.rejectReason}</div>
                        )}
                      </td>
                      <td>{formatDate(r.createdAt)}</td>
                      <td>
                        <div className="ad-actions">
                          {r.approvalStatus !== 'approved' && (
                            <button className="ad-link-btn" onClick={() => openDialog(r, 'approve')}>Duyệt</button>
                          )}
                          {r.approvalStatus !== 'rejected' && (
                            <button className="ad-link-btn danger" onClick={() => openDialog(r, 'reject')}>
                              {r.approvalStatus === 'approved' ? 'Thu hồi' : 'Từ chối'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="ad-pager">
            <span>Trang {data.page}/{data.pages || 1} · {data.total} nhà hàng</span>
            <div className="ad-actions">
              <button className="ad-btn secondary small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                ← Trước
              </button>
              <button className="ad-btn secondary small" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                Sau →
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog && (
        <ReasonDialog
          key={`${dialog.restaurant._id}-${dialog.decision}`}
          title={dialogConfig.title}
          message={dialogConfig.message}
          confirmLabel={dialogConfig.confirmLabel}
          danger={dialogConfig.danger}
          requireReason={dialogConfig.requireReason}
          busy={dialogBusy}
          error={dialogError}
          onConfirm={confirmDialog}
          onCancel={closeDialog}
        />
      )}
    </AdminLayout>
  );
}

export default AdminPartners;