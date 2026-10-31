import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
const labels = { customer: 'Khách hàng', driver: 'Tài xế', restaurant: 'Nhà hàng' };
const destinations = { customer: '/restaurants', driver: '/driver', restaurant: '/restaurant' };
export default function RoleSwitcher() {
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const sync = event => { if (event.key === 'user' || event.key === null) window.location.reload(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  let user;
  try { user = JSON.parse(localStorage.getItem('user')); } catch { user = null; }
  if (!user || user.role === 'admin' || ['/login','/register'].includes(location.pathname)) return null;
  async function switchMode(role) {
    if (role === user.role) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/switch-role', { role });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Reload ends old GPS polling and sockets, and every role guard reads the new session.
      window.location.assign(destinations[role]);
    } catch (e) { setError(e.response?.data?.message || 'Không chuyển được chế độ. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <nav className="role-switcher" aria-label="Chuyển chế độ tài khoản">
    <label>Đang dùng với vai trò <select aria-label="Chế độ tài khoản" value={user.role} disabled={busy} onChange={e => switchMode(e.target.value)}>{Object.entries(labels).map(([role,label]) => <option key={role} value={role}>{label}</option>)}</select></label>
    {busy && <span role="status">Đang chuyển…</span>}
    {error && <span role="alert" className="rs-error">{error}</span>}
  </nav>;
}
