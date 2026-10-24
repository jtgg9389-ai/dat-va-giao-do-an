export default function describeError(err, navigate, fallback = 'Có lỗi xảy ra, vui lòng thử lại') {
  if (err.response?.status === 401) {
    localStorage.clear();
    navigate('/login');
    return '';
  }
  if (!err.response) {
    return 'Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.';
  }
  return err.response.data?.message || fallback;
}