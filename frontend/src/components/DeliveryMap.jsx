import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function DeliveryMap({ location, destination }) {
  const host = useRef(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!location) return;
    const map = L.map(host.current).setView([location.latitude, location.longitude], 15);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' });
    tiles.on('tileerror', () => setError('Không tải được nền bản đồ. Tọa độ tài xế vẫn hiển thị bên dưới.'));
    tiles.addTo(map);
    L.circleMarker([location.latitude, location.longitude], { radius: 10, color: '#ff6a3d' }).addTo(map).bindTooltip('Tài xế');
    if (destination?.latitude !== undefined) L.circleMarker([destination.latitude, destination.longitude], { radius: 8, color: '#1a7a42' }).addTo(map).bindTooltip('Điểm giao');
    return () => map.remove();
  }, [location, destination]);
  if (!location) return <p>Chưa có vị trí tài xế đang giao.</p>;
  return <><div ref={host} className="flow-map" aria-label="Bản đồ vị trí tài xế" />{error && <p role="alert">{error}</p>}<p>GPS: {location.latitude}, {location.longitude} · Cập nhật {new Date(location.at).toLocaleTimeString('vi-VN')}{now - new Date(location.at).getTime() > 60000 && ' · Vị trí đã cũ'}</p></>;
}
