import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import api from '../api';
import useLiveResource from '../hooks/useLiveResource';
import { lazy, Suspense } from 'react';
const DeliveryMap = lazy(() => import('../components/DeliveryMap'));
import './Restaurant.css';
import { money, statusLabel } from '../utils/flowLabels';
export function FlowPage({ title, children }) { return <div className="rs-page"><header className="rs-topbar"><Link className="rs-back" to="/">← Trang chủ</Link><h1>{title}</h1></header><main className="rs-container">{children}</main></div>; }
export function LiveState({ state }) { return <>{state.loading && <p>Đang tải…</p>}{state.error && <p className="rs-error" role="alert">{state.error} <button className="rs-link" onClick={state.refresh}>Thử lại</button></p>}<p className="rs-hint">{state.connected ? 'Đã kết nối cập nhật trực tiếp' : 'Đang kết nối lại — tự tải dữ liệu mỗi 5 giây'}</p></>; }
export default function Orders() {
  const state = useLiveResource('/orders');
  return <FlowPage title="Đơn hàng của tôi"><LiveState state={state} />{state.data?.orders.length === 0 && <p>Chưa có đơn hàng.</p>}{state.data?.orders.map(o => <Link className="rs-card" key={o._id} to={`/orders/${o._id}`}>Đơn #{o._id.slice(-8)} · {statusLabel[o.status]}<p>{new Date(o.createdAt).toLocaleString('vi-VN')} · {money(o.totalAmount ?? o.subtotal)}</p></Link>)}</FlowPage>;
}
export function OrderDetail() {
  const { id } = useParams();
  const state = useLiveResource(`/orders/${id}`);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [rating, setRating] = useState('5'), [driverRating, setDriverRating] = useState('5'), [comment, setComment] = useState('');
  async function action(path, body) { setBusy(true); setError(''); try { await api.post(`/orders/${id}/${path}`, body); await state.refresh(); } catch (e) { setError(e.response?.data?.message || 'Không thực hiện được'); } finally { setBusy(false); } }
  const o = state.data?.order;
  return <FlowPage title="Theo dõi đơn hàng"><Link to="/orders">← Lịch sử đơn</Link><LiveState state={state} />{error && <p className="rs-error" role="alert">{error}</p>}{o && <>
    <section className="rs-card"><h2>#{o._id.slice(-8)} · {statusLabel[o.status]}</h2><p>{state.data.restaurant?.name} · {o.address}</p><p>Điện thoại nhận hàng: {o.phone}</p><ul>{o.items.map((i, n) => <li key={n}>{i.quantity} × {i.name}: {money(i.quantity * i.unitPrice)}</li>)}</ul><p>Tiền món: {money(o.subtotal)} · Phí giao: {money(o.deliveryFee)} · <strong>Tổng: {money(o.totalAmount ?? o.subtotal)}</strong></p><p>{o.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán giả lập'} · {o.paymentState === 'REFUNDED' ? 'Đã hoàn tiền giả lập' : o.paymentState === 'PAID' ? 'Đã ghi nhận thanh toán' : 'Chưa thanh toán'}</p>
    {o.status === 'PENDING_PAYMENT' && <div className="rs-actions"><button className="rs-btn" disabled={busy} onClick={() => action('mock-payment', { outcome: 'success' })}>Giả lập thanh toán thành công</button><button className="rs-btn secondary" disabled={busy} onClick={() => action('mock-payment', { outcome: 'fail' })}>Giả lập thất bại</button></div>}
    {['PENDING_PAYMENT', 'PENDING_CONFIRMATION'].includes(o.status) && <form className="rs-reject" onSubmit={e => { e.preventDefault(); action('cancel', { reason }); }}><label className="rs-field">Lý do hủy<input required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><button className="rs-btn secondary" disabled={busy}>Hủy đơn</button></form>}
    {o.dispatchStatus === 'NO_DRIVER' && ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status) && <p className="rs-notice">Chưa có tài xế phù hợp; hệ thống đang tìm lại. Có thể liên hệ Hỗ trợ.</p>}
    {state.data.driver && <p>Tài xế: {state.data.driver.name} · {state.data.driver.phone}</p>}
    {o.financialHold && <p className="rs-notice">Đơn có sự cố đang chờ admin xử lý.</p>}
    <h3>Lịch sử trạng thái</h3><ol>{o.history.map((h, n) => <li key={n}>{statusLabel[h.status]} · {new Date(h.at).toLocaleString('vi-VN')}{h.reason && ` · ${h.reason}`}</li>)}</ol></section>
    {o.status === 'DELIVERING' && <section className="rs-card"><h2>Vị trí tài xế</h2><Suspense fallback={<p>Đang tải bản đồ…</p>}><DeliveryMap location={state.data.location} destination={o.deliveryLocation} /></Suspense></section>}
    {o.status === 'COMPLETED' && <section className="rs-card"><h2>Đánh giá sau giao hàng</h2>{state.data.review ? <p>Đã đánh giá nhà hàng {state.data.review.restaurantRating}/5 · {state.data.review.comment}</p> : <form className="rs-form" onSubmit={e => { e.preventDefault(); action('review', { restaurantRating: Number(rating), driverRating: Number(driverRating), comment }); }}><label className="rs-field">Điểm nhà hàng<select value={rating} onChange={e => setRating(e.target.value)}>{[5,4,3,2,1].map(n => <option key={n}>{n}</option>)}</select></label><label className="rs-field">Điểm tài xế<select value={driverRating} onChange={e => setDriverRating(e.target.value)}>{[5,4,3,2,1].map(n => <option key={n}>{n}</option>)}</select></label><label className="rs-field full">Nhận xét<textarea value={comment} maxLength={1000} onChange={e => setComment(e.target.value)} /></label><button className="rs-btn" disabled={busy}>Gửi đánh giá</button></form>}</section>}
  </>}</FlowPage>;
}
