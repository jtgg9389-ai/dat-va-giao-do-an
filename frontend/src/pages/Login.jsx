import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
      const res = await api.post('/auth/login', {
        identifier: form.identifier.trim(),
        password: form.password,
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      if (!err.response) {
        setError('Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.');
      } else {
        setError(err.response.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>Đăng nhập</h2>
        {error && <p style={styles.error} role="alert">{error}</p>}

        <input
          style={styles.input}
          name="identifier"
          type="text"
          placeholder="Tên đăng nhập hoặc email"
          aria-label="Tên đăng nhập hoặc email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={form.identifier}
          onChange={handleChange}
          required
        />

        <div style={styles.passwordRow}>
          <input
            style={{ ...styles.input, marginBottom: 0, paddingRight: 70 }}
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mật khẩu"
            aria-label="Mật khẩu"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            style={styles.toggle}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? 'Ẩn' : 'Hiện'}
          </button>
        </div>

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>

        <p>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' },
  form: { background: '#fff', padding: 30, borderRadius: 8, width: 320, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: 10, marginBottom: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' },
  passwordRow: { position: 'relative', marginBottom: 10 },
  toggle: { position: 'absolute', right: 6, top: 6, padding: '4px 10px', border: 'none', borderRadius: 4, background: '#eee', cursor: 'pointer', fontSize: 13 },
  button: { width: '100%', padding: 10, background: '#ff5722', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  error: { color: '#d92d20', fontSize: 14 },
};

export default Login;