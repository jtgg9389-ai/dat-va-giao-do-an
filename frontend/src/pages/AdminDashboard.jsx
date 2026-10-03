import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const roleLabels = {
  customer: 'Khách hàng',
  restaurant: 'Nhà hàng',
  driver: 'Tài xế',
  admin: 'Quản trị viên',
};

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user'));

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập trang này');
      } else if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Không tải được danh sách người dùng');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers(); // tải lại danh sách sau khi đổi
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Xác nhận xoá tài khoản "${name}"?`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: 50 }}>Đang tải...</p>;

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50 }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate('/')}>Về trang chủ</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Quản lý người dùng ({users.length})</h2>
        <button onClick={() => navigate('/')}>Về trang chủ</button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Họ tên</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>SĐT</th>
            <th style={styles.th}>Vai trò</th>
            <th style={styles.th}>Ngày tạo</th>
            <th style={styles.th}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td style={styles.td}>{u.name}</td>
              <td style={styles.td}>{u.email}</td>
              <td style={styles.td}>{u.phone || '—'}</td>
              <td style={styles.td}>
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u._id, e.target.value)}
                  disabled={u._id === currentUser.id} // không tự đổi role chính mình
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </td>
              <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
              <td style={styles.td}>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(u._id, u.name)}
                  disabled={u._id === currentUser.id}
                >
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: { padding: 30, maxWidth: 1000, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  th: { textAlign: 'left', padding: 10, borderBottom: '2px solid #ddd', background: '#f5f5f5' },
  td: { padding: 10, borderBottom: '1px solid #eee' },
  deleteBtn: { background: '#f44336', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' },
};

export default AdminDashboard;