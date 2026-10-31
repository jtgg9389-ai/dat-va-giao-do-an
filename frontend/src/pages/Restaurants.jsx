import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import './Restaurant.css';

function Restaurants() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/restaurants');
        setRestaurants(res.data.restaurants);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear();
          navigate('/login');
        } else {
          setError('Không tải được danh sách nhà hàng');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const keyword = search.trim().toLowerCase();
  const filtered = restaurants.filter(
    (r) => (r.name.toLowerCase().includes(keyword) || r.address.toLowerCase().includes(keyword)) && (!cuisine || r.cuisine === cuisine) && (r.rating || 0) >= Number(minRating)
  );

  return (
    <div className="rs-page">
      <header className="rs-topbar">
        <button className="rs-back" onClick={() => navigate('/')}>← Trang chủ</button>
        <h1>Chọn nhà hàng</h1>
      </header>

      <div className="rs-container">
        <input
          className="rs-search"
          placeholder="Tìm theo tên quán hoặc địa chỉ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="rs-toolbar"><label>Loại món <select value={cuisine} onChange={e => setCuisine(e.target.value)}><option value="">Tất cả</option>{[...new Set(restaurants.map(r => r.cuisine).filter(Boolean))].map(c => <option key={c}>{c}</option>)}</select></label><label>Đánh giá từ <select value={minRating} onChange={e => setMinRating(e.target.value)}>{[0,3,4,5].map(n => <option key={n} value={n}>{n === 0 ? 'Tất cả' : n + ' sao'}</option>)}</select></label></div>
        {loading && <p className="rs-empty">Đang tải...</p>}
        {error && <p className="rs-error">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="rs-empty">
            {restaurants.length === 0
              ? 'Chưa có nhà hàng nào. Hãy đăng ký một tài khoản nhà hàng để thêm quán.'
              : 'Không tìm thấy nhà hàng phù hợp.'}
          </p>
        )}

        <div className="rs-grid">
          {filtered.map((r) => (
            <Link
              to={`/restaurants/${r._id}`}
              className={`rs-rest-card ${r.isOpen ? '' : 'closed'}`}
              key={r._id}
            >
              <div className="rs-rest-icon">🍽️</div>
              <div className="rs-rest-name">{r.name}</div>
              {r.description && <div className="rs-rest-desc">{r.description}</div>}
              <div>{r.cuisine || 'Chưa phân loại'} · {r.rating ? r.rating.toFixed(1) + ' ★' : 'Chưa có đánh giá'}</div>
              <div className="rs-rest-addr">📍 {r.address}</div>
              <span className={`rs-badge ${r.isOpen ? 'open' : 'off'}`}>
                {r.isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Restaurants;