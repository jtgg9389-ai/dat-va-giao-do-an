import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Restaurant.css';
import RestaurantOrders from '../components/RestaurantOrders';
import RestaurantReport from '../components/RestaurantReport';
import PartnerSettlements from '../components/PartnerSettlements';

const formatPrice = (n) => `${Number(n).toLocaleString('vi-VN')}đ`;

const emptyInfo = { name: '', address: '', phone: '', description: '', isOpen: true, latitude: '', longitude: '', cuisine: '' };
const emptyItem = { name: '', price: '', category: '', description: '', image: '' };
const noMsg = { type: '', text: '' };

function RestaurantDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Thông tin quán
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [approval, setApproval] = useState({ status: 'pending', reason: '' });
  const [info, setInfo] = useState(emptyInfo);
  const [infoMsg, setInfoMsg] = useState(noMsg);
  const [savingInfo, setSavingInfo] = useState(false);

  // Thực đơn
  const [menu, setMenu] = useState([]);
  const [item, setItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [itemMsg, setItemMsg] = useState(noMsg);
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/restaurants/mine');
        if (res.data.restaurant) {
          const r = res.data.restaurant;
          setHasRestaurant(true);
          setInfo({
            name: r.name,
            address: r.address,
            phone: r.phone || '',
            description: r.description || '',
            isOpen: r.isOpen,
            latitude: r.location?.latitude ?? '', longitude: r.location?.longitude ?? '', cuisine: r.cuisine || '',
          });
          setMenu(res.data.menu);
          setApproval({ status: r.approvalStatus || 'pending', reason: r.rejectReason || '' });
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear();
          navigate('/login');
        } else {
          setInfoMsg({ type: 'error', text: 'Không tải được dữ liệu nhà hàng' });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  // ----- Thông tin quán -----
  const handleInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInfo({ ...info, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoMsg(noMsg);
    setSavingInfo(true);
    try {
      const res = await api.put('/restaurants/mine', { ...info, location: { latitude: Number(info.latitude), longitude: Number(info.longitude) } });
      setHasRestaurant(true);
      setApproval({ status: res.data.restaurant.approvalStatus, reason: res.data.restaurant.rejectReason || '' });
      setInfoMsg({ type: 'success', text: res.data.message });
    } catch (err) {
      setInfoMsg({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setSavingInfo(false);
    }
  };

  // ----- Thực đơn -----
  const handleItemChange = (e) => setItem({ ...item, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setItemMsg({ type: 'error', text: 'Chọn ảnh JPG, PNG hoặc WebP tối đa 2 MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setItem(previous => ({ ...previous, image: reader.result })); setItemMsg(noMsg); };
    reader.onerror = () => setItemMsg({ type: 'error', text: 'Không đọc được ảnh. Vui lòng chọn lại.' });
    reader.readAsDataURL(file);
  };

  const resetItemForm = () => {
    setItem(emptyItem);
    setEditingId(null);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    setItemMsg(noMsg);
    setSavingItem(true);
    try {
      if (editingId) {
        const res = await api.put(`/restaurants/mine/menu/${editingId}`, item);
        setMenu(menu.map((m) => (m._id === editingId ? res.data.item : m)));
        setItemMsg({ type: 'success', text: 'Cập nhật món thành công' });
      } else {
        const res = await api.post('/restaurants/mine/menu', item);
        setMenu([...menu, res.data.item]);
        setItemMsg({ type: 'success', text: 'Thêm món thành công' });
      }
      resetItemForm();
    } catch (err) {
      setItemMsg({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setSavingItem(false);
    }
  };

  const startEdit = (m) => {
    setItem({
      name: m.name,
      price: String(m.price),
      category: m.category || '',
      description: m.description || '',
      image: m.image || '',
    });
    setEditingId(m._id);
    setItemMsg(noMsg);
    document.getElementById('menu-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleAvailable = async (m) => {
    try {
      const res = await api.put(`/restaurants/mine/menu/${m._id}`, { available: !m.available });
      setMenu(menu.map((x) => (x._id === m._id ? res.data.item : x)));
    } catch (err) {
      setItemMsg({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại' });
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Xóa món "${m.name}"?`)) return;
    try {
      await api.delete(`/restaurants/mine/menu/${m._id}`);
      setMenu(menu.filter((x) => x._id !== m._id));
      if (editingId === m._id) resetItemForm();
    } catch (err) {
      setItemMsg({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại' });
    }
  };

  // Nhóm món theo danh mục để hiển thị
  const grouped = menu.reduce((acc, m) => {
    const key = m.category || 'Khác';
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  if (loading) return <p style={{ textAlign: 'center', marginTop: 50 }}>Đang tải...</p>;

  return (
    <div className="rs-page">
      <header className="rs-topbar">
        <button className="rs-back" onClick={() => navigate('/')}>← Trang chủ</button>
        <h1>Quản lý nhà hàng</h1>
      </header>

      <div className="rs-container">
        {/* Thông tin nhà hàng */}
        <section className="rs-card">
          <h2>Thông tin nhà hàng</h2>
          {hasRestaurant && approval.status === 'pending' && (
            <p className="rs-notice">
              Quán đang chờ quản trị viên duyệt. Quán chỉ hiển thị với khách hàng sau khi được duyệt.
            </p>
          )}
          {hasRestaurant && approval.status === 'rejected' && (
            <p className="rs-notice">
              Quán chưa được duyệt. Lý do: {approval.reason}. Hãy chỉnh sửa thông tin và liên hệ quản trị viên qua trang Hỗ trợ.
            </p>
          )}
          {!hasRestaurant && (
            <p className="rs-notice">
              Bạn chưa có nhà hàng. Hãy điền thông tin bên dưới để tạo quán và bắt đầu thêm món.
            </p>
          )}

          <form className="rs-form" onSubmit={handleSaveInfo}>
            <label className="rs-field">
              Tên nhà hàng
              <input name="name" value={info.name} onChange={handleInfoChange} required />
            </label>
            <label className="rs-field">
              Số điện thoại
              <input name="phone" value={info.phone} onChange={handleInfoChange} placeholder="VD: 0901234567" />
            </label>
            <label className="rs-field full">
              Địa chỉ
              <input name="address" value={info.address} onChange={handleInfoChange} required />
            </label>
            <label className="rs-field full">
              Mô tả
              <textarea name="description" rows="3" value={info.description} onChange={handleInfoChange} />
            </label>
            <label className="rs-field">Loại món<input name="cuisine" value={info.cuisine} onChange={handleInfoChange} maxLength={50} placeholder="Cơm, bún, đồ uống…" /></label>
            <div className="rs-actions"><button type="button" className="rs-btn secondary" onClick={() => navigator.geolocation?.getCurrentPosition(p => setInfo(previous => ({ ...previous, latitude: p.coords.latitude, longitude: p.coords.longitude })), () => setInfoMsg({ type: 'error', text: 'Không lấy được vị trí; nhập tọa độ thủ công.' }))}>Lấy vị trí quán hiện tại</button></div>
            <label className="rs-field">Vĩ độ quán<input name="latitude" type="number" min="-90" max="90" step="any" required value={info.latitude} onChange={handleInfoChange} /></label>
            <label className="rs-field">Kinh độ quán<input name="longitude" type="number" min="-180" max="180" step="any" required value={info.longitude} onChange={handleInfoChange} /></label>
            <label className="rs-switch full">
              <input type="checkbox" name="isOpen" checked={info.isOpen} onChange={handleInfoChange} />
              Đang mở cửa nhận đơn
            </label>

            {infoMsg.text && (
              <p className={`${infoMsg.type === 'error' ? 'rs-error' : 'rs-success'} full`}>{infoMsg.text}</p>
            )}

            <div className="rs-actions full">
              <button className="rs-btn" type="submit" disabled={savingInfo}>
                {savingInfo ? 'Đang lưu...' : hasRestaurant ? 'Lưu thay đổi' : 'Tạo nhà hàng'}
              </button>
            </div>
          </form>
        </section>

        {hasRestaurant && (
          <>
            <RestaurantOrders />
            <RestaurantReport />
            <PartnerSettlements />
            {/* Form thêm / sửa món */}
            <section className="rs-card" id="menu-form">
              <h2>{editingId ? 'Sửa món ăn' : 'Thêm món ăn'}</h2>

              <form className="rs-form" onSubmit={handleSubmitItem}>
                <label className="rs-field">
                  Tên món
                  <input name="name" value={item.name} onChange={handleItemChange} required />
                </label>
                <label className="rs-field">
                  Giá (đồng)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="1000"
                    value={item.price}
                    onChange={handleItemChange}
                    required
                  />
                </label>
                <label className="rs-field">
                  Danh mục
                  <input
                    name="category"
                    list="category-list"
                    value={item.category}
                    onChange={handleItemChange}
                    placeholder="VD: Món chính, Đồ uống"
                  />
                  <datalist id="category-list">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </label>
                <label className="rs-field">
                  Mô tả ngắn
                  <input name="description" value={item.description} onChange={handleItemChange} />
                </label>

                <div className="rs-field full">
                  <label htmlFor="menu-image">Ảnh món ăn (JPG, PNG, WebP, tối đa 2 MB)</label>
                  <input id="menu-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} disabled={savingItem} />
                  {item.image && <div className="rs-image-preview"><img src={item.image} alt="Ảnh món đang chọn" /><button className="rs-btn secondary" type="button" onClick={() => setItem(previous => ({ ...previous, image: '' }))}>Bỏ ảnh</button></div>}
                </div>

                {itemMsg.text && (
                  <p className={`${itemMsg.type === 'error' ? 'rs-error' : 'rs-success'} full`}>{itemMsg.text}</p>
                )}

                <div className="rs-actions full">
                  <button className="rs-btn" type="submit" disabled={savingItem}>
                    {savingItem ? 'Đang lưu...' : editingId ? 'Lưu món' : 'Thêm món'}
                  </button>
                  {editingId && (
                    <button className="rs-btn secondary" type="button" onClick={resetItemForm}>
                      Hủy sửa
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Danh sách món */}
            <section className="rs-card">
              <h2>Thực đơn ({menu.length} món)</h2>

              {menu.length === 0 && (
                <p className="rs-empty">Chưa có món nào. Hãy thêm món đầu tiên ở phía trên.</p>
              )}

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="rs-category">{cat}</h3>
                  {items.map((m) => (
                    <div className={`rs-menu-item ${m.available ? '' : 'off'}`} key={m._id}>
                      {m.image && <img className="rs-menu-image" src={m.image} alt={m.name} loading="lazy" />}
                      <div className="rs-menu-info">
                        <div className="rs-menu-name">
                          {m.name} {!m.available && <span className="rs-badge off">Hết món</span>}
                        </div>
                        {m.description && <div className="rs-menu-desc">{m.description}</div>}
                      </div>
                      <div className="rs-menu-price">{formatPrice(m.price)}</div>
                      <div className="rs-menu-actions">
                        <button className="rs-link" onClick={() => toggleAvailable(m)}>
                          {m.available ? 'Báo hết' : 'Mở bán'}
                        </button>
                        <button className="rs-link" onClick={() => startEdit(m)}>Sửa</button>
                        <button className="rs-link danger" onClick={() => handleDelete(m)}>Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default RestaurantDashboard;