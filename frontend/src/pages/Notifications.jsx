import { Link } from 'react-router-dom';
import useLiveResource from '../hooks/useLiveResource';
import api from '../api';
import { FlowPage, LiveState } from './Orders';
export default function Notifications() {
  const state = useLiveResource('/notifications');
  return <FlowPage title="Thông báo của tôi"><LiveState state={state} />{state.data?.notifications.length === 0 && <p>Chưa có thông báo.</p>}{state.data?.notifications.map(n => <article className="rs-card" key={n._id}><p>{n.title}</p><p>{new Date(n.createdAt).toLocaleString('vi-VN')}</p>{n.order && <Link to={`/orders/${n.order}`}>Xem đơn hàng</Link>} <button className="rs-link" disabled={Boolean(n.readAt)} onClick={async () => { await api.post(`/notifications/${n._id}/read`); await state.refresh(); }}>{n.readAt ? 'Đã đọc' : 'Đánh dấu đã đọc'}</button></article>)}</FlowPage>;
}
