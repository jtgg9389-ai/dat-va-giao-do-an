import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import describeError from '../utils/describeError';
import { categoryLabels, complaintStatusLabels, formatDateTime } from '../utils/labels';
import './Admin.css';

const emptyForm = { category: 'order', subject: '', orderCode: '', description: '' };

function Support() {
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  const [list, setList] = useState(null);
  const [listError, setListError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [detail, setDetail] = useState(null);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    let ignore = false;
    api.get('/complaints')
      .then((res) => {
        if (!ignore) { setList(res.data.complaints); setListError(''); }
      })
      .catch((err) => {
        if (!ignore) setListError(describeError(err, navigate, 'Không tải được danh sách khiếu nại'));
      });
    return () => { ignore = true; };
  }, [reloadKey, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submitComplaint = async (e) => {
    e.preventDefault();
    setFormError('');
    setSending(true);
    try {
      const res = await api.post('/complaints', form);
      setToast(res.data.message);
      setForm(emptyForm);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(describeError(err, navigate));
    } finally {
      setSending(false);
    }
  };

  const openDetail = async (id) => {
    setDetail({ loading: true });
    setReply('');
    setReplyError('');
    try {
      const res = await api.get(`/complaints/${id}`);
      setDetail({ complaint: res.data.complaint });
    } catch (err) {
      setDetail({ error: describeError(err, navigate, 'Không tải được chi tiết khiếu nại') });
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    setReplyError('');
    setReplying(true);
    try {
      const res = await api.post(`/complaints/${detail.complaint._id}/messages`, { text: reply });
      setDetail({ complaint: res.data.complaint });
      setReply('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setReplyError(describeError(err, navigate));
    } finally {
      setReplying(false);
    }
  };

  const c = detail?.complaint;
  const isOpen = c && (c.status === 'OPEN' || c.status === 'IN_REVIEW');

  return (
    <div className="ad-page">
      <header className="ad-topbar">
        <button className="ad-back" onClick={() => navigate('/')}>← Trang chủ</button>
        <h1>Hỗ trợ và phản hồi</h1>
      </header>

      <main className="ad-container">
        {toast && <div className="ad-toast" role="status">{toast}</div>}

        <section className="ad-card" style={{ padding: 24 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Gửi khiếu nại hoặc góp ý</h2>
          <p className="ad-muted" style={{ marginTop: 6 }}>
            Mô tả vấn đề bạn gặp phải. Quản trị viên sẽ xem xét và phản hồi tại đây.
          </p>

          <form onSubmit={submitComplaint}>
            <label className="ad-label">
              Loại vấn đề
              <select name="category" value={form.category} onChange={handleChange}>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="ad-label">
              Tiêu đề (5 đến 120 ký tự)
              <input name="subject" maxLength={120} value={form.subject} onChange={handleChange} required />
            </label>

            <label className="ad-label">
              Mã đơn hàng (nếu có)
              <input name="orderCode" maxLength={30} value={form.orderCode} onChange={handleChange} />
            </label>

            <label className="ad-label">
              Nội dung (10 đến 1000 ký tự)
              <textarea name="description" rows="4" maxLength={1000} value={form.description} onChange={handleChange} required />
            </label>

            {formError && <p className="ad-error" role="alert">{formError}</p>}

            <div className="ad-dialog-actions" style={{ justifyContent: 'flex-start' }}>
              <button className="ad-btn" type="submit" disabled={sending}>
                {sending ? 'Đang gửi...' : 'Gửi khiếu nại'}
              </button>
            </div>
          </form>
        </section>

        <section className="ad-card">
          <h2 style={{ margin: 0, padding: '20px 20px 0', fontSize: 17 }}>Khiếu nại đã gửi</h2>

          {listError && (
            <div className="ad-alert" role="alert" style={{ margin: 20 }}>
              <span>{listError}</span>
              <button className="ad-btn small" onClick={() => { setListError(''); setReloadKey((k) => k + 1); }}>
                Thử lại
              </button>
            </div>
          )}

          {!list && !listError && <p className="ad-muted" style={{ padding: 20 }}>Đang tải...</p>}

          {list && list.length === 0 && (
            <p className="ad-muted" style={{ padding: 20 }}>Bạn chưa gửi khiếu nại nào.</p>
          )}

          {list && list.length > 0 && (
            <div className="ad-table-wrap" style={{ marginTop: 12 }}>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <button className="ad-name-btn" onClick={() => openDetail(item._id)}>{item.subject}</button>
                        <div className="ad-sub">{categoryLabels[item.category]}</div>
                      </td>
                      <td><span className={`ad-chip ${item.status}`}>{complaintStatusLabels[item.status]}</span></td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {detail && (
        <div className="ad-overlay" onClick={() => !replying && setDetail(null)}>
          <div
            className="ad-dialog wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-title"
            onClick={(e) => e.stopPropagation()}
          >
            {detail.loading && <p className="ad-muted">Đang tải...</p>}
            {detail.error && <p className="ad-error" role="alert">{detail.error}</p>}

            {c && (
              <>
                <h3 id="support-title">{c.subject}</h3>
                <p style={{ margin: '0 0 8px' }}>
                  <span className={`ad-chip ${c.status}`}>{complaintStatusLabels[c.status]}</span>{' '}
                  <span className="ad-sub">
                    {categoryLabels[c.category]}{c.orderCode ? ` · Đơn ${c.orderCode}` : ''} · {formatDateTime(c.createdAt)}
                  </span>
                </p>

                <div className="ad-thread">
                  <div className="ad-msg">
                    <div className="ad-msg-meta">Bạn · {formatDateTime(c.createdAt)}</div>
                    {c.description}
                  </div>
                  {c.messages.map((m) => (
                    <div key={m._id} className={`ad-msg ${m.senderRole === 'admin' ? 'staff' : ''}`}>
                      <div className="ad-msg-meta">
                        {m.senderRole === 'admin' ? 'Bộ phận hỗ trợ' : 'Bạn'} · {formatDateTime(m.createdAt)}
                      </div>
                      {m.text}
                    </div>
                  ))}
                </div>

                {!isOpen && (
                  <>
                    <h4 className="ad-section-title">Kết luận</h4>
                    <p className="ad-dialog-msg">{c.resolution}</p>
                  </>
                )}

                {isOpen && (
                  <form onSubmit={sendReply}>
                    <label className="ad-label">
                      Gửi thêm thông tin
                      <textarea rows="3" maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} />
                    </label>
                    {replyError && <p className="ad-error" role="alert">{replyError}</p>}
                    <div className="ad-dialog-actions">
                      <button className="ad-btn secondary" type="button" onClick={() => setDetail(null)} disabled={replying}>
                        Đóng
                      </button>
                      <button className="ad-btn" type="submit" disabled={replying || !reply.trim()}>
                        {replying ? 'Đang gửi...' : 'Gửi'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {(!isOpen) && (
              <div className="ad-dialog-actions">
                <button className="ad-btn secondary" onClick={() => setDetail(null)}>Đóng</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Support;