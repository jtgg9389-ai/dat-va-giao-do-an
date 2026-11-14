import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Profile.css';

const roleLabels = {
  customer: 'Khách hàng',
  restaurant: 'Nhà hàng',
  driver: 'Tài xế',
  admin: 'Quản trị viên',
};

const genderLabels = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const genderOptions = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

const EMPTY_TEXT = '(Chưa có thông tin)';

// Chuyển 2000-05-20 thành 20/05/2000 (tránh lệch múi giờ)
const formatBirthday = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

// Một dòng thông tin: bấm "Thay đổi" để sửa ngay tại chỗ
function EditableRow({ label, display, field, initialValue, type = 'text', options, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(initialValue || '');
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(field, draft);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="info-row">
      <div className="info-label">{label}</div>

      <div className="info-value">
        {editing ? (
          <div className="edit-box">
            {type === 'select' ? (
              <select value={draft} onChange={(e) => setDraft(e.target.value)}>
                <option value="">— Chọn —</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input type={type} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            )}
            {error && <p className="field-error">{error}</p>}
            <div className="edit-actions">
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button className="btn-cancel" onClick={() => setEditing(false)} disabled={saving}>
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <span className={display ? '' : 'empty'}>{display || EMPTY_TEXT}</span>
        )}
      </div>

      <div className="info-action">
        {!editing && (
          <button className="link-btn" onClick={startEdit}>Thay đổi</button>
        )}
      </div>
    </div>
  );
}

// Tab "Bảo vệ tài khoản": đổi mật khẩu
function SecurityPanel() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Đổi mật khẩu thành công!');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-section">
      <h2>Đổi mật khẩu</h2>
      <form className="security-form" onSubmit={handleSubmit}>
        {error && <p className="field-error">{error}</p>}
        {success && <p className="msg-success">{success}</p>}

        <label>
          Mật khẩu hiện tại
          <input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} required />
        </label>
        <label>
          Mật khẩu mới
          <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} required />
        </label>
        <label>
          Nhập lại mật khẩu mới
          <input type="password" name="confirm" value={form.confirm} onChange={handleChange} required />
        </label>

        <button className="btn-save" type="submit" disabled={saving}>
          {saving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
        </button>
      </form>
    </section>
  );
}

function Profile() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('account');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        setUser(res.data.user);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear();
          navigate('/login');
        } else {
          setLoadError('Không tải được thông tin tài khoản');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  // Lưu 1 trường; lỗi sẽ được ném ra để EditableRow hiển thị
  const handleSave = async (field, value) => {
    const res = await api.put('/auth/profile', { [field]: value });
    setUser(res.data.user);

    // Đồng bộ tên mới sang localStorage để trang chủ hiện đúng
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...stored, name: res.data.user.name }));
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: 50 }}>Đang tải...</p>;

  if (loadError || !user) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50 }}>
        <p style={{ color: '#d92d20' }}>{loadError || 'Có lỗi xảy ra'}</p>
        <button onClick={() => navigate('/')}>Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-topbar">
        <button className="back-btn" onClick={() => navigate('/')}>← Trang chủ</button>
        <h1>Thông tin tài khoản</h1>
      </header>

      <div className="profile-layout">
        {/* Thanh bên trái */}
        <aside className="profile-sidebar">
          <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="profile-name">{user.name}</div>
          <span className={`role-chip ${user.role}`}>{roleLabels[user.role]}</span>

          <nav className="profile-menu">
            <button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>
              <span className="menu-icon">👤</span>
              <span>
                <strong>Thông tin tài khoản</strong>
                <small>Quản lý thông tin đăng nhập và thông tin cá nhân</small>
              </span>
            </button>

            <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
              <span className="menu-icon">🔒</span>
              <span>
                <strong>Bảo vệ tài khoản</strong>
                <small>Đổi mật khẩu đăng nhập</small>
              </span>
            </button>

            <button onClick={handleLogout}>
              <span className="menu-icon">🚪</span>
              <span><strong>Đăng xuất</strong></span>
            </button>
          </nav>
        </aside>

        {/* Nội dung bên phải */}
        <main className="profile-main">
          {tab === 'account' && (
            <>
              <section className="profile-section">
                <h2>Thông tin đăng nhập</h2>

                <div className="info-row">
                  <div className="info-label">Email</div>
                  <div className="info-value">{user.email}</div>
                  <div className="info-action"><span className="locked">Không thể đổi</span></div>
                </div>

                <EditableRow
                  label="Số điện thoại"
                  field="phone"
                  display={user.phone}
                  initialValue={user.phone}
                  onSave={handleSave}
                />

                <div className="info-row">
                  <div className="info-label">Mật khẩu</div>
                  <div className="info-value">••••••••</div>
                  <div className="info-action">
                    <button className="link-btn" onClick={() => setTab('security')}>Thay đổi</button>
                  </div>
                </div>
              </section>

              <section className="profile-section">
                <h2>Thông tin cá nhân</h2>

                <EditableRow
                  label="Họ và tên"
                  field="name"
                  display={user.name}
                  initialValue={user.name}
                  onSave={handleSave}
                />
                <EditableRow
                  label="Giới tính"
                  field="gender"
                  type="select"
                  options={genderOptions}
                  display={genderLabels[user.gender]}
                  initialValue={user.gender}
                  onSave={handleSave}
                />
                <EditableRow
                  label="Ngày sinh"
                  field="birthday"
                  type="date"
                  display={formatBirthday(user.birthday)}
                  initialValue={user.birthday ? user.birthday.slice(0, 10) : ''}
                  onSave={handleSave}
                />
                <EditableRow
                  label="Địa chỉ"
                  field="address"
                  display={user.address}
                  initialValue={user.address}
                  onSave={handleSave}
                />
              </section>
            </>
          )}

          {tab === 'security' && <SecurityPanel />}
        </main>
      </div>
    </div>
  );
}

export default Profile;