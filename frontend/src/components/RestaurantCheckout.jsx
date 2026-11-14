import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function RestaurantCheckout({ restaurant, menu }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const cartKey = `cart:${user.id}:${restaurant._id}`;
  const [quantities, setQuantities] = useState(() => { try { return JSON.parse(localStorage.getItem(cartKey)) || {}; } catch { return {}; } });
  useEffect(() => { localStorage.setItem(cartKey, JSON.stringify(quantities)); }, [quantities, cartKey]);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pending = useRef(null);
  const validMenu = menu.filter(m => m.available);
  const total = validMenu.reduce((sum, m) => sum + (quantities[m._id] || 0) * m.price, 0);
  const hasLocation = latitude !== '' && longitude !== '' && restaurant.location?.latitude !== undefined;
  let deliveryFee = null;
  if (hasLocation) {
    const rad = d => d * Math.PI / 180;
    const a = restaurant.location;
    const lat = Number(latitude), lng = Number(longitude);
    const p = Math.sin(rad(lat - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(lat)) * Math.sin(rad(lng - a.longitude) / 2) ** 2;
    const km = 6371 * 2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p));
    deliveryFee = 15000 + Math.ceil(Math.max(0, km - 2)) * 5000;
  }
  async function submit(e) {
    e.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    const payload = { restaurantId: restaurant._id, items: validMenu.filter(m => quantities[m._id] > 0).map(m => ({ menuItem: m._id, quantity: quantities[m._id] })), address, phone, note, paymentMethod, expectedSubtotal: total, deliveryLocation: { latitude: Number(latitude), longitude: Number(longitude) } };
    const signature = JSON.stringify(payload);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    try {
      const { data } = await api.post('/orders', payload, { headers: { 'Idempotency-Key': pending.current.key } });
      setSuccess(`Đơn #${data.order._id.slice(-8)} đã gửi đến nhà hàng. Tiền món: ${data.order.subtotal.toLocaleString('vi-VN')} ₫. Đang chờ xác nhận.`);
      setQuantities({}); localStorage.removeItem(cartKey); pending.current = null; navigate(`/orders/${data.order._id}`);
    } catch (e) { setError(e.response?.data?.message || 'Chưa xác định được kết quả gửi đơn. Thử lại với cùng thông tin để tránh tạo đơn trùng.'); }
    finally { setBusy(false); }
  }
  return <section className="rs-card">
    <h2>Gửi đơn đến nhà hàng</h2>
    <p className="rs-notice">Giỏ tự lưu theo quán và tài khoản. Phí giao 15.000 ₫ trong 2 km, mỗi km vượt cộng 5.000 ₫ (làm tròn lên), tối đa 30 km. Thanh toán giả lập không thu tiền thật.</p>
    <form onSubmit={submit}>
      <fieldset disabled={busy || !restaurant.isOpen} style={{ border: 0, padding: 0 }}>
        {menu.filter(m => m.available).map(m => <label className="rs-menu-item" key={m._id}><span className="rs-menu-info">{m.name} · {m.price.toLocaleString('vi-VN')} ₫</span><input aria-label={`Số lượng ${m.name}`} type="number" min="0" max="99" value={quantities[m._id] || 0} onChange={e => setQuantities(q => ({ ...q, [m._id]: Number(e.target.value) }))} style={{ width: 70 }} /></label>)}
        <div className="rs-form">
          <label className="rs-field">Địa chỉ giao hàng<input value={address} onChange={e => setAddress(e.target.value)} required minLength={5} maxLength={300} /></label>
          <label className="rs-field">Số điện thoại<input value={phone} onChange={e => setPhone(e.target.value)} required pattern="[0-9]{9,11}" /></label>
          <label className="rs-field">Vĩ độ giao hàng<input type="number" step="any" min="-90" max="90" required value={latitude} onChange={e => setLatitude(e.target.value)} /></label>
          <label className="rs-field">Kinh độ giao hàng<input type="number" step="any" min="-180" max="180" required value={longitude} onChange={e => setLongitude(e.target.value)} /></label>
          <button type="button" className="rs-btn secondary" onClick={() => navigator.geolocation?.getCurrentPosition(p => { setLatitude(p.coords.latitude); setLongitude(p.coords.longitude); }, () => setError('Không lấy được GPS, hãy nhập tọa độ thủ công.'))}>Lấy vị trí giao hiện tại</button>
          <label className="rs-field">Thanh toán<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="COD">COD — trả khi nhận hàng</option><option value="MOCK_PREPAID">Thanh toán giả lập</option></select></label>
          <label className="rs-field full">Ghi chú<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></label>
        </div>
        {restaurant.location?.latitude === undefined && <p className="rs-notice">Nhà hàng cần bổ sung tọa độ trước khi nhận đơn giao.</p>}
        <p>Tạm tính tiền món: <strong>{total.toLocaleString('vi-VN')} ₫</strong></p>
        <p>Phí giao dự kiến: {deliveryFee === null ? 'Chọn tọa độ giao hàng' : deliveryFee.toLocaleString('vi-VN') + ' ₫'} · Tổng dự kiến: {(total + (deliveryFee || 0)).toLocaleString('vi-VN')} ₫</p>
        <button className="rs-btn" disabled={!Object.values(quantities).some(q => q > 0) || restaurant.location?.latitude === undefined}>{busy ? 'Đang gửi…' : 'Đặt món'}</button>
        <button type="button" className="rs-btn secondary" onClick={() => setQuantities({})}>Xóa giỏ hàng</button>
      </fieldset>
    </form>
    {!restaurant.isOpen && <p className="rs-error">Nhà hàng đang đóng cửa.</p>}
    {error && <p role="alert" className="rs-error">{error}</p>}
    {success && <p role="status" className="rs-success">{success}</p>}
  </section>;
}
