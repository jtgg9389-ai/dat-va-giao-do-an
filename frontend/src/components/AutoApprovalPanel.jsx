import { useEffect, useState } from 'react';
import api from '../api';

export default function AutoApprovalPanel() {
  const [enabled, setEnabled] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/admin/auto-approval')
      .then(({ data }) => {
        if (active) setEnabled(data.enabled);
      })
      .catch(() => {
        if (active) {
          setError(
            'Không tải được cấu hình. Hãy tải lại trang.'
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function toggle() {
    setBusy(true);
    setError('');

    try {
      const { data } = await api.patch(
        '/admin/auto-approval',
        { enabled: !enabled }
      );

      setEnabled(data.enabled);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Không lưu được cấu hình. Hãy tải lại trang để kiểm tra.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rs-card">
      <h2>Tự duyệt tài xế & nhà hàng</h2>

      <p role="status">
        {enabled === null
          ? 'Đang tải cấu hình…'
          : enabled
            ? 'Đang bật — kiểm tra hồ sơ mỗi 10 giây.'
            : 'Đang tắt — admin duyệt thủ công.'}
      </p>

      <p>
        Tài khoản đang hoạt động, họ tên từ 2 ký tự,
        điện thoại 9–11 chữ số và địa chỉ từ 5 ký tự.
        Nhà hàng cần thêm tên quán, địa chỉ, điện thoại
        và tọa độ hợp lệ.
      </p>

      <p className="rs-notice">
        Áp dụng cả hồ sơ đang chờ. Hồ sơ đã bị từ chối,
        thu hồi hoặc được admin yêu cầu duyệt lại vẫn
        cần duyệt thủ công. Đây là kiểm tra thông tin
        cơ bản, chưa xác minh giấy tờ.
      </p>

      <button
        type="button"
        role="switch"
        aria-checked={enabled === true}
        className="rs-btn"
        disabled={busy || enabled === null}
        onClick={toggle}
      >
        {busy
          ? 'Đang lưu…'
          : enabled
            ? 'Tắt tự duyệt'
            : 'Bật tự duyệt'}
      </button>

      {error && (
        <p className="rs-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}