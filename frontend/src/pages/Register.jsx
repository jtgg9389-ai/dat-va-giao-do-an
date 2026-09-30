import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'customer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      alert('Đăng ký thành công! Mời bạn đăng nhập.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h2>Đăng ký</h2>
        {error && <p style={styles.error}>{error}</p>}

        <input style={styles.input} name="name" placeholder="Họ tên" onChange={handleChange} required />
        <input style={styles.input} name="email" type="email" placeholder="Email" onChange={handleChange} required />
        <input style={styles.input} name="password" type="password" placeholder="Mật khẩu" onChange={handleChange} required />
        <input style={styles.input} name="phone" placeholder="Số điện thoại" onChange={handleChange} />

        <select style={styles.input} name="role" onChange={handleChange} value={form.role}>
          <option value="customer">Khách hàng</option>
          <option value="restaurant">Nhà hàng</option>
          <option value="driver">Tài xế</option>
        </select>

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>

        <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' },
  form: { background: '#fff', padding: 30, borderRadius: 8, width: 320, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: 10, marginBottom: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' },
  button: { width: '100%', padding: 10, background: '#ff5722', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  error: { color: 'red', fontSize: 14 },
};

export default Register;