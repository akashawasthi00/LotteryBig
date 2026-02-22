import { Navigate, Route, Routes } from 'react-router-dom';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import { clearToken, getToken, isAdmin } from './api.js';

function RequireAdmin({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin()) {
    clearToken();
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAdmin><Admin /></RequireAdmin>} />
      </Routes>
    </div>
  );
}
