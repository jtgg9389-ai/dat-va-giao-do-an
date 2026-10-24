import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './Restaurant.css';

const formatPrice = (n) => `${Number(n).toLocaleString('vi-VN')}đ`;

function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/restaurants/${id}`);
        setRestaurant(res.data.restaurant);
        setMenu(res.data.menu);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear();
          navigate('/login');
        } else if (err.response?.status === 404) {
          setError('Không tìm thấy nhà hàng này');
        } else {
          setError('Không tải được thông tin nhà hàng');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const grouped = menu.reduce((acc, m) => {
    const key = m.category || 'Khác';
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="rs-page">
      <header className="rs-topbar">
        <button className="rs-back" onClick={() => navigate('/restaurants')}>← Danh sách quán</button>
        <h1>Thực đơn</h1>
      </header>

      <div className="rs-container">
        {loading && <p className="rs-empty">Đang tải...</p>}
        {error && <p className="rs-error">{error}</p>}

        {restaurant && (
          <>
            <section className="rs-card rs-detail-head">
              <h2>{restaurant.name}</h2>
              <span className={`rs-badge ${restaurant.isOpen ? 'open' : 'off'}`} style={{ alignSelf: 'flex-start' }}>
                {restaurant.isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
              </span>
              <div className="rs-detail-meta">📍 {restaurant.address}</div>
              {restaurant.phone && <div className="rs-detail-meta">📞 {restaurant.phone}</div>}
              {restaurant.description && <div className="rs-detail-meta">{restaurant.description}</div>}
            </section>

            <section className="rs-card">
              <h2>Món ăn ({menu.length})</h2>

              {menu.length === 0 && <p className="rs-empty">Quán chưa có món nào.</p>}

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="rs-category">{cat}</h3>
                  {items.map((m) => (
                    <div className={`rs-menu-item ${m.available ? '' : 'off'}`} key={m._id}>
                      <div className="rs-menu-info">
                        <div className="rs-menu-name">
                          {m.name} {!m.available && <span className="rs-badge off">Hết món</span>}
                        </div>
                        {m.description && <div className="rs-menu-desc">{m.description}</div>}
                      </div>
                      <div className="rs-menu-price">{formatPrice(m.price)}</div>
                    </div>
                  ))}
                </div>
              ))}

              <p className="rs-hint" style={{ marginTop: 20 }}>
                Giỏ hàng và đặt món sẽ được thêm ở bước tiếp theo.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default RestaurantDetail;