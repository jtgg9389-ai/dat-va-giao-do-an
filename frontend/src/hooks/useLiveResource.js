import { useCallback, useEffect, useState } from 'react';
import api from '../api';

export default function useLiveResource(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const refresh = useCallback(async () => {
    try { const response = await api.get(path); setData(response.data); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Không tải được dữ liệu. Hãy thử lại.'); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => {
    let stopped = false, socket, retry;
    async function load() { if (!stopped) await refresh(); }
    function connect() {
      const url = new URL(api.defaults.baseURL); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; url.pathname += '/ws';
      socket = new WebSocket(url);
      socket.onopen = () => socket.send(JSON.stringify({ token: localStorage.getItem('token') }));
      socket.onmessage = event => { try { const payload = JSON.parse(event.data); if (payload.type === 'connected') setConnected(true); load(); } catch { /* Ignore invalid frames. REST remains the source of truth. */ } };
      socket.onclose = () => { if (!stopped) { setConnected(false); retry = setTimeout(connect, 3000); } };
      socket.onerror = () => socket.close();
    }
    load(); connect(); const poll = setInterval(load, 5000);
    return () => { stopped = true; clearInterval(poll); clearTimeout(retry); socket?.close(); };
  }, [refresh]);
  return { data, error, loading, connected, refresh };
}
