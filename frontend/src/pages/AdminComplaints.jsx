import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import AdminLayout from './AdminLayout';
import describeError from '../utils/describeError';
import { roleLabels, categoryLabels, complaintStatusLabels, formatDateTime } from '../utils/labels';

const emptyForm = { message: '', status: 'IN_REVIEW', resolution: '' };

function AdminComplaints() {
  const navigate = useNavigate();

  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey = `${q}|${status}|${page}|${reloadKey}`;
  const loading = loadedKey !== requestKey;

  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let ignore = false;
    api.get('/admin/complaints', { params: { q, status, page } })
      .then((res) => {
        if (!ignore) { setData(res.data); setError(''); }
      })
      .catch((err) => {
        if (!ignore) setError(describeError(err, navigate, 'Không tải được danh sách khiếu nại'));
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

  const openDetail = async (id) => {
    setDetail({ loading: true });
    setForm(emptyForm);
    setFormError('');
    try {
      const res = await api.get(`/admin/complaints/${id}`);
      setDetail({ complaint: res.data.complaint });
    } catch (err) {
      setDetail({ error: describeError(err, navigate, 'Không tải được chi tiết khiếu nại') });
    }
  };

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submitUpdate = async (e) => {
    e.preventDefault();
    const c = detail.complaint;
    const closing = form.status === 'RESOLVED' || form.status === 'REJECTED';

    if (closing && form.resolution.trim().length < 5) {
      setFormError('Vui lòng nhập kết luận xử lý (từ 5 ký tự)');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await api.patch(`/admin/complaints/${c._id}`, {
        status: form.status,
        resolution: closing ? form.resolution : undefined,
        message: form.message,
      });
      setToast('Đã cập nhật khiếu nại');
      setReloadKey((k) => k + 1);
      await openDetail(c._id);
    } catch (err) {
      setFormError(describeError(err, navigate));
    } finally {
      setSaving(false);
    }
  };

  const c = detail?.complaint;
  const isOpen = c && (c.status === 'OPEN' || c.status === 'IN_REVIEW');
  const closing = form.status === 'RESOLVED' || form.status === 'REJECTED';
  const nothingToSend = c && form.status === c.status && !form.message.trim();

  return (
    <AdminLayout title="Khiếu nại và phản hồi">
      {toast && <div className="ad-toast" role="status">{toast}</div>}

      <form className="ad-filters" onSubmit={submitSearch}>
        <input
          className="ad-input grow"
          placeholder="Tìm theo tiêu đề khiếu nại..."
          aria-label="Tìm kiếm khiếu nại"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <button className="ad-btn" type="submit">Tìm</button>

        <select className="ad-input" aria-label="Lọc theo trạng thái" value={status} onChange={changeStatus}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(complaintStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
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
          {data.complaints.length === 0 ? (
            <p className="ad-muted" style={{ padding: 20 }}>Không có khiếu nại nào ở trạng thái này.</p>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Người gửi</th>
                    <th>Trạng thái</th>
                    <th>Gửi lúc</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {data.complaints.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <button className="ad-name-btn" onClick={() => openDetail(item._id)}>{item.subject}</button>
                        <div className="ad-sub">{categoryLabels[item.category]}</div>
                      </td>
                      <td>
                        {item.reporter?.name || 'Không rõ'}
                        <div>
                          {item.reporter?.role && (
                            <span className={`ad-chip ${item.reporter.role}`}>{roleLabels[item.reporter.role]}</span>
                          )}
                        </div>
                      </td>
                      <td><span className={`ad-chip ${item.status}`}>{complaintStatusLabels[item.status]}</span></td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        <button className="ad-link-btn" onClick={() => openDetail(item._id)}>
                          {item.status === 'OPEN' || item.status === 'IN_REVIEW' ? 'Xử lý' : 'Xem'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="ad-pager">
            <span>Trang {data.page}/{data.pages || 1} · {data.total} khiếu nại</span>
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

      {detail && (
        <div className="ad-overlay" onClick={() => !saving && setDetail(null)}>
          <div
            className="ad-dialog wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="complaint-title"
            onClick={(e) => e.stopPropagation()}
          >
            {detail.loading && <p className="ad-muted">Đang tải...</p>}
            {detail.error && <p className="ad-error" role="alert">{detail.error}</p>}

            {c && (
              <>
                <h3 id="complaint-title">{c.subject}</h3>
                <dl className="ad-kv">
                  <dt>Trạng thái</dt>
                  <dd><span className={`ad-chip ${c.status}`}>{complaintStatusLabels[c.status]}</span></dd>
                  <dt>Loại</dt><dd>{categoryLabels[c.category]}</dd>
                  <dt>Người gửi</dt>
                  <dd>{c.reporter?.name} ({roleLabels[c.reporter?.role]}) · {c.reporter?.email}</dd>
                  {c.orderCode && (<><dt>Mã đơn hàng</dt><dd>{c.orderCode}</dd></>)}
                  <dt>Gửi lúc</dt><dd>{formatDateTime(c.createdAt)}</dd>
                  {c.assignedAdmin?.name && (<><dt>Người xử lý</dt><dd>{c.assignedAdmin.name}</dd></>)}
                </dl>

                <div className="ad-thread">
                  <div className="ad-msg">
                    <div className="ad-msg-meta">{c.reporter?.name} · {formatDateTime(c.createdAt)}</div>
                    {c.description}
                  </div>
                  {c.messages.map((m) => (
                    <div key={m._id} className={`ad-msg ${m.senderRole === 'admin' ? 'staff' : ''}`}>
                      <div className="ad-msg-meta">
                        {m.senderRole === 'admin' ? 'Quản trị viên' : roleLabels[m.senderRole]}
                        {m.sender?.name ? ` ${m.sender.name}` : ''} · {formatDateTime(m.createdAt)}
                      </div>
                      {m.text}
                    </div>
                  ))}
                </div>

                {!isOpen && (
                  <>
                    <h4 className="ad-section-title">Kết luận xử lý</h4>
                    <p className="ad-dialog-msg">{c.resolution}</p>
                    <p className="ad-sub">Đóng lúc {formatDateTime(c.resolvedAt)}</p>
                  </>
                )}

                {isOpen && (
                  <form onSubmit={submitUpdate}>
                    <label className="ad-label">
                      Phản hồi gửi cho người dùng (không bắt buộc)
                      <textarea name="message" rows="3" maxLength={1000} value={form.message} onChange={handleFormChange} />
                    </label>

                    <label className="ad-label">
                      Cập nhật trạng thái
                      <select name="status" value={form.status} onChange={handleFormChange}>
                        <option value="IN_REVIEW">Đang xem xét</option>
                        <option value="RESOLVED">Đã giải quyết</option>
                        <option value="REJECTED">Không chấp nhận</option>
                      </select>
                    </label>

                    {closing && (
                      <label className="ad-label">
                        Kết luận xử lý (bắt buộc, từ 5 ký tự)
                        <textarea name="resolution" rows="3" maxLength={500} value={form.resolution} onChange={handleFormChange} />
                      </label>
                    )}

                    {formError && <p className="ad-error" role="alert">{formError}</p>}

                    <div className="ad-dialog-actions">
                      <button className="ad-btn secondary" type="button" onClick={() => setDetail(null)} disabled={saving}>
                        Đóng
                      </button>
                      <button className="ad-btn" type="submit" disabled={saving || nothingToSend}>
                        {saving ? 'Đang lưu...' : closing ? 'Đóng khiếu nại' : 'Lưu'}
                      </button>
                    </div>
                  </form>
                )}

                {!isOpen && (
                  <div className="ad-dialog-actions">
                    <button className="ad-btn secondary" onClick={() => setDetail(null)}>Đóng</button>
                  </div>
                )}
              </>
            )}

            {!c && (
              <div className="ad-dialog-actions">
                <button className="ad-btn secondary" onClick={() => setDetail(null)}>Đóng</button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminComplaints;