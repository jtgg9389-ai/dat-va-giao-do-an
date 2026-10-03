import { Navigate } from 'react-router-dom';
import './Home.css';

const roleContent = {
  customer: {
    eyebrow: 'Khách hàng',
    title: 'Hôm nay bạn muốn ăn gì?',
    subtitle: 'Khám phá hàng trăm quán ăn gần bạn, đặt món chỉ trong vài phút.',
    emoji: '🍜',
  },
  restaurant: {
    eyebrow: 'Đối tác nhà hàng',
    title: 'Quản lý quán ăn của bạn',
    subtitle: 'Theo dõi đơn hàng mới, cập nhật thực đơn và doanh thu tại một nơi.',
    emoji: '🏪',
  },
  driver: {
    eyebrow: 'Đối tác tài xế',
    title: 'Sẵn sàng nhận đơn mới',
    subtitle: 'Bật trạng thái hoạt động để bắt đầu nhận các đơn giao hàng gần bạn.',
    emoji: '🏍️',
  },
  admin: {
    eyebrow: 'Quản trị hệ thống',
    title: 'Chào mừng trở lại, Admin',
    subtitle: 'Theo dõi toàn bộ hoạt động của hệ thống và quản lý người dùng.',
    emoji: '🛠️',
  },
};

function Home() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return <Navigate to="/login" />;

  const content = roleContent[user.role];

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="brand">
          <span className="brand-mark">🍔</span>
          FoodGo
        </div>
        <div className="header-right">
          <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          <button className="logout-link" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </header>

      {/* Hero */}
      <section className="home-hero">
        <div className="hero-text">
          <span className="hero-eyebrow">{content.eyebrow}</span>
          <h1 className="hero-title">Chào {user.name}, {content.title.toLowerCase()}</h1>
          <p className="hero-subtitle">{content.subtitle}</p>
        </div>
        <div className="hero-illustration">{content.emoji}</div>
      </section>

      {/* Action cards */}
      <div className="home-actions">
        <a href="/profile" className="action-card">
          <div className="action-emoji">👤</div>
          <div className="action-title">Thông tin cá nhân</div>
          <div className="action-desc">Xem và chỉnh sửa thông tin tài khoản của bạn.</div>
        </a>

        {user.role === 'admin' && (
          <a href="/admin" className="action-card">
            <div className="action-emoji">🛠️</div>
            <div className="action-title">Quản lý người dùng</div>
            <div className="action-desc">Xem danh sách, phân quyền và quản lý tài khoản.</div>
          </a>
        )}

        {user.role === 'restaurant' && (
          <div className="action-card disabled">
            <div className="action-emoji">📋</div>
            <div className="action-title">Quản lý thực đơn</div>
            <div className="action-status">Sắp ra mắt</div>
          </div>
        )}

        {user.role === 'driver' && (
          <div className="action-card disabled">
            <div className="action-emoji">📦</div>
            <div className="action-title">Nhận đơn giao hàng</div>
            <div className="action-status">Sắp ra mắt</div>
          </div>
        )}

        {user.role === 'customer' && (
          <div className="action-card disabled">
            <div className="action-emoji">🍔</div>
            <div className="action-title">Đặt món ăn</div>
            <div className="action-status">Sắp ra mắt</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;