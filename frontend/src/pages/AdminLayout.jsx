import { NavLink, useNavigate } from 'react-router-dom';
import './Admin.css';

const tabs = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/users', label: 'Tài khoản' },
  { to: '/admin/partners', label: 'Nhà hàng' },
  { to: '/admin/complaints', label: 'Khiếu nại' },
];

function AdminLayout({ title, children }) {
  const navigate = useNavigate();

  return (
    <div className="ad-page">
      <header className="ad-topbar">
        <button className="ad-back" onClick={() => navigate('/')}>← Trang chủ</button>
        <h1>{title}</h1>
      </header>

      <nav className="ad-tabs" aria-label="Quản trị">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => (isActive ? 'ad-tab active' : 'ad-tab')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <main className="ad-container">{children}</main>
    </div>
  );
}

export default AdminLayout;