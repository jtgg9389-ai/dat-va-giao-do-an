import { useEffect, useState } from 'react';
import api from '../api';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const money = n => `${Number(n).toLocaleString('vi-VN')} ₫`;
export default function RestaurantReport() {
  const [from, setFrom] = useState(() => `${today().slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(() => ({ from: `${today().slice(0, 7)}-01`, to: today() }));
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(''); setData(null);
      try { const res = await api.get('/restaurants/mine/report', { params: query, signal: controller.signal }); setData(res.data); }
      catch (e) { if (!controller.signal.aborted) setError(e.response?.data?.message || 'Không tải được báo cáo'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load(); return () => controller.abort();
  }, [query]);
  return <section className="rs-card">
    <h2>Doanh thu & lịch sử đối soát</h2>
    <form className="rs-toolbar" onSubmit={e => { e.preventDefault(); setQuery({ from, to }); }}>
      <label className="rs-field">Từ ngày<input type="date" required value={from} max={to} onChange={e => setFrom(e.target.value)} /></label>
      <label className="rs-field">Đến ngày<input type="date" required value={to} min={from} onChange={e => setTo(e.target.value)} /></label>
      <button className="rs-btn" disabled={loading}>Xem báo cáo</button>
    </form>
    <p className="rs-hint">Ngày theo giờ Việt Nam. Doanh thu tính theo ngày giao thành công; đối soát tính theo ngày chốt kỳ.</p>
    {loading && <p>Đang tải báo cáo…</p>}{error && <p className="rs-error" role="alert">{error}</p>}
    {data && <>
      <dl className="rs-metrics"><div><dt>Đơn giao thành công</dt><dd>{data.totals.count}</dd></div><div><dt>Tổng tiền món</dt><dd>{money(data.totals.subtotal)}</dd></div><div><dt>Hoa hồng (10%)</dt><dd>{money(data.totals.commissionAmount)}</dd></div><div><dt>Nhà hàng được hưởng</dt><dd>{money(data.totals.restaurantNetAmount)}</dd></div></dl>
      <p className="rs-hint">Số được hưởng chưa có nghĩa là đã nhận tiền. Đơn hủy, từ chối hoặc chưa giao xong không được tính doanh thu.</p>
      <h3>Chi tiết đơn hoàn tất</h3>
      {!data.orders.length && <p className="rs-empty">Chưa có đơn giao thành công trong khoảng ngày này.</p>}
      {data.orders.map(o => <div className="rs-order" key={o._id}>#{o._id.slice(-8)} · {new Date(o.completedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · Được hưởng {money(o.restaurantNetAmount)} · {o.settlement?.reference ? `Đã chốt kỳ ${o.settlement.reference}` : o.codConfirmed ? 'Chưa đối soát' : 'Giữ lại: chưa xác nhận thu COD'}</div>)}
      <h3>Lịch sử đối soát</h3>
      {!data.settlements.length && <p className="rs-empty">Chưa có kỳ đối soát đã chốt trong khoảng ngày này.</p>}
      {data.settlements.map(s => <details className="rs-order" key={s.reference}><summary>{s.reference} · {money(s.amount)} · Chốt {new Date(s.finalizedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</summary><ul>{s.orders.map(o => <li key={o.id}>Đơn #{o.id.slice(-8)}: {money(o.amount)} · {o.paidAt ? `Đã ghi nhận chi giả lập ${new Date(o.paidAt).toLocaleDateString('vi-VN')}` : 'Chưa ghi nhận chi'}</li>)}</ul></details>)}
    </>}
  </section>;
}
