import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import AdminLayout from './AdminLayout';
import ReasonDialog from './ReasonDialog';
import describeError from '../utils/describeError';
import { roleLabels, statusLabels, auditActionLabels, formatDate, formatDateTime } from '../utils/labels';

function AdminUsers() {
  const navigate = useNavigate();
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  // Bộ lọc
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Dữ liệu
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey = `${q}|${role}|${status}|${page}|${reloadKey}`;
  const loading = loadedKey !== requestKey;

  // Hộp thoại, chi tiết, thông báo
  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let ignore = false;
    api.get('/admin/users', { params: { q, role, status, page } })
      .then((res) => {
        if (!ignore) { setData(res.data); setError(''); }
      })
      .catch((err) => {
        if (!ignore) setError(describeError(err, navigate, 'Không tải được danh sách người dùng'));
      })
      .finally(() => {
        if (!ignore) setLoadedKey(requestKey);
      });
    return () => { ignore = true; };
  }, [q, role, status, page, reloadKey, requestKey, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setQ(qInput.trim());
    setPage(1);
  };

  const openDialog = (d) => {
    setDialog(d);
    setDialogError('');
  };

  const closeDialog = () => {
    if (!dialogBusy) setDialog(null);
  };

  const confirmDialog = async (reason) => {
    const { type, user, role: newRole } = dialog;
    setDialogBusy(true);
    setDialogError('');
    try {
      if (type === 'lock') await api.patch(`/admin/users/${user._id}/lock`, { reason });
      else if (type === 'unlock') await api.patch(`/admin/users/${user._id}/unlock`, { reason });
      else await api.patch(`/admin/users/${user._id}/role`, { role: newRole, reason });

      setDialog(null);
      setToast(`Đã cập nhật tài khoản "${user.name}"`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setDialogError(describeError(err, navigate));
    } finally {
      setDialogBusy(false);
    }
  };

  const openDetail = async (id) => {
    setDetail({ loading: true });
    try {
      const res = await api.get(`/admin/users/${id}`);
      setDetail(res.data);
    } catch (err) {
      setDetail({ error: describeError(err, navigate, 'Không tải được chi tiết') });
    }
  };

  const dialogConfig = dialog && {
    lock: {
      title: `Khóa tài khoản "${dialog.user.name}"?`,
      message: 'Người này sẽ bị đăng xuất và không thể đăng nhập hay thao tác cho đến khi được mở khóa. Hãy kiểm tra các đơn đang xử lý của họ (nếu có) trước khi khóa.',
      confirmLabel: 'Khóa tài khoản',
      danger: true,
    },
    unlock: {
      title: `Mở khóa tài khoản "${dialog.user.name}"?`,
      message: 'Người này sẽ có thể đăng nhập và sử dụng lại bình thường.',
      confirmLabel: 'Mở khóa',
      danger: false,
    },
    role: {
      title: `Đổi vai trò của "${dialog.user.name}" thành ${roleLabels[dialog.role]}?`,
      message: 'Thay đổi có hiệu lực ngay ở máy chủ. Người dùng cần đăng nhập lại để giao diện được cập nhật.',
      confirmLabel: 'Đổi vai trò',
      danger: false,
    },
  }[dialog.type];

  return (
    <AdminLayout title="Quản lý tài khoản">
      {toast && <div className="ad-toast" role="status">{toast}</div>}

      <form className="ad-filters" onSubmit={submitSearch}>
        <input
          className="ad-input grow"
          placeholder="Tìm theo tên, email hoặc số điện thoại..."
          aria-label="Tìm kiếm tài khoản"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <button className="ad-btn" type="submit">Tìm</button>

        <select className="ad-input" aria-label="Lọc theo vai trò" value={role} onChange={changeFilter(setRole)}>
          <option value="">Tất cả vai trò</option>
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select className="ad-input" aria-label="Lọc theo trạng thái" value={status} onChange={changeFilter(setStatus)}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Đã khóa</option>
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
          {data.users.length === 0 ? (
            <p className="ad-muted" style={{ padding: 20 }}>Không có tài khoản nào phù hợp với bộ lọc.</p>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>SĐT</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => {
                    const isSelf = u._id === me.id;
                    const isAdmin = u.role === 'admin';
                    return (
                      <tr key={u._id} className={u.status === 'locked' ? 'ad-row-locked' : ''}>
                        <td>
                          <button className="ad-name-btn" onClick={() => openDetail(u._id)}>{u.name}</button>
                          <div className="ad-sub">{u.email}</div>
                        </td>
                        <td>{u.phone || '—'}</td>
                        <td>
                          <select
                            className="ad-input"
                            aria-label={`Vai trò của ${u.name}`}
                            value={u.role}
                            disabled={isSelf}
                            onChange={(e) => openDialog({ type: 'role', user: u, role: e.target.value })}
                          >
                            {Object.entries(roleLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span className={`ad-chip ${u.status}`}>{statusLabels[u.status]}</span>
                        </td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td>
                          <div className="ad-actions">
                            <button className="ad-link-btn" onClick={() => openDetail(u._id)}>Chi tiết</button>
                            {!isSelf && !isAdmin && (
                              u.status === 'locked' ? (
                                <button className="ad-link-btn" onClick={() => openDialog({ type: 'unlock', user: u })}>
                                  Mở khóa
                                </button>
                              ) : (
                                <button className="ad-link-btn danger" onClick={() => openDialog({ type: 'lock', user: u })}>
                                  Khóa
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="ad-pager">
            <span>Trang {data.page}/{data.pages || 1} · {data.total} tài khoản</span>
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
          key={`${dialog.type}-${dialog.user._id}-${dialog.role || ''}`}
          title={dialogConfig.title}
          message={dialogConfig.message}
          confirmLabel={dialogConfig.confirmLabel}
          danger={dialogConfig.danger}
          busy={dialogBusy}
          error={dialogError}
          onConfirm={confirmDialog}
          onCancel={closeDialog}
        />
      )}

      {detail && (
        <div className="ad-overlay" onClick={() => setDetail(null)}>
          <div
            className="ad-dialog wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            {detail.loading && <p className="ad-muted">Đang tải...</p>}
            {detail.error && <p className="ad-error" role="alert">{detail.error}</p>}

            {detail.user && (
              <>
                <h3 id="user-detail-title">{detail.user.name}</h3>
                <dl className="ad-kv">
                  <dt>Email</dt><dd>{detail.user.email}</dd>
                  <dt>Số điện thoại</dt><dd>{detail.user.phone || '—'}</dd>
                  <dt>Vai trò</dt><dd>{roleLabels[detail.user.role]}</dd>
                  <dt>Trạng thái</dt><dd>{statusLabels[detail.user.status]}</dd>
                  {detail.user.status === 'locked' && (
                    <>
                      <dt>Lý do khóa</dt><dd>{detail.user.lockReason}</dd>
                      <dt>Khóa lúc</dt>
                      <dd>
                        {formatDateTime(detail.user.lockedAt)}
                        {detail.user.lockedBy?.name ? ` bởi ${detail.user.lockedBy.name}` : ''}
                      </dd>
                    </>
                  )}
                  <dt>Ngày tạo</dt><dd>{formatDateTime(detail.user.createdAt)}</dd>
                </dl>

                <h4 className="ad-section-title">Lịch sử thao tác</h4>
                {detail.audits.length === 0 ? (
                  <p className="ad-muted" style={{ marginTop: 8 }}>Chưa có thao tác quản trị nào với tài khoản này.</p>
                ) : (
                  <ul className="ad-audit">
                    {detail.audits.map((a) => (
                      <li key={a._id}>
                        <strong>{auditActionLabels[a.action] || a.action}</strong> ({a.before} → {a.after}) bởi{' '}
                        {a.actor?.name || 'không rõ'} lúc {formatDateTime(a.createdAt)}
                        <br />
                        Lý do: {a.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="ad-dialog-actions">
              <button className="ad-btn secondary" onClick={() => setDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminUsers;