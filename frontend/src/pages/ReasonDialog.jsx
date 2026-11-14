import { useState } from 'react';

function ReasonDialog({
  title,
  message,
  confirmLabel = 'Xác nhận',
  danger = false,
  requireReason = true,
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState('');
  const tooShort = requireReason && reason.trim().length < 5;

  return (
    <div className="ad-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="ad-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="reason-dialog-title">{title}</h3>
        {message && <p className="ad-dialog-msg">{message}</p>}

        <label className="ad-label">
          Lý do {requireReason ? '(bắt buộc, từ 5 ký tự)' : '(không bắt buộc)'}
          <textarea
            rows="3"
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </label>

        {error && <p className="ad-error" role="alert">{error}</p>}

        <div className="ad-dialog-actions">
          <button className="ad-btn secondary" onClick={onCancel} disabled={busy}>Hủy</button>
          <button
            className={`ad-btn ${danger ? 'danger' : ''}`}
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || tooShort}
          >
            {busy ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReasonDialog;