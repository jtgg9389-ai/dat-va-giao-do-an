import { useRef, useState } from 'react';
import api from '../api';

export default function RestaurantCheckout({ restaurant, menu }) {
  const [quantities, setQuantities] = useState({});
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pending = useRef(null);
  const total = menu.reduce((sum, m) => sum + (quantities[m._id] || 0) * m.price, 0);
  async function submit(e) {
    e.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    const payload = { restaurantId: restaurant._id, items: menu.filter(m => quantities[m._id] > 0).map(m => ({ menuItem: m._id, quantity: quantities[m._id] })), address, phone, note };
    const signature = JSON.stringify(payload);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    try {
      const { data } = await api.post('/orders', payload, { headers: { 'Idempotency-Key': pending.current.key } });
      setSuccess(`Đơn #${data.order._id.slice(-8)} đã gửi đến nhà hàng. Tiền món: ${data.order.subtotal.toLocaleString('vi-VN')} ₫. Đang chờ xác nhận.`);
      setQuantities({}); pending.current = null;
    } catch (e) { setError(e.response?.data?.message || 'Chưa xác định được kết quả gửi đơn. Thử lại với cùng thông tin để tránh tạo đơn trùng.'); }
    finally { setBusy(false); }
  }
  return <section className="rs-card">
    <h2>Gửi đơn đến nhà hàng</h2>
    <p className="rs-notice">Đặt món COD để nhà hàng tiếp nhận và chuẩn bị. Bước này chưa hỗ trợ phí vận chuyển, gán tài xế hay thanh toán trực tuyến.</p>
    <form onSubmit={submit}>
      <fieldset disabled={busy || !restaurant.isOpen} style={{ border: 0, padding: 0 }}>
        {menu.filter(m => m.available).map(m => <label className="rs-menu-item" key={m._id}><span className="rs-menu-info">{m.name} · {m.price.toLocaleString('vi-VN')} ₫</span><input aria-label={`Số lượng ${m.name}`} type="number" min="0" max="99" value={quantities[m._id] || 0} onChange={e => setQuantities(q => ({ ...q, [m._id]: Number(e.target.value) }))} style={{ width: 70 }} /></label>)}
        <div className="rs-form">
          <label className="rs-field">Địa chỉ giao hàng<input value={address} onChange={e => setAddress(e.target.value)} required minLength={5} maxLength={300} /></label>
          <label className="rs-field">Số điện thoại<input value={phone} onChange={e => setPhone(e.target.value)} required pattern="[0-9]{9,11}" /></label>
          <label className="rs-field full">Ghi chú<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></label>
        </div>
        <p>Tạm tính tiền món: <strong>{total.toLocaleString('vi-VN')} ₫</strong></p>
        <button className="rs-btn" disabled={!Object.values(quantities).some(q => q > 0)}>{busy ? 'Đang gửi…' : 'Đặt món COD'}</button>
      </fieldset>
    </form>
    {!restaurant.isOpen && <p className="rs-error">Nhà hàng đang đóng cửa.</p>}
    {error && <p role="alert" className="rs-error">{error}</p>}
    {success && <p role="status" className="rs-success">{success}</p>}
  </section>;
}
