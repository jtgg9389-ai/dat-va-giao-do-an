import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Gọi API lấy thông tin cá nhân khi vào trang
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        setUser(res.data.user);
        setForm({ name: res.data.user.name, phone: res.data.user.phone || '' });
      } catch (err) {
        // Nếu token hết hạn/không hợp lệ, đá về trang đăng nhập
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear();
          navigate('/login');
        } else {
          setError('Không tải được thông tin');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/auth/profile', form);
      setUser(res.data.user);
      setSuccess('Cập nhật thành công!');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: 50 }}>Đang tải...</p>;

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h2>Thông tin cá nhân</h2>
        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <label>Email (không thể thay đổi)</label>
        <input style={styles.input} value={user.email} disabled />

        <label>Vai trò</label>
        <input style={styles.input} value={user.role} disabled />

        <label>Họ tên</label>
        <input style={styles.input} name="name" value={form.name} onChange={handleChange} required />

        <label>Số điện thoại</label>
        <input style={styles.input} name="phone" value={form.phone} onChange={handleChange} />

        <button style={styles.button} type="submit">Lưu thay đổi</button>
        <button
          style={{ ...styles.button, background: '#999', marginTop: 8 }}
          type="button"
          onClick={() => navigate('/')}
        >
          Quay lại trang chủ
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' },
  form: { background: '#fff', padding: 30, borderRadius: 8, width: 350, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: 10, marginBottom: 14, marginTop: 4, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' },
  button: { width: '100%', padding: 10, background: '#ff5722', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  error: { color: 'red', fontSize: 14 },
  success: { color: 'green', fontSize: 14 },
};

export default Profile;