import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './Restaurant.css';
import RestaurantCheckout from '../components/RestaurantCheckout';

export default function RestaurantDetail() {
  const { id } = useParams();
  return <RestaurantPage key={id} id={id} />;
}

function RestaurantPage({ id }) {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data } = await api.get(`/restaurants/${id}`);
        if (!active) return;

        setRestaurant(data.restaurant);
        setMenu(data.menu || []);
        setLoading(false);

        try {
          const response = await api.get(`/restaurants/${id}/reviews`);
          if (active) setReviews(response.data.reviews || []);
        } catch {
          if (active) {
            setReviewError(
              'Chưa tải được đánh giá. Bạn vẫn có thể chọn món.'
            );
          }
        }
      } catch (e) {
        if (!active) return;

        if ([401, 403].includes(e.response?.status)) {
          localStorage.clear();
          navigate('/login');
        } else {
          setError(
            e.response?.status === 404
              ? 'Không tìm thấy nhà hàng.'
              : 'Không tải được nhà hàng. Hãy tải lại trang.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [id, navigate]);

  return (
    <div className="rs-page restaurant-shopping">
      <header className="rs-topbar">
        <button
          className="rs-back"
          onClick={() => navigate('/restaurants')}
        >
          ← Danh sách quán
        </button>
        <h1>Chọn món & đặt hàng</h1>
      </header>

      <div className="rs-container">
        {loading && <p role="status">Đang tải thực đơn…</p>}
        {error && <p className="rs-error" role="alert">{error}</p>}

        {restaurant && (
          <>
            <section className="rs-card rs-detail-head order-restaurant-head">
              <span className={`rs-badge ${restaurant.isOpen ? 'open' : 'off'}`}>
                {restaurant.isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
              </span>

              <h2>{restaurant.name}</h2>
              <div className="rs-detail-meta">📍 {restaurant.address}</div>

              {restaurant.phone && (
                <div className="rs-detail-meta">📞 {restaurant.phone}</div>
              )}

              {restaurant.description && (
                <p className="rs-detail-meta">{restaurant.description}</p>
              )}
            </section>

            <RestaurantCheckout restaurant={restaurant} menu={menu} />

            <section className="rs-card">
              <h2>Đánh giá nhà hàng</h2>

              {reviewError ? (
                <p role="status">{reviewError}</p>
              ) : !reviews.length && (
                <p className="rs-empty">Chưa có đánh giá.</p>
              )}

              {reviews.map(review => (
                <p key={review._id}>
                  ⭐ {review.restaurantRating}/5 ·{' '}
                  {review.comment || 'Không có nhận xét'}
                </p>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}