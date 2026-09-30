import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';

function Home() {
  const user = JSON.parse(localStorage.getItem('user'));
  return (
    <div style={{ textAlign: 'center', marginTop: 50 }}>
      {user ? (
        <>
          <h1>Xin chào, {user.name} 👋</h1>
          <p>Vai trò: {user.role}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}>
            Đăng xuất
          </button>
        </>
      ) : (
        <Navigate to="/login" />
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;