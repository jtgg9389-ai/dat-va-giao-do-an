import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './RestaurantCheckout.css';

const money = value =>
  `${Number(value).toLocaleString('vi-VN')} ₫`;

const clamp = value =>
  Math.min(99, Math.max(0, Math.trunc(Number(value) || 0)));

const coordinates = point =>
  Number.isFinite(point?.latitude) &&
  Math.abs(point.latitude) <= 90 &&
  Number.isFinite(point?.longitude) &&
  Math.abs(point.longitude) <= 180;

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
}

function readCart(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));

    return saved && typeof saved === 'object' && !Array.isArray(saved)
      ? Object.fromEntries(
          Object.entries(saved).map(([id, value]) => [id, clamp(value)])
        )
      : {};
  } catch {
    return {};
  }
}

function distance(a, b) {
  const rad = value => value * Math.PI / 180;

  const p =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
    Math.cos(rad(b.latitude)) *
    Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;

  return 6371 * 2 *
    Math.asin(Math.sqrt(Math.min(1, Math.max(0, p))));
}

export default function RestaurantCheckout({ restaurant, menu }) {
  const navigate = useNavigate();
  const user = readUser();

  const cartKey =
    `cart:${user.id || user._id}:${restaurant._id}`;

  const [quantities, setQuantities] = useState(() => readCart(cartKey));
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [address, setAddress] = useState(user.address || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const pending = useRef(null);
  const sending = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(cartKey, JSON.stringify(quantities));
    } catch {
      // Vẫn cho đặt hàng khi trình duyệt không lưu được giỏ.
    }
  }, [cartKey, quantities]);

  const categories = [
    ...new Set(menu.map(item => item.category || 'Khác')),
  ];

  const visible = menu.filter(item =>
    (!category || (item.category || 'Khác') === category) &&
    item.name.toLocaleLowerCase('vi').includes(
      search.trim().toLocaleLowerCase('vi')
    )
  );

  const selected = menu.filter(item =>
    item.available && quantities[item._id] > 0
  );

  const count = selected.reduce(
    (sum, item) => sum + quantities[item._id], 0
  );

  const subtotal = selected.reduce(
    (sum, item) => sum + item.price * quantities[item._id], 0
  );

  const destination = {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };

  const hasLocation =
    latitude.trim() !== '' &&
    longitude.trim() !== '' &&
    coordinates(destination);

  const hasRestaurantLocation = coordinates(restaurant.location);

  const km = hasLocation && hasRestaurantLocation
    ? distance(restaurant.location, destination)
    : null;

  const tooFar = km !== null && km > 30;

  const fee = km !== null && !tooFar
    ? 15000 + Math.ceil(Math.max(0, km - 2)) * 5000
    : null;

  const blocked = !restaurant.isOpen || !count || fee === null;

  const unavailableInCart = menu.some(item =>
    !item.available && quantities[item._id] > 0
  );

  function change(id, value) {
    if (sending.current) return;

    setQuantities(current => ({
      ...current,
      [id]: clamp(value),
    }));
  }

  function locate() {
    setError('');

    if (!navigator.geolocation) {
      setError(
        'Trình duyệt không hỗ trợ GPS. Hãy nhập tọa độ bên dưới.'
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      position => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(
          'Không lấy được GPS. Hãy cho phép vị trí hoặc nhập tọa độ thủ công.'
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (sending.current || blocked) return;

    sending.current = true;
    setBusy(true);
    setError('');

    const payload = {
      restaurantId: restaurant._id,
      items: selected.map(item => ({
        menuItem: item._id,
        quantity: quantities[item._id],
      })),
      address: address.trim(),
      phone: phone.trim(),
      note: note.trim(),
      paymentMethod,
      expectedSubtotal: subtotal,
      deliveryLocation: destination,
    };

    const signature = JSON.stringify(payload);

    if (pending.current?.signature !== signature) {
      pending.current = {
        signature,
        key: crypto.randomUUID(),
      };
    }

    try {
      const { data } = await api.post('/orders', payload, {
        headers: { 'Idempotency-Key': pending.current.key },
      });

      setQuantities({});

      try {
        localStorage.removeItem(cartKey);
      } catch {
        // Không ảnh hưởng đến đơn đã gửi thành công.
      }

      pending.current = null;
      navigate(`/orders/${data.order._id}`);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Chưa xác định được kết quả gửi đơn. Thử lại với cùng thông tin để tránh tạo đơn trùng.'
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="order-shop" onSubmit={submit}>
      <section className="rs-card order-menu">
        <h2>
          Thực đơn{' '}
          <span className="order-muted">({menu.length} món)</span>
        </h2>

        <input
          className="rs-search"
          aria-label="Tìm món"
          placeholder="Tìm món bạn muốn ăn…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div
          className="order-categories"
          role="group"
          aria-label="Danh mục món"
        >
          {['', ...categories].map(value => (
            <button
              type="button"
              key={value}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value || 'Tất cả'}
            </button>
          ))}
        </div>

        {!restaurant.isOpen && (
          <p className="rs-notice">
            Quán đang đóng cửa, bạn có thể xem thực đơn và giỏ hàng.
          </p>
        )}

        {!visible.length && (
          <p className="order-empty">
            {menu.length
              ? 'Không tìm thấy món phù hợp.'
              : 'Quán chưa có món nào.'}
          </p>
        )}

        <div className="order-dishes">
          {visible.map(item => {
            const quantity = item.available
              ? quantities[item._id] || 0
              : 0;

            const disabled =
              busy || !restaurant.isOpen || !item.available;

            return (
              <article
                className={`order-dish ${quantity ? 'is-selected' : ''}`}
                key={item._id}
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} loading="lazy" />
                ) : (
                  <div className="order-placeholder" aria-hidden="true">
                    🍽️
                  </div>
                )}

                <div className="order-dish-info">
                  <small>{item.category || 'Khác'}</small>
                  <h3>{item.name}</h3>
                  {item.description && <p>{item.description}</p>}
                  <strong>{money(item.price)}</strong>

                  {!item.available && (
                    <span className="rs-badge off">Hết món</span>
                  )}
                </div>

                <div
                  className="order-stepper"
                  role="group"
                  aria-label={`Số lượng ${item.name}`}
                >
                  <button
                    type="button"
                    aria-label={`Giảm ${item.name}`}
                    disabled={disabled || quantity === 0}
                    onClick={() => change(item._id, quantity - 1)}
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="99"
                    step="1"
                    aria-label={`Số lượng ${item.name}`}
                    value={quantity}
                    disabled={disabled}
                    onChange={e => change(item._id, e.target.value)}
                  />

                  <button
                    type="button"
                    aria-label={`Tăng ${item.name}`}
                    disabled={disabled || quantity >= 99}
                    onClick={() => change(item._id, quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="order-cart rs-card">
        <div className="order-cart-title">
          <h2>Giỏ hàng của bạn</h2>
          <span>{count} món</span>
        </div>

        {!count && (
          <p className="order-empty">
            Giỏ hàng đang trống. Bấm + cạnh món để thêm vào giỏ.
          </p>
        )}

        {unavailableInCart && (
          <p className="rs-notice">
            Món hết hàng đã được loại khỏi số tiền và đơn đặt.
          </p>
        )}

        <div className="order-cart-items">
          {selected.map(item => (
            <div className="order-cart-row" key={item._id}>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {quantities[item._id]} × {money(item.price)}
                </small>
              </div>

              <div>
                <strong>
                  {money(item.price * quantities[item._id])}
                </strong>
                <button
                  className="rs-link danger"
                  type="button"
                  disabled={busy}
                  aria-label={`Xóa ${item.name}`}
                  onClick={() => change(item._id, 0)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>

        <fieldset disabled={busy} className="order-fields">
          <legend>Thông tin giao hàng</legend>

          <label className="rs-field">
            Địa chỉ nhận hàng
            <input
              required
              minLength={5}
              maxLength={300}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã…"
            />
          </label>

          <label className="rs-field">
            Số điện thoại
            <input
              type="tel"
              required
              pattern="[0-9]{9,11}"
              maxLength={11}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0901234567"
            />
          </label>

          <button
            type="button"
            className="rs-btn secondary"
            disabled={locating}
            onClick={locate}
          >
            {locating
              ? 'Đang lấy vị trí…'
              : '📍 Lấy vị trí giao hiện tại'}
          </button>

          <p className="order-muted">
            GPS lấy vị trí thiết bị. Nếu giao nơi khác,
            hãy nhập tọa độ đúng với địa chỉ nhận.
          </p>

          <div className="order-coordinates">
            <label className="rs-field">
              Vĩ độ
              <input
                type="number"
                required
                min="-90"
                max="90"
                step="any"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
              />
            </label>

            <label className="rs-field">
              Kinh độ
              <input
                type="number"
                required
                min="-180"
                max="180"
                step="any"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
              />
            </label>
          </div>

          <label className="rs-field">
            Thanh toán
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option value="COD">Trả khi nhận hàng (COD)</option>
              <option value="MOCK_PREPAID">Thanh toán giả lập</option>
            </select>
          </label>

          <label className="rs-field">
            Ghi chú
            <textarea
              rows="2"
              maxLength={500}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ví dụ: ít cay, không hành…"
            />
          </label>
        </fieldset>

        <div className="order-totals" aria-live="polite">
          <p>
            <span>Tiền món</span>
            <strong>{money(subtotal)}</strong>
          </p>

          <p>
            <span>Phí giao dự kiến</span>
            <strong>
              {fee === null ? 'Chưa xác định' : money(fee)}
            </strong>
          </p>

          <p className="order-grand-total">
            <span>Tổng dự kiến</span>
            <strong>
              {count && fee !== null ? money(subtotal + fee) : '—'}
            </strong>
          </p>
        </div>

        {!hasRestaurantLocation && (
          <p className="rs-error">
            Quán cần cập nhật tọa độ để nhận đơn.
          </p>
        )}

        {hasRestaurantLocation && !hasLocation && (
          <p className="order-muted">
            Chọn vị trí giao để tính phí và đặt món.
          </p>
        )}

        {tooFar && (
          <p className="rs-error">
            Địa chỉ ngoài bán kính giao hàng 30 km.
          </p>
        )}

        {error && <p className="rs-error" role="alert">{error}</p>}

        <button
          type="submit"
          className="rs-btn order-submit"
          disabled={busy || blocked}
        >
          {busy
            ? 'Đang gửi đơn…'
            : count
              ? `Đặt ${count} món`
              : 'Chọn món để đặt hàng'}
        </button>

        {count > 0 && (
          <button
            type="button"
            className="rs-link danger"
            disabled={busy}
            onClick={() => setQuantities({})}
          >
            Xóa toàn bộ giỏ hàng
          </button>
        )}

        <p className="order-muted">
          Phí giao: 15.000 ₫ cho 2 km đầu; mỗi km vượt cộng
          5.000 ₫, làm tròn lên. Thanh toán trong đồ án là giả lập.
        </p>
      </aside>
    </form>
  );
}