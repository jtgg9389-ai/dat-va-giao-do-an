import { useEffect, useState } from 'react';
import api from '../api';
import useLiveResource from '../hooks/useLiveResource';
import { FlowPage, LiveState } from './Orders';
import { money, statusLabel } from '../utils/flowLabels';
import PartnerSettlements from '../components/PartnerSettlements';

export default function DriverDashboard() {
  const state = useLiveResource('/driver/profile');
  const [error, setError] = useState(''), [gps, setGps] = useState(false), [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 7) + '-01'), [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [earnings, setEarnings] = useState(null);
  useEffect(() => {
    if (!gps) return;
    let stopped = false;
    async function send() {
      if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ GPS'); return; }
      navigator.geolocation.getCurrentPosition(async position => {
        if (stopped) return;
        try { await api.post('/driver/location', { latitude: position.coords.latitude, longitude: position.coords.longitude, sequence: Date.now() }); setError(''); }
        catch (e) { setError(e.response?.data?.message || 'Không gửi được GPS'); }
      }, () => setError('Không lấy được GPS. Cho phép vị trí trong trình duyệt rồi thử lại.'), { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 });
    }
    send(); const timer = setInterval(send, 3000); return () => { stopped = true; clearInterval(timer); };
  }, [gps]);
  async function action(path, body, method = 'post') { setBusy(true); setError(''); try { await api[method](path, body); await state.refresh(); } catch (e) { setError(e.response?.data?.message || 'Không thực hiện được'); } finally { setBusy(false); } }
  const profile = state.data?.profile;
  return <FlowPage title="Tài xế — nhận và giao đơn"><LiveState state={state} />{error && <p className="rs-error" role="alert">{error}</p>}
    {profile && <section className="rs-card"><h2>Trạng thái hoạt động</h2><p>Hồ sơ: {profile.approvalStatus === 'approved' ? 'Đã duyệt' : profile.approvalStatus === 'rejected' ? 'Bị từ chối: ' + profile.reviewReason : 'Chờ admin duyệt'}</p><p>{profile.online ? 'Đang online' : 'Đang offline'} · GPS {profile.locationAt ? new Date(profile.locationAt).toLocaleTimeString('vi-VN') : 'chưa có'}</p><div className="rs-actions"><button className="rs-btn secondary" onClick={() => setGps(x => !x)}>{gps ? 'Dừng gửi GPS' : 'Bật gửi GPS'}</button><button className="rs-btn" disabled={busy || profile.approvalStatus !== 'approved'} onClick={() => action('/driver/availability', { online: !profile.online }, 'put')}>{profile.online ? 'Chuyển offline' : 'Sẵn sàng nhận đơn'}</button></div><p className="rs-hint">Bật GPS trước khi online. Giữ trang mở để gửi vị trí mỗi 3 giây.</p></section>}
    <section className="rs-card"><h2>Đề nghị giao hàng</h2>{!state.data?.offers.length && <p>Chưa có cuốc được đề nghị.</p>}{state.data?.offers.map(o => <article key={o._id} className="rs-order"><p>Đơn #{o._id.slice(-8)} · Công giao {money(o.deliveryFee)} · Hết hạn {new Date(o.expiresAt).toLocaleTimeString('vi-VN')}</p><div className="rs-actions"><button className="rs-btn" disabled={busy || new Date(o.expiresAt) <= new Date()} onClick={() => action(`/driver/offers/${o._id}`, { action: 'accept' })}>Nhận cuốc</button><button className="rs-btn secondary" disabled={busy} onClick={() => action(`/driver/offers/${o._id}`, { action: 'reject' })}>Từ chối</button></div></article>)}</section>
    <section className="rs-card"><h2>Cuốc của tôi</h2>{state.data?.jobs.map(o => <article className="rs-order" key={o._id}><h3>#{o._id.slice(-8)} · {statusLabel[o.status]}</h3><p>Giao: {o.address} · {o.phone}</p><p>{o.paymentMethod === 'COD' ? `Thu hộ COD ${money(o.totalAmount)}` : 'Khách đã thanh toán giả lập'} · Công giao {money(o.deliveryFee)}</p><div className="rs-actions">{o.status === 'READY_FOR_PICKUP' && <button className="rs-btn" disabled={busy} onClick={() => action(`/driver/jobs/${o._id}/status`, { status: 'PICKED_UP' }, 'patch')}>Đã lấy hàng</button>}{o.status === 'PICKED_UP' && <button className="rs-btn" disabled={busy} onClick={() => action(`/driver/jobs/${o._id}/status`, { status: 'DELIVERING' }, 'patch')}>Bắt đầu giao</button>}{o.status === 'DELIVERING' && <button className="rs-btn" disabled={busy} onClick={() => { if (window.confirm(o.paymentMethod === 'COD' ? `Đã giao hàng và thu đúng ${money(o.totalAmount)} COD?` : 'Xác nhận đã giao hàng?')) action(`/driver/jobs/${o._id}/status`, { status: 'COMPLETED', codCollectedAmount: o.totalAmount }, 'patch'); }}>Đã giao thành công</button>}{['CONFIRMED','PREPARING','READY_FOR_PICKUP','PICKED_UP','DELIVERING'].includes(o.status) && <button className="rs-btn secondary" disabled={busy} onClick={() => { const description = window.prompt('Mô tả sự cố / COD sai lệch (ít nhất 5 ký tự)'); if (description) action(`/driver/jobs/${o._id}/issue`, { description }); }}>Báo sự cố</button>}</div>{o.financialHold && <p className="rs-notice">Đang giữ xử lý sự cố; liên hệ hỗ trợ.</p>}</article>)}</section>
    <section className="rs-card"><h2>Thu nhập theo ngày</h2><form className="rs-toolbar" onSubmit={async e => { e.preventDefault(); try { const r = await api.get('/driver/earnings', { params: { from, to } }); setEarnings(r.data); } catch (e) { setError(e.response?.data?.message || 'Không tải được thu nhập'); } }}><label>Từ ngày <input type="date" required value={from} max={to} onChange={e => setFrom(e.target.value)} /></label><label>Đến ngày <input type="date" required value={to} min={from} onChange={e => setTo(e.target.value)} /></label><button className="rs-btn">Xem thu nhập</button></form>{earnings && <><p>{earnings.totals.count} đơn · Công giao: {money(earnings.totals.earning)}</p><p>COD thu hộ: {money(earnings.totals.codCollected)} · {earnings.totals.netPayable < 0 ? 'Phải nộp lại hệ thống' : 'Được nhận từ hệ thống'}: {money(Math.abs(earnings.totals.netPayable))}</p></>}</section>
    <PartnerSettlements party="driver" />
  </FlowPage>;
}
