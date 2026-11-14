import { useEffect, useState } from 'react';
import api from '../api';

const labels = { PENDING_CONFIRMATION: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang làm', READY_FOR_PICKUP: 'Sẵn sàng giao', REJECTED: 'Đã từ chối', PICKED_UP: 'Đã lấy hàng', DELIVERING: 'Đang giao', COMPLETED: 'Đã giao thành công', CANCELLED: 'Đã hủy', DELIVERY_FAILED: 'Giao thất bại' };
const money = n => `${Number(n).toLocaleString('vi-VN')} ₫`;

export default function RestaurantOrders() {
  const [orders, setOrders] = useState([]);
  const [connection, setConnection] = useState('Đang kết nối thông báo…');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('active');
  const [busy, setBusy] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let seen = null;
    let retryTimer;
    function receive(data) {
      if (seen) {
        const added = data.orders.filter(o => !seen.has(o._id) && o.status === 'PENDING_CONFIRMATION');
        if (added.length) setNotice(`Có ${added.length} đơn mới đang chờ xác nhận.`);
      }
      seen = new Set(data.orders.map(o => o._id));
      setOrders(data.orders);
      setLoaded(true);
    }
    async function connect() {
      try {
        // Authenticated fetch avoids putting JWT credentials into a URL.
        const response = await fetch(`${api.defaults.baseURL}/restaurants/mine/orders/stream`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal });
        if (!response.ok) {
          if ([401, 403].includes(response.status)) { setConnection('Phiên đăng nhập không còn quyền nhận thông báo. Hãy đăng nhập lại.'); return; }
          throw new Error('Không kết nối được thông báo');
        }
        setConnection('Đang nhận cập nhật trực tiếp');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) throw new Error('Kết nối đã đóng');
          buffer += decoder.decode(value, { stream: true });
          let end;
          while ((end = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (event.startsWith('event: unavailable')) throw new Error('Máy chủ chưa sẵn sàng');
            const line = event.split('\n').find(line => line.startsWith('data: '));
            if (line) receive(JSON.parse(line.slice(6)));
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        setConnection('Mất kết nối — đang thử lại. Bạn có thể tải lại danh sách.');
        retryTimer = setTimeout(connect, 3000);
      }
    }
    connect();
    return () => { controller.abort(); clearTimeout(retryTimer); };
  }, []);

  async function reload() {
    setError('');
    try { const { data } = await api.get('/restaurants/mine/orders'); setOrders(data.orders); setLoaded(true); }
    catch (e) { setError(e.response?.data?.message || 'Không tải được đơn hàng'); }
  }
  async function changeStatus(order, status) {
    setBusy(order._id); setError('');
    try {
      const { data } = await api.patch(`/restaurants/mine/orders/${order._id}/status`, { status, ...(status === 'REJECTED' ? { reason } : {}) });
      setOrders(previous => previous.map(o => o._id === data.order._id ? data.order : o));
      setRejectId(null); setReason('');
    } catch (e) { setError(e.response?.data?.message || 'Không cập nhật được đơn hàng'); }
    finally { setBusy(null); }
  }
  const visible = orders.filter(o => filter === 'all' || (filter === 'active' ? ['PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status) : o.status === filter));
  return <section className="rs-card" aria-labelledby="orders-title">
    <h2 id="orders-title">Đơn hàng của nhà hàng</h2>
    <p role="status">{connection}</p>
    {notice && <p className="rs-notice" role="status">{notice} <button className="rs-link" onClick={() => setNotice('')}>Đã xem</button></p>}
    <div className="rs-toolbar">
      <label>Lọc đơn <select value={filter} onChange={e => setFilter(e.target.value)}><option value="active">Đang xử lý</option><option value="all">Tất cả (200 đơn gần nhất)</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="rs-btn secondary" onClick={reload}>Tải lại</button>
    </div>
    {error && <p className="rs-error" role="alert">{error}</p>}
    {!loaded && <p>Đang tải đơn hàng…</p>}
    {loaded && !visible.length && <p className="rs-empty">Không có đơn trong bộ lọc này.</p>}
    {visible.map(order => <article className="rs-order" key={order._id}>
      <h3>Đơn #{order._id.slice(-8)} · {labels[order.status]}</h3>
      <p>{new Date(order.createdAt).toLocaleString('vi-VN')} · COD</p>
      <p>Giao đến: {order.address} · {order.phone}</p>
      <ul>{order.items.map((item, index) => <li key={index}>{item.quantity} × {item.name} — {money(item.unitPrice * item.quantity)}</li>)}</ul>
      <p>Tiền món: <strong>{money(order.subtotal)}</strong></p>
      {order.note && <p>Ghi chú: {order.note}</p>}
      <div className="rs-actions">
        {order.status === 'PENDING_CONFIRMATION' && <><button className="rs-btn" disabled={busy === order._id} onClick={() => changeStatus(order, 'CONFIRMED')}>Xác nhận đơn</button><button className="rs-btn secondary" disabled={busy === order._id} onClick={() => { setRejectId(order._id); setReason(''); }}>Từ chối</button></>}
        {order.status === 'CONFIRMED' && <button className="rs-btn" disabled={busy === order._id} onClick={() => changeStatus(order, 'PREPARING')}>Bắt đầu làm món</button>}
        {order.status === 'PREPARING' && <button className="rs-btn" disabled={busy === order._id} onClick={() => changeStatus(order, 'READY_FOR_PICKUP')}>Sẵn sàng giao</button>}
      </div>
      {rejectId === order._id && <form className="rs-reject" onSubmit={e => { e.preventDefault(); changeStatus(order, 'REJECTED'); }}>
        <label className="rs-field">Lý do từ chối<textarea value={reason} onChange={e => setReason(e.target.value)} required maxLength={500} /></label>
        <div className="rs-actions"><button className="rs-btn" disabled={busy === order._id || !reason.trim()}>Xác nhận từ chối</button><button type="button" className="rs-btn secondary" onClick={() => setRejectId(null)}>Hủy</button></div>
      </form>}
      <details><summary>Lịch sử trạng thái</summary><ol>{order.history.map((h, index) => <li key={index}>{labels[h.status] || h.status} · {new Date(h.at).toLocaleString('vi-VN')}{h.reason ? ` · ${h.reason}` : ''}</li>)}</ol></details>
    </article>)}
  </section>;
}
