import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RoleSwitcher from './components/RoleSwitcher';
import Orders, { OrderDetail } from './pages/Orders';
import DriverDashboard from './pages/DriverDashboard';
import AdminOperations from './pages/AdminOperations';
import Notifications from './pages/Notifications';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminPartners from './pages/AdminPartners';
import AdminComplaints from './pages/AdminComplaints';
import Support from './pages/Support';
import RestaurantDashboard from './pages/RestaurantDashboard';
import Restaurants from './pages/Restaurants';
import RestaurantDetail from './pages/RestaurantDetail';

// Chỉ cho vào nếu đã đăng nhập và đúng vai trò
function RequireRole({ roles, children }) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <RoleSwitcher />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/orders" element={<RequireRole roles={['customer']}><Orders /></RequireRole>} />
        <Route path="/orders/:id" element={<RequireRole><OrderDetail /></RequireRole>} />
        <Route path="/driver" element={<RequireRole roles={['driver']}><DriverDashboard /></RequireRole>} />
        <Route path="/notifications" element={<RequireRole><Notifications /></RequireRole>} />
        <Route path="/admin/operations" element={<RequireRole roles={['admin']}><AdminOperations /></RequireRole>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/admin" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
        <Route path="/admin/partners" element={<RequireRole roles={['admin']}><AdminPartners /></RequireRole>} />
        <Route path="/admin/complaints" element={<RequireRole roles={['admin']}><AdminComplaints /></RequireRole>} />

        <Route
          path="/support"
          element={<RequireRole roles={['customer', 'restaurant', 'driver']}><Support /></RequireRole>}
        />

        <Route path="/restaurant" element={<RequireRole roles={['restaurant']}><RestaurantDashboard /></RequireRole>} />
        <Route path="/restaurants" element={<RequireRole roles={['customer']}><Restaurants /></RequireRole>} />
        <Route path="/restaurants/:id" element={<RequireRole roles={['customer']}><RestaurantDetail /></RequireRole>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;